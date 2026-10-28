<script setup lang="ts">
// Asks before a destructive action: a title, what will happen, then Cancel and the red confirm button.
// Reka UI's alert dialog gives the behaviour (focus starts on Cancel, so Enter never deletes by accident;
// focus kept inside; Esc cancels); DaisyUI's modal gives the look.
// Open and close it with v-model:open. It emits confirm; pass busy while the action runs, and close it when done.
import { AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogOverlay, AlertDialogPortal, AlertDialogRoot, AlertDialogTitle } from 'reka-ui';
import Button from '@/components/ui/Button.vue';

withDefaults(
    defineProps<{
        title: string;
        description: string;
        confirmLabel: string;
        busy?: boolean;
        error?: string;
    }>(),
    {
        busy: false,
        error: undefined,
    },
);

const open = defineModel<boolean>('open', { default: false });

const emit = defineEmits<{
    confirm: [];
}>();
</script>

<template>
    <AlertDialogRoot v-model:open="open">
        <AlertDialogPortal>
            <AlertDialogOverlay class="modal modal-open">
                <AlertDialogContent class="modal-box flex flex-col gap-6">
                    <div class="flex flex-col gap-1">
                        <AlertDialogTitle class="text-xl font-bold">{{ title }}</AlertDialogTitle>
                        <AlertDialogDescription class="text-base-content/70">{{ description }}</AlertDialogDescription>
                    </div>

                    <p v-if="error" role="alert" class="text-error">{{ error }}</p>

                    <div class="flex justify-end gap-3 border-t border-base-300 pt-6">
                        <!-- Not the Button component: Reka must find the button itself to focus it first. -->
                        <AlertDialogCancel class="btn btn-outline">Cancel</AlertDialogCancel>
                        <Button variant="error" :busy="busy" @click="emit('confirm')">{{ confirmLabel }}</Button>
                    </div>
                </AlertDialogContent>
            </AlertDialogOverlay>
        </AlertDialogPortal>
    </AlertDialogRoot>
</template>
