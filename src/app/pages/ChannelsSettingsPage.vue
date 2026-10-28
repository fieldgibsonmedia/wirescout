<script setup lang="ts">
// Where the user can share stories: their magazines (an admin adds them) and the share options
// their stories' Share menu shows.
import { onMounted, ref, watch } from 'vue';
import Alert from '@/components/ui/Alert.vue';
import Button from '@/components/ui/Button.vue';
import Card from '@/components/ui/Card.vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import { profile, saveProfile } from '@/lib/profile';
import { supabase } from '@/lib/supabase';

const magazines = ref<string[]>([]);
const magazinesFailed = ref(false);

const shareOptions = ref({ linkedIn: true, email: true, copyLink: true });
const busy = ref(false);
const saved = ref(false);
const failed = ref(false);

const switches = [
    { key: 'linkedIn', label: 'LinkedIn', description: "Opens LinkedIn's share window with the story." },
    { key: 'email', label: 'Email', description: 'Opens your email app with the story.' },
    { key: 'copyLink', label: 'Copy link', description: "Copies the story's web address." },
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
    const { data, error } = await supabase.from('user_publications').select('publications (name)');
    magazinesFailed.value = Boolean(error);
    magazines.value = (data ?? []).map((row) => row.publications.name).sort();
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
        <p class="max-w-prose text-base-content/70">The magazines you can send story drafts to. An admin adds them.</p>
        <Alert v-if="magazinesFailed" type="error">Your magazines couldn't be loaded.</Alert>
        <p v-else-if="magazines.length === 0">None yet.</p>
        <ul v-else class="flex flex-col divide-y divide-base-300 border-t border-base-300">
            <li v-for="magazine in magazines" :key="magazine" class="py-2">{{ magazine }}</li>
        </ul>
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
