<script setup lang="ts">
// Creates a watch list, then opens it so the user can add sources.
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import FormDialog from '@/components/ui/FormDialog.vue';
import TextField from '@/components/ui/TextField.vue';
import { supabase } from '@/lib/supabase';
import { loadWatchLists } from '@/lib/watchLists';

const open = defineModel<boolean>('open', { default: false });

const router = useRouter();

const name = ref('');
const errors = ref<Record<string, string>>({});
const busy = ref(false);

watch(open, (isOpen) => {
    if (isOpen) {
        name.value = '';
        errors.value = {};
    }
});

async function create() {
    if (!name.value.trim()) {
        errors.value = { name: 'Enter a name.' };
        return;
    }

    busy.value = true;
    const { data, error } = await supabase.from('watch_lists').insert({ name: name.value.trim() }).select('id').single();
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
    </FormDialog>
</template>
