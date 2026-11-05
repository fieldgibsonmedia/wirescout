<script setup lang="ts">
// Creates a watch list, then opens it so the user can add sources. A list follows news stories, or the PDFs on
// issuers' pages for bond alerts (docs/mvp-plan.md, "Document lists for bond alerts"); it can't change later.
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import FormDialog from '@/components/ui/FormDialog.vue';
import TextField from '@/components/ui/TextField.vue';
import { supabase } from '@/lib/supabase';
import { loadWatchLists, type ListKind } from '@/lib/watchLists';

const open = defineModel<boolean>('open', { default: false });

const router = useRouter();

const name = ref('');
const kind = ref<ListKind>('news');
const kinds = [
    { value: 'news', label: 'News stories', description: 'New stories on news pages and in their feeds.' },
    {
        value: 'documents',
        label: 'Bond documents',
        description: "New PDFs on issuers' pages: allocation and impact reports, frameworks, second-party opinions and new bond issues.",
    },
] as const;
const errors = ref<Record<string, string>>({});
const busy = ref(false);

watch(open, (isOpen) => {
    if (isOpen) {
        name.value = '';
        kind.value = 'news';
        errors.value = {};
    }
});

async function create() {
    if (!name.value.trim()) {
        errors.value = { name: 'Enter a name.' };
        return;
    }

    busy.value = true;
    const { data, error } = await supabase.from('watch_lists').insert({ name: name.value.trim(), kind: kind.value }).select('id').single();
    busy.value = false;

    if (error) {
        errors.value = { name: "The watch list couldn't be created. Please try again." };
        return;
    }

    open.value = false;
    await loadWatchLists();
    router.push({ name: 'watch-list', params: { id: data.id } });
}
</script>

<template>
    <FormDialog v-model:open="open" title="New watch list" submit-label="Create" :busy="busy" :errors="errors" @submit="create">
        <TextField v-model="name" name="name" label="Name" :error="errors.name" autocomplete="off" required />
        <fieldset>
            <legend class="font-medium">Follows</legend>
            <label v-for="option in kinds" :key="option.value" class="flex min-h-11 cursor-pointer items-center gap-4 py-2">
                <input v-model="kind" type="radio" name="kind" :value="option.value" class="radio radio-primary" />
                <span class="flex flex-col">
                    <span class="font-medium">{{ option.label }}</span>
                    <span class="text-sm text-base-content/70">{{ option.description }}</span>
                </span>
            </label>
        </fieldset>
    </FormDialog>
</template>
