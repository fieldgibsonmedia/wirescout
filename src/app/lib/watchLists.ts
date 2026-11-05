// The signed-in user's watch lists, shared by the side nav, the dashboard and the list page.
import { ref } from 'vue';
import { supabase } from '@/lib/supabase';

// news: follows stories. documents: follows the PDFs on issuers' pages, for bond alerts (docs/mvp-plan.md,
// "Document lists for bond alerts").
export type ListKind = 'news' | 'documents';

export const watchLists = ref<{ id: string; name: string; keywords: string[]; kind: ListKind }[]>([]);

// Each list's stories found since the user last opened it, through its keywords: the side nav's badges
// and the dashboard's big numbers.
export const newCounts = ref(new Map<string, number>());

// Both the side nav and the dashboard open the "New watch list" dialog, which lives in the layout.
export const creatingWatchList = ref(false);

export async function loadWatchLists() {
    const { data, error } = await supabase.from('watch_lists').select('id, name, keywords, kind').order('created_at');
    if (!error) {
        watchLists.value = data.map((list) => ({ ...list, kind: list.kind as ListKind }));
    }
    return !error;
}

// A list's kind, from the lists loaded for the side nav.
export function listKind(watchListId: string): ListKind {
    return watchLists.value.find((list) => list.id === watchListId)?.kind ?? 'news';
}

// What the model says a documents list's PDF is (articles.document_kind). Empty: not labelled yet.
export const DOCUMENT_KIND_LABELS: Record<string, string> = {
    allocation_report: 'Allocation report',
    impact_report: 'Impact report',
    framework: 'Framework',
    spo: 'Second-party opinion',
    new_issue: 'New bond issue',
    other: 'Other',
};

export function documentKindLabel(kind: string | null) {
    return kind ? (DOCUMENT_KIND_LABELS[kind] ?? kind) : 'Not labelled yet';
}

export async function loadNewCounts() {
    const { data, error } = await supabase.from('watch_list_new_counts').select('watch_list_id, new_count');
    if (!error) {
        newCounts.value = new Map(data.map((count) => [count.watch_list_id ?? '', count.new_count ?? 0]));
    }
    return !error;
}
