<script setup lang="ts">
// A multi-line text field with its label above, like TextField: DaisyUI fieldset + textarea.
// Bind it with v-model, and pass the field's validation error (errors.name) to show it under the field.
// Other attributes (maxlength, rows, …) go on the textarea.
defineOptions({ inheritAttrs: false });

withDefaults(
    defineProps<{
        name: string;
        label: string;
        error?: string;
        helper?: string;
        required?: boolean;
    }>(),
    {
        error: undefined,
        helper: undefined,
        required: false,
    },
);

const model = defineModel<string>({ default: '' });
</script>

<template>
    <fieldset class="fieldset">
        <label :for="name" class="fieldset-legend">
            <span>{{ label }}<span v-if="required" aria-hidden="true">*</span></span>
        </label>

        <!-- Same border, focus and error colours as TextField. -->
        <textarea
            :id="name"
            v-model="model"
            :name="name"
            :required="required"
            :aria-invalid="error ? 'true' : undefined"
            :aria-describedby="error || helper ? `${name}-help` : undefined"
            :class="[
                'textarea w-full focus:outline-offset-0',
                error ? 'textarea-error' : 'border-base-content/50 focus:border-primary focus:outline-primary',
            ]"
            v-bind="$attrs"
        />

        <p v-if="error" :id="`${name}-help`" class="label whitespace-normal text-error">{{ error }}</p>
        <p v-else-if="helper" :id="`${name}-help`" class="label whitespace-normal">{{ helper }}</p>
    </fieldset>
</template>
