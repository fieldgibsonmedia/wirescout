<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import Alert from '@/components/ui/Alert.vue';
import TextField from '@/components/ui/TextField.vue';
import FormLayout from '@/layouts/FormLayout.vue';
import { supabase } from '@/lib/supabase';

const email = ref('');
const errors = ref<Record<string, string>>({});
const sent = ref(false);
const failed = ref(false);
const busy = ref(false);

async function sendLink() {
    errors.value = {};
    failed.value = false;
    if (!email.value.trim()) {
        errors.value = { email: 'Enter your email.' };
        return;
    }

    busy.value = true;
    // The link comes back to the app's home page, which sends the user on to "Set your password".
    const { error } = await supabase.auth.resetPasswordForEmail(email.value.trim(), {
        redirectTo: window.location.origin + import.meta.env.BASE_URL,
    });
    busy.value = false;

    failed.value = Boolean(error);
    sent.value = !error;
}
</script>

<template>
    <FormLayout
        title="Forgot password"
        description="We'll email you a link to choose a new password."
        submit-label="Send link"
        :busy="busy"
        :errors="errors"
        @submit="sendLink"
    >
        <template #message>
            <Alert v-if="sent" type="success">
                If {{ email.trim() }} has a Wirescout account, the link is on its way. Check your inbox.
            </Alert>
            <Alert v-if="failed" type="error">The link couldn't be sent. Please try again in a few minutes.</Alert>
        </template>

        <TextField
            v-model="email"
            name="email"
            label="Email"
            type="email"
            autocomplete="username"
            :error="errors.email"
            required
        />

        <template #links>
            <RouterLink :to="{ name: 'sign-in' }" class="link">Back to sign in</RouterLink>
        </template>
    </FormLayout>
</template>
