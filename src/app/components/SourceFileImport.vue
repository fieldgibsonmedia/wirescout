<script setup lang="ts">
// Adds many sources at once from a file: drop or choose an .xlsx, .csv or .txt file, and every web address
// in it is found (no column to pick). The user sees the list, then adds it with one button.
// The Excel reader is only downloaded when an .xlsx file is used.
import { ArrowUpTrayIcon, PlusIcon } from '@heroicons/vue/20/solid';
import { computed, ref } from 'vue';
import Alert from '@/components/ui/Alert.vue';
import Button from '@/components/ui/Button.vue';
import { addSources, isWebAddress, type Source } from '@/lib/sources';

const props = defineProps<{
    watchListId: string;
    sources: Source[];
}>();

const emit = defineEmits<{
    added: [sources: Source[]];
}>();

const MAX_ADDRESSES = 100;
const MAX_FILE_SIZE = 1024 * 1024;

// Starts at http://, https:// or www. and runs to the next space, quote or bracket.
const ADDRESS_PATTERN = /\b(?:https?:\/\/|www\.)[^\s"'<>()[\]{}]+/gi;

const fileInput = ref<HTMLInputElement>();
const dragging = ref(false);
const reading = ref(false);
const fileError = ref('');
const found = ref<string[]>([]);
const adding = ref(false);
const addFailed = ref(false);
const result = ref('');

const foundLabel = computed(() => (found.value.length === 1 ? 'Found 1 address' : `Found ${found.value.length} addresses`));

function onDrop(event: DragEvent) {
    dragging.value = false;
    const file = event.dataTransfer?.files[0];
    if (file) {
        readFile(file);
    }
}

function onChoose() {
    const file = fileInput.value?.files?.[0];
    if (file) {
        readFile(file);
    }
    // Lets the same file be chosen again after a fix.
    if (fileInput.value) {
        fileInput.value.value = '';
    }
}

async function readFile(file: File) {
    fileError.value = '';
    result.value = '';
    addFailed.value = false;
    found.value = [];

    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (extension === 'numbers') {
        fileError.value = "Numbers files can't be read. In Numbers, export it as Excel or CSV first (File → Export To).";
        return;
    }
    if (!['xlsx', 'csv', 'txt'].includes(extension)) {
        fileError.value = 'Choose an Excel (.xlsx), CSV or text file.';
        return;
    }
    if (file.size > MAX_FILE_SIZE) {
        fileError.value = 'This file is over 1 MB. Keep only the web addresses and try again.';
        return;
    }

    reading.value = true;
    const text = await fileText(file, extension);
    reading.value = false;

    if (text === null) {
        fileError.value = "This file couldn't be read. Check that it opens in Excel, or save it as CSV and try again.";
        return;
    }

    const addresses = findAddresses(text);
    if (addresses.length === 0) {
        fileError.value = 'No web addresses found in this file.';
    } else if (addresses.length > MAX_ADDRESSES) {
        fileError.value = `This file has ${addresses.length} web addresses. Add up to ${MAX_ADDRESSES} at a time: split the file and try again.`;
    } else {
        found.value = addresses;
    }
}

// The file's text. For Excel, the text of every cell on every sheet. Null if the file can't be read.
async function fileText(file: File, extension: string) {
    try {
        if (extension !== 'xlsx') {
            return await file.text();
        }
        const { default: readXlsxFile } = await import('read-excel-file/browser');
        const sheets = await readXlsxFile(file);
        return sheets.flatMap((sheet) => sheet.data.flat()).filter((cell) => typeof cell === 'string').join('\n');
    } catch {
        return null;
    }
}

// Every web address in the text, once each, in the order they appear.
function findAddresses(text: string) {
    const addresses = (text.match(ADDRESS_PATTERN) ?? [])
        // A sentence's full stop or comma isn't part of the address.
        .map((match) => match.replace(/[.,;:!?]+$/, ''))
        .map((match) => (/^www\./i.test(match) ? `https://${match}` : match));
    return [...new Set(addresses)];
}

async function add() {
    const inList = new Set(props.sources.map((source) => source.url));
    const invalid = found.value.filter((url) => !isWebAddress(url));
    const already = found.value.filter((url) => isWebAddress(url) && inList.has(url));
    const toAdd = found.value.filter((url) => isWebAddress(url) && !inList.has(url));

    addFailed.value = false;
    let added: Source[] = [];
    if (toAdd.length > 0) {
        adding.value = true;
        const response = await addSources(props.watchListId, toAdd);
        adding.value = false;

        if (!response) {
            addFailed.value = true;
            return;
        }
        added = response;
    }

    result.value = [
        `${added.length} added`,
        already.length > 0 && `${already.length} already in the list`,
        invalid.length === 1 && "1 isn't a web address",
        invalid.length > 1 && `${invalid.length} aren't web addresses`,
    ]
        .filter(Boolean)
        .join(', ');
    found.value = [];
    emit('added', added);
}
</script>

<template>
    <div class="flex flex-col gap-3 border-t border-base-300 pt-4">
        <h3 class="font-medium">Add many at once</h3>

        <div
            :class="[
                'flex flex-col items-start gap-3 rounded-box border-2 border-dashed p-4 transition-colors motion-reduce:transition-none',
                dragging ? 'border-primary bg-base-200' : 'border-base-content/30',
            ]"
            @dragover.prevent="dragging = true"
            @dragleave="dragging = false"
            @drop.prevent="onDrop"
        >
            <p class="text-sm text-base-content/70">
                Drop an Excel, CSV or text file here, or choose one. Every web address in it is found. Up to {{ MAX_ADDRESSES }} at a time.
            </p>
            <!-- The file field itself is hidden: the label is the button, and shows the focus ring for it. -->
            <label class="btn btn-outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
                <ArrowUpTrayIcon class="size-5" aria-hidden="true" />
                Choose a file
                <input ref="fileInput" type="file" accept=".xlsx,.csv,.txt" class="sr-only" @change="onChoose" />
            </label>
        </div>

        <p v-if="reading" role="status" class="text-sm">Reading the file…</p>
        <Alert v-if="fileError" type="error">{{ fileError }}</Alert>
        <Alert v-if="result" type="success">{{ result }}.</Alert>

        <div v-if="found.length > 0" class="flex flex-col gap-3">
            <p role="status" class="font-medium">{{ foundLabel }}</p>
            <ul class="max-h-64 overflow-y-auto rounded-box border border-base-300 text-sm">
                <li v-for="url in found" :key="url" class="border-b border-base-300 px-3 py-2 break-words last:border-b-0">{{ url }}</li>
            </ul>
            <Alert v-if="addFailed" type="error">The sources couldn't be added. Please try again.</Alert>
            <div class="flex flex-wrap gap-3">
                <Button variant="outline" :busy="adding" @click="add">
                    <PlusIcon v-if="!adding" class="size-5" aria-hidden="true" />
                    Add {{ found.length === 1 ? 'it' : `all ${found.length}` }}
                </Button>
                <Button variant="ghost" @click="found = []">Cancel</Button>
            </div>
        </div>
    </div>
</template>
