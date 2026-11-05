// The Analytics screen's report, as the analytics function sends it (src/analytics/posthog.js, buildReport),
// and the words it's shown with. Shared by the screen and the PDF (usagePdf.ts).
import type { AnalyticsEvent } from '@/lib/analytics';

export type Period = 'day' | 'week' | 'month' | 'half_year' | 'year' | 'all';

// Ken's list (2026-11-04).
export const PERIODS: { value: Period; label: string; description: string }[] = [
    { value: 'day', label: '1 Day', description: 'The last 24 hours' },
    { value: 'week', label: '1 Week', description: 'The last 7 days' },
    { value: 'month', label: '1 Month', description: 'The last 30 days' },
    { value: 'half_year', label: '6 Months', description: 'The last 6 months' },
    { value: 'year', label: '1 Year', description: 'The last 12 months' },
    { value: 'all', label: 'All', description: 'Everything since Wirescout started recording (v0.5.0)' },
];

// Each section is null when PostHog couldn't answer it.
export type Report = {
    activeUsers: { name: string; email: string; days: number; pages: number; lastSeen: string }[] | null;
    topPages: { screen: string; views: number; people: number }[] | null;
    topFeatures: { event: AnalyticsEvent; listKind: '' | 'documents'; times: number; people: number }[] | null;
    topStories: { title: string; url: string; source: string; shares: number; drafts: number }[] | null;
    errors: { message: string; times: number; people: number; lastSeen: string }[] | null;
    replays: { name: string; startedAt: string; activeMinutes: number; url: string }[] | null;
};

export const FEATURE_LABELS: Record<AnalyticsEvent, string> = {
    sources_added: 'Sources added',
    story_shared: 'Stories shared (LinkedIn, Email, Copy link)',
    draft_sent: 'Drafts sent to magazines',
    search: 'Searches',
    story_saved: 'Stories saved',
    digest_link_opened: 'Digest links opened',
    settings_changed: 'Settings changed',
    load_more: 'Load more (past the first 50 stories)',
};

// A feature's row: use in documents lists is its own row.
export function featureLabel(feature: { event: AnalyticsEvent; listKind: string }) {
    const label = FEATURE_LABELS[feature.event] ?? feature.event;
    return feature.listKind === 'documents' ? `${label} · Bond documents` : label;
}

// The screens, by route name (router.ts).
const PAGE_LABELS: Record<string, string> = {
    dashboard: 'Dashboard',
    'watch-list': 'Watch list',
    story: 'Story',
    search: 'Search',
    'digest-settings': 'Daily digest',
    'channels-settings': 'Channels',
    'system-settings': 'System settings',
    analytics: 'Analytics',
    'account-settings': 'Account settings',
    'set-password': 'Set your password',
};

export function pageLabel(screen: string) {
    return PAGE_LABELS[screen] ?? screen;
}

export const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
