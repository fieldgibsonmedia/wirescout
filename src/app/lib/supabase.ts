// The app's one Supabase connection. The session is kept in the browser between visits,
// unless the user signed in without "Remember me": then it ends when the browser closes.
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

// "Remember me" unticked: this flag in localStorage, and a cookie with no expiry date, which the browser drops
// when it closes. Unlike sessionStorage, the cookie is shared by every tab, so a link opened in a new tab
// stays signed in. Flag without the cookie: the browser was closed, so the stored session is dropped before
// Supabase reads it. No flag (email-link sign-ins, sessions from before this): remembered, as before.
const FORGET_FLAG = 'wirescout-forget-session';
const SESSION_COOKIE = 'wirescout_session';

if (localStorage.getItem(FORGET_FLAG) && !document.cookie.split('; ').includes(`${SESSION_COOKIE}=1`)) {
    Object.keys(localStorage)
        .filter((key) => /^sb-.+-auth-token/.test(key))
        .forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem(FORGET_FLAG);
}

// Called after signing in on the sign-in page.
export function rememberSignIn(remember: boolean) {
    if (remember) {
        localStorage.removeItem(FORGET_FLAG);
        return;
    }
    localStorage.setItem(FORGET_FLAG, '1');
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${SESSION_COOKIE}=1; path=${import.meta.env.BASE_URL}; SameSite=Lax${secure}`;
}

// Called on sign-out, so a later email-link sign-in is remembered.
export function forgetSignInChoice() {
    localStorage.removeItem(FORGET_FLAG);
}

// Invite and password-reset emails link back to the app with details after the #.
// Read them before Supabase signs the user in and clears them from the address bar.
const linkDetails = new URLSearchParams(window.location.hash.slice(1));

export const emailLink = {
    // The link signed the user in, and they now choose a password.
    setPassword: ['invite', 'recovery'].includes(linkDetails.get('type') ?? ''),
    // The link was expired or already used.
    failed: linkDetails.has('error_code'),
};

export const supabase = createClient<Database>(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
