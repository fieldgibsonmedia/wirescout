<script setup lang="ts">
// Settings → Manager → System settings → System admins: the super admins. A super admin adds another by the email of
// an existing account, and removes one, themselves too, as long as another is left: the database always keeps one
// (20261104120618_system_admins.sql).
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import Alert from '@/components/ui/Alert.vue';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import Card from '@/components/ui/Card.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import TextField from '@/components/ui/TextField.vue';
import type { Database } from '@/lib/database.types';
import { loadProfile, profile } from '@/lib/profile';
import { supabase } from '@/lib/supabase';

type SuperAdmin = Database['public']['Functions']['super_admins']['Returns'][number];

const router = useRouter();

const admins = ref<SuperAdmin[]>([]);
const loadFailed = ref(false);

const newEmail = ref('');
const addError = ref('');
const addBusy = ref(false);
const addFailed = ref(false);
const added = ref('');

const removing = ref<SuperAdmin | null>(null);
const removeOpen = ref(false);
const removeBusy = ref(false);
const removeError = ref('');

const removingMyself = computed(() => removing.value?.id === profile.value?.id);

// The name when there is one, else the email.
function label(admin: SuperAdmin) {
    return admin.full_name?.trim() || admin.email;
}

async function load() {
    const { data, error } = await supabase.rpc('super_admins');
    loadFailed.value = Boolean(error);
    admins.value = data ?? [];
}

async function add() {
    addError.value = '';
    addFailed.value = false;
    added.value = '';
    const email = newEmail.value.trim().toLowerCase();
    if (!email.includes('@')) {
        addError.value = 'Enter the email of their Wirescout account.';
        return;
    }
    if (admins.value.some((admin) => admin.email.toLowerCase() === email)) {
        addError.value = `${email} is already a super admin.`;
        return;
    }

    addBusy.value = true;
    const { data: found, error } = await supabase.rpc('add_super_admin', { account_email: email });
    addBusy.value = false;

    if (error) {
        addFailed.value = true;
        return;
    }
    if (!found) {
        addError.value = 'No account with that email. They need to sign up first.';
        return;
    }

    newEmail.value = '';
    added.value = email;
    await load();
}

function askRemove(admin: SuperAdmin) {
    removing.value = admin;
    removeError.value = '';
    removeOpen.value = true;
}

async function remove() {
    if (!removing.value) {
        return;
    }
    removeBusy.value = true;
    const { error } = await supabase.rpc('remove_super_admin', { admin_id: removing.value.id });
    removeBusy.value = false;

    if (error) {
        removeError.value = `${label(removing.value)} couldn't be removed. Please try again.`;
        return;
    }
    removeOpen.value = false;
    added.value = '';
    addError.value = '';

    // Removing yourself ends your access to Manager straight away.
    if (removingMyself.value) {
        await loadProfile();
        await router.push({ name: 'dashboard' });
        return;
    }
    await load();
}

onMounted(load);
</script>

<template>
    <Card>
        <h2 class="text-xl font-bold">Super admins</h2>
        <p class="max-w-prose text-base-content/70">
            Super admins see Manager in Settings: they decide who can sign up, and who else is a super admin.
        </p>

        <form class="flex max-w-md flex-col gap-4" novalidate @submit.prevent="add" @input="added = ''">
            <TextField
                v-model="newEmail"
                name="super-admin-email"
                label="Email"
                type="email"
                autocomplete="off"
                helper="The email of their Wirescout account. They need to sign up first."
                :error="addError"
            />
            <div class="flex flex-wrap items-center gap-4">
                <Button type="submit" :busy="addBusy">Add</Button>
                <Alert v-if="added" type="success">{{ added }} is a super admin now.</Alert>
                <Alert v-if="addFailed" type="error">They couldn't be added. Please try again.</Alert>
            </div>
        </form>

        <Alert v-if="loadFailed" type="error">The super admins couldn't be loaded.</Alert>
        <template v-else>
            <ul class="flex flex-col divide-y divide-base-300 border-t border-base-300">
                <li v-for="admin in admins" :key="admin.id" class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2">
                    <span class="flex min-w-0 flex-col">
                        <span class="flex items-center gap-2 break-all">
                            {{ label(admin) }}
                            <Badge v-if="admin.id === profile?.id" size="sm">You</Badge>
                        </span>
                        <span v-if="label(admin) !== admin.email" class="break-all text-base-content/70">{{ admin.email }}</span>
                    </span>
                    <Button v-if="admins.length > 1" variant="ghost" @click="askRemove(admin)">
                        Remove<span class="sr-only"> {{ label(admin) }}</span>
                    </Button>
                </li>
            </ul>
            <p v-if="admins.length === 1" class="text-base-content/70">Wirescout always keeps at least one super admin.</p>
        </template>
    </Card>

    <ConfirmDialog
        v-model:open="removeOpen"
        :title="removingMyself ? 'Remove yourself as super admin?' : `Remove ${removing ? label(removing) : ''} as super admin?`"
        :description="
            removingMyself
                ? 'You lose access to Manager straight away. Another super admin can add you back.'
                : 'They lose access to Manager. Their account stays.'
        "
        confirm-label="Remove"
        :busy="removeBusy"
        :error="removeError"
        @confirm="remove"
    />
</template>
