<script setup lang="ts">
// A white box that groups one block of a page, such as a table with its search and paging (DaisyUI card).
</script>

<template>
    <section class="card border border-base-300 bg-base-100">
        <div class="card-body gap-4 p-4 md:p-6">
            <slot />
        </div>
    </section>
</template>
