// The app's pages. Every page needs a signed-in user except the ones marked public.
// Signed-in pages are children of the layout, so the side nav stays in place between them.
import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '@/layouts/AppLayout.vue';
import { emailLink, supabase } from '@/lib/supabase';
import AccountSettingsPage from '@/pages/AccountSettingsPage.vue';
import ChannelsSettingsPage from '@/pages/ChannelsSettingsPage.vue';
import DashboardPage from '@/pages/DashboardPage.vue';
import DigestSettingsPage from '@/pages/DigestSettingsPage.vue';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage.vue';
import SetPasswordPage from '@/pages/SetPasswordPage.vue';
import SignInPage from '@/pages/SignInPage.vue';
import WatchListPage from '@/pages/WatchListPage.vue';

declare module 'vue-router' {
    interface RouteMeta {
        public?: boolean;
    }
}

export const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            component: AppLayout,
            children: [
                { path: '', name: 'dashboard', component: DashboardPage },
                { path: 'lists/:id', name: 'watch-list', component: WatchListPage, props: true },
                { path: 'settings/digest', name: 'digest-settings', component: DigestSettingsPage },
                { path: 'settings/channels', name: 'channels-settings', component: ChannelsSettingsPage },
                { path: 'account', name: 'account-settings', component: AccountSettingsPage },
            ],
        },
        { path: '/set-password', name: 'set-password', component: SetPasswordPage },
        { path: '/sign-in', name: 'sign-in', component: SignInPage, meta: { public: true } },
        { path: '/forgot-password', name: 'forgot-password', component: ForgotPasswordPage, meta: { public: true } },
        { path: '/:path(.*)*', redirect: '/' },
    ],
});

router.beforeEach(async (to) => {
    const { data } = await supabase.auth.getSession();

    // An invite or password-reset link: send the user to choose a password, once.
    if (data.session && emailLink.setPassword) {
        emailLink.setPassword = false;
        if (to.name !== 'set-password') {
            return { name: 'set-password' };
        }
    }

    if (!to.meta.public && !data.session) {
        return { name: 'sign-in' };
    }

    if (to.meta.public && data.session) {
        return { name: 'dashboard' };
    }
});
