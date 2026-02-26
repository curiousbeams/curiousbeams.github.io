// wolfram-notebook.js
// AnyWidget ESM module for embedding Wolfram Cloud notebooks.
//
// Usage (MyST any:bundle directive):
//
// :::{any:bundle} https://your-host/wolfram-notebook.js
// {
//   "url": "https://www.wolframcloud.com/obj/your-notebook",
//
//   "width": 800,               // optional – px number; null = adapt to container
//   "maxHeight": 600,           // optional – px number; omit = grow freely
//   "allowInteract": true,      // optional, default true
//   "showBorder": false,        // optional, default null (notebook decides)
//   "showRenderProgress": true, // optional, default true
//
//   "style": {                  // optional – arbitrary CSS applied to the outer container div
//     "borderRadius": "8px",
//     "boxShadow": "0 2px 12px rgba(0,0,0,0.12)",
//     "padding": "16px"
//   },
//
//   "headingStyle": {           // optional – CSS applied to h1/h2/h3 inside the notebook
//     "fontFamily": "Georgia, serif",
//     "color": "#1a1a2e"
//   },
//
//   "backgroundStyle": {        // optional – CSS applied to the notebook background areas
//     "background": "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)"
//   }
// }
// :::

const EMBEDDER_CDN =
  "https://unpkg.com/wolfram-notebook-embedder@0.3/dist/wolfram-notebook-embedder.min.js";

// ── Embedder loader (cached globally across widget instances) ───────────────

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

// ── Style helpers ───────────────────────────────────────────────────────────

/**
 * Convert a camelCase CSS-in-JS object into a plain CSS declaration block,
 * e.g. { fontFamily: "serif", color: "#333" } → "font-family:serif; color:#333;"
 */
function cssObjectToString(obj) {
  return Object.entries(obj)
    .map(([prop, value]) => {
      const kebab = prop.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`);
      return `${kebab}:${value}`;
    })
    .join("; ");
}

/**
 * Build scoped CSS for heading and background styles, tied to a unique container id.
 * Using an id selector (specificity 0-1-0) is enough to override the embedder's
 * generic rules without needing !important everywhere.
 */
function buildScopedCSS(id, headingStyle, backgroundStyle) {
  let css = "";

  if (headingStyle && Object.keys(headingStyle).length) {
    const decls = cssObjectToString(headingStyle);
    css += `#${id} h1, #${id} h2, #${id} h3 { ${decls} }\n`;
  }

  if (backgroundStyle && Object.keys(backgroundStyle).length) {
    const decls = cssObjectToString(backgroundStyle);
    // Target the container itself plus the embedder's own outer wrapper class.
    css += `#${id}, #${id} .WolframNotebookEmbedder { ${decls} }\n`;
  }

  return css;
}

/**
 * Inject a <style> element into <head>. Returns a cleanup fn that removes it.
 */
function injectStyle(css) {
  if (!css.trim()) return () => {};
  const el = document.createElement("style");
  el.textContent = css;
  document.head.appendChild(el);
  return () => el.remove();
}

// ── Widget ──────────────────────────────────────────────────────────────────

export default {
  async initialize({ model }) {
    return () => {};
  },

  async render({ model, el }) {
    // ── 1. Read config ──────────────────────────────────────────────────────
    const url                = model.get("url");
    const width              = model.get("width")              ?? null;
    const maxHeight          = model.get("maxHeight")          ?? null;
    const allowInteract      = model.get("allowInteract")      ?? true;
    const showBorder         = model.get("showBorder")         ?? null;
    const showRenderProgress = model.get("showRenderProgress") ?? true;
    const style              = model.get("style")              || {};
    const headingStyle       = model.get("headingStyle")       || {};
    const backgroundStyle    = model.get("backgroundStyle")    || {};

    // ── 2. Validate ─────────────────────────────────────────────────────────
    if (!url) {
      el.innerHTML =
        '<p style="color:red;font-family:sans-serif;">wolfram-notebook: "url" is required.</p>';
      return () => {};
    }

    // ── 3. Build container ──────────────────────────────────────────────────
    // Unique id so scoped <style> rules target exactly this instance
    // even if multiple widgets appear on the same page.
    const id = `wolfram-nb-${Math.random().toString(36).slice(2, 9)}`;

    const container = document.createElement("div");
    container.id = id;
    container.className = "wolfram-notebook-container";

    // Sizing
    if (width != null)     container.style.width     = `${width}px`;
    if (maxHeight != null) container.style.maxHeight = `${maxHeight}px`;

    // Arbitrary container styles (camelCase keys accepted)
    Object.assign(container.style, style);

    el.appendChild(container);

    // ── 4. Inject scoped heading / background styles ─────────────────────────
    const css = buildScopedCSS(id, headingStyle, backgroundStyle);
    const removeStyles = injectStyle(css);

    // ── 5. Load embedder and embed ──────────────────────────────────────────
    let embedding = null;
    try {
      const WolframNotebookEmbedder = await loadEmbedder();

      const embedOptions = {
        allowInteract,
        showRenderProgress,
        // Only pass sizing/border opts when explicitly set; omitting lets the
        // embedder apply its own sensible defaults.
        ...(width     !== null && { width }),
        ...(maxHeight !== null && { maxHeight }),
        ...(showBorder !== null && { showBorder }),
      };

      // The embedder accepts a plain URL string directly as `source` and
      // resolves cloudBase from it automatically — no need to decompose it.
      embedding = await WolframNotebookEmbedder.embed(url, container, embedOptions);

    } catch (err) {
      console.error("wolfram-notebook:", err);
      container.innerHTML = `
        <p style="color:red;font-family:sans-serif;">
          Failed to embed notebook: ${err.message}
        </p>`;
      removeStyles();
      return () => {};
    }

    // ── 6. Cleanup ──────────────────────────────────────────────────────────
    return () => {
      try { embedding?.detach(); } catch (_) {}
      removeStyles();
      container.remove();
    };
  },
};