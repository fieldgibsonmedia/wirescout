<script setup lang="ts">
// The Share button on a story: Copy link, Email and LinkedIn, showing only the options the user
// switched on in Settings → Channels. LinkedIn and Email open the user's own LinkedIn or email app
// with the story filled in, so they post or send it as themselves.
// Above them, one "Send to <magazine>" per magazine the user added (Settings → Channels), and "Add a magazine",
// which opens Channels: a journalist only sees the magazines they work for. Magazines Wirescout can't reach yet
// stay out of this menu; Channels shows them greyed out with "Coming soon...".
// Reka UI gives the menu's behaviour (arrow keys, Esc, focus back on the button); DaisyUI's menu gives the look.
import { ArrowUpOnSquareIcon, CheckIcon } from '@heroicons/vue/20/solid';
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuRoot, DropdownMenuSeparator, DropdownMenuTrigger } from 'reka-ui';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import SendDraftDialog from '@/components/SendDraftDialog.vue';
import { magazines } from '@/lib/magazines';
import { profile } from '@/lib/profile';
import { track } from '@/lib/analytics';

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

const anyShareOption = computed(() => Object.values(options.value).some(Boolean));
// Added ones only; one that needs a new sign-in stays: the Send dialog asks for it.
const addedMagazines = computed(() => magazines.value.filter((magazine) => magazine.connectedAs && !magazine.comingSoon));
const anyOption = computed(() => anyShareOption.value || magazines.value.length > 0);

const router = useRouter();

const sendingTo = ref(0);
const sending = ref(false);

function startSending(magazineId: number) {
    sendingTo.value = magazineId;
    sending.value = true;
}

// The dialog opens from a menu item that's gone when it closes: the focus goes back to the Share button,
// so keyboard and screen reader users keep their place.
const trigger = ref<{ $el: HTMLElement }>();

function returnFocus(event: Event) {
    event.preventDefault();
    trigger.value?.$el.focus();
}

const copied = ref(false);

async function copyLink() {
    track('story_shared', { channel: 'copy_link', article_id: props.articleId });
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
            <DropdownMenuTrigger ref="trigger" class="btn btn-ghost -ms-4">
                <ArrowUpOnSquareIcon class="size-5" aria-hidden="true" />
                Share<span class="sr-only"> story: {{ title }}</span>
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
                <DropdownMenuContent align="start" :side-offset="4" class="menu-pop z-30 w-72 rounded-box border border-base-300 bg-base-100 p-2 shadow-sm">
                    <!-- The magazines first: sending a draft is the main reason to share from Wirescout. -->
                    <template v-if="magazines.length">
                        <DropdownMenuItem v-for="magazine in addedMagazines" :key="magazine.id" :class="itemClass" @select="startSending(magazine.id)">
                            Send to {{ magazine.name }}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator v-if="addedMagazines.length" class="my-2 h-px bg-base-300" />
                        <DropdownMenuItem :class="itemClass" @select="router.push({ name: 'channels-settings' })">Add a magazine</DropdownMenuItem>
                        <DropdownMenuSeparator v-if="anyShareOption" class="my-2 h-px bg-base-300" />
                    </template>
                    <DropdownMenuItem v-if="options.copyLink" :class="itemClass" @select="copyLink">Copy link</DropdownMenuItem>
                    <DropdownMenuItem v-if="options.email" as-child @select="track('story_shared', { channel: 'email', article_id: articleId })">
                        <a :href="emailUrl" :class="itemClass">Email</a>
                    </DropdownMenuItem>
                    <DropdownMenuItem v-if="options.linkedIn" as-child @select="track('story_shared', { channel: 'linkedin', article_id: articleId })">
                        <a :href="linkedInUrl" target="_blank" rel="noopener" :class="itemClass">
                            LinkedIn<span class="sr-only"> (opens in a new tab)</span>
                        </a>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenuPortal>
        </DropdownMenuRoot>

        <SendDraftDialog v-if="sendingTo" v-model:open="sending" :magazine-id="sendingTo" :article-id="articleId" @close-auto-focus="returnFocus" />

        <!-- Tells everyone, screen readers included, that the link is on the clipboard. -->
        <span role="status" class="flex items-center gap-1 text-sm text-success">
            <template v-if="copied">
                <CheckIcon class="size-4" aria-hidden="true" />
                Link copied
            </template>
        </span>
    </div>
</template>
