// wolfram-notebook.js
// :::{any:bundle} https://your-host/wolfram-notebook.js
// {
//   "url": "https://www.wolframcloud.com/obj/your-notebook",
//   "width": 800,
//   "maxHeight": 600,
//   "allowInteract": true,
//   "showBorder": false,
//   "showRenderProgress": true,
//   "useShadowDOM": true
// }
// :::

const EMBEDDER_CDN =
  "https://unpkg.com/wolfram-notebook-embedder@0.3/dist/wolfram-notebook-embedder.min.js";

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
    script.onerror = () => reject(new Error("Failed to load wolfram-notebook-embedder"));
    document.head.appendChild(script);
  });
  return _embedderPromise;
}

export default {
  async initialize({ model }) {
    return () => {};
  },

  async render({ model, el }) {
    const url                = model.get("url");
    const width              = model.get("width")              ?? null;
    const maxHeight          = model.get("maxHeight")          ?? null;
    const allowInteract      = model.get("allowInteract")      ?? true;
    const showBorder         = model.get("showBorder")         ?? false;
    const showRenderProgress = model.get("showRenderProgress") ?? true;
    const useShadowDOM       = model.get("useShadowDOM")       ?? true;

    if (!url) {
      el.innerHTML = '<p style="color:red;font-family:sans-serif;">wolfram-notebook: "url" is required.</p>';
      return () => {};
    }

    const container = document.createElement("div");
    if (width != null) container.style.width = `${width}px`;

    el.appendChild(container);

    let embedding = null;
    try {
      const WolframNotebookEmbedder = await loadEmbedder();
      embedding = await WolframNotebookEmbedder.embed(url, container, {
        allowInteract,
        showBorder,
        showRenderProgress,
        useShadowDOM,
        ...(width     !== null && { width }),
        ...(maxHeight !== null && { maxHeight }),
      });
    } catch (err) {
      console.error("wolfram-notebook:", err);
      container.innerHTML = `<p style="color:red;font-family:sans-serif;">Failed to embed notebook: ${err.message}</p>`;
      return () => {};
    }

    return () => {
      try { embedding?.detach(); } catch (_) {}
      container.remove();
    };
  },
};