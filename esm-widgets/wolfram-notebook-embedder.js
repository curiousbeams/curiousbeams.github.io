// wolfram-notebook.js
// AnyWidget ESM module for embedding Wolfram Cloud notebooks.
//
// :::{any:bundle} https://your-host/wolfram-notebook.js
// {
//   "url": "https://www.wolframcloud.com/obj/your-notebook",
//   "width": 800,               // optional – px; null = adapt to container
//   "maxHeight": 600,           // optional – px; omit = grow freely
//   "allowInteract": true,      // optional, default true
//   "showBorder": false,        // optional, default null (notebook decides)
//   "showRenderProgress": true, // optional, default true
//   "useShadowDOM": true        // optional, default true — isolates the notebook's
//                               // styles from the rest of the page
// }
// :::

const EMBEDDER_CDN =
  "https://unpkg.com/wolfram-notebook-embedder@0.3/dist/wolfram-notebook-embedder.min.js";

// ── Embedder loader (cached globally across instances) ──────────────────────

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
    const useShadowDOM       = model.get("useShadowDOM")       ?? true;

    if (!url) {
      el.innerHTML =
        '<p style="color:red;font-family:sans-serif;">wolfram-notebook: "url" is required.</p>';
      return () => {};
    }

    const container = document.createElement("div");
    container.className = "wolfram-notebook-container";

    if (width != null)     container.style.width     = `${width}px`;
    if (maxHeight != null) container.style.maxHeight = `${maxHeight}px`;

    el.appendChild(container);

    let embedding = null;
    try {
      const WolframNotebookEmbedder = await loadEmbedder();

      embedding = await WolframNotebookEmbedder.embed(url, container, {
        allowInteract,
        showRenderProgress,
        ...(width     !== null && { width }),
        ...(maxHeight !== null && { maxHeight }),
        ...(showBorder !== null && { showBorder }),
        useShadowDOM,
      });

    } catch (err) {
      console.error("wolfram-notebook:", err);
      container.innerHTML = `
        <p style="color:red;font-family:sans-serif;">
          Failed to embed notebook: ${err.message}
        </p>`;
      return () => {};
    }

    return () => {
      try { embedding?.detach(); } catch (_) {}
      container.remove();
    };
  },
};