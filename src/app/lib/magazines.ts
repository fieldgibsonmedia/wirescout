// The magazines a user can send story drafts to, and their connection to each (docs/post-to-modx-plan.md).
// Shared by Settings → Channels and every story's Share menu. Connecting, sending and the suggested text go
// through the Edge Functions: the MODX session never reaches the browser.
import { FunctionsHttpError } from '@supabase/supabase-js';
import { ref } from 'vue';
import { supabase } from '@/lib/supabase';

export type Magazine = {
    id: number;
    name: string;
    // The MODX username the user connected with, or null when not connected.
    connectedAs: string | null;
    // The stored sign-in stopped working (expired, password changed): the user signs in again.
    needsSignIn: boolean;
    // Shown greyed out with "Coming soon...": Wirescout can't reach this magazine yet.
    comingSoon: boolean;
};

export const magazines = ref<Magazine[]>([]);

export async function loadMagazines() {
    const [publications, connections] = await Promise.all([
        supabase.from('publications').select('id, name, coming_soon').not('cms', 'is', null).order('name'),
        supabase.from('magazine_connections').select('publication_id, cms_username, status'),
    ]);
    if (publications.error || connections.error) {
        return false;
    }

    magazines.value = publications.data.map((publication) => {
        const connection = connections.data.find((row) => row.publication_id === publication.id);
        return {
            id: publication.id,
            name: publication.name,
            connectedAs: connection?.cms_username ?? null,
            needsSignIn: connection?.status === 'needs_sign_in',
            comingSoon: publication.coming_soon,
        };
    });
    return true;
}

// duplicate: the magazine already has an article with this title, and existingUrl opens it (post-draft only).
type Failure = { ok: false; error: string; needsSignIn?: boolean; duplicate?: boolean; existingUrl?: string };

// Calls an Edge Function. A refusal comes back as the function's own message (e.g. MODX's words).
async function call<T>(name: string, body: Record<string, unknown>): Promise<({ ok: true } & T) | Failure> {
    const { data, error } = await supabase.functions.invoke<T>(name, { body });
    if (!error && data) {
        return { ok: true, ...data };
    }

    if (error instanceof FunctionsHttpError) {
        const answer = await error.context.json().catch(() => ({}));
        return {
            ok: false,
            error: answer.error ?? 'Something went wrong. Please try again.',
            needsSignIn: answer.status === 'needs_sign_in',
            duplicate: answer.status === 'duplicate',
            existingUrl: answer.existing_url ?? undefined,
        };
    }
    return { ok: false, error: "Wirescout couldn't be reached. Please try again." };
}

export async function connectMagazine(publicationId: number, username: string, password: string) {
    const result = await call<{ cms_username: string }>('magazine-connect', {
        action: 'connect',
        publication_id: publicationId,
        username,
        password,
    });
    if (result.ok) {
        await loadMagazines();
    }
    return result;
}

export async function disconnectMagazine(publicationId: number) {
    const result = await call('magazine-connect', { action: 'disconnect', publication_id: publicationId });
    if (result.ok) {
        await loadMagazines();
    }
    return result;
}

// The suggested title and text for the Send dialog. suggested is false when it's the story's own text.
export async function suggestDraft(articleId: number, publicationId: number) {
    return call<{ title: string; content: string; suggested: boolean }>('draft-text', {
        article_id: articleId,
        publication_id: publicationId,
    });
}

export async function sendDraft(draft: {
    articleId: number;
    publicationId: number;
    title: string;
    content: string;
    aiAssisted: boolean;
}) {
    const result = await call<{ id: number; edit_url: string }>('post-draft', {
        article_id: draft.articleId,
        publication_id: draft.publicationId,
        title: draft.title,
        content: draft.content,
        ai_assisted: draft.aiAssisted,
    });
    if (!result.ok && result.needsSignIn) {
        await loadMagazines();
    }
    return result;
}

// Stories already sent to a magazine (by anyone), so the same story isn't sent twice: the story card shows
// "Sent to <magazine>" and the Send dialog warns first. Keyed by story, then by magazine.
export type StorySend = { sentAt: string; sentBy: string; sentByMe: boolean; editUrl: string };

export const storySends = ref(new Map<number, Map<number, StorySend>>());

// Every story card asks for its own story: the asks made together go out as one request.
let waiting = new Set<number>();

export function loadStorySends(articleId: number) {
    if (waiting.size === 0) {
        queueMicrotask(sendWaiting);
    }
    waiting.add(articleId);
}

async function sendWaiting() {
    const articleIds = [...waiting];
    waiting = new Set();
    const { data, error } = await supabase.rpc('story_sends', { article_ids: articleIds });
    if (error) {
        return;
    }

    for (const articleId of articleIds) {
        const sends = new Map<number, StorySend>();
        for (const row of data.filter((send) => send.article_id === articleId)) {
            sends.set(row.publication_id, { sentAt: row.sent_at, sentBy: row.sent_by, sentByMe: row.sent_by_me, editUrl: row.edit_url });
        }
        storySends.value.set(articleId, sends);
    }
}
