<script setup lang="ts">
// Save / Saved on a story card: keeps the story in its watch list's Saved view; clicking Saved removes it.
// Bind the state with v-model:saved.
import { BookmarkIcon as SavedIcon } from '@heroicons/vue/20/solid';
import { BookmarkIcon } from '@heroicons/vue/24/outline';
import { ref } from 'vue';
import { supabase } from '@/lib/supabase';

const props = defineProps<{
    watchListId: string;
    articleId: number;
    title: string;
}>();

const saved = defineModel<boolean>('saved', { required: true });

const busy = ref(false);
const failed = ref(false);

async function toggle() {
    busy.value = true;
    failed.value = false;
    const { error } = saved.value
        ? await supabase.from('saved_stories').delete().eq('watch_list_id', props.watchListId).eq('article_id', props.articleId)
        : await supabase.from('saved_stories').insert({ watch_list_id: props.watchListId, article_id: props.articleId });
    busy.value = false;

    if (error) {
        failed.value = true;
        return;
    }
    saved.value = !saved.value;
}
</script>

<template>
    <div class="flex items-center gap-2">
        <!-- Screen readers hear "Save story: …" with pressed on or off; the visible word follows the state. -->
        <button type="button" class="btn btn-ghost" :disabled="busy" :aria-pressed="saved" @click="toggle">
            <SavedIcon v-if="saved" class="size-5 text-primary" aria-hidden="true" />
            <BookmarkIcon v-else class="size-5" aria-hidden="true" />
            <span aria-hidden="true">{{ saved ? 'Saved' : 'Save' }}</span>
            <span class="sr-only">Save story: {{ title }}</span>
        </button>
        <span role="status" class="text-sm text-error">
            <template v-if="failed">{{ saved ? "Couldn't remove it from Saved." : "Couldn't save it." }} Please try again.</template>
        </span>
    </div>
</template>
