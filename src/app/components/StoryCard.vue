<script setup lang="ts">
// One story: "New" marker, source and date, "Sent to <magazine>" when someone already sent it there, for a documents
// list's PDF its label ("Impact report") and the section it's in on the page,
// the title (opens the story on its own site), summary, the Share menu and Save. Used in the watch list and on the story's own page. Bind the saved state with v-model:saved.
import { ArrowTopRightOnSquareIcon } from '@heroicons/vue/20/solid';
import { computed, watch } from 'vue';
import SaveButton from '@/components/SaveButton.vue';
import ShareMenu from '@/components/ShareMenu.vue';
import Badge from '@/components/ui/Badge.vue';
import Card from '@/components/ui/Card.vue';
import { loadStorySends, magazines, storySends } from '@/lib/magazines';

const props = defineProps<{
    watchListId: string;
    articleId: number;
    title: string;
    url: string;
    summary: string | null;
    source: string;
    date: string;
    isNew?: boolean;
    label?: string;
    section?: string | null;
}>();

const saved = defineModel<boolean>('saved', { required: true });

watch(() => props.articleId, loadStorySends, { immediate: true });

const sentTo = computed(() => magazines.value.filter((magazine) => storySends.value.get(props.articleId)?.has(magazine.id)));
</script>

<template>
    <Card>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-base-content/70">
            <Badge v-if="isNew" variant="success" size="sm">New</Badge>
            <Badge v-if="label" size="sm">{{ label }}</Badge>
            <span>{{ source }}</span>
            <span v-if="section">{{ section }}</span>
            <span>{{ date }}</span>
            <Badge v-for="magazine in sentTo" :key="magazine.id" variant="outline" size="sm">Sent to {{ magazine.name }}</Badge>
        </div>
        <h3 class="text-lg font-semibold break-words">
            <a :href="url" target="_blank" rel="noopener" class="link link-hover">
                {{ title }}
                <ArrowTopRightOnSquareIcon class="inline size-4" aria-hidden="true" />
                <span class="sr-only">(opens in a new tab)</span>
            </a>
        </h3>
        <p v-if="summary" class="max-w-prose">{{ summary }}</p>
        <div class="flex flex-wrap items-center gap-2">
            <ShareMenu :article-id="articleId" :title="title" :url="url" />
            <SaveButton v-model:saved="saved" :watch-list-id="watchListId" :article-id="articleId" :title="title" />
        </div>
    </Card>
</template>
