// The signed-in user's watch lists, shared by the side nav, the dashboard and the list page.
import { ref } from 'vue';
import { supabase } from '@/lib/supabase';

export const watchLists = ref<{ id: string; name: string; keywords: string[] }[]>([]);

// Both the side nav and the dashboard open the "New watch list" dialog, which lives in the layout.
export const creatingWatchList = ref(false);

export async function loadWatchLists() {
    const { data, error } = await supabase.from('watch_lists').select('id, name, keywords').order('created_at');
    if (!error) {
        watchLists.value = data;
    }
    return !error;
}
