<script setup lang="ts">
// The "⋯" menu next to a watch list's title: Rename (a dialog with the name) and Delete (asks first,
// then goes back to the dashboard). Emits renamed with the new name.
import { EllipsisHorizontalIcon } from '@heroicons/vue/20/solid';
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuRoot, DropdownMenuTrigger } from 'reka-ui';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import FormDialog from '@/components/ui/FormDialog.vue';
import TextField from '@/components/ui/TextField.vue';
import { supabase } from '@/lib/supabase';
import { loadWatchLists } from '@/lib/watchLists';

const props = defineProps<{
    id: string;
    name: string;
}>();

const emit = defineEmits<{
    renamed: [name: string];
}>();

const router = useRouter();

const renaming = ref(false);
const newName = ref('');
const renameErrors = ref<Record<string, string>>({});
const renameBusy = ref(false);

const deleting = ref(false);
const deleteBusy = ref(false);
const deleteError = ref('');

function startRename() {
    newName.value = props.name;
    renameErrors.value = {};
    renaming.value = true;
}

async function rename() {
    const name = newName.value.trim();
    if (!name) {
        renameErrors.value = { name: 'Enter a name.' };
        return;
    }

    renameBusy.value = true;
    const { error } = await supabase.from('watch_lists').update({ name }).eq('id', props.id);
    renameBusy.value = false;

    if (error) {
        renameErrors.value = { name: "The watch list couldn't be renamed. Please try again." };
        return;
    }

    renaming.value = false;
    emit('renamed', name);
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
    router.push({ name: 'dashboard' });
}

const itemClass =
    'flex min-h-11 cursor-pointer items-center rounded-field px-3 outline-none data-[highlighted]:bg-base-200 active:bg-base-300';
</script>

<template>
    <DropdownMenuRoot>
        <DropdownMenuTrigger class="btn btn-circle btn-ghost" aria-label="Watch list options">
            <EllipsisHorizontalIcon class="size-6" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
            <DropdownMenuContent align="start" :side-offset="4" class="menu-pop z-30 w-48 rounded-box border border-base-300 bg-base-100 p-2 shadow-sm">
                <DropdownMenuItem :class="itemClass" @select="startRename">Rename</DropdownMenuItem>
                <DropdownMenuItem :class="[itemClass, 'text-error']" @select="startDelete">Delete</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenuPortal>
    </DropdownMenuRoot>

    <FormDialog v-model:open="renaming" title="Rename watch list" :busy="renameBusy" :errors="renameErrors" @submit="rename">
        <TextField v-model="newName" name="name" label="Name" :error="renameErrors.name" autocomplete="off" required />
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
