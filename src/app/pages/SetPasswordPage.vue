<script setup lang="ts">
// Reached from an invite or password-reset email: the link has already signed the user in.
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import Alert from '@/components/ui/Alert.vue';
import TextField from '@/components/ui/TextField.vue';
import FormLayout from '@/layouts/FormLayout.vue';
import { supabase } from '@/lib/supabase';

const router = useRouter();

const email = ref('');
const password = ref('');
const confirmation = ref('');
const errors = ref<Record<string, string>>({});
const failed = ref('');
const busy = ref(false);

onMounted(async () => {
    const { data } = await supabase.auth.getUser();
    email.value = data.user?.email ?? '';
});

async function save() {
    failed.value = '';
    errors.value = {};
    if (!password.value) {
        errors.value.password = 'Enter a password.';
    } else if (confirmation.value !== password.value) {
        errors.value.confirmation = "The passwords don't match.";
    }
    if (Object.keys(errors.value).length > 0) {
        return;
    }

    busy.value = true;
    const { error } = await supabase.auth.updateUser({ password: password.value });
    busy.value = false;

    if (error?.code === 'weak_password') {
        // Supabase explains what's wrong with the password (too short, too weak…).
        errors.value = { password: error.message };
        return;
    }
    if (error) {
        failed.value = "The password couldn't be saved. Please try again.";
        return;
    }

    router.push({ name: 'dashboard' });
}
</script>

<template>
    <FormLayout
        title="Set your password"
        :description="email ? `For ${email}. You'll use it to sign in.` : undefined"
        submit-label="Save password"
        :busy="busy"
        :errors="errors"
        @submit="save"
    >
        <template #message>
            <Alert v-if="failed" type="error">{{ failed }}</Alert>
        </template>

        <!-- Lets password managers save the new password under the right email. -->
        <input type="email" :value="email" autocomplete="username" class="hidden" aria-hidden="true" tabindex="-1" />

        <TextField
            v-model="password"
            name="password"
            label="New password"
            type="password"
            autocomplete="new-password"
            :error="errors.password"
            required
        />
        <TextField
            v-model="confirmation"
            name="confirmation"
            label="Repeat the password"
            type="password"
            autocomplete="new-password"
            :error="errors.confirmation"
            required
        />
    </FormLayout>
</template>
