/**
 * Composable pivot: state konfigurasi + hasil compute reaktif.
 * API publik dibuat kompatibel dengan pemakaian lama (TinyPivotOnly/exporter)
 * agar view yang sudah ada tidak perlu diubah.
 */
import { computed, ref, watch, type ComputedRef, type Ref } from "vue";
import type {
  AggregationFunction,
  ConditionalFormat,
  PivotConfig,
  PivotResult,
  PivotSort,
  PivotValueField,
} from "./types";
import { computeAvailableFields, computePivotResult, isPivotConfigured } from "./engine";

export interface PivotFieldInfo {
  field: string;
  isNumeric: boolean;
}

export interface PivotTableApi {
  rowFields: Ref<string[]>;
  columnFields: Ref<string[]>;
  valueFields: Ref<PivotValueField[]>;
  showRowTotals: Ref<boolean>;
  showColumnTotals: Ref<boolean>;
  collapsedPaths: Ref<Set<string>>;
  conditionalFormat: Ref<ConditionalFormat>;
  numberFormat: Ref<"us" | "eu" | "plain">;
  sort: Ref<PivotSort | null>;
  availableFields: ComputedRef<PivotFieldInfo[]>;
  isConfigured: ComputedRef<boolean>;
  pivotResult: ComputedRef<PivotResult | null>;
  config: ComputedRef<PivotConfig>;
  addRowField: (field: string) => void;
  removeRowField: (field: string) => void;
  addColumnField: (field: string) => void;
  removeColumnField: (field: string) => void;
  addValueField: (field: string, aggregation?: AggregationFunction) => void;
  removeValueField: (field: string) => void;
  updateValueFieldAggregation: (
    field: string,
    newAgg: AggregationFunction,
  ) => void;
  moveField: (
    from: { area: "row" | "column" | "value"; index: number },
    to: { area: "row" | "column" | "value"; index: number },
  ) => void;
  clearConfig: () => void;
  toggleCollapsedPath: (key: string) => void;
  setValueFields: (fields: PivotValueField[]) => void;
  applyLayout: (layout: {
    rowFields: string[];
    columnFields: string[];
    valueFields: PivotValueField[];
    showRowTotals: boolean;
    showColumnTotals: boolean;
    conditionalFormat?: ConditionalFormat;
    sort?: PivotSort | null;
  }) => void;
}

const DEFAULT_AGG: AggregationFunction = "sum";

export function usePivotTable(data: Ref<Record<string, unknown>[]>): PivotTableApi {
  const rowFields = ref<string[]>([]) as Ref<string[]>;
  const columnFields = ref<string[]>([]) as Ref<string[]>;
  const valueFields = ref<PivotValueField[]>([]) as Ref<PivotValueField[]>;
  const showRowTotals = ref(true);
  const showColumnTotals = ref(true);
  const collapsedPaths = ref<Set<string>>(new Set()) as Ref<Set<string>>;
  const conditionalFormat = ref<ConditionalFormat>("none");
  const numberFormat = ref<"us" | "eu" | "plain">("us");
  const sort = ref<PivotSort | null>(null) as Ref<PivotSort | null>;

  const availableFields = computed<PivotFieldInfo[]>(() =>
    computeAvailableFields(data.value).map((s) => ({
      field: s.field,
      isNumeric: s.isNumeric,
    })),
  );

  const config = computed<PivotConfig>(() => ({
    rowFields: rowFields.value,
    columnFields: columnFields.value,
    valueFields: valueFields.value,
    showRowTotals: showRowTotals.value,
    showColumnTotals: showColumnTotals.value,
  }));

const isConfigured = computed(() => isPivotConfigured(config.value));

// Kumpulkan semua key grup (untuk mode default "semua ter-collapse").
// User memperluas sendiri lewat ▸; setiap kali susunan field berubah,
// collapse-reset ke semua.
const allGroupKeys = (): Set<string> => {
  if (!isConfigured.value) return new Set<string>();
  const preview = computePivotResult(data.value, config.value, {
    sort: sort.value,
    numberFormat: numberFormat.value,
  });
  const keys = new Set<string>();
  for (const r of preview?.rowMeta ?? []) {
    for (const g of r.groupStarts ?? []) keys.add(g.key);
  }
  return keys;
};

const pivotResult = computed<PivotResult | null>(() => {
  if (!isConfigured.value) return null;
  return computePivotResult(data.value, config.value, {
    collapsedPaths: collapsedPaths.value,
    sort: sort.value,
    numberFormat: numberFormat.value,
  });
});

// Reset state collapse saat bentuk field berubah → semua grup ter-collapse
// (user yang memperluas sendiri, seperti DevExpress).
watch(
  () => [
    ...rowFields.value,
    ...columnFields.value,
    ...valueFields.value.map((v) => v.field),
  ],
  () => {
    collapsedPaths.value = allGroupKeys();
  },
);

  const removeFromOthers = (field: string, keep: "row" | "column" | "value") => {
    if (keep !== "row") rowFields.value = rowFields.value.filter((f) => f !== field);
    if (keep !== "column") columnFields.value = columnFields.value.filter((f) => f !== field);
    if (keep !== "value") valueFields.value = valueFields.value.filter((v) => v.field !== field);
  };

  const addRowField = (field: string) => {
    if (!field || rowFields.value.includes(field)) return;
    removeFromOthers(field, "row");
    rowFields.value = [...rowFields.value, field];
  };
  const removeRowField = (field: string) => {
    rowFields.value = rowFields.value.filter((f) => f !== field);
  };
  const addColumnField = (field: string) => {
    if (!field || columnFields.value.includes(field)) return;
    removeFromOthers(field, "column");
    columnFields.value = [...columnFields.value, field];
  };
  const removeColumnField = (field: string) => {
    columnFields.value = columnFields.value.filter((f) => f !== field);
  };
  const addValueField = (field: string, aggregation: AggregationFunction = DEFAULT_AGG) => {
    if (!field) return;
    removeFromOthers(field, "value");
    valueFields.value = [...valueFields.value, { field, aggregation }];
  };
  const removeValueField = (field: string) => {
    valueFields.value = valueFields.value.filter((v) => v.field !== field);
  };
  const updateValueFieldAggregation = (field: string, newAgg: AggregationFunction) => {
    valueFields.value = valueFields.value.map((v) =>
      v.field === field ? { ...v, aggregation: newAgg } : v,
    );
  };
  const setValueFields = (fields: PivotValueField[]) => {
    valueFields.value = fields.map((f) => ({ ...f }));
  };

  const moveField: PivotTableApi["moveField"] = (from, to) => {
    const getArea = (area: string): string[] =>
      area === "row"
        ? [...rowFields.value]
        : area === "column"
          ? [...columnFields.value]
          : valueFields.value.map((v) => v.field);
    const setArea = (area: string, arr: string[]) => {
      if (area === "row") rowFields.value = arr;
      else if (area === "column") columnFields.value = arr;
      else {
        valueFields.value = arr.map(
          (field) =>
            valueFields.value.find((v) => v.field === field) ?? {
              field,
              aggregation: DEFAULT_AGG,
            },
        );
      }
    };
    const src = getArea(from.area);
    if (from.index < 0 || from.index >= src.length) return;
    const [moved] = src.splice(from.index, 1);
    const dst = from.area === to.area ? src : getArea(to.area);
    dst.splice(Math.max(0, Math.min(to.index, dst.length)), 0, moved);
    setArea(from.area, src);
    if (from.area !== to.area) setArea(to.area, dst);
  };

  const clearConfig = () => {
    rowFields.value = [];
    columnFields.value = [];
    valueFields.value = [];
    collapsedPaths.value = new Set();
  };

  const toggleCollapsedPath = (key: string) => {
    const next = new Set(collapsedPaths.value);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    collapsedPaths.value = next;
  };

  const applyLayout: PivotTableApi["applyLayout"] = (layout) => {
    rowFields.value = [...layout.rowFields];
    columnFields.value = [...layout.columnFields];
    valueFields.value = layout.valueFields.map((v) => ({ ...v }));
    showRowTotals.value = layout.showRowTotals;
    showColumnTotals.value = layout.showColumnTotals;
    conditionalFormat.value = layout.conditionalFormat ?? "none";
    sort.value = layout.sort ?? null;
    collapsedPaths.value = new Set();
  };

  return {
    rowFields,
    columnFields,
    valueFields,
    showRowTotals,
    showColumnTotals,
    collapsedPaths,
    conditionalFormat,
    numberFormat,
    sort,
    availableFields,
    isConfigured,
    pivotResult,
    config,
    addRowField,
    removeRowField,
    addColumnField,
    removeColumnField,
    addValueField,
    removeValueField,
    updateValueFieldAggregation,
    moveField,
    clearConfig,
    toggleCollapsedPath,
    setValueFields,
    applyLayout,
  };
}
