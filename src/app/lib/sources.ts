// News sources, followed by URL. A source is shared by every watch list that follows its URL.
import { supabase } from '@/lib/supabase';

export type Source = { id: string; url: string; label: string };

export function sourceLabel(source: { url: string; name: string | null }) {
    return source.name ?? new URL(source.url).hostname.replace(/^www\./, '');
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
            .select('id, url, name')
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

    return found.map((source) => ({ id: source.id, url: source.url, label: sourceLabel(source) }));
}
