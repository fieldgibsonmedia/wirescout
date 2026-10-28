<script setup lang="ts">
// A dropdown with its label above: DaisyUI fieldset + native select (keyboard and screen reader support for free).
// Bind it with v-model and pass the field's validation error or a helper line, like TextField.
// options are { value, label } pairs. placeholder is the empty first choice ("Select publication").
defineOptions({ inheritAttrs: false });

withDefaults(
    defineProps<{
        name: string;
        label: string;
        options: { value: string; label: string }[];
        placeholder?: string;
        error?: string;
        helper?: string;
        required?: boolean;
    }>(),
    {
        placeholder: undefined,
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

        <!-- Same border and focus colours as TextField. -->
        <select
            :id="name"
            v-model="model"
            :name="name"
            :required="required"
            :aria-invalid="error ? 'true' : undefined"
            :aria-describedby="error || helper ? `${name}-help` : undefined"
            :class="[
                'select w-full focus:outline-offset-0',
                error ? 'select-error' : 'border-base-content/50 focus:border-primary focus:outline-primary',
            ]"
            v-bind="$attrs"
        >
            <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
            <option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>

        <p v-if="error" :id="`${name}-help`" class="label whitespace-normal text-error">{{ error }}</p>
        <p v-else-if="helper" :id="`${name}-help`" class="label whitespace-normal">{{ helper }}</p>
    </fieldset>
</template>
