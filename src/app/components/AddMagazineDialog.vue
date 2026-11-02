<script setup lang="ts">
// Connects the user's own account on one magazine (Settings → Channels): they sign in once with their
// MODX username and password, and Wirescout keeps the session, never the password.
import { ref, watch } from 'vue';
import MagazineSignInFields from '@/components/MagazineSignInFields.vue';
import FormDialog from '@/components/ui/FormDialog.vue';
import { connectMagazine, type Magazine } from '@/lib/magazines';

const props = defineProps<{
    magazine: Magazine;
}>();

const open = defineModel<boolean>('open', { default: false });

const username = ref('');
const password = ref('');
const errors = ref<Record<string, string>>({});
const busy = ref(false);

watch(open, (isOpen) => {
    if (isOpen) {
        username.value = props.magazine.connectedAs ?? '';
        password.value = '';
        errors.value = {};
    }
});

async function connect() {
    const missing: Record<string, string> = {};
    if (!username.value.trim()) missing.username = 'Enter your username.';
    if (!password.value) missing.password = 'Enter your password.';
    errors.value = missing;
    if (Object.keys(missing).length) {
        return;
    }

    busy.value = true;
    const result = await connectMagazine(props.magazine.id, username.value.trim(), password.value);
    busy.value = false;
    password.value = '';

    if (!result.ok) {
        errors.value = { password: result.error };
        return;
    }
    open.value = false;
}
</script>

<template>
    <FormDialog
        v-model:open="open"
        :title="`Add ${magazine.name}`"
        :description="`Sign in with your own ${magazine.name} account, the one you use in its MODX manager.`"
        submit-label="Add magazine"
        :busy="busy"
        :errors="errors"
        @submit="connect"
    >
        <MagazineSignInFields v-model:username="username" v-model:password="password" :magazine="magazine.name" :errors="errors" />
    </FormDialog>
</template>
