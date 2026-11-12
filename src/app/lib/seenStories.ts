// New stays until seen (docs/mvp-plan.md, "Feedback from PostHog recordings", job 4): a story loses its New mark once
// at least half of its card has been on screen for a second, or it was opened. The marks shown don't change during
// the visit (nothing jumps while reading); the counts in the side nav and on the dashboard follow within seconds.
// Seen stories are saved a few at a time, and when the page closes or hides.
import { onBeforeUnmount } from 'vue';
import { supabase } from '@/lib/supabase';
import { loadNewCounts } from '@/lib/watchLists';

const SEEN_AFTER_MS = 1000;
const SAVE_EVERY_MS = 3000;

// Marks a story seen in a watch list right away: the story page, opened from the digest.
export async function markSeen(watchListId: string, articleIds: number[]) {
    const { error } = await supabase
        .from('seen_stories')
        .upsert(
            articleIds.map((articleId) => ({ watch_list_id: watchListId, article_id: articleId })),
            { onConflict: 'watch_list_id,article_id', ignoreDuplicates: true },
        );
    if (!error) {
        loadNewCounts();
    }
    return !error;
}

// For a page that lists stories: call observe(element, articleId) for each new story's card.
export function useSeenStories(watchListId: string) {
    const articleIds = new WeakMap<Element, number>();
    const timers = new Map<Element, ReturnType<typeof setTimeout>>();
    const toSave = new Set<number>();

    const observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    timers.set(
                        entry.target,
                        setTimeout(() => {
                            toSave.add(articleIds.get(entry.target)!);
                            observer.unobserve(entry.target);
                        }, SEEN_AFTER_MS),
                    );
                } else {
                    clearTimeout(timers.get(entry.target));
                }
            }
        },
        { threshold: 0.5 },
    );

    function observe(element: Element | null, articleId: number) {
        if (element && !articleIds.has(element)) {
            articleIds.set(element, articleId);
            observer.observe(element);
        }
    }

    async function save() {
        if (toSave.size === 0) {
            return;
        }
        const saving = [...toSave];
        toSave.clear();
        // A failed save tries again next time.
        if (!(await markSeen(watchListId, saving))) {
            saving.forEach((articleId) => toSave.add(articleId));
        }
    }

    const interval = setInterval(save, SAVE_EVERY_MS);
    const onHide = () => document.visibilityState === 'hidden' && save();
    document.addEventListener('visibilitychange', onHide);

    onBeforeUnmount(() => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', onHide);
        timers.forEach(clearTimeout);
        observer.disconnect();
        save();
    });

    return { observe };
}
