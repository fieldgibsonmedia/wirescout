<script setup lang="ts">
// Every signed-in page sits in this layout: the side nav, the top bar with the account menu, and the page.
// Large screens keep the side nav open. Smaller screens hide it behind the menu button (DaisyUI drawer).
// The side nav comes first in the page so the Tab order matches what you see: brand and nav, then the top bar.
// The top bar's search field opens the Search page. On phones it's an icon that opens the field over the bar.
// Same layout as hub. It stays mounted between pages; only the page in the RouterView changes.
import { Bars3Icon, BellAlertIcon, ListBulletIcon, MagnifyingGlassIcon, ShareIcon, Squares2X2Icon } from '@heroicons/vue/24/outline';
import { PlusIcon } from '@heroicons/vue/20/solid';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import NewWatchListDialog from '@/components/NewWatchListDialog.vue';
import WatchListMenu from '@/components/WatchListMenu.vue';
import NavItem from '@/components/ui/NavItem.vue';
import SearchField from '@/components/ui/SearchField.vue';
import UserMenu from '@/components/ui/UserMenu.vue';
import { loadProfile, profile } from '@/lib/profile';
import { supabase } from '@/lib/supabase';
import { creatingWatchList, loadWatchLists, watchLists } from '@/lib/watchLists';

const route = useRoute();
const router = useRouter();

const open = ref(false);
const menuButton = ref<HTMLButtonElement>();
const nav = ref<HTMLElement>();
const side = ref<HTMLElement>();

const userName = computed(() => profile.value?.full_name || profile.value?.email || '');
// The avatar shows the name's first letter; without a name, the person icon.
const userInitial = computed(() => profile.value?.full_name?.trim().charAt(0).toUpperCase() ?? '');

const version = __APP_VERSION__;

const search = ref('');
// Phones only: the search field is open over the top bar.
const searchOpen = ref(false);
const searchForm = ref<HTMLFormElement>();
const searchButton = ref<HTMLButtonElement>();

// On the Search page the field shows what was searched; elsewhere it starts empty.
watch(
    () => route.query.q,
    (query) => {
        search.value = route.name === 'search' && typeof query === 'string' ? query : '';
    },
    { immediate: true },
);

async function openSearch() {
    searchOpen.value = true;
    await nextTick();
    searchForm.value?.querySelector('input')?.focus();
}

async function closeSearch() {
    searchOpen.value = false;
    await nextTick();
    searchButton.value?.focus();
}

// Esc closes the open field on phones. It keeps the text: Chrome would also clear a search field on Esc.
function closeSearchOnEscape(event: KeyboardEvent) {
    if (searchOpen.value) {
        event.preventDefault();
        closeSearch();
    }
}

function submitSearch() {
    const query = search.value.trim();
    if (query) {
        searchOpen.value = false;
        router.push({ name: 'search', query: { q: query } });
    }
}

// The drawer must work from the keyboard (DESIGN.md): the menu button opens and closes it,
// focus moves into the nav when it opens and back to the button when it closes, and Esc closes it.
async function setOpen(value: boolean) {
    open.value = value;

    if (!value) {
        menuButton.value?.focus();
        return;
    }

    // A hidden link can't take focus, and the drawer is only sure to be visible once its
    // opening transition ends. With reduced motion there's no transition.
    await nextTick();
    const focusFirstLink = () => nav.value?.querySelector<HTMLElement>('a[href]')?.focus();

    if (!side.value || getComputedStyle(side.value).transitionProperty === 'none') {
        focusFirstLink();
        return;
    }

    side.value.addEventListener('transitionend', function onEnd(event) {
        if (event.target === side.value && event.propertyName === 'visibility') {
            side.value?.removeEventListener('transitionend', onEnd);
            focusFirstLink();
        }
    });
}

function closeOnEscape(event: KeyboardEvent) {
    if (event.key === 'Escape' && open.value) {
        setOpen(false);
    }
}

// Going to another page closes the drawer on phones.
const stopListening = router.afterEach(() => {
    open.value = false;
});

onMounted(() => {
    document.addEventListener('keydown', closeOnEscape);
    loadProfile();
    loadWatchLists();
});

onUnmounted(() => {
    document.removeEventListener('keydown', closeOnEscape);
    stopListening();
});
</script>

<template>
    <div class="drawer lg:drawer-open">
        <!-- Tapping the dark overlay closes the drawer through this checkbox. -->
        <input id="side-nav" v-model="open" type="checkbox" class="drawer-toggle" tabindex="-1" aria-hidden="true" />

        <div ref="side" class="drawer-side z-20 motion-reduce:transition-none">
            <label for="side-nav" class="drawer-overlay" aria-hidden="true"></label>

            <nav
                id="side-nav-panel"
                ref="nav"
                class="flex min-h-full w-72 flex-col gap-4 border-e border-base-300 bg-base-100 p-4 motion-reduce:transition-none"
                aria-label="Main"
            >
                <!-- aria-current off: it's the brand, not a menu item, and DaisyUI would show it as pressed on the dashboard. -->
                <RouterLink to="/" class="btn btn-ghost justify-start text-xl font-bold" aria-current="false">Wirescout</RouterLink>

                <ul class="menu w-full gap-1 p-0 text-base [--menu-active-bg:var(--color-primary)] [--menu-active-fg:var(--color-primary-content)]">
                    <NavItem to="/" label="Dashboard" :icon="Squares2X2Icon" />

                    <li class="menu-title mt-4 text-base-content/70">Watch lists</li>
                    <NavItem
                        v-for="list in watchLists"
                        :key="list.id"
                        :to="{ name: 'watch-list', params: { id: list.id } }"
                        :label="list.name"
                        :icon="ListBulletIcon"
                    >
                        <!-- Shown on hover and focus, while open, and always where the nav is a drawer (phones and tablets). -->
                        <!-- On the open list, white on the blue highlight. -->
                        <template #end>
                            <WatchListMenu
                                :id="list.id"
                                :name="list.name"
                                :keywords="list.keywords"
                                :trigger-class="[
                                    'btn-sm absolute end-1 top-1/2 -translate-y-1/2 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 lg:data-[state=open]:opacity-100',
                                    route.name === 'watch-list' && route.params.id === list.id ? 'text-primary-content' : '',
                                ].join(' ')"
                            />
                        </template>
                    </NavItem>
                    <li>
                        <button type="button" class="min-h-11 content-center" @click="creatingWatchList = true">
                            <PlusIcon class="size-5" aria-hidden="true" />
                            New watch list
                        </button>
                    </li>
                </ul>

                <ul class="menu mt-auto w-full gap-1 p-0 text-base [--menu-active-bg:var(--color-primary)] [--menu-active-fg:var(--color-primary-content)]">
                    <li class="menu-title text-base-content/70">Settings</li>
                    <NavItem :to="{ name: 'digest-settings' }" label="Daily digest" :icon="BellAlertIcon" />
                    <NavItem :to="{ name: 'channels-settings' }" label="Channels" :icon="ShareIcon" />
                </ul>

                <p class="px-3 text-xs text-base-content/70">v{{ version }}</p>
            </nav>
        </div>

        <div class="drawer-content flex min-h-screen min-w-0 flex-col">
            <header class="navbar sticky top-0 z-10 gap-2 border-b border-base-300 bg-base-100 px-4">
                <div :class="['flex flex-none items-center gap-2 lg:hidden', searchOpen ? 'max-sm:hidden' : '']">
                    <button
                        ref="menuButton"
                        type="button"
                        class="btn btn-circle btn-ghost"
                        aria-label="Menu"
                        aria-controls="side-nav-panel"
                        :aria-expanded="open"
                        @click="setOpen(!open)"
                    >
                        <Bars3Icon class="size-6" aria-hidden="true" />
                    </button>
                    <!-- On phones the side nav is hidden, so the brand shows here. -->
                    <RouterLink to="/" class="btn btn-ghost px-2 text-xl font-bold" aria-current="false">Wirescout</RouterLink>
                </div>

                <form
                    ref="searchForm"
                    role="search"
                    :class="['min-w-0 flex-1 items-center gap-2 sm:flex sm:flex-none', searchOpen ? 'flex' : 'hidden']"
                    @submit.prevent="submitSearch"
                    @keydown.esc="closeSearchOnEscape"
                >
                    <SearchField v-model="search" label="Search all watch lists" />
                    <button v-if="searchOpen" type="button" class="btn btn-ghost sm:hidden" @click="closeSearch">Cancel</button>
                </form>

                <div :class="['ms-auto flex items-center gap-2', searchOpen ? 'max-sm:hidden' : '']">
                    <button ref="searchButton" type="button" class="btn btn-circle btn-ghost sm:hidden" aria-label="Search" @click="openSearch">
                        <MagnifyingGlassIcon class="size-6" aria-hidden="true" />
                    </button>
                    <UserMenu :name="userName" :initial="userInitial" @sign-out="supabase.auth.signOut()" />
                </div>
            </header>

            <main class="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 md:p-8">
                <!-- Each new page fades in (page-enter-active in app.css); the old one goes at once. -->
                <!-- The wrapper gives the Transition one element: pages have several at their top. -->
                <RouterView v-slot="{ Component, route }">
                    <Transition name="page">
                        <div :key="route.path" class="flex flex-1 flex-col gap-6">
                            <component :is="Component" />
                        </div>
                    </Transition>
                </RouterView>
            </main>
        </div>

        <NewWatchListDialog v-model:open="creatingWatchList" />
    </div>
</template>
