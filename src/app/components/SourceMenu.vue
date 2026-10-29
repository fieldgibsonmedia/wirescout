<script setup lang="ts">
// The "⋯" menu on a source in a watch list: Edit (the link), Move to… (another watch list, when the user
// has one) and Remove. The page does all three.
import { EllipsisHorizontalIcon } from '@heroicons/vue/20/solid';
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuRoot, DropdownMenuTrigger } from 'reka-ui';

defineProps<{
    label: string;
    canMove: boolean;
}>();

const emit = defineEmits<{
    edit: [];
    move: [];
    remove: [];
}>();

const itemClass =
    'flex min-h-11 cursor-pointer items-center rounded-field px-3 outline-none data-[highlighted]:bg-base-200 active:bg-base-300';
</script>

<template>
    <DropdownMenuRoot>
        <DropdownMenuTrigger class="btn btn-square btn-ghost" :aria-label="`Options for ${label}`">
            <EllipsisHorizontalIcon class="size-6" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
            <DropdownMenuContent align="end" :side-offset="4" class="z-30 w-48 rounded-box border border-base-300 bg-base-100 p-2 shadow-sm">
                <DropdownMenuItem :class="itemClass" @select="emit('edit')">Edit</DropdownMenuItem>
                <DropdownMenuItem v-if="canMove" :class="itemClass" @select="emit('move')">Move to…</DropdownMenuItem>
                <DropdownMenuItem :class="[itemClass, 'text-error']" @select="emit('remove')">Remove</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenuPortal>
    </DropdownMenuRoot>
</template>
