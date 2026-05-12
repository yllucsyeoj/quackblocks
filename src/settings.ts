import { App, PluginSettingTab, Setting } from "obsidian";
import type QuackBlocksPlugin from "../main";

export interface QuackBlocksSettings {
  debugLogging: boolean;
  defaultChartWidth: number;
  defaultChartHeight: number;
}

export const DEFAULT_SETTINGS: QuackBlocksSettings = {
  debugLogging: false,
  defaultChartWidth: 640,
  defaultChartHeight: 400,
};

export class QuackBlocksSettingTab extends PluginSettingTab {
  plugin: QuackBlocksPlugin;

  constructor(app: App, plugin: QuackBlocksPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Debug logging")
      .setDesc("log DuckDB lifecycle events and query details to the developer console")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.debugLogging)
          .onChange(async (value) => {
            this.plugin.settings.debugLogging = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Default chart width")
      .setDesc("default width in pixels for charts (overridable per-block or via plotDefaults)")
      .addText((text) =>
        text
          .setPlaceholder("640")
          .setValue(String(this.plugin.settings.defaultChartWidth))
          .onChange(async (value) => {
            const num = parseInt(value, 10);
            if (!isNaN(num) && num > 0) {
              this.plugin.settings.defaultChartWidth = num;
              await this.plugin.saveSettings();
            }
          })
      );

    new Setting(containerEl)
      .setName("Default chart height")
      .setDesc("default height in pixels for charts (overridable per-block or via plotDefaults)")
      .addText((text) =>
        text
          .setPlaceholder("400")
          .setValue(String(this.plugin.settings.defaultChartHeight))
          .onChange(async (value) => {
            const num = parseInt(value, 10);
            if (!isNaN(num) && num > 0) {
              this.plugin.settings.defaultChartHeight = num;
              await this.plugin.saveSettings();
            }
          })
      );
  }
}
