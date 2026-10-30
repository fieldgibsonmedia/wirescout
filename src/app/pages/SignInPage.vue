<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import Alert from '@/components/ui/Alert.vue';
import TextField from '@/components/ui/TextField.vue';
import FormLayout from '@/layouts/FormLayout.vue';
import { emailLink, supabase } from '@/lib/supabase';

const router = useRouter();
// The page to open after signing in. Only a path in this app: "//site" would leave it.
const redirect = useRoute().query.redirect;
const next = typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : null;

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
        const messages: Record<string, string> = {
            invalid_credentials: 'Wrong email or password.',
            email_not_confirmed: 'Confirm your email first: open the link we sent you when you created the account.',
        };
        failed.value = messages[error.code ?? ''] ?? 'Sign in failed. Please try again.';
        password.value = '';
        return;
    }

    router.push(next ?? { name: 'dashboard' });
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
            <div class="flex flex-wrap justify-center gap-x-6 gap-y-2">
                <RouterLink :to="{ name: 'forgot-password' }" class="link">Forgot password?</RouterLink>
                <RouterLink :to="{ name: 'sign-up' }" class="link">Create account</RouterLink>
            </div>
        </template>
    </FormLayout>
</template>
