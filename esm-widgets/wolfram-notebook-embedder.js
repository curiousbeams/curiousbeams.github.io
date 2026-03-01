// wolfram-notebook.js
// AnyWidget ESM module for embedding Wolfram Cloud notebooks.
// Bypasses wolfram-notebook-embedder entirely — calls the Wolfram Cloud
// embedding API and lib.embed() directly, giving full CSS access to the
// rendered DOM without any shadow root.
//
// :::{any:bundle} https://your-host/wolfram-notebook.js
// {
//   "url": "https://www.wolframcloud.com/obj/your-notebook",
//   "width": 800,               // optional – px; null = adapt to container
//   "maxHeight": 600,           // optional – px; omit = Infinity
//   "allowInteract": true,      // optional, default true
//   "showBorder": false,        // optional, default null
//   "showRenderProgress": true, // optional, default true
//   "style": { "background": "white" }  // optional – CSS-in-JS on the container
// }
// :::

// ── Script loader cache ─────────────────────────────────────────────────────

const installedScripts = {};
const libraryLoading = {};
let counter = 0;

function installScript(url) {
  if (!installedScripts[url]) {
    const s = document.createElement('script');
    s.type = 'text/javascript';
    s.src = url;
    document.head.appendChild(s);
    installedScripts[url] = true;
  }
}

function loadLibrary(url) {
  if (!libraryLoading[url]) {
    libraryLoading[url] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.type = 'text/javascript';
      s.onerror = reject;
      let callbackName;
      do {
        callbackName = '_wolframEmbedCallback' + (++counter);
      } while (window[callbackName]);
      window[callbackName] = (lib) => {
        delete window[callbackName];
        resolve(lib);
      };
      s.src = url + '?callback=' + callbackName;
      document.head.appendChild(s);
    });
  }
  return libraryLoading[url];
}

// ── Notebook data fetch ─────────────────────────────────────────────────────

function getNotebookData(url) {
  // Parse cloudBase and path from a full wolframcloud.com/obj/... URL
  const match = url.match(/^(https?:\/\/[^/]+)\/(?:obj|objects)\/(.+?)(\?.*)?$/);
  if (!match) throw new Error('Invalid Wolfram Cloud URL: ' + url);
  const cloudBase = match[1];
  const path = match[2];

  return fetch(`${cloudBase}/notebooks/embedding?path=${encodeURIComponent(path)}`)
    .then(r => {
      if (!r.ok) throw new Error('Failed to fetch notebook metadata: ' + r.status);
      return r.json();
    })
    .then(data => ({
      cloudBase,
      notebookID: data.notebookID,
      mainScript: cloudBase + data.mainScript,
      otherScripts: (data.otherScripts || []).map(s => cloudBase + s),
      extraData: data.extraData || [],
    }));
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

    if (!url) {
      el.innerHTML =
        '<p style="color:red;font-family:sans-serif;">wolfram-notebook: "url" is required.</p>';
      return () => {};
    }

    const container = document.createElement("div");
    container.className = "wolfram-notebook-container";

    if (width != null)     container.style.width     = `${width}px`;
    if (maxHeight != null) container.style.maxHeight = `${maxHeight}px`;
    Object.assign(container.style, style);

    el.appendChild(container);

    let embedding = null;
    try {
      const { cloudBase, notebookID, mainScript, otherScripts, extraData } =
        await getNotebookData(url);

      // Load supporting scripts (non-blocking)
      otherScripts.forEach(installScript);

      // Load the main Wolfram Cloud library
      const lib = await loadLibrary(mainScript);

      // Embed directly into our container — no shadow DOM
      embedding = await lib.embed(notebookID, container, {
        allowInteract,
        showRenderProgress,
        maxHeight: maxHeight ?? Infinity,
        ...(width     !== null && { width }),
        ...(showBorder !== null && { showBorder }),
        extraData,
        onContainerDimensionsChange({ width: w, height: h }) {
          if (w != null) container.style.width  = `${w}px`;
          if (h != null) container.style.height = `${h}px`;
        },
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