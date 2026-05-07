import * as Plot from "@observablehq/plot";

// 20-color palette — high contrast, distinct hues, works on light and dark backgrounds
// Inspired by Tableau20 but tuned for data viz readability
const QUACK_PALETTE = [
  "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
  "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac",
  "#5fa2ce", "#fc7d0b", "#c85200", "#1b9e77", "#d95f02",
  "#7570b3", "#e7298a", "#66a61e", "#e6ab02", "#a6761d",
];

const MARK_MAP: Record<string, (data: any[], options: any) => Plot.Markish> = {
  bar: (data, opts) => Plot.barY(data, opts),
  barX: (data, opts) => Plot.barX(data, opts),
  line: (data, opts) => Plot.lineY(data, opts),
  area: (data, opts) => Plot.areaY(data, opts),
  dot: (data, opts) => Plot.dot(data, opts),
  cell: (data, opts) => Plot.cell(data, opts),
  rect: (data, opts) => Plot.rect(data, opts),
  boxY: (data, opts) => Plot.boxY(data, opts),
  boxX: (data, opts) => Plot.boxX(data, opts),
  waffleY: (data, opts) => Plot.waffleY(data, opts),
  waffleX: (data, opts) => Plot.waffleX(data, opts),
  text: (data, opts) => Plot.text(data, opts),
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
function buildColorScale(userColor?: Record<string, any>): Record<string, any> {
  if (!userColor) return { range: QUACK_PALETTE };
  if (userColor.scheme) return { ...userColor };
  return { range: QUACK_PALETTE, ...userColor };
}

// Chart types that render as filled shapes — apply a default fill color
// so they don't fall back to black (currentColor).
const FILLED_MARKS = new Set(["area", "rect"]);

function applyFillDefault(chartType: string, opts: Record<string, any>): Record<string, any> {
  if (FILLED_MARKS.has(chartType) && !opts.fill && !opts.stroke) {
    return { ...opts, fill: QUACK_PALETTE[0] };
  }
  return opts;
}

export function renderChart(
  el: HTMLElement,
  data: Record<string, any>[],
  chartType: string,
  markOptions: Record<string, any>,
  plotDefaults: Record<string, any>,
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
  const plotOptions: Record<string, any> = {};
  const markOpts: Record<string, any> = {};

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
  const computedStyle = getComputedStyle(document.body);
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
    color: buildColorScale(plotOptions.color),
    marks: [markFn(data, applyFillDefault(chartType, markOpts))],
  });

  // Ensure explicit width/height attributes on the SVG element for PDF export
  const w = plotOptions.width ?? defaultWidth;
  const h = plotOptions.height ?? defaultHeight;
  svg.setAttribute("width", String(w));
  svg.setAttribute("height", String(h));

  el.empty();
  el.innerHTML = svg.outerHTML;
}
