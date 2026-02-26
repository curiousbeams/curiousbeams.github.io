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
//   "style": {                  // optional – CSS-in-JS applied to the outer wrapper div
//     "borderRadius": "8px",
//     "boxShadow": "0 2px 12px rgba(0,0,0,0.12)"
//   },
//
//   "customCSS": "..."          // optional – raw CSS string, scoped to this widget's
//                               // container via a generated #id prefix.
//                               // Use the browser Inspector on your notebook to find
//                               // the real class names to target.
//                               // The placeholder {{id}} is replaced with the container id.
//                               //
//                               // Example — tint the notebook background and style headings:
//                               //
//                               // "customCSS": "
//                               //   {{id}} .WolframNotebookEmbedder { background: #f0f4f8; }
//                               //   {{id}} .cell-content .native-layout { color: #1a1a2e; }
//                               // "
// }
// :::

const EMBEDDER_CDN =
  "https://unpkg.com/wolfram-notebook-embedder@0.3/dist/wolfram-notebook-embedder.min.js";

// ── Embedder loader (cached globally) ──────────────────────────────────────

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

function cssObjectToString(obj) {
  return Object.entries(obj)
    .map(([prop, value]) => {
      const kebab = prop.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`);
      return `${kebab}:${value}`;
    })
    .join("; ");
}

function injectStyle(css) {
  if (!css || !css.trim()) return () => {};
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
    const customCSS          = model.get("customCSS")          || "";

    // ── 2. Validate ─────────────────────────────────────────────────────────
    if (!url) {
      el.innerHTML =
        '<p style="color:red;font-family:sans-serif;">wolfram-notebook: "url" is required.</p>';
      return () => {};
    }

    // ── 3. Build container ──────────────────────────────────────────────────
    const id = `wolfram-nb-${Math.random().toString(36).slice(2, 9)}`;

    const container = document.createElement("div");
    container.id = id;
    container.className = "wolfram-notebook-container";

    if (width != null)     container.style.width     = `${width}px`;
    if (maxHeight != null) container.style.maxHeight = `${maxHeight}px`;
    Object.assign(container.style, style);

    el.appendChild(container);

    // ── 4. Inject custom CSS ────────────────────────────────────────────────
    // Replace {{id}} placeholder with the actual #id selector so the user
    // can write readable CSS in the config without knowing the generated id.
    // We also auto-prefix any bare selectors that don't already reference {{id}}
    // as a convenience — but explicit {{id}} usage is recommended.
    const processedCSS = customCSS.replace(/\{\{id\}\}/g, `#${id}`);
    const removeStyles = injectStyle(processedCSS);

    // ── 5. Load embedder and embed ──────────────────────────────────────────
    let embedding = null;
    try {
      const WolframNotebookEmbedder = await loadEmbedder();

      const embedOptions = {
        allowInteract,
        showRenderProgress,
        ...(width     !== null && { width }),
        ...(maxHeight !== null && { maxHeight }),
        ...(showBorder !== null && { showBorder }),
      };

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