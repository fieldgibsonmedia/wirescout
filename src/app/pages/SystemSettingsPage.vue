<script setup lang="ts">
// Settings → Manager → System settings, for super admins only (router.ts; the database refuses everyone else).
// Two tabs (Ken, 2026-11-04): Platform access and System admins (SystemAdminsTab). ?tab=admins opens the second.
// Platform access: who may sign up: whole domains and single addresses (allowed_email_domains, read by the sign-up check).
// Removing one stops new sign-ups from it; accounts already made stay.
import { TabsContent, TabsIndicator, TabsList, TabsRoot, TabsTrigger } from 'reka-ui';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import SystemAdminsTab from '@/components/SystemAdminsTab.vue';
import Alert from '@/components/ui/Alert.vue';
import Button from '@/components/ui/Button.vue';
import Card from '@/components/ui/Card.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import TextField from '@/components/ui/TextField.vue';
import { supabase } from '@/lib/supabase';

// A domain (example.com) or one full address (jane@example.com).
const ENTRY_PATTERN = /^([^@\s]+@)?[a-z0-9-]+(\.[a-z0-9-]+)+$/;

const tab = ref(useRoute().query.tab === 'admins' ? 'admins' : 'access');

const entries = ref<string[]>([]);
const loadFailed = ref(false);

// Domains first, then single addresses, each A–Z.
const domains = computed(() => entries.value.filter((entry) => !entry.includes('@')));
const addresses = computed(() => entries.value.filter((entry) => entry.includes('@')));

const newEntry = ref('');
const addError = ref('');
const addBusy = ref(false);
const addFailed = ref(false);
const added = ref('');

const removing = ref('');
const removeOpen = ref(false);
const removeBusy = ref(false);
const removeError = ref('');

async function load() {
    const { data, error } = await supabase.from('allowed_email_domains').select('entry').order('entry');
    loadFailed.value = Boolean(error);
    entries.value = data?.map((row) => row.entry) ?? [];
}

async function add() {
    addError.value = '';
    addFailed.value = false;
    added.value = '';
    const entry = newEntry.value.trim().toLowerCase();
    if (!ENTRY_PATTERN.test(entry)) {
        addError.value = 'Enter a domain, like example.com, or one email, like jane@example.com.';
        return;
    }

    addBusy.value = true;
    const { error } = await supabase.from('allowed_email_domains').insert({ entry });
    addBusy.value = false;

    if (error?.code === '23505') {
        addError.value = `${entry} is already on the list.`;
        return;
    }
    if (error) {
        addFailed.value = true;
        return;
    }

    newEntry.value = '';
    added.value = entry;
    await load();
}

function askRemove(entry: string) {
    removing.value = entry;
    removeError.value = '';
    removeOpen.value = true;
}

async function remove() {
    removeBusy.value = true;
    const { error } = await supabase.from('allowed_email_domains').delete().eq('entry', removing.value);
    removeBusy.value = false;

    if (error) {
        removeError.value = `${removing.value} couldn't be removed. Please try again.`;
        return;
    }
    removeOpen.value = false;
    added.value = '';
    addError.value = '';
    await load();
}

onMounted(load);
</script>

<template>
    <PageHeader title="System settings" description="Settings for everyone who uses Wirescout." />

    <TabsRoot v-model="tab" class="flex flex-col gap-4">
        <TabsList aria-label="System settings" class="tabs tabs-border relative">
            <TabsTrigger value="access" class="tab data-[state=active]:tab-active">Platform access</TabsTrigger>
            <TabsTrigger value="admins" class="tab data-[state=active]:tab-active">System admins</TabsTrigger>
            <TabsIndicator class="tab-indicator" />
        </TabsList>

        <TabsContent value="access" class="flex flex-col gap-4">
            <Card>
                <h2 class="text-xl font-bold">Who can sign up</h2>
                <p class="max-w-prose text-base-content/70">
                    People with an email at one of these domains, or one of these single addresses, can create an account.
                </p>

                <form class="flex max-w-md flex-col gap-4" novalidate @submit.prevent="add" @input="added = ''">
                    <TextField
                        v-model="newEntry"
                        name="allowed-entry"
                        label="Domain or email"
                        autocomplete="off"
                        helper="A whole domain, like example.com, or one person's email."
                        :error="addError"
                    />
                    <div class="flex flex-wrap items-center gap-4">
                        <Button type="submit" :busy="addBusy">Add</Button>
                        <Alert v-if="added" type="success">{{ added }} can sign up now.</Alert>
                        <Alert v-if="addFailed" type="error">It couldn't be added. Please try again.</Alert>
                    </div>
                </form>

                <Alert v-if="loadFailed" type="error">The list couldn't be loaded.</Alert>
                <template v-else>
                    <div v-for="group in [{ title: 'Domains', items: domains }, { title: 'Single addresses', items: addresses }]" :key="group.title" class="flex flex-col gap-2">
                        <h3 class="font-bold">{{ group.title }}</h3>
                        <p v-if="group.items.length === 0" class="text-base-content/70">None yet.</p>
                        <ul v-else class="flex flex-col divide-y divide-base-300 border-t border-base-300">
                            <li v-for="entry in group.items" :key="entry" class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2">
                                <span class="break-all">{{ entry }}</span>
                                <Button variant="ghost" @click="askRemove(entry)">
                                    Remove<span class="sr-only"> {{ entry }}</span>
                                </Button>
                            </li>
                        </ul>
                    </div>
                </template>
            </Card>
        </TabsContent>

        <TabsContent value="admins" class="flex flex-col gap-4">
            <SystemAdminsTab />
        </TabsContent>
    </TabsRoot>

    <ConfirmDialog
        v-model:open="removeOpen"
        :title="`Remove ${removing}?`"
        description="New accounts can't be made with it any more. Accounts already made stay."
        confirm-label="Remove"
        :busy="removeBusy"
        :error="removeError"
        @confirm="remove"
    />
</template>
