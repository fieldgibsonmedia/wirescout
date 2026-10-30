<script setup lang="ts">
// A watch list's "⋯" menu, next to the list page's title and on each list in the side nav: Edit (a dialog with
// the name and the keywords) and Delete (asks first; from the open list's page, then goes back to the dashboard).
// Both reload the watchLists store, which the nav, the dashboard and the list page read.
import { EllipsisHorizontalIcon } from '@heroicons/vue/20/solid';
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuRoot, DropdownMenuTrigger } from 'reka-ui';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import FormDialog from '@/components/ui/FormDialog.vue';
import TextField from '@/components/ui/TextField.vue';
import { supabase } from '@/lib/supabase';
import { loadWatchLists } from '@/lib/watchLists';

const props = withDefaults(
    defineProps<{
        id: string;
        name: string;
        keywords: string[];
        triggerClass?: string;
    }>(),
    {
        triggerClass: '',
    },
);

const route = useRoute();
const router = useRouter();

// Same limits as the database.
const MAX_KEYWORDS = 20;
const MAX_KEYWORD_LENGTH = 100;

const editing = ref(false);
const newName = ref('');
const keywordsText = ref('');
const editErrors = ref<Record<string, string>>({});
const editBusy = ref(false);

const deleting = ref(false);
const deleteBusy = ref(false);
const deleteError = ref('');

function startEdit() {
    newName.value = props.name;
    keywordsText.value = props.keywords.join(', ');
    editErrors.value = {};
    editing.value = true;
}

// "Flood,  climate   risk, flood" → ["Flood", "climate risk"]: spaces tidied, empty and repeated ones dropped.
function parseKeywords(input: string) {
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
    const name = newName.value.trim();
    const keywords = parseKeywords(keywordsText.value);
    const errors: Record<string, string> = {};
    if (!name) {
        errors.name = 'Enter a name.';
    }
    if (keywords.length > MAX_KEYWORDS) {
        errors.keywords = `Use up to ${MAX_KEYWORDS} keywords.`;
    } else if (keywords.some((keyword) => keyword.length > MAX_KEYWORD_LENGTH)) {
        errors.keywords = `Keep each keyword under ${MAX_KEYWORD_LENGTH} characters.`;
    }
    editErrors.value = errors;
    if (Object.keys(errors).length > 0) {
        return;
    }

    editBusy.value = true;
    const { error } = await supabase.from('watch_lists').update({ name, keywords }).eq('id', props.id);
    editBusy.value = false;

    if (error) {
        editErrors.value = { name: "The watch list couldn't be saved. Please try again." };
        return;
    }

    editing.value = false;
    await loadWatchLists();
}

function startDelete() {
    deleteError.value = '';
    deleting.value = true;
}

async function remove() {
    deleteBusy.value = true;
    const { error } = await supabase.from('watch_lists').delete().eq('id', props.id);
    deleteBusy.value = false;

    if (error) {
        deleteError.value = "The watch list couldn't be deleted. Please try again.";
        return;
    }

    deleting.value = false;
    await loadWatchLists();
    // Deleting another list from the side nav leaves the open page alone.
    if (route.params.id === props.id) {
        router.push({ name: 'dashboard' });
    }
}

const itemClass =
    'flex min-h-11 cursor-pointer items-center rounded-field px-3 outline-none data-[highlighted]:bg-base-200 active:bg-base-300';
</script>

<template>
    <DropdownMenuRoot>
        <DropdownMenuTrigger :class="['btn btn-circle btn-ghost', triggerClass]" :aria-label="`Options for ${name}`">
            <EllipsisHorizontalIcon class="size-6" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
            <DropdownMenuContent align="start" :side-offset="4" class="menu-pop z-30 w-48 rounded-box border border-base-300 bg-base-100 p-2 shadow-sm">
                <DropdownMenuItem :class="itemClass" @select="startEdit">Edit</DropdownMenuItem>
                <DropdownMenuItem :class="[itemClass, 'text-error']" @select="startDelete">Delete</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenuPortal>
    </DropdownMenuRoot>

    <FormDialog v-model:open="editing" title="Edit watch list" :busy="editBusy" :errors="editErrors" @submit="save">
        <TextField v-model="newName" name="name" label="Name" :error="editErrors.name" autocomplete="off" required />
        <TextField
            v-model="keywordsText"
            name="keywords"
            label="Only include stories that mention…"
            helper="Words or phrases, separated by commas, e.g. flood, climate risk. Capitals don't matter. Leave it empty to include all stories."
            :error="editErrors.keywords"
            autocomplete="off"
        />
    </FormDialog>

    <ConfirmDialog
        v-model:open="deleting"
        :title="`Delete “${name}”?`"
        description="The list and its sources are removed from your account. This can't be undone."
        confirm-label="Delete"
        :busy="deleteBusy"
        :error="deleteError"
        @confirm="remove"
    />
</template>
