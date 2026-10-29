<script setup lang="ts">
// The top of every page: its one h1, an optional line under it, and an optional actions slot
// for the page's main button (it sits at the end on wide screens and below on phones).
// The title-end slot sits right after the title, for a small menu button about the page's item.
defineProps<{
    title: string;
    description?: string;
}>();
</script>

<template>
    <div class="flex flex-wrap items-end justify-between gap-4">
        <header class="flex max-w-prose flex-col gap-2">
            <div class="flex items-center gap-2">
                <h1 class="text-3xl font-bold break-words">{{ title }}</h1>
                <slot name="title-end" />
            </div>
            <p v-if="description" class="text-lg text-base-content/70">{{ description }}</p>
        </header>
        <div v-if="$slots.actions" class="flex gap-2">
            <slot name="actions" />
        </div>
    </div>
</template>
