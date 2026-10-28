<script setup lang="ts">
// A text field with its label above: DaisyUI fieldset + input.
// Bind it with v-model, and pass the field's validation error (errors.name) to show it under the field.
// Other attributes (autocomplete, placeholder, …) go on the input.
defineOptions({ inheritAttrs: false });

withDefaults(
    defineProps<{
        name: string;
        label: string;
        type?: string;
        error?: string;
        helper?: string;
        required?: boolean;
    }>(),
    {
        type: 'text',
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

        <!-- border-base-content/50: DaisyUI's default border is 1.5:1 on white, too faint to see; this gives 3.4:1. -->
        <!-- focus: the border and DaisyUI's focus ring take the site's primary colour; a field with an error stays red. -->
        <!-- focus:outline-offset-0: DaisyUI leaves a 2 px gap between the border and the focus ring; without it they read as one thicker border. -->
        <input
            :id="name"
            v-model="model"
            :name="name"
            :type="type"
            :required="required"
            :aria-invalid="error ? 'true' : undefined"
            :aria-describedby="error || helper ? `${name}-help` : undefined"
            :class="[
                'input w-full focus:outline-offset-0',
                error ? 'input-error' : 'border-base-content/50 focus:border-primary focus:outline-primary',
            ]"
            v-bind="$attrs"
        />

        <!-- whitespace-normal: DaisyUI's label never wraps, so a long message would overflow on phones. -->
        <p v-if="error" :id="`${name}-help`" class="label whitespace-normal text-error">{{ error }}</p>
        <p v-else-if="helper" :id="`${name}-help`" class="label whitespace-normal">{{ helper }}</p>
    </fieldset>
</template>
