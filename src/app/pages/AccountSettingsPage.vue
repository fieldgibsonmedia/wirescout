<script setup lang="ts">
// The signed-in person's account: their name, email and password, and the theme on this device.
import { nextTick, ref, watch } from 'vue';
import Alert from '@/components/ui/Alert.vue';
import Button from '@/components/ui/Button.vue';
import Card from '@/components/ui/Card.vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import TextField from '@/components/ui/TextField.vue';
import { profile, saveProfile } from '@/lib/profile';
import { supabase } from '@/lib/supabase';
import { theme } from '@/lib/theme';

const name = ref('');
const nameBusy = ref(false);
const nameSaved = ref(false);
const nameFailed = ref(false);

const newEmail = ref('');
const emailError = ref('');
const emailBusy = ref(false);
const emailSentTo = ref('');
const emailFailed = ref(false);

const passwordForm = ref<HTMLFormElement>();
const currentPassword = ref('');
const newPassword = ref('');
const confirmation = ref('');
const passwordErrors = ref<Record<string, string>>({});
const passwordBusy = ref(false);
const passwordSaved = ref(false);
const passwordFailed = ref(false);

const themes = [
    { value: 'auto', label: 'Auto', description: "Follows your computer's setting." },
    { value: 'light', label: 'Light', description: '' },
    { value: 'dark', label: 'Dark', description: '' },
] as const;

// The profile may still be loading when the page opens.
watch(
    profile,
    (current) => {
        if (current) {
            name.value = current.full_name ?? '';
        }
    },
    { immediate: true },
);

async function saveName() {
    nameSaved.value = false;
    nameBusy.value = true;
    const ok = await saveProfile({ full_name: name.value.trim() || null });
    nameBusy.value = false;

    nameSaved.value = ok;
    nameFailed.value = !ok;
}

async function changeEmail() {
    emailSentTo.value = '';
    emailFailed.value = false;
    emailError.value = '';
    if (!newEmail.value.trim()) {
        emailError.value = 'Enter your new email.';
        return;
    }
    if (newEmail.value.trim().toLowerCase() === profile.value?.email.toLowerCase()) {
        emailError.value = 'This is already your email.';
        return;
    }

    emailBusy.value = true;
    const { error } = await supabase.auth.updateUser({ email: newEmail.value.trim() });
    emailBusy.value = false;

    if (error?.code === 'email_exists') {
        emailError.value = 'This email already has a Wirescout account.';
        return;
    }
    if (error?.code === 'validation_failed') {
        emailError.value = 'Enter a valid email, like name@example.com.';
        return;
    }
    if (error) {
        emailFailed.value = true;
        return;
    }

    emailSentTo.value = newEmail.value.trim();
    newEmail.value = '';
}

async function changePassword() {
    passwordSaved.value = false;
    passwordFailed.value = false;
    passwordErrors.value = {};
    if (!currentPassword.value) {
        passwordErrors.value.currentPassword = 'Enter your current password.';
    }
    if (!newPassword.value) {
        passwordErrors.value.newPassword = 'Enter a new password.';
    } else if (confirmation.value !== newPassword.value) {
        passwordErrors.value.confirmation = "The passwords don't match.";
    }
    if (await showPasswordErrors()) {
        return;
    }

    passwordBusy.value = true;
    // Signing in again proves the current password, so someone at an unlocked computer can't change it.
    const check = await supabase.auth.signInWithPassword({ email: profile.value?.email ?? '', password: currentPassword.value });
    if (check.error) {
        passwordBusy.value = false;
        if (check.error.code === 'invalid_credentials') {
            passwordErrors.value = { currentPassword: 'This password is wrong.' };
            await showPasswordErrors();
        } else {
            passwordFailed.value = true;
        }
        return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword.value });
    passwordBusy.value = false;

    if (error?.code === 'weak_password' || error?.code === 'same_password') {
        // Supabase explains what's wrong with the password (too short, same as before…).
        passwordErrors.value = { newPassword: error.message };
        await showPasswordErrors();
        return;
    }
    if (error) {
        passwordFailed.value = true;
        return;
    }

    currentPassword.value = '';
    newPassword.value = '';
    confirmation.value = '';
    passwordSaved.value = true;
}

// Moves the cursor to the first field that needs fixing (DESIGN.md). True if there was one.
async function showPasswordErrors() {
    if (Object.keys(passwordErrors.value).length === 0) {
        return false;
    }
    await nextTick();
    passwordForm.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    return true;
}
</script>

<template>
    <PageHeader title="Account settings" :description="profile?.email" />

    <Card>
        <form class="flex max-w-md flex-col gap-6" novalidate @submit.prevent="saveName" @input="nameSaved = false">
            <h2 class="text-xl font-bold">Your name</h2>
            <TextField v-model="name" name="full-name" label="Name" autocomplete="name" helper="Shown in the top bar." />

            <div class="flex flex-wrap items-center gap-4">
                <Button type="submit" :busy="nameBusy">Save</Button>
                <Alert v-if="nameSaved" type="success">Saved.</Alert>
                <Alert v-if="nameFailed" type="error">Your name couldn't be saved. Please try again.</Alert>
            </div>
        </form>
    </Card>

    <Card>
        <form class="flex max-w-md flex-col gap-6" novalidate @submit.prevent="changeEmail">
            <h2 class="text-xl font-bold">Email</h2>
            <TextField
                v-model="newEmail"
                name="new-email"
                label="New email"
                type="email"
                autocomplete="email"
                :helper="`Now ${profile?.email ?? ''}. You'll confirm the change from both addresses.`"
                :error="emailError"
                required
            />

            <div class="flex flex-wrap items-center gap-4">
                <Button type="submit" :busy="emailBusy">Change email</Button>
                <Alert v-if="emailSentTo" type="success">
                    Check both inboxes: we've sent a link to {{ profile?.email }} and to {{ emailSentTo }}. Your email changes once
                    both are confirmed.
                </Alert>
                <Alert v-if="emailFailed" type="error">Your email couldn't be changed. Please try again in a few minutes.</Alert>
            </div>
        </form>
    </Card>

    <Card>
        <form ref="passwordForm" class="flex max-w-md flex-col gap-6" novalidate @submit.prevent="changePassword" @input="passwordSaved = false">
            <h2 class="text-xl font-bold">Password</h2>

            <!-- Lets password managers save the new password under the right email. -->
            <input type="email" :value="profile?.email" autocomplete="username" class="hidden" aria-hidden="true" tabindex="-1" />

            <div class="flex flex-col gap-2">
                <TextField
                    v-model="currentPassword"
                    name="current-password"
                    label="Current password"
                    type="password"
                    autocomplete="current-password"
                    :error="passwordErrors.currentPassword"
                    required
                />
                <TextField
                    v-model="newPassword"
                    name="new-password"
                    label="New password"
                    type="password"
                    autocomplete="new-password"
                    :error="passwordErrors.newPassword"
                    required
                />
                <TextField
                    v-model="confirmation"
                    name="confirmation"
                    label="Repeat the new password"
                    type="password"
                    autocomplete="new-password"
                    :error="passwordErrors.confirmation"
                    required
                />
            </div>

            <div class="flex flex-wrap items-center gap-4">
                <Button type="submit" :busy="passwordBusy">Change password</Button>
                <Alert v-if="passwordSaved" type="success">Password changed.</Alert>
                <Alert v-if="passwordFailed" type="error">Your password couldn't be changed. Please try again.</Alert>
            </div>
        </form>
    </Card>

    <Card>
        <fieldset class="flex flex-col gap-2">
            <legend class="text-xl font-bold">Theme</legend>
            <p class="mt-2 max-w-prose text-base-content/70">Saved on this device only.</p>

            <label v-for="option in themes" :key="option.value" class="flex min-h-11 cursor-pointer items-center gap-4 py-2">
                <input v-model="theme" type="radio" name="theme" :value="option.value" class="radio radio-primary" />
                <span class="flex flex-col">
                    <span class="font-medium">{{ option.label }}</span>
                    <span v-if="option.description" class="text-sm text-base-content/70">{{ option.description }}</span>
                </span>
            </label>
        </fieldset>
    </Card>

    <Card>
        <h2 class="text-xl font-bold">Usage</h2>
        <p class="max-w-prose text-base-content/70">
            Wirescout counts the days you use it, the stories you share and the digest links you open, to see what's useful. Only the Wirescout team sees it.
        </p>
    </Card>
</template>
