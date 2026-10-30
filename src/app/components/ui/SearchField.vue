<script setup lang="ts">
// A search box with a magnifier icon (DaisyUI input around a search input), as in the watch list's tabs.
// Bind it with v-model. label is read by screen readers and shown as the placeholder.
import { MagnifyingGlassIcon } from '@heroicons/vue/20/solid';

defineProps<{
    label: string;
}>();

const model = defineModel<string>({ default: '' });
</script>

<template>
    <!-- Same border and focus colours as TextField: the outline sits on the border, with no gap. -->
    <label class="input w-full border-base-content/50 focus-within:border-primary focus-within:outline-primary focus-within:outline-offset-0 sm:w-72">
        <MagnifyingGlassIcon class="size-5 text-base-content/70" aria-hidden="true" />
        <input v-model="model" type="search" :placeholder="label" :aria-label="label" />
    </label>
</template>
