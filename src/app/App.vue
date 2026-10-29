<script setup lang="ts">
// When the session ends (signed out here or in another tab, or expired), forget the user's data
// and go back to the sign-in page.
import { RouterView, useRouter } from 'vue-router';
import { profile } from '@/lib/profile';
import { supabase } from '@/lib/supabase';
import { watchLists } from '@/lib/watchLists';

const router = useRouter();

supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
        profile.value = null;
        watchLists.value = [];
        router.push({ name: 'sign-in' });
    }
});
</script>

<template>
    <RouterView />
</template>
