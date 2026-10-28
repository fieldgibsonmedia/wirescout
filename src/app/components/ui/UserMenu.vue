<script setup lang="ts">
// The signed-in person's menu in the top bar: avatar and name, then Account settings and Sign out.
// Phones show the avatar only; the name stays for screen readers.
// Reka UI gives the menu's behaviour (closes on outside click and Esc, arrow keys, focus back on the button),
// like the Share menu; DaisyUI's classes give the look.
import { ChevronDownIcon } from '@heroicons/vue/20/solid';
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuRoot, DropdownMenuTrigger } from 'reka-ui';
import { RouterLink } from 'vue-router';
import Avatar from '@/components/ui/Avatar.vue';

defineProps<{
    name: string;
}>();

const emit = defineEmits<{
    signOut: [];
}>();

const itemClass =
    'flex min-h-11 cursor-pointer items-center rounded-field px-3 outline-none data-[highlighted]:bg-base-200 active:bg-base-300';
</script>

<template>
    <DropdownMenuRoot>
        <DropdownMenuTrigger class="btn btn-ghost gap-2 px-2">
            <Avatar />
            <span class="sr-only sm:not-sr-only">{{ name }}</span>
            <ChevronDownIcon class="hidden size-4 sm:block" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
            <DropdownMenuContent align="end" :side-offset="4" class="z-30 w-56 rounded-box border border-base-300 bg-base-100 p-2 shadow-sm">
                <DropdownMenuItem as-child>
                    <RouterLink :to="{ name: 'account-settings' }" :class="itemClass">Account settings</RouterLink>
                </DropdownMenuItem>
                <DropdownMenuItem :class="itemClass" @select="emit('signOut')">Sign out</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenuPortal>
    </DropdownMenuRoot>
</template>
