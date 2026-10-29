<script setup lang="ts">
// A watch list: its stories, newest first, 50 at a time, and its sources, added, fixed, moved and removed by URL.
// Opening it marks the stories shown as seen, so the dashboard's new count starts again from zero.
import { ArrowTopRightOnSquareIcon, ExclamationTriangleIcon, PlusIcon } from '@heroicons/vue/20/solid';
import { computed, onMounted, ref } from 'vue';
import AddManySources from '@/components/AddManySources.vue';
import ShareMenu from '@/components/ShareMenu.vue';
import SourceMenu from '@/components/SourceMenu.vue';
import WatchListMenu from '@/components/WatchListMenu.vue';
import Alert from '@/components/ui/Alert.vue';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import Card from '@/components/ui/Card.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import FormDialog from '@/components/ui/FormDialog.vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import SelectField from '@/components/ui/SelectField.vue';
import TextField from '@/components/ui/TextField.vue';
import {
    addSources,
    checkLinks,
    checkMessages,
    isWebAddress,
    listLabel,
    moveSources,
    removeSources,
    replaceSource,
    SOURCE_COLUMNS,
    toSource,
    type Source,
} from '@/lib/sources';
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

// Select mode: a tick box on each source, then Move to… or Remove for the ticked ones.
const selecting = ref(false);
const selected = ref<string[]>([]);
const confirmingRemove = ref(false);
const removeBusy = ref(false);
const removeError = ref('');

// The Move dialog: the sources being moved (one from its menu, or the ticked ones) and where to.
const moving = ref<string[]>([]);
const moveTarget = ref('');
const moveErrors = ref<Record<string, string>>({});
const moveBusy = ref(false);
const moved = ref('');

const otherLists = computed(() => watchLists.value.filter((list) => list.id !== props.id).map((list) => ({ value: list.id, label: list.name })));

// The Fix and Edit dialog: the source being changed, and whether it opened from Fix (it then says what's wrong).
const editing = ref<Source | null>(null);
const fixing = ref(false);
const editUrl = ref('');
const editErrors = ref<Record<string, string>>({});
const saving = ref(false);

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
    const problem = await checkLink(url);
    if (problem) {
        adding.value = false;
        urlError.value = problem;
        return;
    }
    const added = await addSources(props.id, [url]);
    adding.value = false;

    if (!added) {
        urlError.value = "The source couldn't be added. Please try again.";
        return;
    }

    newUrl.value = '';
    await showAdded(added);
}

function startEdit(source: Source, fix: boolean) {
    editing.value = source;
    fixing.value = fix;
    editUrl.value = source.url;
    editErrors.value = {};
}

async function saveEdit() {
    const source = editing.value!;
    const url = editUrl.value.trim();
    if (url === source.url) {
        editing.value = null;
        return;
    }
    if (!isWebAddress(url)) {
        editErrors.value = { url: 'Enter the full web address of a news page, starting with https://' };
        return;
    }
    if (sources.value.some((other) => other.url === url)) {
        editErrors.value = { url: 'This source is already in the list.' };
        return;
    }

    saving.value = true;
    const problem = await checkLink(url);
    if (problem) {
        saving.value = false;
        editErrors.value = { url: problem };
        return;
    }
    const saved = await replaceSource(props.id, source.id, url);
    saving.value = false;

    if (!saved) {
        editErrors.value = { url: "The source couldn't be saved. Please try again." };
        return;
    }

    editing.value = null;
    sources.value = sources.value.map((other) => (other.id === source.id ? saved : other));
    await loadArticles();
}

// Checks one link with the scanner's code: why it can't be used, or null if it works.
async function checkLink(url: string) {
    const checks = await checkLinks([url]);
    if (!checks) {
        return "The link couldn't be checked. Please try again.";
    }
    return checks[0].problem ? checkMessages(checks, ['This link'])[0] : null;
}

async function showAdded(added: Source[]) {
    sources.value.push(...added);
    await loadArticles();
}

async function removeSource(sourceId: string) {
    moved.value = '';
    removeFailed.value = false;
    removing.value = sourceId;
    const removed = await removeSources(props.id, [sourceId]);
    removing.value = '';

    if (!removed) {
        removeFailed.value = true;
        return;
    }

    dropSources([sourceId]);
}

// Takes moved or removed sources, and their stories, off the page.
function dropSources(sourceIds: string[]) {
    sources.value = sources.value.filter((source) => !sourceIds.includes(source.id));
    articles.value = articles.value.filter((article) => !sourceIds.includes(article.sourceId));
    selected.value = selected.value.filter((id) => !sourceIds.includes(id));
}

function stopSelecting() {
    selecting.value = false;
    selected.value = [];
}

function startRemoveSelected() {
    moved.value = '';
    removeError.value = '';
    confirmingRemove.value = true;
}

async function removeSelected() {
    removeBusy.value = true;
    const removed = await removeSources(props.id, selected.value);
    removeBusy.value = false;

    if (!removed) {
        removeError.value = "The sources couldn't be removed. Please try again.";
        return;
    }

    confirmingRemove.value = false;
    dropSources(selected.value);
    stopSelecting();
}

function startMove(sourceIds: string[]) {
    moved.value = '';
    moveTarget.value = '';
    moveErrors.value = {};
    moving.value = sourceIds;
}

async function move() {
    if (!moveTarget.value) {
        moveErrors.value = { list: 'Choose a watch list.' };
        return;
    }

    moveBusy.value = true;
    const done = await moveSources(props.id, moveTarget.value, moving.value);
    moveBusy.value = false;

    if (!done) {
        moveErrors.value = { list: "The sources couldn't be moved. Please try again." };
        return;
    }

    const count = moving.value.length;
    const listName = otherLists.value.find((list) => list.value === moveTarget.value)?.label;
    moved.value = `${count === 1 ? '1 source' : `${count} sources`} moved to ${listName}.`;
    dropSources(moving.value);
    moving.value = [];
    if (selected.value.length === 0) {
        stopSelecting();
    }
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
                        <p v-if="adding" role="status" class="text-sm">Validating source…</p>
                        <div>
                            <Button type="submit" variant="outline" :busy="adding">
                                <PlusIcon v-if="!adding" class="size-5" aria-hidden="true" />
                                Add source
                            </Button>
                        </div>
                    </form>

                    <AddManySources :watch-list-id="id" :sources="sources" @added="showAdded" />

                    <Alert v-if="removeFailed" type="error">The source couldn't be removed. Please try again.</Alert>
                    <Alert v-if="moved" type="success">{{ moved }}</Alert>

                    <div v-if="sources.length > 0" class="flex flex-wrap items-center justify-end gap-2 border-t border-base-300 pt-4">
                        <template v-if="selecting">
                            <p role="status" class="me-auto font-medium">{{ selected.length }} selected</p>
                            <Button v-if="selected.length > 0 && otherLists.length > 0" variant="outline" @click="startMove(selected)">Move to…</Button>
                            <Button v-if="selected.length > 0" variant="outline" @click="startRemoveSelected">Remove</Button>
                            <Button variant="ghost" @click="stopSelecting">Done</Button>
                        </template>
                        <Button v-else variant="ghost" @click="selecting = true">Select</Button>
                    </div>

                    <p v-if="sources.length === 0" class="text-base-content/70">No sources yet.</p>
                    <ul v-else class="flex flex-col divide-y divide-base-300 border-t border-base-300">
                        <li
                            v-for="source in sources"
                            :key="source.id"
                            :class="['flex items-center justify-between gap-3 py-2', { 'opacity-50': removing === source.id }]"
                            :aria-busy="removing === source.id"
                        >
                            <div class="flex min-w-0 items-center gap-3">
                                <input
                                    v-if="selecting"
                                    :id="`select-${source.id}`"
                                    v-model="selected"
                                    type="checkbox"
                                    :value="source.id"
                                    class="checkbox shrink-0"
                                />
                                <div class="min-w-0">
                                    <label v-if="selecting" :for="`select-${source.id}`" class="block cursor-pointer font-medium break-words">
                                        {{ listLabel(source, sources) }}
                                    </label>
                                    <p v-else class="font-medium break-words">{{ listLabel(source, sources) }}</p>
                                    <p :class="['flex gap-1 text-sm', source.problem ? 'text-error' : 'text-base-content/70']">
                                        <ExclamationTriangleIcon v-if="source.problem" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                        {{ source.status }}
                                    </p>
                                </div>
                            </div>
                            <div class="flex shrink-0 items-center gap-1">
                                <Button v-if="source.problem" variant="outline" @click="startEdit(source, true)">
                                    Fix<span class="sr-only"> {{ listLabel(source, sources) }}</span>
                                </Button>
                                <SourceMenu
                                    :label="listLabel(source, sources)"
                                    :can-move="otherLists.length > 0"
                                    @edit="startEdit(source, false)"
                                    @move="startMove([source.id])"
                                    @remove="removeSource(source.id)"
                                />
                            </div>
                        </li>
                    </ul>
                </Card>

                <FormDialog
                    :open="moving.length > 0"
                    :title="moving.length === 1 ? 'Move source' : `Move ${moving.length} sources`"
                    description="They keep their stories."
                    submit-label="Move"
                    :busy="moveBusy"
                    :errors="moveErrors"
                    @update:open="moving = []"
                    @submit="move"
                >
                    <SelectField
                        v-model="moveTarget"
                        name="move-to"
                        label="Watch list"
                        :options="otherLists"
                        placeholder="Choose a watch list"
                        :error="moveErrors.list"
                    />
                </FormDialog>

                <ConfirmDialog
                    v-model:open="confirmingRemove"
                    :title="selected.length === 1 ? 'Remove 1 source?' : `Remove ${selected.length} sources?`"
                    description="Their stories leave this list. Other watch lists that follow them keep them."
                    confirm-label="Remove"
                    :busy="removeBusy"
                    :error="removeError"
                    @confirm="removeSelected"
                />

                <FormDialog
                    :open="editing !== null"
                    :title="fixing ? 'Fix source' : 'Edit source'"
                    :description="fixing ? (editing?.problem ?? undefined) : undefined"
                    :busy="saving"
                    :errors="editErrors"
                    @update:open="editing = null"
                    @submit="saveEdit"
                >
                    <TextField
                        v-model="editUrl"
                        name="url"
                        label="News page address"
                        type="url"
                        inputmode="url"
                        autocomplete="url"
                        placeholder="https://"
                        :error="editErrors.url"
                    />
                    <p v-if="saving" role="status" class="text-sm">Validating source…</p>
                </FormDialog>
            </section>
        </div>
    </template>
</template>
