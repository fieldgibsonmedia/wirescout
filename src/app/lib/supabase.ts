// The app's one Supabase connection. The session is kept in the browser between visits.
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

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
