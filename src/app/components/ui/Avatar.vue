<script setup lang="ts">
// A round avatar (DaisyUI avatar) in the primary colour: the initials if given, a person icon if not.
// Decorative: put the name in text beside it.
import { UserIcon } from '@heroicons/vue/24/outline';

defineProps<{
    initials?: string;
}>();
</script>

<template>
    <span class="avatar avatar-placeholder" aria-hidden="true">
        <span class="grid size-8 place-items-center rounded-full bg-primary text-sm text-primary-content">
            <template v-if="initials">{{ initials }}</template>
            <UserIcon v-else class="size-5" />
        </span>
    </span>
</template>
