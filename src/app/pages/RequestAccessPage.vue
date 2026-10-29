<script setup lang="ts">
// For people whose email isn't allowed to sign up. The request lands in access_requests;
// Ken adds the address to the allowed list and replies himself.
import { ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import Alert from '@/components/ui/Alert.vue';
import TextAreaField from '@/components/ui/TextAreaField.vue';
import TextField from '@/components/ui/TextField.vue';
import FormLayout from '@/layouts/FormLayout.vue';
import { supabase } from '@/lib/supabase';

const route = useRoute();

const name = ref('');
const email = ref(typeof route.query.email === 'string' ? route.query.email : '');
const reason = ref('');
// Hidden from people: only bots fill it in.
const website = ref('');
const errors = ref<Record<string, string>>({});
const sent = ref(false);
const failed = ref(false);
const busy = ref(false);

async function send() {
    failed.value = false;
    errors.value = {};
    if (!name.value.trim()) {
        errors.value.name = 'Enter your name.';
    }
    if (!email.value.trim()) {
        errors.value.email = 'Enter your email.';
    }
    if (!reason.value.trim()) {
        errors.value.reason = 'Say why you need Wirescout.';
    }
    if (Object.keys(errors.value).length > 0) {
        return;
    }

    // A bot gets the same thank-you, so it doesn't learn to skip the field.
    if (website.value) {
        sent.value = true;
        return;
    }

    busy.value = true;
    const { error } = await supabase
        .from('access_requests')
        .insert({ name: name.value.trim(), email: email.value.trim(), reason: reason.value.trim() });
    busy.value = false;

    // 23505: this email already has an open request, which is fine.
    if (error && error.code !== '23505') {
        if (error.code === '23514') {
            errors.value = { email: 'Enter a valid email, like name@example.com.' };
        } else {
            failed.value = true;
        }
        return;
    }

    sent.value = true;
}
</script>

<template>
    <FormLayout
        title="Request access"
        description="Tell us who you are and we'll reply by email."
        submit-label="Send request"
        :busy="busy"
        :errors="errors"
        @submit="send"
    >
        <template #message>
            <Alert v-if="sent" type="success">Thanks, your request is in. We'll reply to {{ email.trim() }}.</Alert>
            <Alert v-if="failed" type="error">The request couldn't be sent. Please try again in a few minutes.</Alert>
        </template>

        <TextField v-model="name" name="name" label="Name" autocomplete="name" maxlength="100" :error="errors.name" required />
        <TextField
            v-model="email"
            name="email"
            label="Email"
            type="email"
            autocomplete="email"
            maxlength="254"
            :error="errors.email"
            required
        />
        <TextAreaField
            v-model="reason"
            name="reason"
            label="Why do you need Wirescout?"
            rows="4"
            maxlength="1000"
            :error="errors.reason"
            required
        />

        <!-- The bot trap: off screen, skipped by the keyboard and by screen readers. -->
        <input
            v-model="website"
            name="website"
            type="text"
            autocomplete="off"
            class="absolute -left-[9999px]"
            aria-hidden="true"
            tabindex="-1"
        />

        <template #links>
            <RouterLink :to="{ name: 'sign-in' }" class="link">Back to sign in</RouterLink>
        </template>
    </FormLayout>
</template>
