<script setup lang="ts">
// Settings → Manager → Analytics, for super admins only (router.ts; the analytics function refuses everyone else).
// How Wirescout is used, for the chosen period, from PostHog (src/analytics/posthog.js): who uses it, what they
// do, which stories they share, errors and replays. "Download report" makes a PDF without errors and replays.
import { ArrowDownTrayIcon, ArrowTopRightOnSquareIcon } from '@heroicons/vue/20/solid';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { TabsIndicator, TabsList, TabsRoot, TabsTrigger } from 'reka-ui';
import { computed, ref, watch } from 'vue';
import AnalyticsSection from '@/components/AnalyticsSection.vue';
import Alert from '@/components/ui/Alert.vue';
import Button from '@/components/ui/Button.vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import { dateFormat, featureLabel, pageLabel, PERIODS, type Period, type Report } from '@/lib/analyticsReport';
import { supabase } from '@/lib/supabase';

const period = ref<Period>('month');
const description = computed(() => PERIODS.find((option) => option.value === period.value)!.description);

const report = ref<Report | null>(null);
const loading = ref(false);
const loadError = ref('');
const downloading = ref(false);

// The answer for the latest period picked, if they're switched quickly.
let request = 0;

async function load() {
    const current = ++request;
    loading.value = true;
    loadError.value = '';
    const { data, error } = await supabase.functions.invoke<Report>('analytics', { body: { period: period.value } });
    if (current !== request) {
        return;
    }
    loading.value = false;
    if (error || !data) {
        const answer = error instanceof FunctionsHttpError ? await error.context.json().catch(() => ({})) : {};
        loadError.value = answer.error ?? "Analytics couldn't be loaded. Please try again.";
        report.value = null;
        return;
    }
    report.value = data;
}

async function download() {
    if (!report.value) {
        return;
    }
    downloading.value = true;
    const { downloadUsagePdf } = await import('@/lib/usagePdf');
    downloadUsagePdf(report.value, description.value);
    downloading.value = false;
}

watch(period, load, { immediate: true });
</script>

<template>
    <PageHeader title="Analytics" description="How Wirescout is used, from PostHog.">
        <template #actions>
            <Button variant="outline" :busy="downloading" :disabled="!report || loading" @click="download">
                <ArrowDownTrayIcon class="size-5" aria-hidden="true" />
                Download report
            </Button>
        </template>
    </PageHeader>

    <TabsRoot v-model="period" class="flex flex-col gap-2">
        <TabsList aria-label="Period" class="tabs tabs-border relative">
            <TabsTrigger v-for="option in PERIODS" :key="option.value" :value="option.value" class="tab data-[state=active]:tab-active">
                {{ option.label }}
            </TabsTrigger>
            <TabsIndicator class="tab-indicator" />
        </TabsList>
        <p class="text-base-content/70">{{ description }}.</p>
    </TabsRoot>

    <Alert v-if="loadError" type="error">{{ loadError }}</Alert>
    <p v-else-if="loading && !report" class="flex items-center gap-2 text-base-content/70">
        <span class="loading loading-spinner loading-sm" aria-hidden="true"></span>
        Loading…
    </p>

    <div v-if="report" :class="['flex flex-col gap-6 transition-opacity', loading && 'opacity-50']" :aria-busy="loading">
        <AnalyticsSection
            :title="`Active users: ${report.activeUsers?.length ?? 0}`"
            description="Everyone who opened Wirescout, most active first."
            :rows="report.activeUsers"
        >
            <table class="table">
                <thead>
                    <tr>
                        <th>Person</th>
                        <th class="text-right">Active days</th>
                        <th class="text-right">Pages</th>
                        <th>Last seen</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="user in report.activeUsers" :key="user.email + user.lastSeen">
                        <td>
                            <div class="font-bold">{{ user.name }}</div>
                            <div v-if="user.email && user.email !== user.name" class="text-base-content/70">{{ user.email }}</div>
                        </td>
                        <td class="text-right">{{ user.days }}</td>
                        <td class="text-right">{{ user.pages }}</td>
                        <td>{{ dateFormat.format(new Date(user.lastSeen)) }}</td>
                    </tr>
                </tbody>
            </table>
        </AnalyticsSection>

        <AnalyticsSection title="Features used" :rows="report.topFeatures">
            <table class="table">
                <thead>
                    <tr>
                        <th>Feature</th>
                        <th class="text-right">Times</th>
                        <th class="text-right">People</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="feature in report.topFeatures" :key="feature.event + feature.listKind">
                        <td>{{ featureLabel(feature) }}</td>
                        <td class="text-right">{{ feature.times }}</td>
                        <td class="text-right">{{ feature.people }}</td>
                    </tr>
                </tbody>
            </table>
        </AnalyticsSection>

        <AnalyticsSection title="Most shared stories" description="Shared by LinkedIn, Email or Copy link, or sent to a magazine." :rows="report.topStories">
            <table class="table">
                <thead>
                    <tr>
                        <th>Story</th>
                        <th class="text-right">Shares</th>
                        <th class="text-right">Drafts sent</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="story in report.topStories" :key="story.url + story.title">
                        <td>
                            <a v-if="story.url" :href="story.url" target="_blank" rel="noopener" class="link font-bold">
                                {{ story.title }}<span class="sr-only"> (opens in a new tab)</span>
                            </a>
                            <span v-else class="font-bold">{{ story.title }}</span>
                            <div class="text-base-content/70">{{ story.source }}</div>
                        </td>
                        <td class="text-right">{{ story.shares }}</td>
                        <td class="text-right">{{ story.drafts }}</td>
                    </tr>
                </tbody>
            </table>
        </AnalyticsSection>

        <AnalyticsSection title="Top pages" :rows="report.topPages">
            <table class="table">
                <thead>
                    <tr>
                        <th>Page</th>
                        <th class="text-right">Views</th>
                        <th class="text-right">People</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="page in report.topPages" :key="page.screen">
                        <td>{{ pageLabel(page.screen) }}</td>
                        <td class="text-right">{{ page.views }}</td>
                        <td class="text-right">{{ page.people }}</td>
                    </tr>
                </tbody>
            </table>
        </AnalyticsSection>

        <AnalyticsSection title="Errors" description="Errors people ran into in the app. Not in the downloaded report." :rows="report.errors">
            <table class="table">
                <thead>
                    <tr>
                        <th>Error</th>
                        <th class="text-right">Times</th>
                        <th class="text-right">People</th>
                        <th>Last seen</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="error in report.errors" :key="error.message">
                        <td class="break-all">{{ error.message }}</td>
                        <td class="text-right">{{ error.times }}</td>
                        <td class="text-right">{{ error.people }}</td>
                        <td>{{ dateFormat.format(new Date(error.lastSeen)) }}</td>
                    </tr>
                </tbody>
            </table>
        </AnalyticsSection>

        <AnalyticsSection
            title="Replays"
            description="Recordings of visits, newest first, with everything typed hidden. They open in PostHog: sign in there first."
            :rows="report.replays"
        >
            <table class="table">
                <thead>
                    <tr>
                        <th>Person</th>
                        <th>Started</th>
                        <th class="text-right">Active minutes</th>
                        <th><span class="sr-only">Replay</span></th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="replay in report.replays" :key="replay.url">
                        <td>{{ replay.name }}</td>
                        <td>{{ dateFormat.format(new Date(replay.startedAt)) }}</td>
                        <td class="text-right">{{ replay.activeMinutes }}</td>
                        <td>
                            <a :href="replay.url" target="_blank" rel="noopener" class="link inline-flex items-center gap-1">
                                Watch<span class="sr-only"> {{ replay.name }}'s replay in PostHog (opens in a new tab)</span>
                                <ArrowTopRightOnSquareIcon class="size-4" aria-hidden="true" />
                            </a>
                        </td>
                    </tr>
                </tbody>
            </table>
        </AnalyticsSection>
    </div>
</template>
