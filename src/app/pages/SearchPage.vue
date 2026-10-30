<script setup lang="ts">
// Search across every watch list, from the top bar's search field (/search?q=…).
// Sources: those whose name or link contains the search, each opening its list's Sources tab. They come first:
// there are few of them, and they'd be lost under the stories.
// Stories: the newest 50 whose title or summary contains the search, the same matching as the list's search box,
// through each list's keywords (watch_list_articles). A story in two lists shows once per list.
import { ExclamationTriangleIcon } from '@heroicons/vue/20/solid';
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import Alert from '@/components/ui/Alert.vue';
import Card from '@/components/ui/Card.vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import { SOURCE_COLUMNS, toSource, type Source } from '@/lib/sources';
import { supabase } from '@/lib/supabase';
import { watchLists } from '@/lib/watchLists';

const props = defineProps<{
    query: string;
}>();

// Stories shown at most: a search that finds more asks for more words.
const STORY_LIMIT = 50;

type Story = {
    id: number;
    watchListId: string;
    title: string;
    summary: string | null;
    source: string;
    date: string;
};

const sources = ref<(Source & { watchListId: string })[]>([]);
const stories = ref<Story[]>([]);
const hasMore = ref(false);
const loading = ref(false);
const failed = ref(false);
// Counts searches, so an answer that arrives after a newer search started is dropped.
let request = 0;

const term = computed(() => props.query.trim());

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function listName(watchListId: string) {
    return watchLists.value.find((list) => list.id === watchListId)?.name ?? '';
}

async function load() {
    const current = ++request;
    if (!term.value) {
        sources.value = [];
        stories.value = [];
        return;
    }

    loading.value = true;
    failed.value = false;

    // Every source in the user's lists: few enough to match here, and the stories need their names.
    const [listSources, articles] = await Promise.all([
        supabase.from('watch_list_sources').select(`watch_list_id, sources (${SOURCE_COLUMNS})` as const).order('created_at'),
        supabase
            .from('watch_list_articles')
            .select('watch_list_id, id, source_id, title, summary, published_at, first_seen_at')
            // % and _ are wildcards in ilike: escape them so they're searched for as typed.
            .ilike('search_text', `%${term.value.replace(/[\\%_]/g, '\\$&')}%`)
            .order('first_seen_at', { ascending: false })
            .order('id', { ascending: false })
            .limit(STORY_LIMIT + 1),
    ]);

    if (current !== request) {
        return;
    }
    loading.value = false;
    if (listSources.error || articles.error) {
        failed.value = true;
        return;
    }

    const allSources = listSources.data.map(({ watch_list_id, sources: source }) => ({ ...toSource(source), watchListId: watch_list_id }));
    const lowerTerm = term.value.toLowerCase();
    sources.value = allSources.filter((source) => `${source.label}\n${source.url}`.toLowerCase().includes(lowerTerm));

    stories.value = articles.data.slice(0, STORY_LIMIT).map((article) => ({
        id: article.id,
        watchListId: article.watch_list_id,
        title: article.title,
        summary: article.summary,
        source: allSources.find((source) => source.id === article.source_id)?.label ?? '',
        date: dateFormat.format(new Date(article.published_at ?? article.first_seen_at)),
    }));
    hasMore.value = articles.data.length > STORY_LIMIT;
}

watch(term, load, { immediate: true });
</script>

<template>
    <PageHeader title="Search" :description="term ? `Results for “${term}”` : undefined" />

    <Card v-if="!term">
        <p class="max-w-prose">Type in the search box at the top to find stories and sources in all your watch lists.</p>
    </Card>

    <div v-else-if="loading" class="flex flex-col gap-4" aria-busy="true" aria-label="Searching">
        <div class="skeleton h-24"></div>
        <div class="skeleton h-64"></div>
    </div>

    <Alert v-else-if="failed" type="error">
        <p>The search couldn't be run.</p>
        <button type="button" class="link mt-2" @click="load">Try again</button>
    </Alert>

    <Card v-else-if="sources.length === 0 && stories.length === 0">
        <p class="max-w-prose break-words">Nothing in your watch lists matches “{{ term }}”.</p>
    </Card>

    <template v-else>
        <section v-if="sources.length > 0" class="flex flex-col gap-3" aria-labelledby="source-results">
            <h2 id="source-results" class="text-xl font-semibold">Sources ({{ sources.length }})</h2>
            <Card>
                <ul class="divide-y divide-base-300">
                    <li v-for="source in sources" :key="`${source.watchListId}-${source.id}`" class="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                        <RouterLink
                            :to="{ name: 'watch-list', params: { id: source.watchListId }, query: { tab: 'sources' } }"
                            class="link link-hover font-semibold break-words"
                        >
                            {{ source.label }}
                        </RouterLink>
                        <span class="text-sm break-all text-base-content/70">{{ source.url }}</span>
                        <span class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-base-content/70">
                            <span>{{ listName(source.watchListId) }}</span>
                            <span v-if="source.problem" class="inline-flex items-center gap-1 text-error">
                                <ExclamationTriangleIcon class="size-4" aria-hidden="true" />
                                {{ source.status }}
                            </span>
                        </span>
                    </li>
                </ul>
            </Card>
        </section>

        <section v-if="stories.length > 0" class="flex flex-col gap-3" aria-labelledby="story-results">
            <h2 id="story-results" class="text-xl font-semibold">Stories ({{ hasMore ? `${STORY_LIMIT}+` : stories.length }})</h2>
            <p v-if="hasMore" class="text-base-content/70">Showing the {{ STORY_LIMIT }} newest. Add a word to narrow the search.</p>
            <Card>
                <ul class="divide-y divide-base-300">
                    <li v-for="story in stories" :key="`${story.watchListId}-${story.id}`" class="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                        <span class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-base-content/70">
                            <span class="font-semibold">{{ listName(story.watchListId) }}</span>
                            <span>{{ story.source }}</span>
                            <span>{{ story.date }}</span>
                        </span>
                        <RouterLink
                            :to="{ name: 'story', params: { id: story.watchListId, storyId: story.id } }"
                            class="link link-hover text-lg font-semibold break-words"
                        >
                            {{ story.title }}
                        </RouterLink>
                        <p v-if="story.summary" class="line-clamp-2 max-w-prose">{{ story.summary }}</p>
                    </li>
                </ul>
            </Card>
        </section>
    </template>
</template>
