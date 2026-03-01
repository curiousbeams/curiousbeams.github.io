/**
 * marimo-island-widget.js
 *
 * Anywidget that renders a hosted marimo .py notebook as reactive marimo islands,
 * injected directly into the host page (MyST / JupyterBook etc.).
 *
 * ⚠️  One marimo notebook per page — multiple instances will conflict.
 *
 * Model properties:
 *   url           {string}  Required. URL of the remote .py marimo notebook.
 *   version       {string}  Optional. Overrides auto-detected version.
 *   width         {string}  Optional. CSS width (default: "100%").
 *   background    {string}  Optional. CSS background (default: "transparent").
 *   border_radius {string}  Optional. CSS border-radius (default: "6px").
 *
 * Height is intentionally not configurable — the container expands to fit
 * its content once marimo hydrates.
 */

// ---------------------------------------------------------------------------
// Parser helpers
// ---------------------------------------------------------------------------

function parseVersion(src) {
  const m = src.match(/^__generated_with\s*=\s*["']([^"']+)["']/m);
  return m ? m[1] : null;
}

/**
 * @typedef {{ code: string, hideCode: boolean }} MarimoCell
 * @param {string} src
 * @returns {MarimoCell[]}
 */
function parseMarimoNotebook(src) {
  const lines = src.split("\n");
  const cells = [];
  let i = 0;

  while (i < lines.length) {
    // 1. Find @app.cell decorator
    if (!/^@app\.cell/.test(lines[i])) {
      i++;
      continue;
    }
    const hideCode = /hide_code\s*=\s*True/i.test(lines[i]);
    i++;

    // 2. Skip def/async def signature (may span lines)
    if (i >= lines.length || !/^\s*(async\s+)?def\s+/.test(lines[i])) continue;
    let depth = 0;
    while (i < lines.length) {
      const sl = lines[i];
      for (const ch of sl) {
        if (ch === "(") depth++;
        else if (ch === ")") depth--;
      }
      i++;
      if (depth <= 0 && sl.trimEnd().endsWith(":")) break;
    }

    // 3. Collect indented body lines
    const bodyLines = [];
    while (i < lines.length) {
      const line = lines[i];
      if (line.length > 0 && line[0] !== " " && line[0] !== "\t") break;
      bodyLines.push(line);
      i++;
    }
    while (bodyLines.length > 0 && bodyLines.at(-1).trim() === "")
      bodyLines.pop();

    // 4. Strip trailing `return` statement (marimo's dep-tracking artifact)
    let returnStart = -1,
      parenBalance = 0;
    for (let j = bodyLines.length - 1; j >= 0; j--) {
      const t = bodyLines[j].trim();
      for (const ch of t) {
        if (ch === ")" || ch === "]") parenBalance++;
        else if (ch === "(" || ch === "[") parenBalance--;
      }
      if (/^return\b/.test(t) && parenBalance >= 0) {
        returnStart = j;
        break;
      }
      if (parenBalance === 0 && t !== "" && !/^[)\],\\]/.test(t)) break;
    }

    const codeLines =
      returnStart >= 0 ? bodyLines.slice(0, returnStart) : [...bodyLines];
    while (codeLines.length > 0 && codeLines.at(-1).trim() === "")
      codeLines.pop();

    // 5. Dedent
    const code = codeLines
      .map((l) => (l.startsWith("    ") ? l.slice(4) : l))
      .join("\n");
    if (code.trim() === "") continue;

    cells.push({ code, hideCode });
  }

  return cells;
}

// ---------------------------------------------------------------------------
// Head injection (idempotent)
// ---------------------------------------------------------------------------

const MARIMO_HEAD_ATTR = "data-marimo-islands-loaded";

function injectHead(version) {
  if (document.head.querySelector(`[${MARIMO_HEAD_ATTR}]`)) return;

  const base = `https://cdn.jsdelivr.net/npm/@marimo-team/islands@${version}`;
  const fonts = `https://fonts.googleapis.com/css2?family=Fira+Mono:wght@400;500;700&family=Lora&family=PT+Sans:wght@400;700&display=swap`;

  const items = [
    Object.assign(document.createElement("script"), {
      type: "module",
      src: `${base}/dist/main.js`,
    }),
    Object.assign(document.createElement("link"), {
      rel: "stylesheet",
      href: `${base}/dist/style.css`,
      crossOrigin: "anonymous",
    }),
    Object.assign(document.createElement("link"), {
      rel: "preconnect",
      href: "https://fonts.googleapis.com",
    }),
    Object.assign(document.createElement("link"), {
      rel: "preconnect",
      href: "https://fonts.gstatic.com",
      crossOrigin: "",
    }),
    Object.assign(document.createElement("link"), {
      rel: "stylesheet",
      href: fonts,
    }),
    Object.assign(document.createElement("link"), {
      rel: "stylesheet",
      href: "https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css",
      integrity:
        "sha384-wcIxkf4k558AjM3Yz3BBFQUbk/zgIYC2R0QpeeYb+TwlBVMrlgLqwRjRtGZiK7ww",
      crossOrigin: "anonymous",
    }),
    // Hide raw cell code content before Pyodide hydrates — it should
    // never be visible to users regardless.
    Object.assign(document.createElement("style"), {
      textContent: "marimo-cell-code { display: none !important; }",
    }),
    // Required by marimo islands runtime
    Object.assign(document.createElement("marimo-filename"), { hidden: true }),
  ];

  items[0].setAttribute(MARIMO_HEAD_ATTR, version);
  items.forEach((node) => document.head.appendChild(node));
}

// ---------------------------------------------------------------------------
// Anywidget lifecycle
// ---------------------------------------------------------------------------

export default {
  async initialize({ model }) {
    return () => {};
  },

  async render({ model, el }) {
    const notebookUrl = model.get("url");
    const versionProp = model.get("version");
    const width = model.get("width") || "100%";
    const background = model.get("background") || "transparent";
    const borderRadius = model.get("border_radius") || "6px";

    // Height is auto — expands to fit content once hydrated.
    el.style.cssText = `
      display: block;
      width: ${width};
      background: ${background};
      border-radius: ${borderRadius};
      overflow: hidden;
    `;

    if (!notebookUrl) {
      el.textContent = "marimo-widget: no notebook URL provided.";
      return () => {};
    }

    el.textContent = "Loading notebook…";

    try {
      const resp = await fetch(notebookUrl);
      if (!resp.ok)
        throw new Error(`HTTP ${resp.status} fetching ${notebookUrl}`);
      const src = await resp.text();

      const version = parseVersion(src) || versionProp || "0.20.2";
      const cells = parseMarimoNotebook(src);
      if (cells.length === 0)
        throw new Error("No cells found — is this a valid marimo notebook?");

      injectHead(version);

      el.innerHTML = "";

      cells.forEach((cell, idx) => {
        const island = document.createElement("marimo-island");
        island.setAttribute("data-app-id", "main");
        island.setAttribute(
          "data-cell-id",
          `cell-${String(idx).padStart(4, "0")}`,
        );
        island.setAttribute("data-cell-idx", String(idx));
        island.setAttribute("data-reactive", "true");

        const output = document.createElement("marimo-cell-output");
        const code = document.createElement("marimo-cell-code");
        code.textContent = encodeURIComponent(cell.code);
        if (cell.hideCode) code.setAttribute("hidden", "");

        island.appendChild(output);
        island.appendChild(code);
        el.appendChild(island);
      });
    } catch (err) {
      el.innerHTML = `<div style="padding:1rem;font-family:monospace;font-size:.8rem;
        color:#c0392b;background:#fff5f5;border:1px solid #fbb;border-radius:4px;
        white-space:pre-wrap;overflow:auto;"
        >marimo-widget error:\n\n${String(err?.stack ?? err)}</div>`;
    }

    return () => {};
  },
};
