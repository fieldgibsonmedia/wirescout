#!/usr/bin/env node
// PreToolUse hook: Claude never commits, pushes or merges to main/master.
// Ken merges every PR himself (a push to main deploys to production).
// Exit code 2 blocks the tool call and shows the reason to Claude.

const { execFileSync } = require("child_process");
const path = require("path");
const os = require("os");

const PROTECTED = ["main", "master"];
const COMMIT_COMMANDS = ["commit", "merge", "cherry-pick", "revert", "am"];

const block = (reason) => {
    process.stderr.write(
        `Blocked by .claude/hooks/guard-main.js: ${reason}\n` +
            "Rule: never commit, push or merge to main. Work on a branch, push that branch and leave the merge to Ken.\n",
    );
    process.exit(2);
};

const isProtected = (ref) => {
    const name = String(ref || "")
        .replace(/^\+/, "")
        .replace(/^refs\/heads\//, "");
    return PROTECTED.includes(name);
};

const currentBranch = (dir) => {
    try {
        return execFileSync(
            "git",
            ["-C", dir, "rev-parse", "--abbrev-ref", "HEAD"],
            {
                encoding: "utf8",
                stdio: ["ignore", "pipe", "ignore"],
            },
        ).trim();
    } catch {
        return null; // not a git repo
    }
};

// Rough shell split: keeps quoted strings together, enough for git/gh commands.
const tokenize = (segment) =>
    (segment.match(/"[^"]*"|'[^']*'|\S+/g) || []).map((t) =>
        t.replace(/^["']|["']$/g, ""),
    );

const resolveDir = (base, dir) => {
    if (dir === "~" || dir.startsWith("~/"))
        return path.join(os.homedir(), dir.slice(1));
    return path.resolve(base, dir);
};

const checkGit = (args, dir, branchOf) => {
    // git global options before the subcommand
    let i = 0;
    while (i < args.length && args[i].startsWith("-")) {
        if (args[i] === "-C") dir = resolveDir(dir, args[i + 1] || ".");
        i += ["-C", "-c", "--git-dir", "--work-tree"].includes(args[i]) ? 2 : 1;
    }
    const sub = args[i];
    const rest = args.slice(i + 1);
    const branch = branchOf(dir);

    if (sub === "checkout" || sub === "switch") {
        if (rest.includes("--")) return { dir };
        const flag = rest.findIndex((a) =>
            ["-b", "-B", "-c", "-C"].includes(a),
        );
        const target =
            flag >= 0 ? rest[flag + 1] : rest.find((a) => !a.startsWith("-"));
        return { dir, switchedTo: target };
    }

    if (COMMIT_COMMANDS.includes(sub) && isProtected(branch)) {
        block(`"git ${sub}" while on ${branch}.`);
    }

    if (sub === "push") {
        if (rest.some((a) => ["--all", "--mirror"].includes(a)))
            block('"git push --all/--mirror" includes main.');
        if (rest.some((a) => a === "-f" || a.startsWith("--force")))
            block('"git push --force": no force-push, ever.');
        const refspecs = rest.filter((a) => !a.startsWith("-")).slice(1); // first one is the remote
        if (refspecs.length === 0 && isProtected(branch))
            block(`"git push" while on ${branch}.`);
        for (const spec of refspecs) {
            const dest = spec.includes(":") ? spec.split(":").pop() : spec;
            if (isProtected(dest)) block(`"git push" to ${dest}.`);
            if (dest === "HEAD" && isProtected(branch))
                block(`"git push HEAD" while on ${branch}.`);
        }
    }
    return { dir };
};

const checkGh = (args) => {
    if (args[0] === "pr" && args[1] === "merge")
        block('"gh pr merge": Ken merges PRs.');
    if (
        args[0] === "api" &&
        args.some((a) => /\/pulls\/\d+\/merge\b|\/merges\b/.test(a))
    ) {
        block('merging through "gh api": Ken merges PRs.');
    }
};

const checkBash = (command, cwd) => {
    // Coarse checks first: they also catch commands wrapped in bash -c, xargs, etc.
    if (/\bgh\s+pr\s+merge\b/.test(command))
        block('"gh pr merge": Ken merges PRs.');
    const pushToMain =
        /\bgit\s+(?:(?:-C|-c)\s+\S+\s+|--?\S+\s+)*push\b[^\n;&|]*?(?:\s|:|\+|refs\/heads\/)(?:main|master)(?![\w\-/.])/;
    if (pushToMain.test(command)) {
        block('"git push" to main.');
    }

    const switched = {}; // dir -> branch after a checkout/switch earlier in the same command
    const branchOf = (dir) => switched[dir] || currentBranch(dir);
    let dir = cwd;

    for (const segment of command.split(/&&|\|\||;|\||\n/)) {
        const tokens = tokenize(segment.trim());
        while (tokens.length && /^\w+=/.test(tokens[0])) tokens.shift(); // VAR=value prefixes
        if (!tokens.length) continue;

        if (tokens[0] === "cd") {
            dir = resolveDir(dir, tokens[1] || "~");
        } else if (tokens[0] === "git") {
            const result = checkGit(tokens.slice(1), dir, branchOf);
            if (result.switchedTo) switched[result.dir] = result.switchedTo;
        } else if (tokens[0] === "gh") {
            checkGh(tokens.slice(1));
        }
    }
};

const checkMcp = (toolName, input) => {
    if (/merge_pull_request|merge_pr\b/.test(toolName))
        block(`${toolName}: Ken merges PRs.`);
    if (
        /push_files|create_or_update_file|delete_file|create_commit/.test(
            toolName,
        ) &&
        isProtected(input.branch)
    ) {
        block(`${toolName} on ${input.branch}.`);
    }
};

let raw = "";
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
    let data;
    try {
        data = JSON.parse(raw);
    } catch {
        process.exit(0);
    }
    const input = data.tool_input || {};
    if (data.tool_name === "Bash")
        checkBash(String(input.command || ""), data.cwd || process.cwd());
    else if (String(data.tool_name || "").startsWith("mcp__"))
        checkMcp(data.tool_name, input);
    process.exit(0);
});
