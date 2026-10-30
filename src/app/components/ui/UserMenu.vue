<script setup lang="ts">
// The signed-in person's menu in the top bar: their avatar (the name's initial), then Account settings and Sign out.
// The name is there for screen readers only, to save space.
// Reka UI gives the menu's behaviour (closes on outside click and Esc, arrow keys, focus back on the button),
// like the Share menu; DaisyUI's classes give the look.
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuRoot, DropdownMenuTrigger } from 'reka-ui';
import { RouterLink } from 'vue-router';
import Avatar from '@/components/ui/Avatar.vue';

defineProps<{
    name: string;
    initial: string;
}>();

const emit = defineEmits<{
    signOut: [];
}>();

const itemClass =
    'flex min-h-11 cursor-pointer items-center rounded-field px-3 outline-none data-[highlighted]:bg-base-200 active:bg-base-300';
</script>

<template>
    <DropdownMenuRoot>
        <DropdownMenuTrigger class="btn btn-circle btn-ghost">
            <Avatar :initials="initial" />
            <span class="sr-only">{{ name || 'Account' }}</span>
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
