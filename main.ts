import { Plugin } from "obsidian";
import { DuckDBManager } from "./src/db";
import { parseFrontmatter } from "./src/frontmatter";
import { parseCodeBlock } from "./src/parser";
import { renderTable, renderError, renderEmpty, renderLoading } from "./src/renderers";
import { renderChart } from "./src/renderer-chart";
import { QuackBlocksSettings, DEFAULT_SETTINGS, QuackBlocksSettingTab } from "./src/settings";

export default class QuackBlocksPlugin extends Plugin {
  private dbManager = new DuckDBManager();
  settings: QuackBlocksSettings = DEFAULT_SETTINGS;

  private getPluginDir(): string {
    const adapter = this.app.vault.adapter as any;
    const basePath = adapter.basePath || adapter.getBasePath?.();
    return `${basePath}/${this.manifest.dir}`;
  }

  private getVaultBasePath(): string {
    const adapter = this.app.vault.adapter as any;
    return adapter.basePath || adapter.getBasePath?.();
  }

  private expandPath(inputPath: string): string {
    if (!inputPath.startsWith("~/")) return inputPath;

    // 1. Environment variables (fastest, works in most Electron configs)
    const envHome = process?.env?.HOME || process?.env?.USERPROFILE;
    if (envHome) return inputPath.replace(/^~/, envHome);

    // 2. Node os module (requires nodeIntegration)
    try {
      const os = require("os");
      const osHome = os.homedir();
      if (osHome) return inputPath.replace(/^~/, osHome);
    } catch { /* ignore */ }

    // 3. Derive from vault path: /Users/<name>/... → /Users/<name>
    try {
      const base = this.getVaultBasePath();
      if (base) {
        const parts = base.split(/[\\/]/).filter(Boolean);
        if (parts.length >= 2 && parts[0] === "Users") {
          return inputPath.replace(/^~/, `/${parts[0]}/${parts[1]}`);
        }
        if (parts.length >= 2 && parts[0] === "home") {
          return inputPath.replace(/^~/, `/${parts[0]}/${parts[1]}`);
        }
      }
    } catch { /* ignore */ }

    return inputPath;
  }

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new QuackBlocksSettingTab(this.app, this));

    if (this.settings.debugLogging) {
      console.log("[quackblocks] Loading plugin...");
    }

    this.registerMarkdownCodeBlockProcessor(
      "quack",
      async (source: string, el: HTMLElement, ctx) => {
        const { chartType, chartOptions, caption, sql } = parseCodeBlock(source);
        await this.renderQueryBlock(sql, el, ctx.sourcePath, chartType, chartOptions, caption);
      }
    );
  }

  private async renderQueryBlock(
    sql: string,
    el: HTMLElement,
    sourcePath: string,
    chartType: string | null,
    chartOptions: Record<string, any>,
    caption: string | null
  ): Promise<void> {
    renderLoading(el);

    if (!sql) {
      renderError(el, "Empty query — write some SQL!");
      return;
    }

    try {
      await this.dbManager.init(this.getPluginDir(), this.settings.debugLogging);

      const cache = this.app.metadataCache.getCache(sourcePath);
      const { datasources, plotDefaults } = parseFrontmatter(cache?.frontmatter);

      const path = require("path");
      const basePath = this.getVaultBasePath();
      const noteDir = path.dirname(path.join(basePath, sourcePath));

      const loadErrors: string[] = [];
      for (const [tableName, rawPath] of Object.entries(datasources)) {
        try {
          const expandedPath = this.expandPath(rawPath);
          const absolutePath = path.resolve(noteDir, expandedPath);
          await this.dbManager.loadParquet(tableName, absolutePath);
        } catch (err: any) {
          loadErrors.push(`${tableName}: ${err.message}`);
        }
      }

      if (loadErrors.length > 0) {
        if (this.settings.debugLogging) {
          console.warn("[quackblocks] Some datasources failed to load:", loadErrors);
        }
        renderError(el, `Datasource error: ${loadErrors[0]}`);
        return;
      }

      const { columns, rows } = await this.dbManager.query(sql);

      if (rows.length === 0) {
        renderEmpty(el);
        return;
      }

      if (chartType) {
        const data = rows.map((row) => {
          const obj: Record<string, any> = {};
          columns.forEach((col, i) => (obj[col] = row[i]));
          return obj;
        });
        renderChart(el, data, chartType, chartOptions, plotDefaults, {
          defaultWidth: this.settings.defaultChartWidth,
          defaultHeight: this.settings.defaultChartHeight,
        });
        if (caption) this.wrapWithCaption(el, caption, "quack-figure");
      } else {
        el.empty();
        renderTable(el, columns, rows);
        if (caption) this.wrapWithCaption(el, caption, "quack-table");
      }
    } catch (err: any) {
      renderError(el, err.message || String(err));
    }
  }

  private wrapWithCaption(el: HTMLElement, caption: string, className: string): void {
    const figure = document.createElement("figure");
    figure.className = className;
    // Move all existing children into the figure
    while (el.firstChild) {
      figure.appendChild(el.firstChild);
    }
    const figcaption = document.createElement("figcaption");
    figcaption.textContent = caption;
    figure.appendChild(figcaption);
    el.appendChild(figure);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async onunload() {
    if (this.settings.debugLogging) {
      console.log("[quackblocks] Unloading...");
    }
    await this.dbManager.close();
  }
}
