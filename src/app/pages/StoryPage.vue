<script setup lang="ts">
// One story on its own page, opened from the daily digest: a link back to its watch list, then the story
// with the Share menu. The digest links here instead of to the source site, so sharing happens in the app.
// It shows only a story from one of the list's sources: anything else is "not in your watch lists".
import { ArrowLeftIcon } from '@heroicons/vue/20/solid';
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import StoryCard from '@/components/StoryCard.vue';
import Alert from '@/components/ui/Alert.vue';
import { sourceLabel } from '@/lib/sources';
import { supabase } from '@/lib/supabase';

const props = defineProps<{
    id: string;
    storyId: string;
}>();

type Story = {
    title: string;
    url: string;
    summary: string | null;
    source: string;
    date: string;
};

const listName = ref('');
const story = ref<Story | null>(null);
const loading = ref(true);
const failed = ref(false);
const notFound = ref(false);

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

async function load() {
    loading.value = true;
    failed.value = false;
    notFound.value = false;

    // Row-level security already limits stories to the user's sources; the list's sources narrow it to this list.
    const [list, listSources, article] = await Promise.all([
        supabase.from('watch_lists').select('name').eq('id', props.id).maybeSingle(),
        supabase.from('watch_list_sources').select('source_id').eq('watch_list_id', props.id),
        supabase
            .from('articles')
            .select('url, title, summary, published_at, first_seen_at, source_id, sources (url, name)')
            .eq('id', Number(props.storyId))
            .maybeSingle(),
    ]);
    loading.value = false;

    if (list.error || listSources.error || article.error) {
        failed.value = true;
        return;
    }
    const inList = listSources.data.some((source) => source.source_id === article.data?.source_id);
    if (!list.data || !article.data || !inList) {
        notFound.value = true;
        return;
    }

    listName.value = list.data.name;
    story.value = {
        title: article.data.title,
        url: article.data.url,
        summary: article.data.summary,
        source: sourceLabel(article.data.sources),
        date: dateFormat.format(new Date(article.data.published_at ?? article.data.first_seen_at)),
    };
}

onMounted(load);
</script>

<template>
    <div v-if="loading" class="flex flex-col gap-4" aria-busy="true" aria-label="Loading story">
        <div class="skeleton h-6 w-40"></div>
        <div class="skeleton h-40"></div>
    </div>

    <Alert v-else-if="notFound" type="error">
        <p>This story isn't in your watch lists.</p>
        <RouterLink :to="{ name: 'dashboard' }" class="link mt-2 inline-block">Go to the dashboard</RouterLink>
    </Alert>

    <Alert v-else-if="failed" type="error">
        <p>This story couldn't be loaded.</p>
        <button type="button" class="link mt-2" @click="load">Try again</button>
    </Alert>

    <div v-else-if="story" class="flex flex-col gap-4">
        <RouterLink :to="{ name: 'watch-list', params: { id } }" class="link link-hover inline-flex items-center gap-1 self-start">
            <ArrowLeftIcon class="size-4" aria-hidden="true" />
            {{ listName }}
        </RouterLink>
        <StoryCard :article-id="Number(storyId)" v-bind="story" />
    </div>
</template>
