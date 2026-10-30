<script setup lang="ts">
// The watch list's keywords, above its stories: "All stories" or "Only stories that mention: …", with a
// dialog to change them (words or phrases, separated by commas). The database does the matching
// (watch_list_articles). Bind the keywords with v-model:keywords; emits changed after a save, so the page
// reloads its stories.
import { ref } from 'vue';
import FormDialog from '@/components/ui/FormDialog.vue';
import TextField from '@/components/ui/TextField.vue';
import { supabase } from '@/lib/supabase';

const props = defineProps<{
    watchListId: string;
}>();

const keywords = defineModel<string[]>('keywords', { required: true });

const emit = defineEmits<{
    changed: [];
}>();

// Same limits as the database.
const MAX_KEYWORDS = 20;
const MAX_KEYWORD_LENGTH = 100;

const editing = ref(false);
const text = ref('');
const errors = ref<Record<string, string>>({});
const busy = ref(false);

function startEdit() {
    text.value = keywords.value.join(', ');
    errors.value = {};
    editing.value = true;
}

// "Flood,  climate   risk, flood" → ["Flood", "climate risk"]: spaces tidied, empty and repeated ones dropped.
function parse(input: string) {
    const parsed: string[] = [];
    for (const part of input.split(',')) {
        const keyword = part.trim().replace(/\s+/g, ' ');
        if (keyword && !parsed.some((other) => other.toLowerCase() === keyword.toLowerCase())) {
            parsed.push(keyword);
        }
    }
    return parsed;
}

async function save() {
    const parsed = parse(text.value);
    if (parsed.length > MAX_KEYWORDS) {
        errors.value = { keywords: `Use up to ${MAX_KEYWORDS} keywords.` };
        return;
    }
    if (parsed.some((keyword) => keyword.length > MAX_KEYWORD_LENGTH)) {
        errors.value = { keywords: `Keep each keyword under ${MAX_KEYWORD_LENGTH} characters.` };
        return;
    }

    busy.value = true;
    const { error } = await supabase.from('watch_lists').update({ keywords: parsed }).eq('id', props.watchListId);
    busy.value = false;

    if (error) {
        errors.value = { keywords: "The keywords couldn't be saved. Please try again." };
        return;
    }

    editing.value = false;
    keywords.value = parsed;
    emit('changed');
}
</script>

<template>
    <p class="text-sm text-base-content/70">
        <template v-if="keywords.length === 0">
            All stories ·
            <button type="button" class="link" @click="startEdit">Only show stories that mention…</button>
        </template>
        <template v-else>
            Only stories that mention: <span class="font-semibold text-base-content">{{ keywords.join(', ') }}</span> ·
            <button type="button" class="link" @click="startEdit">Edit</button>
        </template>
    </p>

    <FormDialog
        v-model:open="editing"
        title="Only show stories that mention…"
        description="Stories whose title or summary mentions one of these words. Capitals don't matter. Leave it empty to show all stories."
        :busy="busy"
        :errors="errors"
        @submit="save"
    >
        <TextField
            v-model="text"
            name="keywords"
            label="Keywords"
            helper="Words or phrases, separated by commas, e.g. flood, climate risk"
            :error="errors.keywords"
            autocomplete="off"
        />
    </FormDialog>
</template>
