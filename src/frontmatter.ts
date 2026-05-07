export interface ParsedFrontmatter {
  datasources: Record<string, string>;
  plotDefaults: Record<string, any>;
}

export function parseFrontmatter(frontmatter: any): ParsedFrontmatter {
  const datasources: Record<string, string> = {};
  const plotDefaults: Record<string, any> = frontmatter?.plotDefaults ?? {};

  const raw = frontmatter?.datasources;
  if (raw && typeof raw === "object") {
    for (const [name, filePath] of Object.entries(raw)) {
      if (typeof filePath !== "string") continue;
      if (!filePath.endsWith(".parquet")) {
        console.warn(`[quackblocks] Skipping datasource "${name}": path must end in .parquet`);
        continue;
      }
      datasources[name] = filePath;
    }
  }

  return { datasources, plotDefaults };
}
