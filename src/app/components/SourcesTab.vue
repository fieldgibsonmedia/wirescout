<script setup lang="ts">
// A watch list's sources as a table (TanStack Table): search, sort by any column (failing sources first by
// default), tick boxes to move or remove many at once, and a "⋯" menu on each row (Edit, Move to…, Remove),
// plus Fix on failing sources. "Add sources" opens a dialog to paste links or upload a file.
// On a phone each row stacks into a small card. Emits changed when the sources change, so the page reloads
// its stories.
import { ChevronDownIcon, ChevronUpDownIcon, ChevronUpIcon, ExclamationTriangleIcon, MagnifyingGlassIcon, PlusIcon } from '@heroicons/vue/20/solid';
import {
    columnFilteringFeature,
    createFilteredRowModel,
    createSortedRowModel,
    filterFn_includesString,
    globalFilteringFeature,
    rowSelectionFeature,
    rowSortingFeature,
    sortFn_text,
    tableFeatures,
    useTable,
    type ColumnDef,
    type RowSelectionState,
    type SortingState,
    type Updater,
} from '@tanstack/vue-table';
import { computed, ref, type Ref } from 'vue';
import AddManySources from '@/components/AddManySources.vue';
import SourceMenu from '@/components/SourceMenu.vue';
import Alert from '@/components/ui/Alert.vue';
import Button from '@/components/ui/Button.vue';
import Card from '@/components/ui/Card.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import Dialog from '@/components/ui/Dialog.vue';
import FormDialog from '@/components/ui/FormDialog.vue';
import SelectField from '@/components/ui/SelectField.vue';
import TextField from '@/components/ui/TextField.vue';
import {
    checkLinks,
    checkMessages,
    isWebAddress,
    listLabel,
    moveSources,
    removeSources,
    replaceSource,
    type Source,
} from '@/lib/sources';
import { watchLists } from '@/lib/watchLists';

const props = defineProps<{
    watchListId: string;
}>();

const sources = defineModel<Source[]>('sources', { required: true });

const emit = defineEmits<{
    changed: [];
}>();

const features = tableFeatures({
    rowSortingFeature,
    sortedRowModel: createSortedRowModel(),
    sortFns: { text: sortFn_text },
    columnFilteringFeature,
    globalFilteringFeature,
    filteredRowModel: createFilteredRowModel(),
    filterFns: { includesString: filterFn_includesString },
    rowSelectionFeature,
});

// Failing sources first, then the ones not checked yet, then the working ones.
function statusRank(source: Source) {
    return source.problem ? 0 : source.lastCheckedAt ? 2 : 1;
}

const columns: ColumnDef<typeof features, Source, unknown>[] = [
    { id: 'source', header: 'Source', accessorFn: (source) => listLabel(source, sources.value), sortFn: 'text' },
    {
        id: 'status',
        header: 'Status',
        accessorFn: (source) => source.status,
        sortFn: (rowA, rowB) => statusRank(rowA.original) - statusRank(rowB.original),
    },
    {
        id: 'lastChecked',
        header: 'Last checked',
        accessorFn: (source) => source.lastCheckedAt ?? undefined,
        // ISO dates sort as text. Newest first on the first click; never-checked sources last.
        sortFn: (rowA, rowB) => rowA.original.lastCheckedAt!.localeCompare(rowB.original.lastCheckedAt!),
        sortDescFirst: true,
        sortUndefined: 'last',
    },
];

const search = ref('');
const sorting = ref<SortingState>([{ id: 'status', desc: false }]);
const rowSelection = ref<RowSelectionState>({});

// The table changes its state through these, so the refs stay the one place it lives.
function updates<T>(target: Ref<T>) {
    return (updater: Updater<T>) => {
        target.value = typeof updater === 'function' ? (updater as (old: T) => T)(target.value) : updater;
    };
}

const table = useTable<typeof features, Source>({
    features,
    columns,
    data: sources,
    state: computed(() => ({ sorting: sorting.value, globalFilter: search.value, rowSelection: rowSelection.value })),
    onSortingChange: updates(sorting),
    onGlobalFilterChange: updates(search),
    onRowSelectionChange: updates(rowSelection),
    getRowId: (source) => source.id,
    globalFilterFn: 'includesString',
    getColumnCanGlobalFilter: (column) => column.id !== 'lastChecked',
    enableSortingRemoval: false,
});

const rows = computed(() => table.getRowModel().rows);
const selected = computed(() => Object.keys(rowSelection.value).filter((id) => rowSelection.value[id]));
const allShownSelected = computed(() => rows.value.length > 0 && rows.value.every((row) => rowSelection.value[row.id]));

// The header tick box ticks or clears the sources shown (after the search), not hidden ones.
function toggleAllShown() {
    const next = { ...rowSelection.value };
    const select = !allShownSelected.value;
    for (const row of rows.value) {
        if (select) {
            next[row.id] = true;
        } else {
            delete next[row.id];
        }
    }
    rowSelection.value = next;
}

const ariaSort = { asc: 'ascending', desc: 'descending' } as const;

const addingSources = ref(false);
const removing = ref('');
const removeFailed = ref(false);
const confirmingRemove = ref(false);
const removeBusy = ref(false);
const removeError = ref('');

// The Move dialog: the sources being moved (one from its menu, or the ticked ones) and where to.
const moving = ref<string[]>([]);
const moveTarget = ref('');
const moveErrors = ref<Record<string, string>>({});
const moveBusy = ref(false);
const moved = ref('');

const otherLists = computed(() =>
    watchLists.value.filter((list) => list.id !== props.watchListId).map((list) => ({ value: list.id, label: list.name })),
);

// The Fix and Edit dialog: the source being changed, and whether it opened from Fix (it then says what's wrong).
const editing = ref<Source | null>(null);
const fixing = ref(false);
const editUrl = ref('');
const editErrors = ref<Record<string, string>>({});
const saving = ref(false);

function onAdded(added: Source[]) {
    sources.value = [...sources.value, ...added];
    emit('changed');
}

function startEdit(source: Source, fix: boolean) {
    editing.value = source;
    fixing.value = fix;
    editUrl.value = source.url;
    editErrors.value = {};
}

async function saveEdit() {
    const source = editing.value!;
    const url = editUrl.value.trim();
    if (url === source.url) {
        editing.value = null;
        return;
    }
    if (!isWebAddress(url)) {
        editErrors.value = { url: 'Enter the full web address of a news page, starting with https://' };
        return;
    }
    if (sources.value.some((other) => other.url === url)) {
        editErrors.value = { url: 'This source is already in the list.' };
        return;
    }

    saving.value = true;
    const problem = await checkLink(url);
    if (problem) {
        saving.value = false;
        editErrors.value = { url: problem };
        return;
    }
    const saved = await replaceSource(props.watchListId, source.id, url);
    saving.value = false;

    if (!saved) {
        editErrors.value = { url: "The source couldn't be saved. Please try again." };
        return;
    }

    editing.value = null;
    dropSelection([source.id]);
    sources.value = sources.value.map((other) => (other.id === source.id ? saved : other));
    emit('changed');
}

// Checks one link with the scanner's code: why it can't be used, or null if it works.
async function checkLink(url: string) {
    const checks = await checkLinks([url]);
    if (!checks) {
        return "The link couldn't be checked. Please try again.";
    }
    return checks[0].problem ? checkMessages(checks, ['This link'])[0] : null;
}

async function removeSource(sourceId: string) {
    moved.value = '';
    removeFailed.value = false;
    removing.value = sourceId;
    const removed = await removeSources(props.watchListId, [sourceId]);
    removing.value = '';

    if (!removed) {
        removeFailed.value = true;
        return;
    }

    dropSources([sourceId]);
}

// Takes moved or removed sources off the list. The table keeps ticks for rows that are gone, so clear them.
function dropSources(sourceIds: string[]) {
    dropSelection(sourceIds);
    sources.value = sources.value.filter((source) => !sourceIds.includes(source.id));
    emit('changed');
}

function dropSelection(sourceIds: string[]) {
    rowSelection.value = Object.fromEntries(Object.entries(rowSelection.value).filter(([id]) => !sourceIds.includes(id)));
}

function startRemoveSelected() {
    moved.value = '';
    removeError.value = '';
    confirmingRemove.value = true;
}

async function removeSelected() {
    removeBusy.value = true;
    const removed = await removeSources(props.watchListId, selected.value);
    removeBusy.value = false;

    if (!removed) {
        removeError.value = "The sources couldn't be removed. Please try again.";
        return;
    }

    confirmingRemove.value = false;
    dropSources(selected.value);
}

function startMove(sourceIds: string[]) {
    moved.value = '';
    moveTarget.value = '';
    moveErrors.value = {};
    moving.value = sourceIds;
}

async function move() {
    if (!moveTarget.value) {
        moveErrors.value = { list: 'Choose a watch list.' };
        return;
    }

    moveBusy.value = true;
    const done = await moveSources(props.watchListId, moveTarget.value, moving.value);
    moveBusy.value = false;

    if (!done) {
        moveErrors.value = { list: "The sources couldn't be moved. Please try again." };
        return;
    }

    const count = moving.value.length;
    const listName = otherLists.value.find((list) => list.value === moveTarget.value)?.label;
    moved.value = `${count === 1 ? '1 source' : `${count} sources`} moved to ${listName}.`;
    dropSources(moving.value);
    moving.value = [];
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center gap-3">
            <label class="input min-w-0 grow focus-within:outline-primary sm:max-w-sm">
                <MagnifyingGlassIcon class="size-5 text-base-content/70" aria-hidden="true" />
                <input v-model="search" type="search" placeholder="Search sources" aria-label="Search sources" />
            </label>
            <Button @click="addingSources = true">
                <PlusIcon class="size-5" aria-hidden="true" />
                Add sources
            </Button>
        </div>

        <Alert v-if="removeFailed" type="error">The source couldn't be removed. Please try again.</Alert>
        <Alert v-if="moved" type="success">{{ moved }}</Alert>

        <div v-if="selected.length > 0" class="flex flex-wrap items-center gap-2 rounded-box bg-base-200 p-2">
            <p role="status" class="me-auto px-2 font-medium">{{ selected.length }} selected</p>
            <Button v-if="otherLists.length > 0" variant="outline" @click="startMove(selected)">Move to…</Button>
            <Button variant="outline" @click="startRemoveSelected">Remove</Button>
            <Button variant="ghost" @click="rowSelection = {}">Clear</Button>
        </div>

        <Card v-if="sources.length === 0">
            <p class="max-w-prose">No sources yet. Add one to start seeing its stories.</p>
        </Card>
        <p v-else-if="rows.length === 0" class="text-base-content/70">No sources match “{{ search }}”.</p>

        <!-- On a phone the header hides and each row becomes a grid: tick box | source, status, last checked | actions. -->
        <table v-else class="table">
            <thead class="max-md:hidden">
                <tr>
                    <th class="w-px">
                        <input
                            type="checkbox"
                            class="checkbox"
                            :checked="allShownSelected"
                            :indeterminate="!allShownSelected && rows.some((row) => rowSelection[row.id])"
                            aria-label="Select all sources shown"
                            @change="toggleAllShown"
                        />
                    </th>
                    <th
                        v-for="header in table.getHeaderGroups()[0].headers"
                        :key="header.id"
                        :aria-sort="header.column.getIsSorted() ? ariaSort[header.column.getIsSorted() as 'asc' | 'desc'] : undefined"
                    >
                        <button type="button" class="flex items-center gap-1 font-semibold" @click="header.column.getToggleSortingHandler()?.($event)">
                            {{ header.column.columnDef.header }}
                            <ChevronUpIcon v-if="header.column.getIsSorted() === 'asc'" class="size-4" aria-hidden="true" />
                            <ChevronDownIcon v-else-if="header.column.getIsSorted() === 'desc'" class="size-4" aria-hidden="true" />
                            <ChevronUpDownIcon v-else class="size-4 text-base-content/40" aria-hidden="true" />
                        </button>
                    </th>
                    <th class="w-px"><span class="sr-only">Actions</span></th>
                </tr>
            </thead>
            <tbody>
                <tr
                    v-for="row in rows"
                    :key="row.id"
                    :class="[
                        'max-md:grid max-md:grid-cols-[auto_1fr_auto] max-md:items-center max-md:gap-x-3 max-md:py-2',
                        { 'opacity-50': removing === row.id },
                    ]"
                    :aria-busy="removing === row.id"
                >
                    <td class="max-md:row-span-3 max-md:p-0">
                        <input
                            type="checkbox"
                            class="checkbox"
                            :checked="row.getIsSelected()"
                            :aria-label="`Select ${listLabel(row.original, sources)}`"
                            @click="row.getToggleSelectedHandler()($event)"
                        />
                    </td>
                    <td class="font-medium break-words max-md:col-start-2 max-md:p-0">{{ listLabel(row.original, sources) }}</td>
                    <td :class="['max-md:col-start-2 max-md:p-0 max-md:text-sm', row.original.problem ? 'text-error' : 'text-base-content/70']">
                        <span class="flex gap-1">
                            <ExclamationTriangleIcon v-if="row.original.problem" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                            {{ row.original.status }}
                        </span>
                    </td>
                    <td class="whitespace-nowrap text-base-content/70 max-md:col-start-2 max-md:p-0 max-md:text-sm">
                        <span v-if="row.original.lastChecked" class="md:hidden">Last checked </span>{{ row.original.lastChecked }}
                    </td>
                    <td class="max-md:col-start-3 max-md:row-span-3 max-md:row-start-1 max-md:p-0">
                        <div class="flex items-center justify-end gap-1">
                            <Button v-if="row.original.problem" variant="outline" @click="startEdit(row.original, true)">
                                Fix<span class="sr-only"> {{ listLabel(row.original, sources) }}</span>
                            </Button>
                            <SourceMenu
                                :label="listLabel(row.original, sources)"
                                :can-move="otherLists.length > 0"
                                @edit="startEdit(row.original, false)"
                                @move="startMove([row.original.id])"
                                @remove="removeSource(row.original.id)"
                            />
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>

    <Dialog v-model:open="addingSources" title="Add sources">
        <AddManySources :watch-list-id="watchListId" :sources="sources" @added="onAdded" />
    </Dialog>

    <FormDialog
        :open="moving.length > 0"
        :title="moving.length === 1 ? 'Move source' : `Move ${moving.length} sources`"
        description="They keep their stories."
        submit-label="Move"
        :busy="moveBusy"
        :errors="moveErrors"
        @update:open="moving = []"
        @submit="move"
    >
        <SelectField v-model="moveTarget" name="move-to" label="Watch list" :options="otherLists" placeholder="Choose a watch list" :error="moveErrors.list" />
    </FormDialog>

    <ConfirmDialog
        v-model:open="confirmingRemove"
        :title="selected.length === 1 ? 'Remove 1 source?' : `Remove ${selected.length} sources?`"
        description="Their stories leave this list. Other watch lists that follow them keep them."
        confirm-label="Remove"
        :busy="removeBusy"
        :error="removeError"
        @confirm="removeSelected"
    />

    <FormDialog
        :open="editing !== null"
        :title="fixing ? 'Fix source' : 'Edit source'"
        :description="fixing ? (editing?.problem ?? undefined) : undefined"
        :busy="saving"
        :errors="editErrors"
        @update:open="editing = null"
        @submit="saveEdit"
    >
        <TextField
            v-model="editUrl"
            name="url"
            label="News page address"
            type="url"
            inputmode="url"
            autocomplete="url"
            placeholder="https://"
            :error="editErrors.url"
        />
        <p v-if="saving" role="status" class="text-sm">Validating source…</p>
    </FormDialog>
</template>
