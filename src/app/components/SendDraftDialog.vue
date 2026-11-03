<script setup lang="ts">
// Sends a story to a magazine as an unpublished draft, as the user's own account there
// (docs/post-to-modx-plan.md, "The Send dialog"). Steps:
//   sign-in: not connected yet, or the stored sign-in stopped working: the MODX username and password first.
//   loading: the suggested title and text are being written (a few seconds).
//   edit:    the title and text, both editable. What is sent is what the user sees.
//   sent:    done: the same form, with the fields swapped for the confirmation, which holds the link to the draft
//            in the magazine's MODX manager, and Send greyed out, so it reads as the same dialog.
import { ArrowTopRightOnSquareIcon, CheckIcon } from '@heroicons/vue/20/solid';
import { DialogClose } from 'reka-ui';
import { computed, nextTick, ref, watch } from 'vue';
import MagazineSignInFields from '@/components/MagazineSignInFields.vue';
import Alert from '@/components/ui/Alert.vue';
import Button from '@/components/ui/Button.vue';
import Dialog from '@/components/ui/Dialog.vue';
import TextAreaField from '@/components/ui/TextAreaField.vue';
import TextField from '@/components/ui/TextField.vue';
import { connectMagazine, loadStorySends, magazines, sendDraft, storySends, suggestDraft } from '@/lib/magazines';

const props = defineProps<{
    magazineId: number;
    articleId: number;
}>();

const open = defineModel<boolean>('open', { default: false });

const magazine = computed(() => magazines.value.find((item) => item.id === props.magazineId));

const step = ref<'sign-in' | 'loading' | 'edit' | 'sent'>('loading');
const username = ref('');
const password = ref('');
const title = ref('');
const content = ref('');
const aiAssisted = ref(false);
// Set when the draft is the story's own text, not a suggestion: said above the fields, so the journalist checks it.
const fallbackReason = ref<'limit' | 'unavailable' | null>(null);
const editUrl = ref('');
const errors = ref<Record<string, string>>({});
const notice = ref('');
const failed = ref('');
const existingUrl = ref('');
// The title the magazine already has: sending it again would fail the same way, so Send waits for a new one.
const duplicateTitle = ref('');
// Someone (maybe a colleague at the same magazine) already sent this story there: check before sending again.
const earlierSend = computed(() => storySends.value.get(props.articleId)?.get(props.magazineId));
const earlierSendText = computed(() => {
    if (!earlierSend.value || !magazine.value) {
        return '';
    }
    const who = earlierSend.value.sentByMe ? 'You' : earlierSend.value.sentBy;
    const day = new Date(earlierSend.value.sentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `${who} already sent this story to ${magazine.value.name} on ${day}. Open it to check before sending it again.`;
});
const sendDisabled = computed(() => step.value === 'sent' || (duplicateTitle.value !== '' && title.value.trim() === duplicateTitle.value));
const busy = ref(false);
const openLink = ref<HTMLAnchorElement>();

// Each opening starts again; while it's open, the text survives signing in again.
// immediate: the Share menu creates the dialog already open.
watch(
    open,
    (isOpen) => {
        title.value = '';
        content.value = '';
        fallbackReason.value = null;
        if (!isOpen || !magazine.value) {
            return;
        }
        errors.value = {};
        failed.value = '';
        existingUrl.value = '';
        duplicateTitle.value = '';
        password.value = '';
        username.value = magazine.value.connectedAs ?? '';
        notice.value = magazine.value.needsSignIn ? `Your sign-in to ${magazine.value.name} has expired. Please sign in again.` : '';
        loadStorySends(props.articleId);
        if (magazine.value.connectedAs && !magazine.value.needsSignIn) {
            loadSuggestion();
        } else {
            step.value = 'sign-in';
        }
    },
    { immediate: true },
);

async function loadSuggestion() {
    step.value = 'loading';
    const result = await suggestDraft(props.articleId, props.magazineId);
    if (!result.ok) {
        failed.value = result.error;
        step.value = 'edit';
        return;
    }
    title.value = result.title;
    content.value = result.content;
    aiAssisted.value = result.suggested;
    fallbackReason.value = result.suggested ? null : (result.reason ?? null);
    step.value = 'edit';
}

async function signIn() {
    const missing: Record<string, string> = {};
    if (!username.value.trim()) missing.username = 'Enter your username.';
    if (!password.value) missing.password = 'Enter your password.';
    errors.value = missing;
    failed.value = '';
    if (Object.keys(missing).length) {
        return;
    }

    busy.value = true;
    const result = await connectMagazine(props.magazineId, username.value.trim(), password.value);
    busy.value = false;
    password.value = '';

    if (!result.ok) {
        // A wrong username or password goes under the fields; anything else (e.g. the magazine isn't responding)
        // above the buttons, so it doesn't read as a password problem.
        if (result.refused) {
            errors.value = { password: result.error };
        } else {
            failed.value = result.error;
        }
        return;
    }
    notice.value = '';
    // Signed in again from the edit step: keep what the user wrote.
    if (title.value) {
        step.value = 'edit';
    } else {
        loadSuggestion();
    }
}

async function send() {
    const missing: Record<string, string> = {};
    if (!title.value.trim()) missing.title = 'Enter a title.';
    if (!content.value.trim()) missing.content = 'Enter the text.';
    errors.value = missing;
    failed.value = '';
    existingUrl.value = '';
    if (Object.keys(missing).length) {
        return;
    }

    busy.value = true;
    const result = await sendDraft({
        articleId: props.articleId,
        publicationId: props.magazineId,
        title: title.value,
        content: content.value,
        aiAssisted: aiAssisted.value,
    });
    busy.value = false;

    if (result.ok) {
        editUrl.value = result.edit_url;
        step.value = 'sent';
        loadStorySends(props.articleId);
        // Send is greyed out now, so the focus moves on to the next thing to do.
        await nextTick();
        openLink.value?.focus();
    } else if (result.needsSignIn) {
        notice.value = result.error;
        step.value = 'sign-in';
    } else {
        failed.value = result.error;
        existingUrl.value = result.existingUrl ?? '';
        duplicateTitle.value = result.duplicate ? title.value.trim() : '';
    }
}
</script>

<template>
    <Dialog v-if="magazine" v-model:open="open" :title="`Send draft to ${magazine.name}`" wide>
        <form v-if="step === 'sign-in'" class="flex flex-col gap-4" novalidate @submit.prevent="signIn">
            <Alert v-if="notice" type="info">{{ notice }}</Alert>
            <p v-else>You haven't added {{ magazine.name }} yet. Sign in with your own account there, the one you use in its MODX manager.</p>
            <MagazineSignInFields v-model:username="username" v-model:password="password" :magazine="magazine.name" :errors="errors" />
            <Alert v-if="failed" type="error">{{ failed }}</Alert>
            <!-- The same footer as FormDialog, like the app's other dialogs. -->
            <div class="flex justify-end gap-3 border-t border-base-300 pt-6">
                <DialogClose as-child>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" :busy="busy">
                    <CheckIcon v-if="!busy" class="size-5" aria-hidden="true" />
                    Add magazine
                </Button>
            </div>
        </form>

        <div v-else-if="step === 'loading'" role="status" class="flex items-center gap-3 py-6">
            <span class="loading loading-spinner" aria-hidden="true" />
            Writing a suggested draft…
        </div>

        <form v-else class="flex flex-col gap-4" novalidate @submit.prevent="send">
            <Alert type="info" class="text-sm text-base-content">
                You're sending this as <strong>{{ magazine.connectedAs }}</strong>.<br />
                It goes in as a draft; you or an editor still reviews it.
            </Alert>
            <Alert v-if="step === 'sent'" type="success">
                <p>Draft sent to {{ magazine.name }}.</p>
                <a ref="openLink" :href="editUrl" target="_blank" rel="noopener" class="btn btn-sm btn-outline mt-3">
                    Open in {{ magazine.name }}
                    <ArrowTopRightOnSquareIcon class="size-4" aria-hidden="true" />
                    <span class="sr-only">(opens in a new tab)</span>
                </a>
            </Alert>
            <template v-else>
                <Alert v-if="fallbackReason === 'limit'" type="info" class="text-sm text-base-content">
                    You've used your 10 AI drafts for this hour, so this draft is the story's own text. Please check its language and
                    wording before sending.
                </Alert>
                <Alert v-else-if="fallbackReason === 'unavailable'" type="info" class="text-sm text-base-content">
                    Wirescout couldn't write a suggested draft this time, so this is the story's own text. Please check its language
                    and wording before sending.
                </Alert>
                <Alert v-if="earlierSend" type="warning" class="text-base-content">
                    <p>{{ earlierSendText }}</p>
                    <a :href="earlierSend.editUrl" target="_blank" rel="noopener" class="btn btn-sm btn-outline mt-3">
                        Open existing story
                        <ArrowTopRightOnSquareIcon class="size-4" aria-hidden="true" />
                        <span class="sr-only">(opens in a new tab)</span>
                    </a>
                </Alert>
                <TextField v-model="title" name="draft-title" label="Title" :error="errors.title" maxlength="255" required />
                <TextAreaField v-model="content" name="draft-content" label="Content" :error="errors.content" rows="8" required />
                <Alert v-if="failed" type="error">
                    <p>{{ failed }}</p>
                    <a v-if="existingUrl" :href="existingUrl" target="_blank" rel="noopener" class="btn btn-sm btn-outline btn-error mt-3">
                        Open existing story
                        <ArrowTopRightOnSquareIcon class="size-4" aria-hidden="true" />
                        <span class="sr-only">(opens in a new tab)</span>
                    </a>
                </Alert>
                <p class="text-sm text-base-content/70">
                    Wirescout uses AI to write drafts, and AI can make mistakes. Please check your draft before sending.
                </p>
            </template>
            <div class="flex justify-end gap-3 border-t border-base-300 pt-6">
                <!-- Once sent there's nothing left to cancel. -->
                <DialogClose as-child>
                    <Button variant="outline">{{ step === 'sent' ? 'Close' : 'Cancel' }}</Button>
                </DialogClose>
                <Button type="submit" :busy="busy" :disabled="sendDisabled">
                    <CheckIcon v-if="!busy" class="size-5" aria-hidden="true" />
                    {{ earlierSend && step !== 'sent' ? 'Send anyway' : 'Send' }}
                </Button>
            </div>
        </form>
    </Dialog>
</template>
