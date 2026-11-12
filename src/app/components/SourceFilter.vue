<script setup lang="ts">
// The watch list's "Sources" dropdown: shows only the stories of the sources picked (one or more). Each source shows
// its new stories, "BBC (8)"; the caller passes them in order (most new first, then A to Z). A search box in the
// dropdown narrows a long list (a bond list has hundreds of sources). Bind the picked source ids with v-model.
import { CheckIcon, ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/vue/20/solid';
import {
    ListboxContent,
    ListboxFilter,
    ListboxItem,
    ListboxItemIndicator,
    ListboxRoot,
    PopoverContent,
    PopoverPortal,
    PopoverRoot,
    PopoverTrigger,
} from 'reka-ui';
import { computed, ref } from 'vue';

const props = defineProps<{
    sources: { id: string; label: string; newCount: number }[];
}>();

const picked = defineModel<string[]>({ required: true });

const filter = ref('');
const shown = computed(() => {
    const term = filter.value.trim().toLowerCase();
    return term ? props.sources.filter((source) => source.label.toLowerCase().includes(term)) : props.sources;
});

const buttonLabel = computed(() => {
    if (picked.value.length === 0) {
        return 'All sources';
    }
    if (picked.value.length === 1) {
        return props.sources.find((source) => source.id === picked.value[0])?.label ?? '1 source';
    }
    return `${picked.value.length} sources`;
});
</script>

<template>
    <PopoverRoot @update:open="filter = ''">
        <PopoverTrigger
            :class="['btn max-w-full justify-between sm:max-w-64', picked.length > 0 ? 'btn-primary btn-soft' : 'border-base-content/50 bg-base-100']"
        >
            <span class="truncate"><span class="sr-only">Show stories from: </span>{{ buttonLabel }}</span>
            <ChevronDownIcon class="size-5 shrink-0" aria-hidden="true" />
        </PopoverTrigger>
        <PopoverPortal>
            <PopoverContent
                align="start"
                :side-offset="4"
                class="menu-pop z-30 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 rounded-box border border-base-300 bg-base-100 p-2 shadow-sm"
            >
                <ListboxRoot v-model="picked" multiple class="flex flex-col gap-2">
                    <label class="input w-full border-base-content/50 focus-within:border-primary focus-within:outline-primary focus-within:outline-offset-0">
                        <MagnifyingGlassIcon class="size-5 text-base-content/70" aria-hidden="true" />
                        <ListboxFilter v-model="filter" auto-focus placeholder="Find a source" aria-label="Find a source" />
                    </label>
                    <ListboxContent class="max-h-72 overflow-y-auto">
                        <ListboxItem
                            v-for="source in shown"
                            :key="source.id"
                            :value="source.id"
                            class="flex min-h-11 cursor-pointer items-center gap-2 rounded-field px-3 outline-none data-[highlighted]:bg-base-200"
                        >
                            <span class="flex size-5 shrink-0 items-center justify-center rounded-sm border border-base-content/50">
                                <ListboxItemIndicator>
                                    <CheckIcon class="size-4" aria-hidden="true" />
                                </ListboxItemIndicator>
                            </span>
                            <span class="min-w-0 flex-1 truncate">{{ source.label }}</span>
                            <span v-if="source.newCount > 0" class="font-medium">({{ source.newCount }})</span>
                            <span v-if="source.newCount > 0" class="sr-only">new</span>
                        </ListboxItem>
                        <p v-if="shown.length === 0" class="px-3 py-2 text-sm text-base-content/70">No source matches "{{ filter }}".</p>
                    </ListboxContent>
                </ListboxRoot>
                <button v-if="picked.length > 0" type="button" class="btn btn-ghost btn-sm self-start" @click="picked = []">
                    Show all sources
                </button>
            </PopoverContent>
        </PopoverPortal>
    </PopoverRoot>
</template>
