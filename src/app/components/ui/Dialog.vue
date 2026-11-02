<script setup lang="ts">
// A dialog with a title, a close button and any content (default slot), for content that has its own
// buttons. Reka UI gives the behaviour (focus kept inside, Esc and outside click close, page scroll locked);
// DaisyUI's modal gives the look, like FormDialog. Open and close it with v-model:open.
// Pass wide for a dialog holding a long text (42rem instead of DaisyUI's 32rem): it stays shorter.
// close-auto-focus: when the dialog was opened from something that's gone by the time it closes (a menu item),
// call preventDefault() and move the focus yourself, or it lands on the page itself.
import { XMarkIcon } from '@heroicons/vue/24/outline';
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui';

defineProps<{
    title: string;
    wide?: boolean;
}>();

const open = defineModel<boolean>('open', { default: false });

const emit = defineEmits<{
    closeAutoFocus: [event: Event];
}>();
</script>

<template>
    <DialogRoot v-model:open="open">
        <DialogPortal>
            <!-- The overlay holds the dialog so tall content scrolls inside it instead of being cut off. -->
            <DialogOverlay class="dialog-fade modal modal-open">
                <DialogContent
                    :class="['dialog-pop modal-box flex flex-col gap-6', wide && 'max-w-2xl']"
                    :aria-describedby="undefined"
                    @close-auto-focus="emit('closeAutoFocus', $event)"
                >
                    <div class="flex items-start justify-between gap-4">
                        <DialogTitle class="text-xl font-bold">{{ title }}</DialogTitle>
                        <DialogClose class="btn btn-circle btn-ghost -me-2 -mt-2" aria-label="Close">
                            <XMarkIcon class="size-6" aria-hidden="true" />
                        </DialogClose>
                    </div>
                    <slot />
                </DialogContent>
            </DialogOverlay>
        </DialogPortal>
    </DialogRoot>
</template>
