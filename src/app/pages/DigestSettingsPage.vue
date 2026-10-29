<script setup lang="ts">
// When the user's daily digest email is sent: any minute of the day in their time zone, or off.
// The time zone isn't picked: the app takes it from the browser on every visit (lib/profile).
import { computed, ref, watch } from 'vue';
import Alert from '@/components/ui/Alert.vue';
import Button from '@/components/ui/Button.vue';
import Card from '@/components/ui/Card.vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import TextField from '@/components/ui/TextField.vue';
import { profile, saveProfile } from '@/lib/profile';

const enabled = ref(true);
const time = ref('');
const timeError = ref('');
const busy = ref(false);
const saved = ref(false);
const failed = ref(false);

// The profile may still be loading when the page opens.
watch(
    profile,
    (current) => {
        if (current) {
            enabled.value = current.digest_time !== null;
            // The database gives 07:15:00; the time field takes 07:15.
            time.value = current.digest_time?.slice(0, 5) ?? '07:00';
        }
    },
    { immediate: true },
);

const timeZone = computed(() => profile.value?.time_zone.replaceAll('_', ' ') ?? '');

async function save() {
    saved.value = false;
    failed.value = false;
    timeError.value = '';
    if (enabled.value && !time.value) {
        timeError.value = 'Enter a time, such as 07:00.';
        return;
    }

    busy.value = true;
    const ok = await saveProfile({ digest_time: enabled.value ? time.value : null });
    busy.value = false;

    saved.value = ok;
    failed.value = !ok;
}
</script>

<template>
    <PageHeader title="Daily digest" description="One email with the new stories from all your watch lists." />

    <Card>
        <form class="flex max-w-md flex-col gap-6" novalidate @submit.prevent="save" @input="saved = false">
            <div class="flex flex-col gap-2">
                <label class="flex min-h-11 cursor-pointer items-center gap-4 py-2">
                    <input v-model="enabled" type="checkbox" class="toggle toggle-primary" />
                    <span class="font-medium">Send me the daily digest</span>
                </label>

                <TextField
                    v-if="enabled"
                    v-model="time"
                    name="digest-time"
                    label="Send it at"
                    type="time"
                    :error="timeError"
                    helper="Sent Monday to Friday, at around this time."
                />
                <p v-if="timeZone" class="text-sm text-base-content/70">Your time zone: {{ timeZone }}. It follows your computer's clock.</p>
            </div>

            <div class="flex flex-wrap items-center gap-4">
                <Button type="submit" :busy="busy">Save</Button>
                <Alert v-if="saved" type="success">Saved.</Alert>
                <Alert v-if="failed" type="error">Your settings couldn't be saved. Please try again.</Alert>
            </div>
        </form>
    </Card>
</template>
