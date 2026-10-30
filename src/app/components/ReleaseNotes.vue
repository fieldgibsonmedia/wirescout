<script setup lang="ts">
// The dashboard's "What's new" card: the latest version's notes, and the earlier ones behind "Earlier versions".
import Badge from '@/components/ui/Badge.vue';
import Card from '@/components/ui/Card.vue';
import { releaseNotes } from '@/lib/releaseNotes';

const [latest, ...earlier] = releaseNotes;
</script>

<template>
    <Card v-if="latest">
        <div class="flex items-center gap-2">
            <h2 class="text-xl font-bold">What's new</h2>
            <Badge size="sm">v{{ latest.version }}</Badge>
        </div>
        <ul class="flex max-w-prose list-disc flex-col gap-1 ps-5">
            <li v-for="note in latest.notes" :key="note">{{ note }}</li>
        </ul>

        <details v-if="earlier.length > 0">
            <summary class="link w-fit">Earlier versions</summary>
            <div class="mt-4 flex flex-col gap-4">
                <section v-for="release in earlier" :key="release.version">
                    <h3 class="font-semibold">v{{ release.version }}</h3>
                    <ul class="mt-1 flex max-w-prose list-disc flex-col gap-1 ps-5">
                        <li v-for="note in release.notes" :key="note">{{ note }}</li>
                    </ul>
                </section>
            </div>
        </details>
    </Card>
</template>
