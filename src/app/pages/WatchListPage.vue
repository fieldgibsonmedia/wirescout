<script setup lang="ts">
// A watch list in two tabs: Stories (newest first, 50 at a time) and Sources (SourcesTab), which shows how
// many sources are failing. Opening it marks the stories shown as seen, so the dashboard's new count starts
// again from zero. Stories come from watch_list_articles, which keeps only those matching the list's keywords;
// the search box narrows them further. ?tab=sources opens the Sources tab (the digest's failing-sources link).
// The name and keywords follow the watchLists store, so an edit from the side nav shows here too.
import { ExclamationTriangleIcon } from '@heroicons/vue/20/solid';
import { TabsContent, TabsIndicator, TabsList, TabsRoot, TabsTrigger } from 'reka-ui';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import SourcesTab from '@/components/SourcesTab.vue';
import StoryCard from '@/components/StoryCard.vue';
import WatchListMenu from '@/components/WatchListMenu.vue';
import Alert from '@/components/ui/Alert.vue';
import Button from '@/components/ui/Button.vue';
import Card from '@/components/ui/Card.vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import SearchField from '@/components/ui/SearchField.vue';
import { SOURCE_COLUMNS, toSource, type Source } from '@/lib/sources';
import { supabase } from '@/lib/supabase';
import { watchLists } from '@/lib/watchLists';

const props = defineProps<{
    id: string;
}>();

type Article = {
    id: number;
    url: string;
    title: string;
    summary: string | null;
    date: string;
    sourceId: string;
    source: string;
    isNew: boolean;
};

// Stories shown per page: "Load more" adds the next ones.
const PAGE_SIZE = 50;
// Wait this long after the last key press before searching.
const SEARCH_DELAY_MS = 300;

const name = ref('');
// When the user last opened this list: stories first seen after it are new.
const lastViewedAt = ref('');
const keywords = ref<string[]>([]);
const sources = ref<Source[]>([]);
const articles = ref<Article[]>([]);
const hasMore = ref(false);
const loadingMore = ref(false);
const moreFailed = ref(false);
const loading = ref(true);
const failed = ref(false);
const notFound = ref(false);

const search = ref('');
// The search behind the stories shown, for the "No stories match" line.
const shownSearch = ref('');
// Counts story loads, so an answer that arrives after a newer search started is dropped.
let request = 0;

const tab = ref(useRoute().query.tab === 'sources' ? 'sources' : 'stories');
const failingSources = computed(() => sources.value.filter((source) => source.problem).length);

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

async function load() {
    loading.value = true;
    failed.value = false;

    const [list, listSources] = await Promise.all([
        supabase.from('watch_lists').select('name, last_viewed_at, keywords').eq('id', props.id).maybeSingle(),
        supabase.from('watch_list_sources').select(`sources (${SOURCE_COLUMNS})` as const).eq('watch_list_id', props.id).order('created_at'),
    ]);

    if (list.error || listSources.error) {
        loading.value = false;
        failed.value = true;
        return;
    }
    if (!list.data) {
        loading.value = false;
        notFound.value = true;
        return;
    }

    name.value = list.data.name;
    lastViewedAt.value = list.data.last_viewed_at;
    keywords.value = list.data.keywords;
    sources.value = listSources.data.map(({ sources: source }) => toSource(source));

    await loadArticles();
    loading.value = false;
}

async function loadArticles() {
    const current = ++request;
    const term = search.value.trim();
    if (sources.value.length === 0) {
        articles.value = [];
        hasMore.value = false;
        return;
    }

    const { data, error } = await fetchArticles(0, term);
    if (current !== request) {
        return;
    }
    if (error) {
        failed.value = true;
        return;
    }

    articles.value = data.slice(0, PAGE_SIZE).map(toArticle);
    hasMore.value = data.length > PAGE_SIZE;
    shownSearch.value = term;

    // Mark as seen up to the newest story shown (not "now"), so stories found while the page loads stay new.
    // Not while searching: newer stories the search hides would lose their "New".
    const newest = data[0]?.first_seen_at;
    if (!term && newest && new Date(newest) > new Date(lastViewedAt.value)) {
        await supabase.from('watch_lists').update({ last_viewed_at: newest }).eq('id', props.id);
    }
}

async function loadMore() {
    moreFailed.value = false;
    loadingMore.value = true;
    const current = request;
    const { data, error } = await fetchArticles(articles.value.length, shownSearch.value);
    loadingMore.value = false;

    if (current !== request) {
        return;
    }

    if (error) {
        moreFailed.value = true;
        return;
    }

    // Stories found since the page opened push older ones down, so the next page can repeat a few: skip them.
    const shown = new Set(articles.value.map((article) => article.id));
    articles.value.push(...data.slice(0, PAGE_SIZE).filter((article) => !shown.has(article.id)).map(toArticle));
    hasMore.value = data.length > PAGE_SIZE;
}

// One page of stories from offset on, plus one more to tell whether there's another page.
// The search matches any part of the title or summary, ignoring capitals.
function fetchArticles(offset: number, term: string) {
    let query = supabase
        .from('watch_list_articles')
        .select('id, url, title, summary, published_at, first_seen_at, source_id')
        .eq('watch_list_id', props.id);
    if (term) {
        // % and _ are wildcards in ilike: escape them so they're searched for as typed.
        query = query.ilike('search_text', `%${term.replace(/[\\%_]/g, '\\$&')}%`);
    }
    return query
        .order('first_seen_at', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + PAGE_SIZE);
}

function toArticle(article: {
    id: number;
    url: string;
    title: string;
    summary: string | null;
    published_at: string | null;
    first_seen_at: string;
    source_id: string;
}): Article {
    return {
        id: article.id,
        url: article.url,
        title: article.title,
        summary: article.summary,
        date: dateFormat.format(new Date(article.published_at ?? article.first_seen_at)),
        sourceId: article.source_id,
        source: sources.value.find((source) => source.id === article.source_id)?.label ?? '',
        isNew: new Date(article.first_seen_at) > new Date(lastViewedAt.value),
    };
}

// After an edit (here or in the side nav), show the new name, and reload the stories if the keywords changed.
watch(
    () => watchLists.value.find((list) => list.id === props.id),
    (list) => {
        if (!list || loading.value || notFound.value || failed.value) {
            return;
        }
        name.value = list.name;
        if (list.keywords.join(',') !== keywords.value.join(',')) {
            keywords.value = list.keywords;
            loadArticles();
        }
    },
);

let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadArticles, SEARCH_DELAY_MS);
});

onMounted(load);
</script>

<template>
    <div v-if="loading" class="flex flex-col gap-4" aria-busy="true" aria-label="Loading watch list">
        <div class="skeleton h-10 w-64"></div>
        <div class="skeleton h-64"></div>
    </div>

    <Alert v-else-if="notFound" type="error">This watch list doesn't exist, or it belongs to someone else.</Alert>

    <Alert v-else-if="failed" type="error">
        <p>This watch list couldn't be loaded.</p>
        <button type="button" class="link mt-2" @click="load">Try again</button>
    </Alert>

    <template v-else>
        <PageHeader :title="name">
            <template #title-end>
                <WatchListMenu :id="id" :name="name" :keywords="keywords" />
            </template>
        </PageHeader>

        <TabsRoot v-model="tab" class="flex flex-col gap-4">
            <TabsList aria-label="Watch list" class="tabs tabs-border relative">
                <TabsTrigger value="stories" class="tab data-[state=active]:tab-active">Stories</TabsTrigger>
                <TabsTrigger value="sources" class="tab gap-2 data-[state=active]:tab-active">
                    Sources
                    <span v-if="failingSources > 0" class="badge badge-sm badge-error gap-1">
                        <ExclamationTriangleIcon class="size-3" aria-hidden="true" />
                        {{ failingSources }}<span class="sr-only"> failing</span>
                    </span>
                </TabsTrigger>
                <TabsIndicator class="tab-indicator" />
            </TabsList>

            <TabsContent value="stories" class="flex flex-col gap-4">
                <SearchField v-if="sources.length > 0" v-model="search" label="Search stories" />

                <Card v-if="articles.length === 0">
                    <p v-if="sources.length === 0" class="max-w-prose">
                        Add a source to start seeing its stories.
                        <button type="button" class="link" @click="tab = 'sources'">Go to Sources</button>
                    </p>
                    <p v-else-if="shownSearch" class="max-w-prose break-words">No stories match "{{ shownSearch }}".</p>
                    <p v-else-if="keywords.length > 0" class="max-w-prose">
                        No stories mention these keywords yet. New ones appear here after the next scan.
                    </p>
                    <p v-else class="max-w-prose">No stories yet. New ones appear here after the next scan.</p>
                </Card>

                <ul v-else class="flex flex-col gap-4">
                    <li v-for="article in articles" :key="article.id">
                        <StoryCard
                            :article-id="article.id"
                            :title="article.title"
                            :url="article.url"
                            :summary="article.summary"
                            :source="article.source"
                            :date="article.date"
                            :is-new="article.isNew"
                        />
                    </li>
                </ul>

                <div v-if="hasMore || moreFailed" class="flex flex-col items-start gap-2">
                    <Alert v-if="moreFailed" type="error">More stories couldn't be loaded. Please try again.</Alert>
                    <Button variant="outline" :busy="loadingMore" @click="loadMore">Load more</Button>
                </div>
            </TabsContent>

            <TabsContent value="sources">
                <SourcesTab v-model:sources="sources" :watch-list-id="id" @changed="loadArticles" />
            </TabsContent>
        </TabsRoot>
    </template>
</template>
