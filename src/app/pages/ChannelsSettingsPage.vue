<script setup lang="ts">
// Where the user can share stories: the magazines they send drafts to, signed in with their own account
// there, and the share options their stories' Share menu shows. A magazine Wirescout can't reach yet shows greyed
// out with "Coming soon..." and can't be added.
import { onMounted, ref, watch } from 'vue';
import AddMagazineDialog from '@/components/AddMagazineDialog.vue';
import Alert from '@/components/ui/Alert.vue';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import Card from '@/components/ui/Card.vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import { disconnectMagazine, loadMagazines, magazines, type Magazine } from '@/lib/magazines';
import { profile, saveProfile } from '@/lib/profile';

const magazinesFailed = ref(false);
const adding = ref<Magazine | null>(null);
const addOpen = ref(false);
const disconnecting = ref(0);
const disconnectFailed = ref('');

function add(magazine: Magazine) {
    adding.value = magazine;
    addOpen.value = true;
}

async function disconnect(magazine: Magazine) {
    disconnectFailed.value = '';
    disconnecting.value = magazine.id;
    const result = await disconnectMagazine(magazine.id);
    disconnecting.value = 0;
    if (!result.ok) {
        disconnectFailed.value = result.error;
    }
}

const shareOptions = ref({ linkedIn: true, email: true, copyLink: true });
const busy = ref(false);
const saved = ref(false);
const failed = ref(false);

const switches = [
    { key: 'copyLink', label: 'Copy link', description: "Copies the story's web address." },
    { key: 'email', label: 'Email', description: 'Opens your email app with the story.' },
    { key: 'linkedIn', label: 'LinkedIn', description: "Opens LinkedIn's share window with the story." },
] as const;

// The profile may still be loading when the page opens.
watch(
    profile,
    (current) => {
        if (current) {
            shareOptions.value = {
                linkedIn: current.share_linkedin,
                email: current.share_email,
                copyLink: current.share_copy_link,
            };
        }
    },
    { immediate: true },
);

onMounted(async () => {
    magazinesFailed.value = !(await loadMagazines());
});

async function save() {
    saved.value = false;
    busy.value = true;
    const ok = await saveProfile({
        share_linkedin: shareOptions.value.linkedIn,
        share_email: shareOptions.value.email,
        share_copy_link: shareOptions.value.copyLink,
    });
    busy.value = false;

    saved.value = ok;
    failed.value = !ok;
}
</script>

<template>
    <PageHeader title="Channels" description="Where you can share the stories you find." />

    <Card>
        <h2 class="text-xl font-bold">Magazines</h2>
        <p class="max-w-prose text-base-content/70">
            Connect your MODX account to send story drafts to Field Gibson Media magazines.
        </p>
        <Alert v-if="magazinesFailed" type="error">Your magazines couldn't be loaded.</Alert>
        <Alert v-if="disconnectFailed" type="error">{{ disconnectFailed }}</Alert>
        <ul v-if="!magazinesFailed" class="flex flex-col divide-y divide-base-300 border-t border-base-300">
            <li v-for="magazine in magazines" :key="magazine.id" class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
                <span class="flex flex-col">
                    <span v-if="magazine.comingSoon" class="flex flex-wrap items-center gap-2">
                        <span class="font-medium text-base-content/50">{{ magazine.name }}</span>
                        <Badge variant="outline" size="sm">Coming soon...</Badge>
                    </span>
                    <span v-else class="font-medium">{{ magazine.name }}</span>
                    <span v-if="magazine.connectedAs" class="flex flex-wrap items-center gap-2 text-sm text-base-content/70">
                        Connected as {{ magazine.connectedAs }}
                        <Badge v-if="magazine.needsSignIn" variant="outline" size="sm">Needs sign-in</Badge>
                    </span>
                </span>
                <span class="flex gap-2">
                    <Button v-if="!magazine.comingSoon && (!magazine.connectedAs || magazine.needsSignIn)" variant="outline" @click="add(magazine)">
                        {{ magazine.connectedAs ? 'Sign in again' : 'Add magazine' }}
                    </Button>
                    <Button v-if="magazine.connectedAs" variant="ghost" :busy="disconnecting === magazine.id" @click="disconnect(magazine)">
                        Disconnect<span class="sr-only"> {{ magazine.name }}</span>
                    </Button>
                </span>
            </li>
        </ul>
        <AddMagazineDialog v-if="adding" v-model:open="addOpen" :magazine="adding" />
    </Card>

    <Card>
        <form class="flex flex-col gap-6" novalidate @submit.prevent="save" @input="saved = false">
            <fieldset class="flex flex-col gap-2">
                <legend class="text-xl font-bold">Share options</legend>
                <p class="mt-2 max-w-prose text-base-content/70">Choose what your stories' Share menu shows.</p>

                <label v-for="item in switches" :key="item.key" class="flex min-h-11 cursor-pointer items-center gap-4 py-2">
                    <input v-model="shareOptions[item.key]" type="checkbox" class="toggle toggle-primary" />
                    <span class="flex flex-col">
                        <span class="font-medium">{{ item.label }}</span>
                        <span class="text-sm text-base-content/70">{{ item.description }}</span>
                    </span>
                </label>
            </fieldset>

            <div class="flex flex-wrap items-center gap-4">
                <Button type="submit" :busy="busy">Save</Button>
                <Alert v-if="saved" type="success">Saved.</Alert>
                <Alert v-if="failed" type="error">Your settings couldn't be saved. Please try again.</Alert>
            </div>
        </form>
    </Card>
</template>
