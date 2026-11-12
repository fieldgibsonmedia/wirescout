// What's new in each version, newest first, for the dashboard's "What's new" card, in words a journalist would use.
// The newest entry takes package.json's version, so the app shows one version everywhere. When the version goes up,
// type the old number into this entry and add a new one on top. Every job that changes what users get raises the version
// (docs/mvp-plan.md, Decisions). Every change users get, security updates included, most important first: security,
// then system, then features and fixes, looks (screens, icons) last.
export const releaseNotes: { version: string; notes: string[] }[] = [
    {
        version: __APP_VERSION__,
        notes: [
            'A watch list can show only the stories of the sources you pick: use the Sources menu next to search, click a source\'s name on a story, or choose See its stories in the Sources tab. Each source shows how many new stories it has.',
        ],
    },
    {
        version: '0.7.6',
        notes: [
            "Adding sources from a file or a pasted list now adds every link, even one that doesn't work yet. A short message says how many work, and the ones with a problem show at the top of the Sources tab, in red, each with a Fix button.",
        ],
    },
    {
        version: '0.7.5',
        notes: [
            "Bond documents lists find PDFs on more issuers' pages, including pages built with JavaScript.",
            'A site that shows Wirescout a robot check now says "the site blocks Wirescout", not "no stories found".',
        ],
    },
    {
        version: '0.7.4',
        notes: [
            'Uploading a spreadsheet of issuers to a bond documents list names each source after the issuer in its first column (e.g. "Covivio", not covivio.eu).',
        ],
    },
    {
        version: '0.7.3',
        notes: ['A PDF an issuer puts up again under a new file name no longer shows as new: you see it once.'],
    },
    {
        version: '0.7.2',
        notes: [
            "Wirescout now opens each new story's and document's link before showing it: a link the site says doesn't exist is left out, and tried again later.",
            'Fixed: some PDF links (e.g. Gothenburg\'s) opened "page not found".',
            'The Sources tab shows how many sources a list has, 25 per page (or 50, 100).',
        ],
    },
    {
        version: '0.7.1',
        notes: ['Your daily digest lists every new bond document in your bond document lists, each with its label.'],
    },
    {
        version: '0.7.0',
        notes: [
            "New: bond document lists. Choose Bond documents when you create a watch list, add issuers' pages, and Wirescout shows each new PDF on them, labelled: allocation report, impact report, framework, second-party opinion or new bond issue.",
            'Uploading an Excel file of sources also finds the links behind cell text.',
        ],
    },
    {
        version: '0.6.2',
        notes: ["Security: you can change your email only to one that's allowed on Wirescout, like when signing up."],
    },
    {
        version: '0.6.1',
        notes: [
            'Security and stability: updated the parts that send emails and fetch web pages, with their latest security fixes.',
            'Fixed: a source could show stories from the whole website (e.g. blog posts) instead of only those on the page you added.',
        ],
    },
    {
        version: '0.6.0',
        notes: ['A red number next to each watch list in the side menu shows its new stories since you last opened it. Opening the list clears it.'],
    },
    {
        version: '0.5.10',
        notes: ['The sign-in screens have their titles and descriptions centred, under the Wirescout robot.'],
    },
    {
        version: '0.5.9',
        notes: ["The Wirescout robot now shows in your browser tab and bookmarks, and on your phone's home screen if you add Wirescout there."],
    },
    {
        version: '0.5.8',
        notes: ['For super admins: if you are the only one, Delete account opens a message with a button to System admins, to assign another first.'],
    },
    {
        version: '0.5.7',
        notes: ['The All stories · Saved switch in a watch list is easier to see: the option not chosen has a white background.'],
    },
    {
        version: '0.5.6',
        notes: ['Fixed: a source you add could show as failing, although its link check had just passed.'],
    },
    {
        version: '0.5.5',
        notes: ['The Wirescout robot now sits next to the name on the sign-in screens, in the daily digest and in account emails.'],
    },
    {
        version: '0.5.4',
        notes: ["The Privacy policy now says that session recordings show only Wirescout's own pages, never your computer, screen or other tabs."],
    },
    {
        version: '0.5.3',
        notes: ['For super admins: Analytics always shows the latest figures. Before, it could be up to 6 hours behind.'],
    },
    {
        version: '0.5.2',
        notes: ['Fixed: session replays in usage statistics were missing for some browsers.'],
    },
    {
        version: '0.5.1',
        notes: ['Fixed: usage statistics were missing for some browsers.'],
    },
    {
        version: '0.5.0',
        notes: [
            'A Privacy policy at the bottom of the side bar: what Wirescout records about how it is used, and who sees it.',
            'For super admins: Analytics in Manager shows who uses Wirescout, what they use and the most shared stories, with a report to download.',
        ],
    },
    {
        version: '0.4.0',
        notes: [
            'For super admins: System settings has two tabs, Platform access (who can sign up) and System admins (add or remove super admins).',
            'Wirescout always keeps at least one super admin: the only one is asked to assign another before deleting their account.',
        ],
    },
    {
        version: '0.3.0',
        notes: ['Delete your account yourself, at the bottom of Account settings. Everything in it goes with it.'],
    },
    {
        version: '0.2.0',
        notes: [
            'New sources show their latest stories straight away, instead of after the next hourly check.',
            "Adding many sources at once works with big news sites too. If a link can't be checked, only that one is left out, and the rest are added.",
            'The same address written two ways (with or without www., http or https) is added only once.',
            'The file upload box is smaller again, so the addresses it finds show without scrolling.',
        ],
    },
    {
        version: '0.1.0',
        notes: [
            "Send a story to Corporate Disclosures as a draft: add the magazine once with your own MODX login in Settings → Channels, then pick Send to Corporate Disclosures in the story's Share menu.",
            'The draft comes with a suggested title and short brief, ending with the source link. Edit them as you like before you send.',
            "Suggested drafts are always in British English, even when the story isn't.",
            "You'll see when a story was already sent to a magazine, so it isn't posted twice.",
            'Environmental Finance, InsuranceERM and Insurance Asset Risk are coming soon.',
            'Remember me when you sign in: leave it unticked to be signed out when you close your browser.',
            'Your watch lists and settings are listed A–Z in the side bar.',
            'The dashboard shows each watch list at a glance: new stories, the last 7 days, its sources and any that fail, and its saved stories.',
            'Search all your watch lists at once from the box at the top: matching stories and sources.',
            'Save stories for later: click Save on a story, then find it under Saved on the Stories tab.',
            "Click a source's name on the Sources tab to open its page on the site, even when it fails.",
            'Edit or delete a watch list from its ⋯ menu in the side bar. Its keywords are in Edit now.',
            'A cleaner look in light and dark, with smoother menus, dialogs and tabs.',
        ],
    },
];
