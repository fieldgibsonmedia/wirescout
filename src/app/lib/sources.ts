// News sources, followed by URL. A source is shared by every watch list that follows its URL.
import { supabase } from '@/lib/supabase';

// problem: why the source fails, for the Fix dialog, or null when it works or hasn't been checked yet.
export type Source = { id: string; url: string; label: string; status: string; problem: string | null };

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
        status: sourceStatus(source, problem?.status),
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

// What the scanner found in its last check: "Working · Last checked 10:40", the problem ("No stories found · …")
// or "Not checked yet".
function sourceStatus(source: { last_checked_at: string | null }, problem: string | undefined) {
    if (!source.last_checked_at) {
        return 'Not checked yet';
    }
    const checkedAt = new Date(source.last_checked_at);
    const isToday = checkedAt.toDateString() === new Date().toDateString();
    const lastChecked = `Last checked ${(isToday ? timeFormat : dateTimeFormat).format(checkedAt)}`;
    return `${problem ?? 'Working'} · ${lastChecked}`;
}

export function isWebAddress(text: string) {
    if (!URL.canParse(text)) {
        return false;
    }
    const url = new URL(text);
    return ['http:', 'https:'].includes(url.protocol) && url.hostname.includes('.');
}

// Long address lists are looked up in batches: they travel in the request's URL, which has a size limit.
const LOOKUP_BATCH = 20;

// Adds the URLs to the watch list, reusing a source if someone added its URL before.
// Returns the added sources, or null if they couldn't be added.
export async function addSources(watchListId: string, urls: string[]): Promise<Source[] | null> {
    const created = await supabase.from('sources').upsert(
        urls.map((url) => ({ url })),
        { onConflict: 'url', ignoreDuplicates: true },
    );
    if (created.error) {
        return null;
    }

    const found = [];
    for (let start = 0; start < urls.length; start += LOOKUP_BATCH) {
        const { data, error } = await supabase
            .from('sources')
            .select(SOURCE_COLUMNS)
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

    return found.map(toSource);
}

// Swaps a source for the one at url, in this watch list only: other lists following the old source keep it.
// The new source keeps the old one's place in the list. Returns it, or null if it couldn't be swapped.
export async function replaceSource(watchListId: string, sourceId: string, url: string): Promise<Source | null> {
    const created = await supabase.from('sources').upsert({ url }, { onConflict: 'url', ignoreDuplicates: true });
    if (created.error) {
        return null;
    }

    const { data, error } = await supabase.from('sources').select(SOURCE_COLUMNS).eq('url', url).single();
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
