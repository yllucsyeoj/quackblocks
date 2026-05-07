export function renderTable(
  el: HTMLElement,
  columns: string[],
  rows: any[][]
): void {
  const table = el.createEl("table", {
    attr: {
      style:
        "border-collapse: collapse; font-family: var(--font-text); font-size: 13px; width: 100%;",
    },
  });

  const thead = table.createEl("thead");
  const headerRow = thead.createEl("tr");
  for (const col of columns) {
    headerRow.createEl("th", {
      text: col,
      attr: {
        style:
          "text-align: left; padding: 6px 10px; border-bottom: 2px solid var(--background-modifier-border); color: var(--text-normal); font-weight: 600;",
      },
    });
  }

  const tbody = table.createEl("tbody");
  for (const row of rows) {
    const tr = tbody.createEl("tr");
    for (const val of row) {
      tr.createEl("td", {
        text: String(val ?? ""),
        attr: {
          style:
            "padding: 4px 10px; border-bottom: 1px solid var(--background-modifier-border); color: var(--text-muted);",
        },
      });
    }
  }
}

export function renderError(el: HTMLElement, message: string): void {
  el.empty();

  // Improve common DuckDB error messages
  let displayMessage = message;
  const tableMatch = message.match(/Table with name (\w+) does not exist/);
  if (tableMatch) {
    displayMessage = `Table "${tableMatch[1]}" not found. Is it declared in your frontmatter datasources?`;
  }

  const box = el.createEl("div", {
    attr: {
      style:
        "background: rgba(220, 38, 38, 0.08); border: 1px solid rgba(220, 38, 38, 0.3); border-radius: 6px; padding: 10px 14px; font-family: var(--font-monospace);",
    },
  });
  box.createEl("div", {
    text: "SQL Error",
    attr: {
      style: "font-size: 12px; font-weight: bold; color: var(--text-error); margin-bottom: 4px;",
    },
  });
  box.createEl("div", {
    text: displayMessage,
    attr: { style: "font-size: 11px; color: var(--text-error); opacity: 0.85;" },
  });
}

export function renderEmpty(el: HTMLElement): void {
  el.empty();
  el.createEl("div", {
    text: "Query returned 0 rows",
    attr: {
      style: "padding: 8px; color: var(--text-faint); font-style: italic;",
    },
  });
}

export function renderLoading(el: HTMLElement): void {
  el.empty();
  el.createEl("div", {
    text: "Running query...",
    attr: {
      style:
        "padding: 8px; color: var(--text-faint); font-family: var(--font-monospace); font-size: 12px;",
    },
  });
}
