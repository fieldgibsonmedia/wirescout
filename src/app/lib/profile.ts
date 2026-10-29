// The signed-in user's profile and settings, shared by the layout, the share menu and the settings pages.
// The layout loads it once per sign-in.
import { ref } from 'vue';
import type { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type Profile = Database['public']['Tables']['profiles']['Row'];

export const profile = ref<Profile | null>(null);

export async function loadProfile() {
    const { data } = await supabase.from('profiles').select('*').single();
    profile.value = data;

    // The digest goes out in the user's own time zone: take it from their browser on every visit,
    // so it follows them when they travel.
    const timeZone = browserTimeZone();
    if (data && data.time_zone !== timeZone) {
        await saveProfile({ time_zone: timeZone });
    }
}

// London when the browser doesn't say.
function browserTimeZone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London';
}

export async function saveProfile(changes: Database['public']['Tables']['profiles']['Update']) {
    if (!profile.value) {
        return false;
    }

    const { error } = await supabase.from('profiles').update(changes).eq('id', profile.value.id);
    if (error) {
        return false;
    }

    profile.value = { ...profile.value, ...changes };
    return true;
}
