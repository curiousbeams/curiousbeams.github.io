// image-gallery.js — a justified-rows photo gallery with a lightbox.
//
//   :::{anywidget} https://curiousbeams.github.io/esm-widgets/image-gallery.js
//   {
//     "source": "https://curiousbeams.github.io/gallery.yml",
//     "key": "gallery",        // the top-level key in that file (default "gallery")
//     "limit": 0,              // 0 or absent: every photo
//     "target_height": 230,    // the height rows aim for, in px, before justifying
//     "gap": 8,
//     "caption_on_hover": true
//   }
//   :::
//
// `images` may be given inline instead of `source`, in the same shape the
// carousel takes:
//
//   {"images": [{"src": "https://…/photo.jpg", "caption": "What is happening."}]}
//
// Rows are laid out the way a photo site does it: fill a row until it is wider
// than the container, then scale that row down so it ends flush. Every photo
// keeps its own aspect ratio and nothing is cropped, which matters because the
// lab's photographs are a mix of portrait and landscape. The last row is left at
// the target height rather than stretched, so two leftover photos do not blow up
// to fill a whole line.

// ---------------------------------------------------------------------------
// Shared plumbing, inlined.
//
// These helpers are duplicated in the other widgets in this folder rather than
// imported from one module, because a widget mounted with {anywidget} has to be
// a SINGLE FILE. The build downloads the module it is pointed at, re-serves it
// from the site's own origin under a content hash, and copies nothing beside
// it, so a relative import inside that copy resolves to a path on the site's
// origin where nothing lives, 404s, and takes the whole widget down with it.
// Absolute-URL imports survive, which is how the CDN dependencies elsewhere in
// the folder work; relative ones do not. Keep any edit below in step across the
// widgets that carry it.
// ---------------------------------------------------------------------------

/** True when the host page is in dark mode. */
function isDark() {
  const root = document.documentElement;
  if (root.classList.contains("dark")) return true; // MyST book-theme / Tailwind
  if (root.dataset.theme === "dark") return true;
  if (root.dataset.theme === "light") return false;
  return matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

/**
 * Mirror the host page's light/dark mode onto `el.dataset.theme`.
 *
 * The page's own theme toggle only changes a class on <html>, which no media
 * query inside the widget can observe, so a widget that styles itself from
 * `prefers-color-scheme` alone stays light on a page the reader has switched to
 * dark. Watching the attribute is what keeps the two in step.
 *
 * Returns a function that stops watching.
 */
function trackTheme(el, onChange) {
  const apply = () => {
    const dark = isDark();
    el.dataset.theme = dark ? "dark" : "light";
    onChange?.(dark);
  };
  apply();
  const mq = matchMedia?.("(prefers-color-scheme: dark)");
  mq?.addEventListener("change", apply);
  const mo = new MutationObserver(apply);
  mo.observe(document.documentElement, {attributes: true, attributeFilter: ["class", "data-theme"]});
  return () => {
    mq?.removeEventListener("change", apply);
    mo.disconnect();
  };
}

/**
 * The palette every widget draws from.
 *
 * Each token prefers the host theme's own variable and falls back to a literal
 * when the site does not define it — custom properties are inherited, so the
 * theme's values reach us through the shadow boundary, and the fallbacks keep
 * the widget legible under a theme that has never heard of MyST. The dark block
 * repeats the `var()` with a dark fallback rather than a bare colour, so a site
 * that does define the tokens stays authoritative in both modes.
 */
const PALETTE_CSS = `
:host { color-scheme: light; }

.cbl-root {
  --cbl-text:          var(--myst-color-text, #1b1e23);
  --cbl-text-secondary:var(--myst-color-text-secondary, #4b5563);
  --cbl-muted:         var(--myst-color-text-tertiary, #6b7280);
  --cbl-bg:            var(--myst-color-bg, #ffffff);
  --cbl-surface:       var(--myst-color-surface, #f3f4f6);
  --cbl-border:        var(--myst-color-border, #e5e7eb);
  --cbl-border-strong: var(--myst-color-border-strong, #d1d5db);
  --cbl-link:          var(--myst-color-link, #1d4ed8);
  --cbl-focus:         var(--myst-color-focus-ring, #3b82f6);
  --cbl-radius: 6px;

  color: var(--cbl-text);
  font: inherit;            /* inherit the host page's typography */
  line-height: 1.5;
  display: block;
}

.cbl-root[data-theme="dark"] {
  --cbl-text:          var(--myst-color-text, #f3f4f6);
  --cbl-text-secondary:var(--myst-color-text-secondary, #d1d5db);
  --cbl-muted:         var(--myst-color-text-tertiary, #9ca3af);
  --cbl-bg:            var(--myst-color-bg, #16181d);
  --cbl-surface:       var(--myst-color-surface, #21242b);
  --cbl-border:        var(--myst-color-border, #343a43);
  --cbl-border-strong: var(--myst-color-border-strong, #444b56);
  --cbl-link:          var(--myst-color-link, #60a5fa);
  --cbl-focus:         var(--myst-color-focus-ring, #60a5fa);
  color-scheme: dark;
}

.cbl-root :focus-visible {
  outline: 2px solid var(--cbl-focus);
  outline-offset: 2px;
  border-radius: 3px;
}

.cbl-root img, .cbl-root svg, .cbl-root canvas { max-width: 100%; }

.cbl-error {
  color: var(--myst-color-error, #b91c1c);
  border: 1px solid currentColor;
  border-radius: var(--cbl-radius);
  padding: 8px 10px;
  font-size: 0.85rem;
  white-space: pre-wrap;
}
`;

/**
 * Build the root element every widget hangs its DOM from: a <style> and a
 * themed <div>, both inside `el` so they survive the shadow boundary.
 *
 * `css` is appended after the palette, so a widget's own rules can use the
 * tokens and override them.
 */
function createRoot(el, {className = "", css = "", onTheme} = {}) {
  const style = document.createElement("style");
  style.textContent = PALETTE_CSS + css;
  el.appendChild(style);

  const root = document.createElement("div");
  root.className = className ? `cbl-root ${className}` : "cbl-root";
  el.appendChild(root);

  const untrack = trackTheme(root, onTheme);

  return {
    root,
    dispose() {
      untrack();
      root.remove();
      style.remove();
    }
  };
}

/** Report a failure in place rather than leaving an empty hole in the page. */
function showError(root, message) {
  const pre = document.createElement("div");
  pre.className = "cbl-error";
  pre.textContent = String(message);
  root.appendChild(pre);
  return pre;
}

/** An inline SVG icon that takes its colour from `currentColor`. */
function svgIcon(path, {size = 16, viewBox = "0 0 16 16"} = {}) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", viewBox);
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("fill", "currentColor");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const p = document.createElementNS(ns, "path");
  p.setAttribute("d", path);
  svg.appendChild(p);
  return svg;
}

/** True when the reader has asked for less animation. */
function prefersReducedMotion() {
  return matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}


const CSS = `
.gallery { display: block; }

.gallery--rows {
  position: relative;
  width: 100%;
}

/* Tiles are absolutely positioned from measured geometry rather than left to
   flex-wrap: a row only ends flush if its widths sum to the container exactly,
   and rounding through flex-grow does not guarantee that. Positioning also
   keeps every <img> in place across a resize, so nothing reloads or flickers. */
.gallery--tile {
  position: absolute;
  margin: 0;
  padding: 0;
  border: 0;
  overflow: hidden;
  border-radius: var(--cbl-radius);
  background: var(--cbl-surface);
  cursor: zoom-in;
  display: block;
}
.gallery--tile img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s cubic-bezier(0.25, 0.8, 0.3, 1);
}
.gallery--tile:hover img,
.gallery--tile:focus-visible img { transform: scale(1.04); }

/* The caption sits on a photograph rather than on the page, so it is keyed to a
   dark scrim in both themes — white on a photo is legible whatever the reader
   has the site set to. */
.gallery--caption {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  padding: 0.4rem 0.6rem;
  background: linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0));
  color: #fff;
  font-size: 0.78rem;
  line-height: 1.35;
  text-align: left;
  transition: opacity 0.25s ease;
}
.gallery.caption-on-hover .gallery--caption { opacity: 0; }
.gallery.caption-on-hover .gallery--tile:hover .gallery--caption,
.gallery.caption-on-hover .gallery--tile:focus-visible .gallery--caption { opacity: 1; }

.gallery--empty { color: var(--cbl-muted); font-size: 0.85rem; }

/* Lightbox. position:fixed escapes the widget's box even from inside a shadow
   root, so the overlay covers the viewport rather than the gallery. */
.gallery--lightbox {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem 4.5rem;
  background: rgba(0, 0, 0, 0.92);
  color: #fff;
}
/* An author display:flex outranks the user agent's [hidden] {display:none}, so
   without this the closed overlay stays on screen, dimming the whole page and
   swallowing every click. (No backticks in this block: it is a template
   literal.) */
.gallery--lightbox[hidden] { display: none; }
.gallery--lightbox figure {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  max-width: 100%;
  max-height: 100%;
}
.gallery--lightbox img {
  max-width: 100%;
  max-height: calc(100vh - 9rem);
  object-fit: contain;
  border-radius: 4px;
}
.gallery--lightbox figcaption {
  font-size: 0.9rem;
  text-align: center;
  max-width: 60ch;
}
.gallery--count {
  position: absolute;
  top: 1rem; left: 1rem;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
}

.gallery--button {
  position: absolute;
  display: flex; align-items: center; justify-content: center;
  width: 2.75rem; height: 2.75rem;
  padding: 0; border: 0; border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  cursor: pointer;
  transition: background 0.15s ease;
}
.gallery--button:hover { background: rgba(255, 255, 255, 0.28); }
.gallery--button svg { width: 1.1rem; height: 1.1rem; fill: currentColor; }
.gallery--button.close { top: 0.75rem; right: 0.75rem; }
.gallery--button.prev { left: 0.75rem; top: 50%; transform: translateY(-50%); }
.gallery--button.next { right: 0.75rem; top: 50%; transform: translateY(-50%); }

@media (prefers-reduced-motion: reduce) {
  .gallery--tile img { transition: none; }
  .gallery--tile:hover img, .gallery--tile:focus-visible img { transform: none; }
  .gallery--caption { transition: none; }
}
`;

const CHEVRON_LEFT = "M9.78 12.78a.75.75 0 0 1-1.06 0L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 1 1 1.06 1.06L6.06 8l3.72 3.72a.75.75 0 0 1 0 1.06Z";
const CHEVRON_RIGHT = "M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z";
const CROSS = "M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z";

function roundButton(className, pathData, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `gallery--button ${className}`;
  button.setAttribute("aria-label", label);
  button.appendChild(svgIcon(pathData, {size: 16}));
  return button;
}

/** Normalise an entry to `{src, caption}`, accepting the shapes news.yml uses. */
function readImages(raw) {
  return (Array.isArray(raw) ? raw : [])
    .map((item) => (typeof item === "string" ? {src: item} : item ?? {}))
    .map((item) => ({src: item.src ?? item.image ?? "", caption: item.caption ?? item.title ?? ""}))
    .filter((item) => typeof item.src === "string" && item.src.trim())
    .map((item) => ({...item, src: item.src.trim()}));
}

/**
 * Read the photo list out of a YAML file — the site's gallery.yml.
 *
 * js-yaml is imported by absolute URL, which is the only kind of import that
 * survives here: the build copies this module to its own origin, so a relative
 * import would resolve to a path that does not exist. It is also loaded lazily,
 * so a widget given its photos inline never fetches a parser it cannot use.
 */
async function loadSource(url, key, signal) {
  const resolved = new URL(url, document.baseURI).href;
  const response = await fetch(resolved, {signal});
  if (!response.ok) throw new Error(`Fetching ${resolved} failed with HTTP ${response.status}.`);
  const text = await response.text();
  const {load} = await import("https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/+esm");
  const parsed = load(text) ?? {};
  const entries = Array.isArray(parsed) ? parsed : parsed[key] ?? [];
  // Paths in the file are written relative to the file, as news.yml writes them.
  return readImages(entries).map((item) => ({...item, src: new URL(item.src, resolved).href}));
}

/** Everything a widget needs to know about where its photos come from. */
async function resolveImages(model, signal) {
  const inline = readImages(model.get("images"));
  const source = model.get("source");
  const images = inline.length || !source
    ? inline
    : await loadSource(source, model.get("key") || "gallery", signal);
  const limit = Number(model.get("limit")) || 0;
  return limit > 0 ? images.slice(0, limit) : images;
}

/**
 * Pack photos into rows of equal height that each end flush with the container.
 *
 * `ratio` is width / height. A row is filled until it overflows, then the whole
 * row is scaled so its widths plus the gaps come to exactly `width`.
 */
function justify(items, width, {targetHeight, gap}) {
  const rows = [];
  let row = [];
  let ratioSum = 0;

  const flush = (stretch) => {
    if (!row.length) return;
    const available = width - gap * (row.length - 1);
    const height = stretch
      ? available / ratioSum
      : Math.min(targetHeight, available / ratioSum);
    rows.push({items: row, height});
    row = [];
    ratioSum = 0;
  };

  for (const item of items) {
    row.push(item);
    ratioSum += item.ratio;
    if (ratioSum * targetHeight + gap * (row.length - 1) >= width) flush(true);
  }
  flush(false);   // a part-full last row keeps the target height
  return rows;
}

/** Rows get shorter on a narrow screen, so a phone shows whole photos. */
function targetHeightFor(width, requested) {
  if (width < 420) return Math.round(requested * 0.8);
  if (width < 700) return Math.round(requested * 0.9);
  return requested;
}

export default {
  async render({model, el}) {
    const captionOnHover = model.get("caption_on_hover") ?? true;
    const requestedHeight = Number(model.get("target_height")) || 230;
    const gap = Number(model.get("gap") ?? 8);

    const {root, dispose} = createRoot(el, {
      className: `gallery${captionOnHover ? " caption-on-hover" : ""}`,
      css: CSS
    });

    const controller = new AbortController();
    let disposed = false;
    let teardown = () => {};

    // The list may come from a file, so the build-out is deferred rather than
    // awaited: returning the cleanup function promptly is what lets an unmount
    // abort a fetch that is still in flight.
    (async () => {
      let images;
      try {
        images = await resolveImages(model, controller.signal);
      } catch (error) {
        if (disposed || error.name === "AbortError") return;
        console.error("image-gallery:", error);
        showError(root, `Could not load the photo list. ${error.message}`);
        return;
      }
      if (disposed) return;
      teardown = build(root, images, {captionOnHover, requestedHeight, gap});
    })();

    return () => {
      disposed = true;
      controller.abort();
      teardown();
      dispose();
    };
  }
};

function build(root, images, {requestedHeight, gap}) {
  if (!images.length) {
    const empty = document.createElement("p");
    empty.className = "gallery--empty";
    empty.textContent = "No photographs to show yet.";
    root.appendChild(empty);
    return () => empty.remove();
  }

  const rowsEl = document.createElement("div");
  rowsEl.className = "gallery--rows";
  root.appendChild(rowsEl);

  // 3:2 until the file reports otherwise, so the first layout is close enough
  // that the page does not jump far once the photographs arrive.
  const tiles = images.map((image, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "gallery--tile";
    button.setAttribute("aria-label", image.caption || `Photograph ${index + 1}`);

    const img = document.createElement("img");
    img.src = image.src;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    img.draggable = false;
    button.appendChild(img);

    if (image.caption) {
      const caption = document.createElement("span");
      caption.className = "gallery--caption";
      caption.textContent = image.caption;
      button.appendChild(caption);
    }

    const tile = {...image, index, el: button, img, ratio: 1.5};
    img.addEventListener("load", () => {
      if (img.naturalHeight > 0) {
        tile.ratio = img.naturalWidth / img.naturalHeight;
        schedule();
      }
    });
    button.addEventListener("click", () => lightbox.open(index));
    rowsEl.appendChild(button);
    return tile;
  });

  let width = 0;
  let frame = null;
  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      layout();
    });
  }

  function layout() {
    if (width <= 0) return;
    const targetHeight = targetHeightFor(width, requestedHeight);
    let y = 0;
    for (const row of justify(tiles, width, {targetHeight, gap})) {
      let x = 0;
      for (const tile of row.items) {
        const w = row.height * tile.ratio;
        tile.el.style.left = `${x}px`;
        tile.el.style.top = `${y}px`;
        tile.el.style.width = `${w}px`;
        tile.el.style.height = `${row.height}px`;
        x += w + gap;
      }
      y += row.height + gap;
    }
    rowsEl.style.height = `${Math.max(0, y - gap)}px`;
  }

  const resize = new ResizeObserver(([entry]) => {
    const next = entry.contentRect.width;
    if (next === width) return;
    width = next;
    layout();
  });
  resize.observe(rowsEl);

  const lightbox = createLightbox(root, tiles);

  return () => {
    resize.disconnect();
    if (frame) cancelAnimationFrame(frame);
    lightbox.destroy();
    rowsEl.remove();
  };
}

function createLightbox(root, tiles) {
  const overlay = document.createElement("div");
  overlay.className = "gallery--lightbox";
  overlay.hidden = true;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Photograph");

  const figure = document.createElement("figure");
  const img = document.createElement("img");
  img.alt = "";
  const caption = document.createElement("figcaption");
  figure.append(img, caption);

  const count = document.createElement("div");
  count.className = "gallery--count";

  const close = roundButton("close", CROSS, "Close");
  const previous = roundButton("prev", CHEVRON_LEFT, "Previous photograph");
  const next = roundButton("next", CHEVRON_RIGHT, "Next photograph");

  overlay.append(figure, count, close, previous, next);
  root.appendChild(overlay);

  let current = 0;
  let opener = null;

  function show(index) {
    current = (index % tiles.length + tiles.length) % tiles.length;
    const tile = tiles[current];
    img.src = tile.src;
    caption.textContent = tile.caption;
    caption.hidden = !tile.caption;
    count.textContent = `${current + 1} / ${tiles.length}`;
    const single = tiles.length < 2;
    previous.hidden = single;
    next.hidden = single;
  }

  function open(index) {
    opener = tiles[index]?.el ?? null;
    show(index);
    overlay.hidden = false;
    // The page behind should not scroll while the overlay covers it. This is the
    // one thing the widget reaches outside itself for, and it is put back on close.
    document.body.style.overflow = "hidden";
    close.focus();
  }

  function dismiss() {
    overlay.hidden = true;
    document.body.style.overflow = "";
    opener?.focus();
    opener = null;
    img.removeAttribute("src");   // stop a large photograph decoding in the background
  }

  close.addEventListener("click", dismiss);
  previous.addEventListener("click", () => show(current - 1));
  next.addEventListener("click", () => show(current + 1));
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay || event.target === figure) dismiss();
  });

  // Keyed on the document: the overlay covers the viewport, so the reader may
  // well have clicked outside the widget before reaching for a key.
  const onKey = (event) => {
    if (overlay.hidden) return;
    const handlers = {
      Escape: dismiss,
      ArrowLeft: () => show(current - 1),
      ArrowRight: () => show(current + 1),
      Home: () => show(0),
      End: () => show(tiles.length - 1)
    };
    const handler = handlers[event.key];
    if (!handler) return;
    event.preventDefault();
    handler();
  };
  document.addEventListener("keydown", onKey);

  return {
    open,
    destroy() {
      document.removeEventListener("keydown", onKey);
      if (!overlay.hidden) document.body.style.overflow = "";
      overlay.remove();
    }
  };
}
