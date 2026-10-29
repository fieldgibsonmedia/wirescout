<script setup lang="ts">
// Anyone with an allowed email (allowed_email_domains) can create an account. Supabase refuses the others,
// and they can request access instead.
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import Alert from '@/components/ui/Alert.vue';
import TextField from '@/components/ui/TextField.vue';
import FormLayout from '@/layouts/FormLayout.vue';
import { supabase } from '@/lib/supabase';

const email = ref('');
const password = ref('');
const confirmation = ref('');
const errors = ref<Record<string, string>>({});
const sentTo = ref('');
const deniedEmail = ref('');
const failed = ref(false);
const busy = ref(false);

async function signUp() {
    sentTo.value = '';
    deniedEmail.value = '';
    failed.value = false;
    errors.value = {};
    if (!email.value.trim()) {
        errors.value.email = 'Enter your email.';
    }
    if (!password.value) {
        errors.value.password = 'Enter a password.';
    } else if (confirmation.value !== password.value) {
        errors.value.confirmation = "The passwords don't match.";
    }
    if (Object.keys(errors.value).length > 0) {
        return;
    }

    busy.value = true;
    const { error } = await supabase.auth.signUp({ email: email.value.trim(), password: password.value });
    busy.value = false;

    if (error?.code === 'weak_password' || error?.code === 'validation_failed') {
        // Supabase explains what's wrong (password too short, email not valid…).
        errors.value = error.code === 'weak_password' ? { password: error.message } : { email: error.message };
        return;
    }
    // The sign-up check (hook_before_user_created) refused the email.
    if (error?.status === 403) {
        deniedEmail.value = email.value.trim();
        return;
    }
    if (error) {
        failed.value = true;
        return;
    }

    sentTo.value = email.value.trim();
    password.value = '';
    confirmation.value = '';
}
</script>

<template>
    <FormLayout title="Create your Wirescout account" submit-label="Create account" :busy="busy" :errors="errors" @submit="signUp">
        <template #message>
            <Alert v-if="sentTo" type="success">
                Check your inbox: we've sent a link to {{ sentTo }}. Open it and click Confirm to finish.
            </Alert>
            <Alert v-if="deniedEmail" type="error">
                Account creation denied: {{ deniedEmail }} isn't on Wirescout's list.
                <RouterLink :to="{ name: 'request-access', query: { email: deniedEmail } }" class="link">Request access</RouterLink>
            </Alert>
            <Alert v-if="failed" type="error">The account couldn't be created. Please try again in a few minutes.</Alert>
        </template>

        <TextField
            v-model="email"
            name="email"
            label="Work email"
            type="email"
            autocomplete="username"
            :error="errors.email"
            required
        />
        <TextField
            v-model="password"
            name="password"
            label="Password"
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

        <template #links>
            <RouterLink :to="{ name: 'sign-in' }" class="link">I already have an account</RouterLink>
        </template>
    </FormLayout>
</template>
