<script setup lang="ts">
// A dialog holding a form: title, description, the fields (default slot), then Cancel and the submit button.
// Reka UI gives the behaviour (focus kept inside, Esc and outside click close, page scroll locked);
// DaisyUI's modal gives the look and centres it both ways.
// Open and close it with v-model:open. It emits submit; pass busy while the form is sending,
// and the form's errors so the cursor moves to the first field that needs fixing.
import { CheckIcon } from '@heroicons/vue/20/solid';
import { XMarkIcon } from '@heroicons/vue/24/outline';
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui';
import { nextTick, ref, watch } from 'vue';
import Button from '@/components/ui/Button.vue';

const props = withDefaults(
    defineProps<{
        title: string;
        description?: string;
        submitLabel?: string;
        busy?: boolean;
        errors?: Record<string, string>;
    }>(),
    {
        description: undefined,
        submitLabel: 'Save',
        busy: false,
        errors: () => ({}),
    },
);

const open = defineModel<boolean>('open', { default: false });

const emit = defineEmits<{
    submit: [];
}>();

const form = ref<HTMLFormElement>();

watch(
    () => props.errors,
    async (errors) => {
        if (Object.keys(errors).length === 0) {
            return;
        }

        await nextTick();
        form.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    },
);
</script>

<template>
    <DialogRoot v-model:open="open">
        <DialogPortal>
            <!-- The overlay holds the dialog so a tall form scrolls inside it instead of being cut off. -->
            <DialogOverlay class="modal modal-open">
                <DialogContent class="modal-box">
                    <!-- novalidate: the page checks the form, so every error shows the same way, next to its field. -->
                    <form ref="form" class="flex flex-col gap-6" novalidate @submit.prevent="emit('submit')">
                        <div class="flex items-start justify-between gap-4">
                            <div class="flex flex-col gap-1">
                                <DialogTitle class="text-xl font-bold">{{ title }}</DialogTitle>
                                <DialogDescription v-if="description" class="text-base-content/70">
                                    {{ description }}
                                </DialogDescription>
                            </div>
                            <DialogClose class="btn btn-circle btn-ghost -me-2 -mt-2" aria-label="Close">
                                <XMarkIcon class="size-6" aria-hidden="true" />
                            </DialogClose>
                        </div>

                        <div class="flex flex-col gap-2">
                            <slot />
                        </div>

                        <div class="flex justify-end gap-3 border-t border-base-300 pt-6">
                            <DialogClose as-child>
                                <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" :busy="busy">
                                <CheckIcon v-if="!busy" class="size-5" aria-hidden="true" />
                                {{ submitLabel }}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </DialogOverlay>
        </DialogPortal>
    </DialogRoot>
</template>
