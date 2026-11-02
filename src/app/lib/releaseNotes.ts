// What's new in each version, newest first, for the dashboard's "What's new" card. Add an entry with each release,
// with the version from package.json, in words a journalist would use.
export const releaseNotes: { version: string; notes: string[] }[] = [
    {
        version: '0.2.0',
        notes: [
            "Send a story to Corporate Disclosures as a draft: add the magazine once with your own MODX login in Settings → Channels, then pick Send to Corporate Disclosures in the story's Share menu.",
            'The draft comes with a suggested title and short brief, ending with the source link. Edit them as you like before you send.',
            "You'll see when a story was already sent to a magazine, so it isn't posted twice.",
            'Environmental Finance, InsuranceERM and Insurance Asset Risk are coming soon.',
        ],
    },
    {
        version: '0.1.0',
        notes: [
            'The dashboard shows each watch list at a glance: new stories, the last 7 days, its sources and any that fail, and its saved stories.',
            'Search all your watch lists at once from the box at the top: matching stories and sources.',
            'Save stories for later: click Save on a story, then find it under Saved on the Stories tab.',
            "Click a source's name on the Sources tab to open its page on the site, even when it fails.",
            'Edit or delete a watch list from its ⋯ menu in the side bar. Its keywords are in Edit now.',
            'A cleaner look in light and dark, with smoother menus, dialogs and tabs.',
        ],
    },
];
