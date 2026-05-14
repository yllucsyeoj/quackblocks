export interface ParsedDirectives {
  chartType: string | null;
  chartOptions: Record<string, unknown>;
  caption: string | null;
  sql: string;
}

const CHART_TYPE_RE = /\bchart=(\S+)/;
const CAPTION_RE = /\bcaption="([^"]+)"/;
const OPTIONS_RE = /\{[\s\S]*\}/;

export function parseCodeBlock(source: string): ParsedDirectives {
  // Directives live on the first line of the code block content:
  //   chart=bar caption="Revenue by month" { "x": "month", "y": "amount" }
  //   SELECT month, amount FROM revenue
  //
  // caption= can also be used without chart= for table captions:
  //   caption="Summary statistics"
  //   SELECT ...
  //
  // If the first line contains chart= or caption=, it's a directive line.
  // Everything after it is SQL.

  const lines = source.trim().split("\n");
  const firstLine = lines[0].trim();

  let chartType: string | null = null;
  let chartOptions: Record<string, unknown> = {};
  let caption: string | null = null;
  let sql: string;

  const chartMatch = firstLine.match(CHART_TYPE_RE);
  const captionMatch = firstLine.match(CAPTION_RE);

  if (chartMatch || captionMatch) {
    if (chartMatch) {
      chartType = chartMatch[1];
    }

    if (captionMatch) {
      caption = captionMatch[1];
    }

    const optionsMatch = firstLine.match(OPTIONS_RE);
    if (optionsMatch) {
      try {
        chartOptions = JSON.parse(optionsMatch[0]) as Record<string, unknown>;
      } catch (err) {
        console.warn("[quackblocks] Failed to parse chart options:", optionsMatch[0], err);
      }
    }

    // SQL is everything after the directive line
    sql = lines.slice(1).join("\n").trim();
  } else {
    // No directive — entire content is SQL
    sql = source.trim();
  }

  return { chartType, chartOptions, caption, sql };
}
