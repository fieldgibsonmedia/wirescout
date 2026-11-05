// News sources, followed by URL. A source is shared by every watch list that follows its URL.
import { track } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';

// status: "Working", why it fails ("Page not found · check the address") or "Not checked yet".
// lastChecked: when the scanner last checked it ("10:40" today, "28 Oct, 10:40" before), or ''.
// problem: why the source fails, for the Fix dialog, or null when it works or hasn't been checked yet.
export type Source = {
    id: string;
    url: string;
    label: string;
    status: string;
    lastChecked: string;
    lastCheckedAt: string | null;
    problem: string | null;
};

// The columns toSource needs.
export const SOURCE_COLUMNS = 'id, url, name, last_checked_at, stories_found, problem';

type SourceRow = {
    id: string;
    url: string;
    name: string | null;
    last_checked_at: string | null;
    stories_found: number | null;
    problem: string | null;
};

// Why the scanner found no stories in its last check (sources.problem): the status line, and the line in the Fix dialog.
const PROBLEMS: Record<string, { status: string; explanation: string }> = {
    not_found: {
        status: 'Page not found · check the address',
        explanation: "The site says this page doesn't exist. Check the address, or paste the link of the site's news page.",
    },
    blocked: {
        status: 'The site blocks Wirescout',
        explanation: 'The site turns Wirescout away. Try another page with the same news, such as its RSS feed.',
    },
    unreachable: {
        status: "The site can't be reached",
        explanation: "The site didn't answer, or its security certificate is broken. Check the address. If it's right, leave it: Wirescout tries again every hour.",
    },
    none: {
        status: 'No stories found',
        explanation: 'Wirescout found no stories on this page. Paste the link of the page that lists the news, or of its RSS feed.',
    },
};

export function toSource(source: SourceRow): Source {
    const failing = source.last_checked_at !== null && !source.stories_found;
    const problem = failing ? PROBLEMS[source.problem ?? 'none'] ?? PROBLEMS.none : null;
    return {
        id: source.id,
        url: source.url,
        label: sourceLabel(source),
        status: source.last_checked_at ? (problem?.status ?? 'Working') : 'Not checked yet',
        lastChecked: source.last_checked_at ? lastChecked(source.last_checked_at) : '',
        lastCheckedAt: source.last_checked_at,
        problem: problem?.explanation ?? null,
    };
}

export function sourceLabel(source: { url: string; name: string | null }) {
    return source.name ?? new URL(source.url).hostname.replace(/^www\./, '');
}

// The label in a list: two sources on the same site also show the end of their path ("swissre.com · news_releases").
export function listLabel(source: Source, sources: Source[]) {
    const sharesSite = sources.some((other) => other.id !== source.id && other.label === source.label);
    const pathEnd = new URL(source.url).pathname.split('/').filter(Boolean).at(-1);
    return sharesSite && pathEnd ? `${source.label} · ${pathEnd}` : source.label;
}

const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });
const dateTimeFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// The time only for today's checks.
function lastChecked(checkedAtText: string) {
    const checkedAt = new Date(checkedAtText);
    const isToday = checkedAt.toDateString() === new Date().toDateString();
    return (isToday ? timeFormat : dateTimeFormat).format(checkedAt);
}

export function isWebAddress(text: string) {
    if (!URL.canParse(text)) {
        return false;
    }
    const url = new URL(text);
    return ['http:', 'https:'].includes(url.protocol) && url.hostname.includes('.');
}

// The same address written differently: http or https, with or without www., a trailing slash.
// Used to spot a link that's already in the list, or pasted twice.
export function addressKey(url: string) {
    if (!URL.canParse(url)) {
        return url;
    }
    const { hostname, pathname, search } = new URL(url);
    return `${hostname.replace(/^www\./, '')}${pathname.replace(/\/+$/, '')}${search}`;
}

// The addresses once each, in the order they come; of two ways of writing one, the first is kept.
export function uniqueAddresses(urls: string[]) {
    const seen = new Set<string>();
    return urls.filter((url) => {
        const key = addressKey(url);
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

// Why a link can't be added, from the check-links function (the scanner's own check).
// "unchecked": the check itself failed, so the link wasn't added; trying again may work.
export type LinkCheck = { url: string; problem: 'not_found' | 'blocked' | 'unreachable' | 'no_stories' | 'unchecked' | null };

// One link per call: the free plan gives each call 2 seconds of processing, and a big news page
// can take most of it on its own. A few calls run at a time.
const PARALLEL_CHECKS = 5;

// Checks links before they're added: one result per link, in the same order.
export async function checkLinks(urls: string[]): Promise<LinkCheck[]> {
    const results: LinkCheck[] = [];
    let next = 0;
    async function worker() {
        while (next < urls.length) {
            const index = next++;
            const { data, error } = await supabase.functions.invoke<{ results: LinkCheck[] }>('check-links', {
                body: { urls: [urls[index]] },
            });
            results[index] = error || !data ? { url: urls[index], problem: 'unchecked' } : data.results[0];
        }
    }
    await Promise.all(Array.from({ length: PARALLEL_CHECKS }, worker));
    return results;
}

// Reads sources just added that the scanner hasn't checked yet, or that failed its last check (shared with
// another list: the link check just passed, so the old "failing" would be wrong), so their stories and status
// show now instead of after the next hourly scan. One source per call, like checkLinks. A failed read is left
// to that scan. Returns the sources with their new status.
export async function scanNewSources(sources: Source[]): Promise<Source[]> {
    const unchecked = sources.filter((source) => !source.lastCheckedAt || source.problem);
    let next = 0;
    async function worker() {
        while (next < unchecked.length) {
            const source = unchecked[next++];
            await supabase.functions.invoke('scan-new-sources', { body: { source_id: source.id } });
        }
    }
    await Promise.all(Array.from({ length: PARALLEL_CHECKS }, worker));

    const rows: SourceRow[] = [];
    for (let start = 0; start < unchecked.length; start += LOOKUP_BATCH) {
        const ids = unchecked.slice(start, start + LOOKUP_BATCH).map((source) => source.id);
        const { data, error } = await supabase.from('sources').select(SOURCE_COLUMNS).in('id', ids);
        if (error) {
            return sources;
        }
        rows.push(...data);
    }
    return sources.map((source) => {
        const row = rows.find((found) => found.id === source.id);
        return row ? toSource(row) : source;
    });
}

const listFormat = new Intl.ListFormat('en-GB');

// One line per reason for the links that failed their check, e.g. 'X and Y return "page not found". …'.
// Pass ['This link'] as the names when there's only the one link in a field.
export function checkMessages(failed: LinkCheck[], names = failed.map((check) => check.url)) {
    const problems = ['not_found', 'blocked', 'unreachable', 'no_stories', 'unchecked'] as const;
    return problems.flatMap((problem) => {
        const links = names.filter((_, index) => failed[index].problem === problem);
        if (links.length === 0) {
            return [];
        }
        const list = listFormat.format(links);
        const one = links.length === 1;
        if (problem === 'not_found') {
            return `${list} ${one ? 'returns' : 'return'} "page not found". Check the ${one ? 'link' : 'links'} and try again.`;
        }
        if (problem === 'unchecked') {
            return `${list} couldn't be checked. Please try again.`;
        }
        const reason = { blocked: 'the site blocks Wirescout', unreachable: "the site can't be reached", no_stories: 'no stories found' }[problem];
        return `${list} couldn't be added: ${reason}.`;
    });
}

// Long address lists are looked up in batches: they travel in the request's URL, which has a size limit.
const LOOKUP_BATCH = 20;

// Adds the URLs to the watch list, reusing a source if someone added its URL before.
// Returns the added sources, or null if they couldn't be added.
export async function addSources(watchListId: string, urls: string[]): Promise<Source[] | null> {
    const created = await supabase.from('sources').upsert(
        urls.map((url) => ({ url })),
        { onConflict: 'url,kind', ignoreDuplicates: true },
    );
    if (created.error) {
        return null;
    }

    const found = [];
    for (let start = 0; start < urls.length; start += LOOKUP_BATCH) {
        const { data, error } = await supabase
            .from('sources')
            .select(SOURCE_COLUMNS)
            .eq('kind', 'news')
            .in('url', urls.slice(start, start + LOOKUP_BATCH));
        if (error) {
            return null;
        }
        found.push(...data);
    }

    const linked = await supabase
        .from('watch_list_sources')
        .insert(found.map((source) => ({ watch_list_id: watchListId, source_id: source.id })));
    if (linked.error) {
        return null;
    }

    track('sources_added', { count: found.length });
    return found.map(toSource);
}

// Swaps a source for the one at url, in this watch list only: other lists following the old source keep it.
// The new source keeps the old one's place in the list. Returns it, or null if it couldn't be swapped.
export async function replaceSource(watchListId: string, sourceId: string, url: string): Promise<Source | null> {
    const created = await supabase.from('sources').upsert({ url }, { onConflict: 'url,kind', ignoreDuplicates: true });
    if (created.error) {
        return null;
    }

    const { data, error } = await supabase.from('sources').select(SOURCE_COLUMNS).eq('kind', 'news').eq('url', url).single();
    if (error) {
        return null;
    }

    const swapped = await supabase
        .from('watch_list_sources')
        .update({ source_id: data.id })
        .eq('watch_list_id', watchListId)
        .eq('source_id', sourceId);
    if (swapped.error) {
        return null;
    }

    return toSource(data);
}

// Takes sources out of a watch list. Their stories stay in other lists that follow them.
export async function removeSources(watchListId: string, sourceIds: string[]) {
    const { error } = await supabase.from('watch_list_sources').delete().eq('watch_list_id', watchListId).in('source_id', sourceIds);
    return !error;
}

// Moves sources to another of the user's watch lists; they keep their stories. A source the other list
// already follows is only taken out of this one. Returns false if they couldn't be moved.
export async function moveSources(fromWatchListId: string, toWatchListId: string, sourceIds: string[]) {
    const { data, error } = await supabase
        .from('watch_list_sources')
        .select('source_id')
        .eq('watch_list_id', toWatchListId)
        .in('source_id', sourceIds);
    if (error) {
        return false;
    }

    const there = new Set(data.map((link) => link.source_id));
    const toMove = sourceIds.filter((id) => !there.has(id));
    if (toMove.length > 0) {
        const moved = await supabase
            .from('watch_list_sources')
            .update({ watch_list_id: toWatchListId })
            .eq('watch_list_id', fromWatchListId)
            .in('source_id', toMove);
        if (moved.error) {
            return false;
        }
    }
    return there.size === 0 || (await removeSources(fromWatchListId, [...there]));
}
