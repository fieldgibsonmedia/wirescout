<script setup lang="ts">
// Opened from a Wirescout email (new account, password reset, email change). The link is only used when the
// person clicks Confirm: company email scanners open every link, and would use up a link that acts on opening.
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Alert from '@/components/ui/Alert.vue';
import FormLayout from '@/layouts/FormLayout.vue';
import { supabase } from '@/lib/supabase';

const route = useRoute();
const router = useRouter();

const actions = {
    signup: { title: 'Confirm your account', submitLabel: 'Confirm' },
    recovery: { title: 'Choose a new password', submitLabel: 'Continue' },
    email_change: { title: 'Confirm your new email', submitLabel: 'Confirm' },
} as const;

const type = route.query.type as keyof typeof actions;
const tokenHash = typeof route.query.token_hash === 'string' ? route.query.token_hash : '';
const action = actions[type];

const failed = ref(!action || !tokenHash);
const otherAddressNext = ref(false);
const busy = ref(false);

async function confirm() {
    busy.value = true;
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    busy.value = false;

    if (error) {
        failed.value = true;
        return;
    }

    if (type === 'recovery') {
        router.push({ name: 'set-password' });
    } else if (type === 'email_change' && !data.session) {
        // Both addresses get a link: the change happens once both are confirmed.
        otherAddressNext.value = true;
    } else {
        router.push({ name: type === 'email_change' ? 'account-settings' : 'dashboard' });
    }
}
</script>

<template>
    <!-- Once the link is used up (or broken), the button leads on to sign in. -->
    <FormLayout
        :title="action?.title ?? 'Confirm'"
        :submit-label="failed || otherAddressNext ? 'Go to sign in' : action.submitLabel"
        :busy="busy"
        @submit="failed || otherAddressNext ? router.push({ name: 'sign-in' }) : confirm()"
    >
        <template #message>
            <Alert v-if="failed" type="error">
                That email link has expired or was already used. Sign in, or use "Forgot password" to get a new link.
            </Alert>
            <Alert v-else-if="otherAddressNext" type="success">
                Done. Now open the link we sent to your other email address to finish the change.
            </Alert>
            <p v-else class="text-base-content/70">Click {{ action.submitLabel }} to continue.</p>
        </template>
    </FormLayout>
</template>
