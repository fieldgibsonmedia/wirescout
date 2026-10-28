<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import Alert from '@/components/ui/Alert.vue';
import TextField from '@/components/ui/TextField.vue';
import FormLayout from '@/layouts/FormLayout.vue';
import { emailLink, supabase } from '@/lib/supabase';

const router = useRouter();

const email = ref('');
const password = ref('');
const errors = ref<Record<string, string>>({});
const failed = ref('');
const busy = ref(false);

async function signIn() {
    failed.value = '';
    errors.value = {};
    if (!email.value.trim()) {
        errors.value.email = 'Enter your email.';
    }
    if (!password.value) {
        errors.value.password = 'Enter your password.';
    }
    if (Object.keys(errors.value).length > 0) {
        return;
    }

    busy.value = true;
    const { error } = await supabase.auth.signInWithPassword({ email: email.value.trim(), password: password.value });
    busy.value = false;

    if (error) {
        failed.value =
            error.code === 'invalid_credentials' ? 'Wrong email or password.' : 'Sign in failed. Please try again.';
        password.value = '';
        return;
    }

    router.push({ name: 'dashboard' });
}
</script>

<template>
    <FormLayout title="Sign in to Wirescout" submit-label="Sign in" :busy="busy" :errors="errors" @submit="signIn">
        <template #message>
            <Alert v-if="failed" type="error">{{ failed }}</Alert>
            <Alert v-else-if="emailLink.failed" type="error">
                That email link has expired or was already used. Sign in, or use "Forgot password" to get a new link.
            </Alert>
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
        <TextField
            v-model="password"
            name="password"
            label="Password"
            type="password"
            autocomplete="current-password"
            :error="errors.password"
            required
        />

        <template #links>
            <RouterLink :to="{ name: 'forgot-password' }" class="link">Forgot password?</RouterLink>
        </template>
    </FormLayout>
</template>
