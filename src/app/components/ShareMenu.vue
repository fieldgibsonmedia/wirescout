<script setup lang="ts">
// The Share button on a story: LinkedIn, Email and Copy link, showing only the options the user
// switched on in Settings → Channels. LinkedIn and Email open the user's own LinkedIn or email app
// with the story filled in, so they post or send it as themselves.
// Reka UI gives the menu's behaviour (arrow keys, Esc, focus back on the button); DaisyUI's menu gives the look.
import { ArrowUpOnSquareIcon, CheckIcon } from '@heroicons/vue/20/solid';
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuRoot, DropdownMenuTrigger } from 'reka-ui';
import { computed, ref } from 'vue';
import { profile } from '@/lib/profile';
import { recordUsage } from '@/lib/usage';

const props = defineProps<{
    title: string;
    url: string;
    articleId: number;
}>();

const linkedInUrl = computed(() => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(props.url)}`);
const emailUrl = computed(
    () => `mailto:?subject=${encodeURIComponent(props.title)}&body=${encodeURIComponent(`${props.title}\n\n${props.url}`)}`,
);

const options = computed(() => ({
    linkedIn: profile.value?.share_linkedin ?? true,
    email: profile.value?.share_email ?? true,
    copyLink: profile.value?.share_copy_link ?? true,
}));

const anyOption = computed(() => Object.values(options.value).some(Boolean));

const copied = ref(false);

async function copyLink() {
    recordUsage('share_copy_link', props.articleId);
    await navigator.clipboard.writeText(props.url);
    copied.value = true;
    setTimeout(() => (copied.value = false), 3000);
}

const itemClass =
    'flex min-h-11 cursor-pointer items-center rounded-field px-3 outline-none data-[highlighted]:bg-base-200 active:bg-base-300';
</script>

<template>
    <div v-if="anyOption" class="flex items-center gap-2">
        <DropdownMenuRoot>
            <!-- Not the Button component: Reka can't find the button inside it, so focus wouldn't return to it on close. -->
            <DropdownMenuTrigger class="btn btn-ghost -ms-4">
                <ArrowUpOnSquareIcon class="size-5" aria-hidden="true" />
                Share<span class="sr-only"> story: {{ title }}</span>
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
                <DropdownMenuContent align="start" :side-offset="4" class="z-30 w-56 rounded-box border border-base-300 bg-base-100 p-2 shadow-sm">
                    <DropdownMenuItem v-if="options.linkedIn" as-child @select="recordUsage('share_linkedin', articleId)">
                        <a :href="linkedInUrl" target="_blank" rel="noopener" :class="itemClass">
                            LinkedIn<span class="sr-only"> (opens in a new tab)</span>
                        </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem v-if="options.email" as-child @select="recordUsage('share_email', articleId)">
                        <a :href="emailUrl" :class="itemClass">Email</a>
                    </DropdownMenuItem>
                    <DropdownMenuItem v-if="options.copyLink" :class="itemClass" @select="copyLink">Copy link</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenuPortal>
        </DropdownMenuRoot>

        <!-- Tells everyone, screen readers included, that the link is on the clipboard. -->
        <span role="status" class="flex items-center gap-1 text-sm text-success">
            <template v-if="copied">
                <CheckIcon class="size-4" aria-hidden="true" />
                Link copied
            </template>
        </span>
    </div>
</template>
