// The signed-in user's watch lists, shared by the side nav, the dashboard and the list page.
import { ref } from 'vue';
import { supabase } from '@/lib/supabase';

export const watchLists = ref<{ id: string; name: string; keywords: string[] }[]>([]);

// Each list's stories found since the user last opened it, through its keywords: the side nav's badges
// and the dashboard's big numbers.
export const newCounts = ref(new Map<string, number>());

// Both the side nav and the dashboard open the "New watch list" dialog, which lives in the layout.
export const creatingWatchList = ref(false);

export async function loadWatchLists() {
    const { data, error } = await supabase.from('watch_lists').select('id, name, keywords').order('created_at');
    if (!error) {
        watchLists.value = data;
    }
    return !error;
}

export async function loadNewCounts() {
    const { data, error } = await supabase.from('watch_list_new_counts').select('watch_list_id, new_count');
    if (!error) {
        newCounts.value = new Map(data.map((count) => [count.watch_list_id ?? '', count.new_count ?? 0]));
    }
    return !error;
}
