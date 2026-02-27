// wolfram-notebook.js
// AnyWidget ESM module for embedding Wolfram Cloud notebooks.
//
// :::{any:bundle} https://your-host/wolfram-notebook.js
// {
//   "url": "https://www.wolframcloud.com/obj/your-notebook",
//   "width": 800,
//   "maxHeight": 600,
//   "allowInteract": true,
//   "showBorder": false,
//   "showRenderProgress": true,
//   "style": { "borderRadius": "8px" },
//   "customCSS": "
//     .WolframNotebookEmbedder { background: #f0f4f8; }
//     .cell-content .native-layout { color: #c0392b; font-style: italic; }
//   "
// }
// :::
//
// Every rule in customCSS is automatically scoped to this widget's container,
// so styles never leak to the rest of the page.

const EMBEDDER_CDN =
  "https://unpkg.com/wolfram-notebook-embedder@0.3/dist/wolfram-notebook-embedder.min.js";

// ── Embedder loader ─────────────────────────────────────────────────────────

let _embedderPromise = null;

function loadEmbedder() {
  if (_embedderPromise) return _embedderPromise;
  _embedderPromise = new Promise((resolve, reject) => {
    if (window.WolframNotebookEmbedder) {
      resolve(window.WolframNotebookEmbedder);
      return;
    }
    const script = document.createElement("script");
    script.crossOrigin = "anonymous";
    script.src = EMBEDDER_CDN;
    script.onload = () => resolve(window.WolframNotebookEmbedder);
    script.onerror = () =>
      reject(new Error("Failed to load wolfram-notebook-embedder from CDN"));
    document.head.appendChild(script);
  });
  return _embedderPromise;
}

// ── CSS auto-scoping ────────────────────────────────────────────────────────

/**
 * Parse a CSS string and prefix every selector with `#containerId`.
 *
 * Handles:
 *   - Multiple selectors separated by commas
 *   - Multi-line rules
 *   - @-rules (passed through unchanged — @keyframes, @media etc.)
 *
 * Does NOT handle nested CSS or complex at-rules, which aren't needed here.
 */
function scopeCSS(css, id) {
  const scope = `#${id}`;

  // Strip comments first
  css = css.replace(/\/\*[\s\S]*?\*\//g, "");

  const result = [];
  let i = 0;

  while (i < css.length) {
    // Skip whitespace
    while (i < css.length && /\s/.test(css[i])) i++;
    if (i >= css.length) break;

    // At-rule: pass through as-is (find matching braces or semicolon)
    if (css[i] === "@") {
      const semi = css.indexOf(";", i);
      const brace = css.indexOf("{", i);
      if (semi !== -1 && (brace === -1 || semi < brace)) {
        result.push(css.slice(i, semi + 1));
        i = semi + 1;
      } else if (brace !== -1) {
        // Find matching closing brace
        let depth = 0;
        let j = brace;
        while (j < css.length) {
          if (css[j] === "{") depth++;
          else if (css[j] === "}") { depth--; if (depth === 0) break; }
          j++;
        }
        result.push(css.slice(i, j + 1));
        i = j + 1;
      }
      continue;
    }

    // Find the opening brace for this rule
    const braceOpen = css.indexOf("{", i);
    if (braceOpen === -1) break;

    // Find the matching closing brace
    let depth = 0;
    let braceClose = braceOpen;
    while (braceClose < css.length) {
      if (css[braceClose] === "{") depth++;
      else if (css[braceClose] === "}") { depth--; if (depth === 0) break; }
      braceClose++;
    }

    // The selector string (may be comma-separated)
    const selectorPart = css.slice(i, braceOpen).trim();
    const declarations = css.slice(braceOpen + 1, braceClose).trim();

    // Prefix each comma-separated selector
    const scopedSelector = selectorPart
      .split(",")
      .map(sel => {
        sel = sel.trim();
        if (!sel) return "";
        // If the user already wrote the scope id, don't double-prefix
        if (sel.startsWith(scope)) return sel;
        return `${scope} ${sel}`;
      })
      .filter(Boolean)
      .join(",\n");

    result.push(`${scopedSelector} { ${declarations} }`);
    i = braceClose + 1;
  }

  return result.join("\n");
}

function injectStyle(css) {
  if (!css || !css.trim()) return () => {};
  const el = document.createElement("style");
  el.textContent = css;
  document.head.appendChild(el);
  return () => el.remove();
}

function cssObjectToString(obj) {
  return Object.entries(obj)
    .map(([prop, value]) => {
      const kebab = prop.replace(/([A-Z])/g, m => `-${m.toLowerCase()}`);
      return `${kebab}:${value}`;
    })
    .join("; ");
}

// ── Widget ──────────────────────────────────────────────────────────────────

export default {
  async initialize({ model }) {
    return () => {};
  },

  async render({ model, el }) {
    const url                = model.get("url");
    const width              = model.get("width")              ?? null;
    const maxHeight          = model.get("maxHeight")          ?? null;
    const allowInteract      = model.get("allowInteract")      ?? true;
    const showBorder         = model.get("showBorder")         ?? null;
    const showRenderProgress = model.get("showRenderProgress") ?? true;
    const style              = model.get("style")              || {};
    const customCSS          = model.get("customCSS")          || "";

    if (!url) {
      el.innerHTML =
        '<p style="color:red;font-family:sans-serif;">wolfram-notebook: "url" is required.</p>';
      return () => {};
    }

    // Unique container id — used as the CSS scope anchor
    const id = `wolfram-nb-${Math.random().toString(36).slice(2, 9)}`;

    const container = document.createElement("div");
    container.id = id;
    container.className = "wolfram-notebook-container";

    if (width != null)     container.style.width     = `${width}px`;
    if (maxHeight != null) container.style.maxHeight = `${maxHeight}px`;
    Object.assign(container.style, style);

    el.appendChild(container);

    // Scope and inject customCSS — every rule is prefixed with #id automatically
    const scoped = scopeCSS(customCSS, id);
    const removeStyles = injectStyle(scoped);

    let embedding = null;
    try {
      const WolframNotebookEmbedder = await loadEmbedder();

      embedding = await WolframNotebookEmbedder.embed(url, container, {
        allowInteract,
        showRenderProgress,
        ...(width     !== null && { width }),
        ...(maxHeight !== null && { maxHeight }),
        ...(showBorder !== null && { showBorder }),
      });

    } catch (err) {
      console.error("wolfram-notebook:", err);
      container.innerHTML = `
        <p style="color:red;font-family:sans-serif;">
          Failed to embed notebook: ${err.message}
        </p>`;
      removeStyles();
      return () => {};
    }

    return () => {
      try { embedding?.detach(); } catch (_) {}
      removeStyles();
      container.remove();
    };
  },
};