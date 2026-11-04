<script setup lang="ts">
// The MODX username and password for one magazine, with the line saying what happens to them.
// Used by the Add magazine dialog (Settings → Channels) and the Send dialog.
import Alert from '@/components/ui/Alert.vue';
import TextField from '@/components/ui/TextField.vue';

defineProps<{
    magazine: string;
    errors: Record<string, string>;
}>();

const username = defineModel<string>('username', { default: '' });
const password = defineModel<string>('password', { default: '' });
</script>

<template>
    <TextField v-model="username" name="cms-username" :label="`${magazine} username`" :error="errors.username" autocomplete="off" required />
    <TextField
        v-model="password"
        name="cms-password"
        type="password"
        :label="`${magazine} password`"
        :error="errors.password"
        autocomplete="off"
        required
    />
    <!-- The same light box as the Send dialog's note, with dark text so it reads easily. -->
    <Alert type="info" class="mt-2 text-sm text-base-content">
        Your MODX password is never stored. To send your drafts, Wirescout keeps an encrypted session, held on its servers only, never in
        your browser, to ensure maximum privacy and security. You can remove it any time in Channels under Settings.
    </Alert>
</template>
