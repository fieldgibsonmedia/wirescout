// Light, dark, or Auto (follows the computer's setting). Saved per device, so it also applies on the sign-in page.
// DaisyUI shows the theme named in data-theme on <html>; without it, it follows the computer.
import { ref, watch } from 'vue';

export type Theme = 'auto' | 'light' | 'dark';

const STORAGE_KEY = 'theme';

function savedTheme(): Theme {
    try {
        const value = localStorage.getItem(STORAGE_KEY);
        return value === 'light' || value === 'dark' ? value : 'auto';
    } catch {
        // Some browsers block storage (private mode, strict settings): fall back to Auto.
        return 'auto';
    }
}

export const theme = ref<Theme>(savedTheme());

watch(
    theme,
    (value) => {
        if (value === 'auto') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', value);
        }

        try {
            localStorage.setItem(STORAGE_KEY, value);
        } catch {
            // Not saved: it still applies until the page is closed.
        }
    },
    { immediate: true },
);
