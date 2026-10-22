<script setup lang="ts">
/**
 * Chart dari hasil pivot (chart.js sudah jadi dependency project).
 * Menjawab pertanyaan yang sama dengan grid, hanya dalam bentuk tren/perbandingan.
 */
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import Chart from "chart.js/auto";
import type { PivotResult } from "@/lib/pivot/types";

const props = withDefaults(
  defineProps<{
    result: PivotResult | null;
    rowFields: string[];
    columnFields: string[];
    valueFields: { field: string; label?: string; aggregation: string }[];
    chartType?: "bar" | "line" | "pie";
  }>(),
  { chartType: "bar" },
);

const canvasRef = ref<HTMLCanvasElement | null>(null);
let chart: Chart | null = null;

const PALETTE = ["#3B5998", "#5B79B8", "#2C4472", "#8494A7", "#D97706", "#059669"];

function buildConfig() {
  const result = props.result;
  if (!result || !result.data.length) return null;

  const valueCount = Math.max(1, props.valueFields.length);
  const dataWidth = result.data[0].length;

  if (props.columnFields.length > 0) {
    const numCols = Math.floor(dataWidth / valueCount);
    const labels = result.rowMeta
      .filter((m) => !m.isSubtotal)
      .map((m) => m.path.filter(Boolean).join(" / "));
    const leafIdx = result.rowMeta
      .map((m, i) => ({ m, i }))
      .filter((x) => !x.m.isSubtotal)
      .map((x) => x.i);

    const datasets = [];
    for (let c = 0; c < numCols; c++) {
      const colLabel = props.columnFields
        .map((_f, level) => result.headers[level]?.[c * valueCount] ?? "")
        .filter(Boolean)
        .join(" / ");
      datasets.push({
        label: colLabel || `Kolom ${c + 1}`,
        data: leafIdx.map((ri) => result.data[ri]?.[c * valueCount]?.value ?? 0),
        backgroundColor: PALETTE[c % PALETTE.length],
        borderColor: PALETTE[c % PALETTE.length],
        borderWidth: props.chartType === "line" ? 2 : 1,
        fill: false,
      });
    }
    return { labels, datasets };
  }

  const labels = result.rowMeta
    .filter((m) => !m.isSubtotal)
    .map((m) => m.path.filter(Boolean).join(" / "));
  const leafIdx = result.rowMeta
    .map((m, i) => ({ m, i }))
    .filter((x) => !x.m.isSubtotal)
    .map((x) => x.i);
  const datasets = props.valueFields.map((vf, vi) => ({
    label: vf.label || vf.field,
    data: leafIdx.map((ri) => result.data[ri]?.[vi]?.value ?? 0),
    backgroundColor: PALETTE[vi % PALETTE.length],
    borderColor: PALETTE[vi % PALETTE.length],
    borderWidth: 1,
  }));
  return { labels, datasets };
}

function render() {
  if (!canvasRef.value) return;
  const data = buildConfig();
  if (chart) {
    chart.destroy();
    chart = null;
  }
  if (!data) return;
  chart = new Chart(canvasRef.value, {
    type: props.chartType,
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 10 } } } },
      scales:
        props.chartType === "pie"
          ? undefined
          : {
              x: { ticks: { font: { size: 10 }, maxRotation: 60, minRotation: 0 } },
              y: { ticks: { font: { size: 10 } } },
            },
    },
  });
}

onMounted(render);
watch(() => [props.result, props.chartType], render, { deep: false });
onBeforeUnmount(() => {
  if (chart) chart.destroy();
});
</script>

<template>
  <div class="pivot-chart-wrap">
    <canvas ref="canvasRef" />
    <div v-if="!result || !result.data.length" class="pivot-chart-empty">
      Tidak ada data untuk digrafikkan.
    </div>
  </div>
</template>

<style scoped>
.pivot-chart-wrap {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  padding: 8px;
  background: #fff;
  border: 1px solid var(--ds-border, #a0aab8);
}
.pivot-chart-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ds-text-muted, #8494a7);
  font-size: 12px;
}
</style>
