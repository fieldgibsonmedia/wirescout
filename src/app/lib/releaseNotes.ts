// What's new in each version, newest first, for the dashboard's "What's new" card. Add an entry with each release,
// with the version from package.json, in words a journalist would use.
export const releaseNotes: { version: string; notes: string[] }[] = [
    {
        version: '0.1.0',
        notes: [
            'The dashboard shows each watch list at a glance: new stories, the last 7 days, its sources and any that fail, and its saved stories.',
            'Search all your watch lists at once from the box at the top: matching stories and sources.',
            'Save stories for later: click Save on a story, then find it under Saved on the Stories tab.',
            'Edit or delete a watch list from its ⋯ menu in the side bar. Its keywords are in Edit now.',
            'A cleaner look in light and dark, with smoother menus, dialogs and tabs.',
        ],
    },
];
