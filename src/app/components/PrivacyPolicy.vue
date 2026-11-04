<script setup lang="ts">
// "Privacy policy" next to the version at the bottom of the side nav: what Wirescout records about its users,
// who sees it, and what it keeps for the magazines (docs/mvp-plan.md, job 3). Keep it in step with lib/analytics.ts.
// Also on the sign-up page, in the required "I've read and agree" checkbox (Ken, 2026-11-04): the link's words
// are the default slot, and classes go on the link.
// Plain, professional wording (Ken, 2026-11-04). "Pseudonymised", never "anonymised": names can be added back.
import { ref } from 'vue';
import Dialog from '@/components/ui/Dialog.vue';

defineOptions({ inheritAttrs: false });

const open = ref(false);
</script>

<template>
    <button type="button" class="link" v-bind="$attrs" @click="open = true"><slot>Privacy policy</slot></button>

    <Dialog v-model:open="open" title="Privacy policy" wide>
        <div class="flex flex-col gap-4">
            <section class="flex flex-col gap-2">
                <h3 class="font-bold">Usage analytics</h3>
                <p>
                    Wirescout uses PostHog, hosted in the EU, to understand how the product is used and to diagnose errors. This covers pages viewed,
                    features used, error reports and session recordings. Recordings never include what you type or your name and email address.
                    Recordings show only Wirescout's own pages, as they appear in its tab. They never capture your computer or phone, its screen,
                    other apps, other tabs or websites, or anything else in your browser.
                </p>
                <p>
                    Data is pseudonymised: PostHog receives an account identifier, never your name or email address. It is collected only while you
                    are signed in, without cookies or browser storage.
                </p>
            </section>

            <section class="flex flex-col gap-2">
                <h3 class="font-bold">Access</h3>
                <p>Usage data is available only to Wirescout administrators.</p>
            </section>

            <section class="flex flex-col gap-2">
                <h3 class="font-bold">Magazine accounts</h3>
                <p>
                    Your MODX password is never stored. To send your drafts, Wirescout keeps an encrypted session, held on its servers only, never in
                    your browser, to ensure maximum privacy and security.
                </p>
            </section>

            <section class="flex flex-col gap-2">
                <h3 class="font-bold">Account deletion</h3>
                <p>Deleting your account in Account settings removes all its data, including the data held by PostHog.</p>
            </section>
        </div>
    </Dialog>
</template>
