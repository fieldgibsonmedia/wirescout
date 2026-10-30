// Usage, for the monthly report to the Wirescout team: the days each person opens the app, the stories they
// share and the digest links they open. Recording never gets in the way: a failure is ignored.
import { supabase } from '@/lib/supabase';

export type UsageAction = 'share_linkedin' | 'share_email' | 'share_copy_link' | 'digest_click';

// The user and day already recorded, so only the first page of the day calls the database.
let recorded = '';

export async function recordActiveDay(userId: string) {
    const key = `${userId} ${new Date().toDateString()}`;
    if (recorded === key) {
        return;
    }
    recorded = key;
    await supabase.rpc('record_active_day');
}

export async function recordUsage(action: UsageAction, articleId?: number) {
    await supabase.from('usage_events').insert({ action, article_id: articleId ?? null });
}
