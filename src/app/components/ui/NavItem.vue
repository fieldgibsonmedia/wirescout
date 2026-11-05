<script setup lang="ts">
// One item in the side nav (inside a DaisyUI menu): an icon (a Heroicons component) and a label.
// The current page is highlighted in the primary colour by the layout's menu.
// The badge slot sits right after the label, inside the link (a watch list's new stories).
// The end slot holds a small button at the item's end (a watch list's "⋯" menu), outside the link.
import type { Component } from 'vue';
import { RouterLink, type RouteLocationRaw } from 'vue-router';

defineProps<{
    to: RouteLocationRaw;
    label: string;
    icon: Component;
}>();
</script>

<template>
    <li class="group">
        <RouterLink :to="to" :class="['min-h-11 content-center', { 'pe-12': $slots.end }]" exact-active-class="menu-active">
            <component :is="icon" class="size-5 shrink-0" aria-hidden="true" />
            <span class="break-words">{{ label }}</span>
            <slot name="badge" />
        </RouterLink>
        <slot name="end" />
    </li>
</template>
