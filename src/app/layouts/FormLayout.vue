<script setup lang="ts">
// A one-task page with a form (sign in, set password…), centred both ways (DESIGN.md).
// Shows the title and description, an optional message at the top, the fields, the submit button,
// and links under it. Emits submit; pass busy while the form is sending, and the form's errors so the
// cursor moves to the first field that needs fixing.
import { nextTick, ref, watch } from 'vue';
import Button from '@/components/ui/Button.vue';
import Card from '@/components/ui/Card.vue';

const props = withDefaults(
    defineProps<{
        title: string;
        description?: string;
        submitLabel: string;
        busy?: boolean;
        errors?: Record<string, string>;
    }>(),
    {
        description: undefined,
        busy: false,
        errors: () => ({}),
    },
);

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
    <main class="grid min-h-screen place-items-center p-4">
        <div class="w-full max-w-sm">
            <Card>
                <!-- novalidate: the page checks the form, so every error shows the same way, next to its field. -->
                <form ref="form" class="flex flex-col gap-6" novalidate @submit.prevent="emit('submit')">
                    <header class="flex flex-col gap-2">
                        <h1 class="text-2xl font-bold">{{ title }}</h1>
                        <p v-if="description" class="text-base-content/70">{{ description }}</p>
                    </header>

                    <slot name="message" />

                    <div class="flex flex-col gap-2">
                        <slot />
                    </div>

                    <Button type="submit" :busy="busy">{{ submitLabel }}</Button>

                    <div v-if="$slots.links" class="flex justify-center">
                        <slot name="links" />
                    </div>
                </form>
            </Card>
        </div>
    </main>
</template>
