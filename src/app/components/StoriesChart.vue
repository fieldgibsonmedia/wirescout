<script setup lang="ts">
// A small bar chart of a watch list's stories per day over the last 7 days, today last (watch_list_stats.daily_counts).
// Earlier days in gray, today in the primary colour (both 3:1 or more on the card, in light and dark).
// Hovering a day shows its count; screen readers get every day in the chart's label, and the caption gives the total.
import { computed } from 'vue';

const props = defineProps<{
    counts: number[];
}>();

const WIDTH = 110;
const HEIGHT = 40;
const BAR_WIDTH = 14;
const GAP = 2;
const CORNER = 4;
// A day with stories always shows, however busy the busiest day was.
const MIN_BAR_HEIGHT = 2;

const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short' });
const fullDate = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

const days = computed(() => {
    const busiest = Math.max(...props.counts, 0);
    return props.counts.map((count, index) => {
        const daysAgo = props.counts.length - 1 - index;
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        const height = count === 0 ? 0 : Math.max(MIN_BAR_HEIGHT, (count / busiest) * (HEIGHT - 1));
        return {
            x: index * (BAR_WIDTH + GAP),
            height,
            count,
            isToday: daysAgo === 0,
            label: daysAgo === 0 ? 'Today' : weekday.format(date),
            title: `${daysAgo === 0 ? 'Today' : fullDate.format(date)}: ${stories(count)}`,
        };
    });
});

const total = computed(() => props.counts.reduce((sum, count) => sum + count, 0));
const label = computed(
    () => `Stories found per day, last 7 days: ${days.value.map((day) => `${day.label} ${day.count}`).join(', ')}`,
);

function stories(count: number) {
    return `${count} ${count === 1 ? 'story' : 'stories'}`;
}

// A bar standing on the baseline, its top corners rounded.
function barPath(x: number, height: number) {
    const top = HEIGHT - 1 - height;
    const corner = Math.min(CORNER, height, BAR_WIDTH / 2);
    return `M${x},${HEIGHT - 1} V${top + corner} Q${x},${top} ${x + corner},${top} H${x + BAR_WIDTH - corner} Q${x + BAR_WIDTH},${top} ${x + BAR_WIDTH},${top + corner} V${HEIGHT - 1} Z`;
}
</script>

<template>
    <figure class="flex flex-col items-end gap-1">
        <svg :width="WIDTH" :height="HEIGHT" :viewBox="`0 0 ${WIDTH} ${HEIGHT}`" role="img" :aria-label="label">
            <line x1="0" :x2="WIDTH" :y1="HEIGHT - 0.5" :y2="HEIGHT - 0.5" class="stroke-base-300" />
            <g v-for="day in days" :key="day.x">
                <title>{{ day.title }}</title>
                <path v-if="day.height > 0" :d="barPath(day.x, day.height)" :class="day.isToday ? 'fill-primary' : 'fill-base-content/60'" />
                <!-- The whole column answers the hover, not just the bar. -->
                <rect :x="day.x" y="0" :width="BAR_WIDTH" :height="HEIGHT" fill="transparent" />
            </g>
        </svg>
        <figcaption class="text-xs text-base-content/70">Last 7 days · {{ stories(total) }}</figcaption>
    </figure>
</template>
