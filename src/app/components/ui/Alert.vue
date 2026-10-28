<script setup lang="ts">
// A message at the top of a page (DaisyUI alert). type: error, success, info.
// Errors interrupt screen readers right away; the others wait their turn.
withDefaults(
    defineProps<{
        type?: 'error' | 'success' | 'info';
    }>(),
    {
        type: 'info',
    },
);

const types = {
    error: 'alert-error',
    success: 'alert-success',
    info: 'alert-info',
};
</script>

<template>
    <div :role="type === 'error' ? 'alert' : 'status'" :class="['alert alert-soft', types[type]]">
        <div><slot /></div>
    </div>
</template>
