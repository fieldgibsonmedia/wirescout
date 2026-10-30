<script setup lang="ts">
// One card per watch list: its new stories, a chart of the last 7 days, its sources (failing ones link to the
// Sources tab), its saved stories and when its latest story was found. The card opens its list.
// Then "What's new" (ReleaseNotes): people come for their lists, so it comes after them.
import { ExclamationTriangleIcon, PlusIcon } from '@heroicons/vue/20/solid';
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import ReleaseNotes from '@/components/ReleaseNotes.vue';
import StoriesChart from '@/components/StoriesChart.vue';
import Alert from '@/components/ui/Alert.vue';
import Button from '@/components/ui/Button.vue';
import Card from '@/components/ui/Card.vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import { supabase } from '@/lib/supabase';
import { creatingWatchList, loadWatchLists, watchLists } from '@/lib/watchLists';

type Stats = {
    sourceCount: number;
    failingCount: number;
    savedCount: number;
    latestStoryAt: string | null;
    dailyCounts: number[];
};

const router = useRouter();

const newCounts = ref(new Map<string, number>());
const stats = ref(new Map<string, Stats>());
const loading = ref(true);
const failed = ref(false);

const boxes = computed(() =>
    watchLists.value.map((list) => ({ ...list, newCount: newCounts.value.get(list.id) ?? 0, stats: stats.value.get(list.id) })),
);

async function load() {
    loading.value = true;
    failed.value = false;

    const [listsLoaded, numbersLoaded] = await Promise.all([loadWatchLists(), loadNumbers()]);

    loading.value = false;
    failed.value = !listsLoaded || !numbersLoaded;
}

async function loadNumbers() {
    const [counts, listStats] = await Promise.all([
        supabase.from('watch_list_new_counts').select('watch_list_id, new_count'),
        supabase.from('watch_list_stats').select('watch_list_id, source_count, failing_count, saved_count, latest_story_at, daily_counts'),
    ]);
    if (counts.error || listStats.error) {
        return false;
    }

    newCounts.value = new Map(counts.data.map((count) => [count.watch_list_id ?? '', count.new_count ?? 0]));
    stats.value = new Map(
        listStats.data.map((row) => [
            row.watch_list_id ?? '',
            {
                sourceCount: row.source_count ?? 0,
                failingCount: row.failing_count ?? 0,
                savedCount: row.saved_count ?? 0,
                latestStoryAt: row.latest_story_at,
                dailyCounts: row.daily_counts ?? [],
            },
        ]),
    );
    return true;
}

// Keywords decide which stories count, so an edit from a list's menu reloads the numbers.
watch(
    () => watchLists.value.map((list) => list.keywords.join(',')).join('|'),
    () => {
        if (!loading.value) {
            loadNumbers();
        }
    },
);

function plural(count: number, word: string) {
    return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function sourcesText(count: number) {
    return count === 0 ? 'No sources yet' : plural(count, 'source');
}

// "3 saved · Latest story 2 h ago"; no saved part without saved stories.
function storiesText(listStats: Stats) {
    const parts = listStats.savedCount > 0 ? [`${listStats.savedCount} saved`] : [];
    parts.push(listStats.latestStoryAt ? `Latest story ${timeAgo(listStats.latestStoryAt)}` : 'No stories yet');
    return parts.join(' · ');
}

// "just now", "5 min ago", "2 h ago", "yesterday", "3 days ago".
function timeAgo(date: string) {
    const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60_000);
    if (minutes < 1) {
        return 'just now';
    }
    if (minutes < 60) {
        return `${minutes} min ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours} h ago`;
    }
    const days = Math.floor(hours / 24);
    return days === 1 ? 'yesterday' : `${days} days ago`;
}

onMounted(load);
</script>

<template>
    <PageHeader title="Dashboard">
        <template v-if="watchLists.length > 0" #actions>
            <Button @click="creatingWatchList = true">
                <PlusIcon class="size-5" aria-hidden="true" />
                New watch list
            </Button>
        </template>
    </PageHeader>

    <div v-if="loading" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading watch lists">
        <div v-for="index in 3" :key="index" class="skeleton h-52"></div>
    </div>

    <Alert v-else-if="failed" type="error">
        <p>Your watch lists couldn't be loaded.</p>
        <button type="button" class="link mt-2" @click="load">Try again</button>
    </Alert>

    <Card v-else-if="watchLists.length === 0">
        <h2 class="text-xl font-bold">No watch lists yet</h2>
        <p class="max-w-prose">A watch list follows the news sources you pick and shows their new stories here.</p>
        <div>
            <Button @click="creatingWatchList = true">
                <PlusIcon class="size-5" aria-hidden="true" />
                New watch list
            </Button>
        </div>
    </Card>

    <ul v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <!-- The list name's link covers the whole card (after:inset-0); the failing link and the chart sit above it (z-10). -->
        <li
            v-for="list in boxes"
            :key="list.id"
            class="card relative border border-base-300 bg-base-100 transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md has-[.card-link:focus-visible]:outline-2 has-[.card-link:focus-visible]:outline-offset-2 has-[.card-link:focus-visible]:outline-primary active:translate-y-0 active:bg-base-200 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
            <div class="card-body gap-4 p-4 md:p-6">
                <h2 class="card-title text-lg break-words">
                    <RouterLink
                        :to="{ name: 'watch-list', params: { id: list.id } }"
                        class="card-link outline-none after:absolute after:inset-0 after:rounded-box"
                    >
                        {{ list.name }}
                    </RouterLink>
                </h2>

                <div class="flex items-end justify-between gap-4">
                    <p v-if="list.newCount > 0" class="flex flex-col">
                        <span class="text-4xl font-bold">{{ list.newCount }}</span>
                        <span class="text-base-content/70">new {{ list.newCount === 1 ? 'story' : 'stories' }}</span>
                    </p>
                    <p v-else class="text-lg text-base-content/70">No new stories</p>

                    <!-- Above the card's link so hovering a day shows its count; a click still opens the list. -->
                    <StoriesChart
                        v-if="list.stats"
                        :counts="list.stats.dailyCounts"
                        class="relative z-10 cursor-pointer"
                        @click="router.push({ name: 'watch-list', params: { id: list.id } })"
                    />
                </div>

                <div v-if="list.stats" class="flex flex-col gap-1 text-sm text-base-content/70">
                    <p>
                        {{ sourcesText(list.stats.sourceCount) }}
                        <template v-if="list.stats.failingCount > 0">
                            ·
                            <RouterLink
                                :to="{ name: 'watch-list', params: { id: list.id }, query: { tab: 'sources' } }"
                                class="link relative z-10 inline-flex items-center gap-1 text-error"
                            >
                                <ExclamationTriangleIcon class="size-4" aria-hidden="true" />
                                {{ list.stats.failingCount }} failing
                            </RouterLink>
                        </template>
                    </p>
                    <p>{{ storiesText(list.stats) }}</p>
                </div>
            </div>
        </li>
    </ul>

    <ReleaseNotes v-if="!loading" />
</template>
