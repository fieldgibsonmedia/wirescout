<script setup lang="ts">
// Adds sources, one or many at once (the Add sources dialog), in two tabs:
// - Paste links: one per line, text around them is fine, and a bare domain on its own line counts.
//   Lines without a link are listed while typing, so they can be fixed before adding.
// - Upload a file: drop or choose an .xlsx, .csv or .txt file, and every web address in it is found
//   (no column to pick). The user sees the list, then adds it with one button.
// Each link is checked first: the ones that fail aren't added, and the user sees why.
// The Excel reader is only downloaded when an .xlsx file is used.
import { ArrowUpTrayIcon, PlusIcon } from '@heroicons/vue/20/solid';
import { TabsContent, TabsIndicator, TabsList, TabsRoot, TabsTrigger } from 'reka-ui';
import { computed, ref } from 'vue';
import Alert from '@/components/ui/Alert.vue';
import Button from '@/components/ui/Button.vue';
import TextAreaField from '@/components/ui/TextAreaField.vue';
import { addSources, checkLinks, checkMessages, isWebAddress, type LinkCheck, type Source } from '@/lib/sources';

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

// A whole line that's only a domain, maybe with a path: presse.macif.fr or presse.macif.fr/communiques.
const BARE_DOMAIN_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(\/\S*)?$/i;

const tab = ref('paste');

const pasted = ref('');
const pasteError = ref('');

const fileInput = ref<HTMLInputElement>();
const dragging = ref(false);
const reading = ref(false);
const fileError = ref('');
const found = ref<string[]>([]);
const adding = ref(false);
const addFailed = ref(false);
const result = ref('');
// The links that failed their check, one line per reason.
const notAdded = ref<string[]>([]);

const foundLabel = computed(() => (found.value.length === 1 ? 'Found 1 address' : `Found ${found.value.length} addresses`));

// Each pasted line that isn't empty, with its web addresses.
const pastedLines = computed(() =>
    pasted.value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => ({ line, addresses: lineAddresses(line) })),
);
const pastedLinks = computed(() => [...new Set(pastedLines.value.flatMap((line) => line.addresses))]);
const badLines = computed(() => pastedLines.value.filter((line) => line.addresses.length === 0).map((line) => line.line));

// "12 links ready · 2 lines aren't links"
const pasteSummary = computed(() => {
    const links = pastedLinks.value.length;
    const bad = badLines.value.length;
    return [
        links === 1 ? '1 link ready' : `${links} links ready`,
        bad === 1 && "1 line isn't a link",
        bad > 1 && `${bad} lines aren't links`,
    ]
        .filter(Boolean)
        .join(' · ');
});

function lineAddresses(line: string) {
    const addresses = findAddresses(line);
    if (addresses.length > 0) {
        return addresses;
    }
    const domain = line.replace(/[.,;:!?]+$/, '');
    return BARE_DOMAIN_PATTERN.test(domain) ? [`https://${domain}`] : [];
}

async function addPasted() {
    pasteError.value = '';
    if (pastedLinks.value.length === 0) {
        pasteError.value = 'Paste at least one link.';
        return;
    }
    if (pastedLinks.value.length > MAX_ADDRESSES) {
        pasteError.value = `Add up to ${MAX_ADDRESSES} links at a time: remove some and try again.`;
        return;
    }
    if (await add(pastedLinks.value)) {
        pasted.value = '';
    }
}

async function addFound() {
    if (await add(found.value)) {
        found.value = [];
    }
}

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
    notAdded.value = [];
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

// Checks the links and adds the ones that work. Returns false if they couldn't be added at all.
async function add(urls: string[]) {
    result.value = '';
    notAdded.value = [];
    const inList = new Set(props.sources.map((source) => source.url));
    const invalid = urls.filter((url) => !isWebAddress(url));
    const already = urls.filter((url) => isWebAddress(url) && inList.has(url));
    const toCheck = urls.filter((url) => isWebAddress(url) && !inList.has(url));

    addFailed.value = false;
    let added: Source[] = [];
    let failed: LinkCheck[] = [];
    if (toCheck.length > 0) {
        adding.value = true;
        const checks = await checkLinks(toCheck);
        if (!checks) {
            adding.value = false;
            addFailed.value = true;
            return false;
        }
        failed = checks.filter((check) => check.problem);
        const working = checks.filter((check) => !check.problem).map((check) => check.url);
        const response = working.length > 0 ? await addSources(props.watchListId, working) : [];
        adding.value = false;

        if (!response) {
            addFailed.value = true;
            return false;
        }
        added = response;
    }

    result.value = [
        `${added.length} added`,
        failed.length > 0 && `${failed.length} not added`,
        already.length > 0 && `${already.length} already in the list`,
        invalid.length === 1 && "1 isn't a web address",
        invalid.length > 1 && `${invalid.length} aren't web addresses`,
    ]
        .filter(Boolean)
        .join(', ');
    notAdded.value = checkMessages(failed);
    emit('added', added);
    return true;
}
</script>

<template>
    <!-- One fixed height for both tabs and their results, so the dialog never resizes; the content scrolls inside. -->
    <div class="flex h-[28rem] max-h-[calc(100dvh-12rem)] flex-col gap-3 overflow-y-auto">
        <TabsRoot v-model="tab" class="flex flex-col gap-3">
            <TabsList aria-label="How to add sources" class="tabs tabs-border relative">
                <TabsTrigger value="paste" class="tab data-[state=active]:tab-active">Paste links</TabsTrigger>
                <TabsTrigger value="file" class="tab data-[state=active]:tab-active">Upload a file</TabsTrigger>
                <TabsIndicator class="tab-indicator" />
            </TabsList>

            <TabsContent value="paste" class="flex flex-col gap-3">
                <TextAreaField
                    v-model="pasted"
                    name="pasted-links"
                    label="Links, one per line"
                    :helper="`Text around the links is fine. Up to ${MAX_ADDRESSES} at a time.`"
                    :error="pasteError"
                    rows="6"
                    spellcheck="false"
                />
                <p v-if="pastedLines.length > 0" role="status" class="text-sm font-medium">{{ pasteSummary }}</p>
                <ul v-if="badLines.length > 0" class="rounded-box border border-base-300 text-sm" aria-label="Lines that aren't links">
                    <li v-for="(line, index) in badLines" :key="index" class="border-b border-base-300 px-3 py-2 break-words text-error last:border-b-0">
                        {{ line }}
                    </li>
                </ul>
                <p v-if="adding" role="status" class="text-sm">
                    Validating {{ pastedLinks.length === 1 ? 'source' : `${pastedLinks.length} sources` }}…
                </p>
                <Alert v-if="addFailed" type="error">The sources couldn't be added. Please try again.</Alert>
                <div>
                    <Button variant="outline" :busy="adding" @click="addPasted">
                        <PlusIcon v-if="!adding" class="size-5" aria-hidden="true" />
                        Add
                    </Button>
                </div>
            </TabsContent>

            <TabsContent value="file" class="flex flex-col gap-3">
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

                <div v-if="found.length > 0" class="flex flex-col gap-3">
                    <p role="status" class="font-medium">{{ foundLabel }}</p>
                    <ul class="max-h-64 overflow-y-auto rounded-box border border-base-300 text-sm">
                        <li v-for="url in found" :key="url" class="border-b border-base-300 px-3 py-2 break-words last:border-b-0">{{ url }}</li>
                    </ul>
                    <p v-if="adding" role="status" class="text-sm">Validating {{ found.length === 1 ? 'source' : `${found.length} sources` }}…</p>
                    <Alert v-if="addFailed" type="error">The sources couldn't be added. Please try again.</Alert>
                    <div class="flex flex-wrap gap-3">
                        <Button variant="outline" :busy="adding" @click="addFound">
                            <PlusIcon v-if="!adding" class="size-5" aria-hidden="true" />
                            Add {{ found.length === 1 ? 'it' : `all ${found.length}` }}
                        </Button>
                        <Button variant="ghost" @click="found = []">Cancel</Button>
                    </div>
                </div>
            </TabsContent>
        </TabsRoot>

        <Alert v-if="result" type="success">{{ result }}.</Alert>
        <Alert v-if="notAdded.length > 0" type="error">
            <p v-for="message in notAdded" :key="message" class="break-words">{{ message }}</p>
        </Alert>
    </div>
</template>
