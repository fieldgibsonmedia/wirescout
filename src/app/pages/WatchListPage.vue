<script setup lang="ts">
// A watch list in two tabs: Stories (newest first, 50 at a time) and Sources (SourcesTab), which shows how
// many sources are failing. Opening it marks the stories shown as seen, so the dashboard's new count starts
// again from zero.
import { ArrowTopRightOnSquareIcon, ExclamationTriangleIcon } from '@heroicons/vue/20/solid';
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui';
import { computed, onMounted, ref } from 'vue';
import ShareMenu from '@/components/ShareMenu.vue';
import SourcesTab from '@/components/SourcesTab.vue';
import WatchListMenu from '@/components/WatchListMenu.vue';
import Alert from '@/components/ui/Alert.vue';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import Card from '@/components/ui/Card.vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import { SOURCE_COLUMNS, toSource, type Source } from '@/lib/sources';
import { supabase } from '@/lib/supabase';

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

const name = ref('');
// When the user last opened this list: stories first seen after it are new.
const lastViewedAt = ref('');
const sources = ref<Source[]>([]);
const articles = ref<Article[]>([]);
const hasMore = ref(false);
const loadingMore = ref(false);
const moreFailed = ref(false);
const loading = ref(true);
const failed = ref(false);
const notFound = ref(false);

const tab = ref('stories');
const failingSources = computed(() => sources.value.filter((source) => source.problem).length);

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

async function load() {
    loading.value = true;
    failed.value = false;

    const [list, listSources] = await Promise.all([
        supabase.from('watch_lists').select('name, last_viewed_at').eq('id', props.id).maybeSingle(),
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
    sources.value = listSources.data.map(({ sources: source }) => toSource(source));

    await loadArticles();
    loading.value = false;
}

async function loadArticles() {
    if (sources.value.length === 0) {
        articles.value = [];
        hasMore.value = false;
        return;
    }

    const { data, error } = await fetchArticles(0);
    if (error) {
        failed.value = true;
        return;
    }

    articles.value = data.slice(0, PAGE_SIZE).map(toArticle);
    hasMore.value = data.length > PAGE_SIZE;

    // Mark as seen up to the newest story shown (not "now"), so stories found while the page loads stay new.
    const newest = data[0]?.first_seen_at;
    if (newest && new Date(newest) > new Date(lastViewedAt.value)) {
        await supabase.from('watch_lists').update({ last_viewed_at: newest }).eq('id', props.id);
    }
}

async function loadMore() {
    moreFailed.value = false;
    loadingMore.value = true;
    const { data, error } = await fetchArticles(articles.value.length);
    loadingMore.value = false;

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
function fetchArticles(offset: number) {
    return supabase
        .from('articles')
        .select('id, url, title, summary, published_at, first_seen_at, source_id')
        .in(
            'source_id',
            sources.value.map((source) => source.id),
        )
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
                <WatchListMenu :id="id" :name="name" @renamed="name = $event" />
            </template>
        </PageHeader>

        <TabsRoot v-model="tab" class="flex flex-col gap-4">
            <TabsList aria-label="Watch list" class="tabs tabs-border">
                <TabsTrigger value="stories" class="tab data-[state=active]:tab-active">Stories</TabsTrigger>
                <TabsTrigger value="sources" class="tab gap-2 data-[state=active]:tab-active">
                    Sources
                    <span v-if="failingSources > 0" class="badge badge-sm badge-error gap-1">
                        <ExclamationTriangleIcon class="size-3" aria-hidden="true" />
                        {{ failingSources }}<span class="sr-only"> failing</span>
                    </span>
                </TabsTrigger>
            </TabsList>

            <TabsContent value="stories" class="flex flex-col gap-4">
                <Card v-if="articles.length === 0">
                    <p v-if="sources.length === 0" class="max-w-prose">
                        Add a source to start seeing its stories.
                        <button type="button" class="link" @click="tab = 'sources'">Go to Sources</button>
                    </p>
                    <p v-else class="max-w-prose">No stories yet. New ones appear here after the next scan.</p>
                </Card>

                <ul v-else class="flex flex-col gap-4">
                    <li v-for="article in articles" :key="article.id">
                        <Card>
                            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-base-content/70">
                                <Badge v-if="article.isNew" variant="success" size="sm">New</Badge>
                                <span>{{ article.source }}</span>
                                <span>{{ article.date }}</span>
                            </div>
                            <h3 class="text-lg font-semibold break-words">
                                <a :href="article.url" target="_blank" rel="noopener" class="link link-hover">
                                    {{ article.title }}
                                    <ArrowTopRightOnSquareIcon class="inline size-4" aria-hidden="true" />
                                    <span class="sr-only">(opens in a new tab)</span>
                                </a>
                            </h3>
                            <p v-if="article.summary" class="max-w-prose">{{ article.summary }}</p>
                            <ShareMenu :title="article.title" :url="article.url" />
                        </Card>
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
