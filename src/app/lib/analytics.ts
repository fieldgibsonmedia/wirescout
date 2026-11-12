// Usage analytics with PostHog (EU), read in Settings → Manager → Analytics (docs/mvp-plan.md, job 3).
// Only signed-in use is recorded, tied to the user's id, never their name or email. Nothing is kept in the
// browser (persistence: memory), so there's no cookie banner. Replays hide everything typed into fields, and any
// text marked with the class ph-mask (where the app shows a name or email).
// Manager pages show everyone's names and emails, so they're never in a replay.
// Without a key (locally, .env.development) nothing is sent: every function here does nothing.
import posthog, { type CaptureResult } from 'posthog-js';
// The replay script, bundled: PostHog would otherwise load it as posthog-recorder.js, a file name ad blockers block
// on every site, even through our proxy.
import 'posthog-js/dist/posthog-recorder';

const key = import.meta.env.VITE_POSTHOG_KEY;

// The main features, for the Analytics screen's "Top features".
export type AnalyticsEvent =
    | 'sources_added'
    | 'story_shared'
    | 'draft_sent'
    | 'search'
    | 'story_saved'
    | 'digest_link_opened'
    | 'settings_changed'
    | 'load_more'
    | 'source_filter'
    | 'mark_all_read';

// The signed-in user, or '' while signed out: nothing is sent then, not even errors or replays.
let userId = '';

// Addresses go without their ?…, so search terms stay out of PostHog. Nothing goes while signed out.
function beforeSend(event: CaptureResult | null) {
    if (!event || !userId) {
        return null;
    }
    for (const property of ['$current_url', '$referrer']) {
        const value = event.properties[property];
        if (typeof value === 'string' && URL.canParse(value)) {
            const url = new URL(value);
            event.properties[property] = url.origin + url.pathname;
        }
    }
    return event;
}

// Called on every signed-in page: starts PostHog once, and switches user after a sign-out and sign-in.
export function startAnalytics(id: string) {
    if (!key || userId === id) {
        return;
    }
    const started = userId !== '' || posthog.__loaded;
    userId = id;
    if (started) {
        posthog.identify(id);
        return;
    }
    posthog.init(key, {
        api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com',
        ui_host: 'https://eu.posthog.com',
        persistence: 'memory',
        bootstrap: { distinctID: id, isIdentifiedID: true },
        person_profiles: 'identified_only',
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        capture_exceptions: true,
        disable_surveys: true,
        session_recording: { maskAllInputs: true },
        before_send: beforeSend,
    });
}

export function stopAnalytics() {
    if (!key || !userId) {
        return;
    }
    userId = '';
    posthog.reset();
}

// A page, by its screen name (the route's name, e.g. "watch-list"), for "Top pages". The replay pauses on
// Manager pages.
export function trackPage(screen: string, managerPage: boolean) {
    if (!userId) {
        return;
    }
    if (managerPage) {
        posthog.stopSessionRecording();
    } else {
        posthog.startSessionRecording();
    }
    posthog.capture('$pageview', { screen });
}

export function track(event: AnalyticsEvent, properties?: Record<string, string | number | boolean>) {
    if (userId) {
        posthog.capture(event, properties);
    }
}
