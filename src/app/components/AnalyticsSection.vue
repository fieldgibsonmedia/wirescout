<script setup lang="ts">
// One section of the Analytics screen: a card with its title, and its table (default slot) once there are rows.
// rows is null when PostHog couldn't answer that section.
import Card from '@/components/ui/Card.vue';

defineProps<{
    title: string;
    description?: string;
    rows: unknown[] | null;
}>();
</script>

<template>
    <Card>
        <header class="flex flex-col gap-1">
            <h2 class="text-xl font-bold">{{ title }}</h2>
            <p v-if="description" class="max-w-prose text-base-content/70">{{ description }}</p>
        </header>
        <p v-if="rows === null" class="text-base-content/70">This couldn't be loaded. Please try again later.</p>
        <p v-else-if="rows.length === 0" class="text-base-content/70">Nothing in this period.</p>
        <div v-else class="overflow-x-auto">
            <slot />
        </div>
    </Card>
</template>
