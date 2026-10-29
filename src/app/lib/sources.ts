// News sources, followed by URL. A source is shared by every watch list that follows its URL.
import { supabase } from '@/lib/supabase';

export type Source = { id: string; url: string; label: string; status: string };

// The columns toSource needs.
export const SOURCE_COLUMNS = 'id, url, name, last_checked_at, stories_found';

type SourceRow = { id: string; url: string; name: string | null; last_checked_at: string | null; stories_found: number | null };

export function toSource(source: SourceRow): Source {
    return { id: source.id, url: source.url, label: sourceLabel(source), status: sourceStatus(source) };
}

export function sourceLabel(source: { url: string; name: string | null }) {
    return source.name ?? new URL(source.url).hostname.replace(/^www\./, '');
}

const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });
const dateTimeFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// What the scanner found in its last check: "Working · Last checked 10:40", "No stories found · …" or "Not checked yet".
function sourceStatus(source: { last_checked_at: string | null; stories_found: number | null }) {
    if (!source.last_checked_at) {
        return 'Not checked yet';
    }
    const checkedAt = new Date(source.last_checked_at);
    const isToday = checkedAt.toDateString() === new Date().toDateString();
    const lastChecked = `Last checked ${(isToday ? timeFormat : dateTimeFormat).format(checkedAt)}`;
    return `${source.stories_found ? 'Working' : 'No stories found'} · ${lastChecked}`;
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
