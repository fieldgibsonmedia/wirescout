// What's new in each version, newest first, for the dashboard's "What's new" card, in words a journalist would use.
// The newest entry takes package.json's version, so the app shows one version everywhere. When the version goes up,
// type the old number into this entry and add a new one on top. Every job that changes what users get raises the version
// (docs/mvp-plan.md, Decisions).
export const releaseNotes: { version: string; notes: string[] }[] = [
    {
        version: __APP_VERSION__,
        notes: ['For super admins: if you are the only one, Delete account opens a message with a button to System admins, to assign another first.'],
    },
    {
        version: '0.5.7',
        notes: ['The All stories · Saved switch in a watch list is easier to see: the option not chosen has a white background.'],
    },
    {
        version: '0.5.6',
        notes: ['Fixed: a source you add could show as failing, although its link check had just passed.'],
    },
    {
        version: '0.5.5',
        notes: ['The Wirescout robot now sits next to the name on the sign-in screens, in the daily digest and in account emails.'],
    },
    {
        version: '0.5.4',
        notes: ["The Privacy policy now says that session recordings show only Wirescout's own pages, never your computer, screen or other tabs."],
    },
    {
        version: '0.5.3',
        notes: ['For super admins: Analytics always shows the latest figures. Before, it could be up to 6 hours behind.'],
    },
    {
        version: '0.5.2',
        notes: ['Fixed: session replays in usage statistics were missing for some browsers.'],
    },
    {
        version: '0.5.1',
        notes: ['Fixed: usage statistics were missing for some browsers.'],
    },
    {
        version: '0.5.0',
        notes: [
            'A Privacy policy at the bottom of the side bar: what Wirescout records about how it is used, and who sees it.',
            'For super admins: Analytics in Manager shows who uses Wirescout, what they use and the most shared stories, with a report to download.',
        ],
    },
    {
        version: '0.4.0',
        notes: [
            'For super admins: System settings has two tabs, Platform access (who can sign up) and System admins (add or remove super admins).',
            'Wirescout always keeps at least one super admin: the only one is asked to assign another before deleting their account.',
        ],
    },
    {
        version: '0.3.0',
        notes: ['Delete your account yourself, at the bottom of Account settings. Everything in it goes with it.'],
    },
    {
        version: '0.2.0',
        notes: [
            'New sources show their latest stories straight away, instead of after the next hourly check.',
            "Adding many sources at once works with big news sites too. If a link can't be checked, only that one is left out, and the rest are added.",
            'The same address written two ways (with or without www., http or https) is added only once.',
            'The file upload box is smaller again, so the addresses it finds show without scrolling.',
        ],
    },
    {
        version: '0.1.0',
        notes: [
            "Send a story to Corporate Disclosures as a draft: add the magazine once with your own MODX login in Settings → Channels, then pick Send to Corporate Disclosures in the story's Share menu.",
            'The draft comes with a suggested title and short brief, ending with the source link. Edit them as you like before you send.',
            "Suggested drafts are always in British English, even when the story isn't.",
            "You'll see when a story was already sent to a magazine, so it isn't posted twice.",
            'Environmental Finance, InsuranceERM and Insurance Asset Risk are coming soon.',
            'Remember me when you sign in: leave it unticked to be signed out when you close your browser.',
            'Your watch lists and settings are listed A–Z in the side bar.',
            'The dashboard shows each watch list at a glance: new stories, the last 7 days, its sources and any that fail, and its saved stories.',
            'Search all your watch lists at once from the box at the top: matching stories and sources.',
            'Save stories for later: click Save on a story, then find it under Saved on the Stories tab.',
            "Click a source's name on the Sources tab to open its page on the site, even when it fails.",
            'Edit or delete a watch list from its ⋯ menu in the side bar. Its keywords are in Edit now.',
            'A cleaner look in light and dark, with smoother menus, dialogs and tabs.',
        ],
    },
];
