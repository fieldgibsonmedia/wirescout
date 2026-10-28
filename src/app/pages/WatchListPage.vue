<script setup lang="ts">
// A watch list: its stories, newest first, 50 at a time, and its sources, added and removed by URL.
// Opening it marks the stories shown as seen, so the dashboard's new count starts again from zero.
import { ArrowTopRightOnSquareIcon, PlusIcon } from '@heroicons/vue/20/solid';
import { onMounted, ref } from 'vue';
import ShareMenu from '@/components/ShareMenu.vue';
import SourceFileImport from '@/components/SourceFileImport.vue';
import WatchListMenu from '@/components/WatchListMenu.vue';
import Alert from '@/components/ui/Alert.vue';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import Card from '@/components/ui/Card.vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import TextField from '@/components/ui/TextField.vue';
import { addSources, isWebAddress, sourceLabel, type Source } from '@/lib/sources';
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

const newUrl = ref('');
const urlError = ref('');
const adding = ref(false);
const removing = ref('');
const removeFailed = ref(false);

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

async function load() {
    loading.value = true;
    failed.value = false;

    const [list, listSources] = await Promise.all([
        supabase.from('watch_lists').select('name, last_viewed_at').eq('id', props.id).maybeSingle(),
        supabase.from('watch_list_sources').select('sources (id, url, name)').eq('watch_list_id', props.id).order('created_at'),
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
    sources.value = listSources.data.map(({ sources: source }) => ({ id: source.id, url: source.url, label: sourceLabel(source) }));

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

async function addSource() {
    urlError.value = '';
    const url = newUrl.value.trim();
    if (!isWebAddress(url)) {
        urlError.value = 'Enter the full web address of a news page, starting with https://';
        return;
    }
    if (sources.value.some((source) => source.url === url)) {
        urlError.value = 'This source is already in the list.';
        return;
    }

    adding.value = true;
    const added = await addSources(props.id, [url]);
    adding.value = false;

    if (!added) {
        urlError.value = "The source couldn't be added. Please try again.";
        return;
    }

    newUrl.value = '';
    await showAdded(added);
}

async function showAdded(added: Source[]) {
    sources.value.push(...added);
    await loadArticles();
}

async function removeSource(sourceId: string) {
    removeFailed.value = false;
    removing.value = sourceId;
    const { error } = await supabase.from('watch_list_sources').delete().eq('watch_list_id', props.id).eq('source_id', sourceId);
    removing.value = '';

    if (error) {
        removeFailed.value = true;
        return;
    }

    sources.value = sources.value.filter((source) => source.id !== sourceId);
    articles.value = articles.value.filter((article) => article.sourceId !== sourceId);
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

        <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
            <section class="flex flex-col gap-4 lg:col-span-2" aria-labelledby="stories-heading">
                <h2 id="stories-heading" class="text-xl font-bold">Stories</h2>

                <Card v-if="articles.length === 0">
                    <p v-if="sources.length === 0" class="max-w-prose">Add a source to start seeing its stories.</p>
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
            </section>

            <section class="flex flex-col gap-4" aria-labelledby="sources-heading">
                <h2 id="sources-heading" class="text-xl font-bold">Sources</h2>

                <Card>
                    <form class="flex flex-col gap-2" novalidate @submit.prevent="addSource">
                        <TextField
                            v-model="newUrl"
                            name="url"
                            label="News page address"
                            type="url"
                            inputmode="url"
                            autocomplete="url"
                            placeholder="https://"
                            :error="urlError"
                        />
                        <div>
                            <Button type="submit" variant="outline" :busy="adding">
                                <PlusIcon v-if="!adding" class="size-5" aria-hidden="true" />
                                Add source
                            </Button>
                        </div>
                    </form>

                    <SourceFileImport :watch-list-id="id" :sources="sources" @added="showAdded" />

                    <Alert v-if="removeFailed" type="error">The source couldn't be removed. Please try again.</Alert>

                    <p v-if="sources.length === 0" class="text-base-content/70">No sources yet.</p>
                    <ul v-else class="flex flex-col divide-y divide-base-300 border-t border-base-300">
                        <li v-for="source in sources" :key="source.id" class="flex items-center justify-between gap-3 py-2">
                            <div class="min-w-0">
                                <p class="font-medium break-words">{{ source.label }}</p>
                                <p class="text-sm break-words text-base-content/70">{{ source.url }}</p>
                            </div>
                            <Button variant="ghost" :busy="removing === source.id" @click="removeSource(source.id)">
                                Remove<span class="sr-only"> {{ source.label }}</span>
                            </Button>
                        </li>
                    </ul>
                </Card>
            </section>
        </div>
    </template>
</template>
