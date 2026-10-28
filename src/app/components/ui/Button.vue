<script setup lang="ts">
// The only button in the app: a DaisyUI btn.
// variant: primary (the main action), outline, ghost, error.
// Pass to (a route) to get a link that looks like a button.
// Pass busy while a form is sending: the button can't be pressed twice and shows a spinner.
import { RouterLink, type RouteLocationRaw } from 'vue-router';

withDefaults(
    defineProps<{
        variant?: 'primary' | 'outline' | 'ghost' | 'error';
        type?: 'button' | 'submit';
        to?: RouteLocationRaw;
        busy?: boolean;
    }>(),
    {
        variant: 'primary',
        type: 'button',
        to: undefined,
        busy: false,
    },
);

const variants = {
    primary: 'btn-primary hover:bg-primary-hover hover:border-primary-hover active:bg-primary-active active:border-primary-active',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
    error: 'btn-error',
};
</script>

<template>
    <RouterLink v-if="to" :to="to" :class="['btn', variants[variant]]"><slot /></RouterLink>
    <button v-else :type="type" :disabled="busy" :class="['btn', variants[variant]]">
        <!-- DaisyUI's spinner can't be stopped, so "Reduce motion" users get a label instead. -->
        <template v-if="busy">
            <span class="loading loading-spinner loading-sm motion-reduce:hidden" aria-hidden="true"></span>
            <span class="motion-safe:hidden">Processing…</span>
        </template>
        <slot />
    </button>
</template>
