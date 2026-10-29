<script setup lang="ts">
// One box per watch list with its number of new items. A box opens its list.
import { PlusIcon } from '@heroicons/vue/20/solid';
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import Alert from '@/components/ui/Alert.vue';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import Card from '@/components/ui/Card.vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import { supabase } from '@/lib/supabase';
import { creatingWatchList, loadWatchLists, watchLists } from '@/lib/watchLists';

const newCounts = ref(new Map<string, number>());
const loading = ref(true);
const failed = ref(false);

const boxes = computed(() => watchLists.value.map((list) => ({ ...list, newCount: newCounts.value.get(list.id) ?? 0 })));

async function load() {
    loading.value = true;
    failed.value = false;

    const [listsLoaded, counts] = await Promise.all([
        loadWatchLists(),
        supabase.from('watch_list_new_counts').select('watch_list_id, new_count'),
    ]);

    loading.value = false;
    if (!listsLoaded || counts.error) {
        failed.value = true;
        return;
    }

    newCounts.value = new Map(counts.data.map((count) => [count.watch_list_id ?? '', count.new_count ?? 0]));
}

onMounted(load);
</script>

<template>
    <PageHeader title="Dashboard">
        <template v-if="watchLists.length > 0" #actions>
            <Button @click="creatingWatchList = true">
                <PlusIcon class="size-5" aria-hidden="true" />
                New watch list
            </Button>
        </template>
    </PageHeader>

    <div v-if="loading" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading watch lists">
        <div v-for="index in 3" :key="index" class="skeleton h-28"></div>
    </div>

    <Alert v-else-if="failed" type="error">
        <p>Your watch lists couldn't be loaded.</p>
        <button type="button" class="link mt-2" @click="load">Try again</button>
    </Alert>

    <Card v-else-if="watchLists.length === 0">
        <h2 class="text-xl font-bold">No watch lists yet</h2>
        <p class="max-w-prose">A watch list follows the news sources you pick and shows their new stories here.</p>
        <div>
            <Button @click="creatingWatchList = true">
                <PlusIcon class="size-5" aria-hidden="true" />
                New watch list
            </Button>
        </div>
    </Card>

    <ul v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="list in boxes" :key="list.id">
            <RouterLink
                :to="{ name: 'watch-list', params: { id: list.id } }"
                class="card h-full border border-base-300 bg-base-100 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-base-200 motion-reduce:transition-none"
            >
                <div class="card-body gap-3 p-4 md:p-6">
                    <h2 class="card-title text-lg break-words">{{ list.name }}</h2>
                    <div>
                        <Badge v-if="list.newCount > 0" variant="success">{{ list.newCount }} new</Badge>
                        <Badge v-else>No new items</Badge>
                    </div>
                </div>
            </RouterLink>
        </li>
    </ul>
</template>
