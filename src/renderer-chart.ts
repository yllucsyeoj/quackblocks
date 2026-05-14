import * as Plot from "@observablehq/plot";
import type { CellValue } from "./types";

type PlotOptions = Record<string, unknown>;
type RowData = Record<string, CellValue>;

// 20-color palette — high contrast, distinct hues, works on light and dark backgrounds
// Inspired by Tableau20 but tuned for data viz readability
const QUACK_PALETTE = [
  "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
  "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac",
  "#5fa2ce", "#fc7d0b", "#c85200", "#1b9e77", "#d95f02",
  "#7570b3", "#e7298a", "#66a61e", "#e6ab02", "#a6761d",
];

const MARK_MAP: Record<string, (data: RowData[], options: PlotOptions) => Plot.Markish> = {
  bar: (data, opts) => Plot.barY(data as never[], opts),
  barX: (data, opts) => Plot.barX(data as never[], opts),
  line: (data, opts) => Plot.lineY(data as never[], opts),
  area: (data, opts) => Plot.areaY(data as never[], opts),
  dot: (data, opts) => Plot.dot(data as never[], opts),
  cell: (data, opts) => Plot.cell(data as never[], opts),
  rect: (data, opts) => Plot.rect(data as never[], opts),
  boxY: (data, opts) => Plot.boxY(data as never[], opts),
  boxX: (data, opts) => Plot.boxX(data as never[], opts),
  waffleY: (data, opts) => Plot.waffleY(data as never[], opts),
  waffleX: (data, opts) => Plot.waffleX(data as never[], opts),
  text: (data, opts) => Plot.text(data as never[], opts),
};

// Options that always go to Plot.plot() rather than the mark constructor
const PLOT_LEVEL_KEYS = new Set([
  "width", "height",
  "marginLeft", "marginRight", "marginTop", "marginBottom",
  "style",
  "title", "subtitle", "caption",
  "facet",
  "grid",
]);

// Keys that are plot-level when an object (axis config) but mark-level when a string (column name)
const DUAL_KEYS = new Set(["x", "y", "fx", "fy", "color"]);

export interface ChartDefaults {
  defaultWidth: number;
  defaultHeight: number;
}

// Build the color scale config. If the user specified a scheme (continuous scale),
// don't inject our categorical range — they conflict.
function buildColorScale(userColor?: PlotOptions): PlotOptions {
  if (!userColor) return { range: QUACK_PALETTE };
  if (userColor.scheme) return { ...userColor };
  return { range: QUACK_PALETTE, ...userColor };
}

// Chart types that render as filled shapes — apply a default fill color
// so they don't fall back to black (currentColor).
const FILLED_MARKS = new Set(["area", "rect"]);

function applyFillDefault(chartType: string, opts: PlotOptions): PlotOptions {
  if (FILLED_MARKS.has(chartType) && !opts.fill && !opts.stroke) {
    return { ...opts, fill: QUACK_PALETTE[0] };
  }
  return opts;
}

export function renderChart(
  el: HTMLElement,
  data: RowData[],
  chartType: string,
  markOptions: PlotOptions,
  plotDefaults: PlotOptions,
  defaults: ChartDefaults = { defaultWidth: 640, defaultHeight: 400 }
): void {
  const markFn = MARK_MAP[chartType];
  if (!markFn) {
    el.empty();
    el.createEl("div", {
      text: `Unknown chart type: "${chartType}". Supported: ${Object.keys(MARK_MAP).join(", ")}`,
      attr: {
        style:
          "background: rgba(220, 38, 38, 0.08); border: 1px solid rgba(220, 38, 38, 0.3); border-radius: 6px; padding: 10px 14px; font-family: var(--font-monospace); font-size: 11px; color: var(--text-error);",
      },
    });
    return;
  }

  // Merge plotDefaults with per-block options (block wins)
  const merged = { ...plotDefaults, ...markOptions };

  // Separate plot-level options from mark-level options
  const plotOptions: PlotOptions = {};
  const markOpts: PlotOptions = {};

  for (const [key, value] of Object.entries(merged)) {
    if (PLOT_LEVEL_KEYS.has(key)) {
      plotOptions[key] = value;
    } else if (DUAL_KEYS.has(key) && typeof value === "object" && value !== null) {
      // Object value = axis/facet config → plot-level
      plotOptions[key] = value;
    } else {
      markOpts[key] = value;
    }
  }

  // Resolve Obsidian CSS vars to actual colors for PDF export compatibility
  const computedStyle = getComputedStyle(activeDocument.body);
  const textColor = computedStyle.getPropertyValue("--text-normal").trim() || "#1a1a1a";

  const { defaultWidth, defaultHeight } = defaults;

  const svg = Plot.plot({
    width: defaultWidth,
    height: defaultHeight,
    marginLeft: 60,
    style: {
      color: textColor,
      background: "transparent",
      fontSize: "12px",
    },
    ...plotOptions,
    color: buildColorScale(plotOptions.color as PlotOptions | undefined),
    marks: [markFn(data, applyFillDefault(chartType, markOpts))],
  });

  // Ensure explicit width/height attributes on the SVG element for PDF export
  const w = (plotOptions.width as number) ?? defaultWidth;
  const h = (plotOptions.height as number) ?? defaultHeight;
  svg.setAttribute("width", String(w));
  svg.setAttribute("height", String(h));

  el.empty();
  el.appendChild(svg);
}
