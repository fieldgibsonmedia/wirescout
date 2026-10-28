<script setup lang="ts">
// A small status tag (DaisyUI badge). variant: neutral, success or outline. size: md or sm.
withDefaults(
    defineProps<{
        variant?: 'neutral' | 'success' | 'outline';
        size?: 'md' | 'sm';
    }>(),
    {
        variant: 'neutral',
        size: 'md',
    },
);

const variants = {
    neutral: 'badge-ghost',
    success: 'badge-soft badge-success',
    outline: 'badge-outline',
};

const sizes = {
    md: '',
    sm: 'badge-sm',
};
</script>

<template>
    <span :class="['badge', variants[variant], sizes[size]]"><slot /></span>
</template>
