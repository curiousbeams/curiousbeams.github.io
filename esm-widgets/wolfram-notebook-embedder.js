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
//   "useShadowDOM": true,       // optional, default true
//
//   "shadowCSS": "..."          // optional – raw CSS injected directly into the
//                               // shadow root, so it can reach notebook internals.
//                               // Use the browser Inspector (expand the shadow-root
//                               // node) to find selectors.
//                               // Example:
//                               // "shadowCSS": "
//                               //   .WolframNotebookEmbedder { background: white; }
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

// ── Shadow root style injection ─────────────────────────────────────────────

/**
 * Wait for the shadow root to appear on the container (the embedder attaches
 * it asynchronously), then inject a <style> element inside it.
 * Returns a cleanup fn that removes the injected element.
 */
function injectIntoShadowRoot(container, css) {
  if (!css || !css.trim()) return () => {};

  return new Promise((resolve) => {
    function tryInject() {
      const shadowRoot = container.shadowRoot;
      if (shadowRoot) {
        const styleEl = document.createElement("style");
        styleEl.textContent = css;
        shadowRoot.appendChild(styleEl);
        resolve(() => styleEl.remove());
      } else {
        // Shadow root not attached yet — poll briefly
        setTimeout(tryInject, 50);
      }
    }
    tryInject();
  });
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
    const shadowCSS          = model.get("shadowCSS")          || "";

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

    // Start listening for the shadow root immediately, in parallel with embedding,
    // since the embedder attaches it synchronously before its async work completes.
    const shadowInjectPromise = useShadowDOM
      ? injectIntoShadowRoot(container, shadowCSS)
      : Promise.resolve(() => {});

    let embedding = null;
    let removeShadowStyles = () => {};

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

      // Resolve shadow style injection (should already be done by now)
      removeShadowStyles = await shadowInjectPromise;

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
      removeShadowStyles();
      container.remove();
    };
  },
};