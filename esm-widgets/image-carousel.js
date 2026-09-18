// image-carousel.js — a photo carousel for MyST pages.
//
//   :::{anywidget} https://curiousbeams.github.io/esm-widgets/image-carousel.js
//   {
//     "source": "https://curiousbeams.github.io/gallery.yml",
//     "key": "gallery",             // the top-level key in that file (default "gallery")
//     "limit": 4,                   // 0 or absent: every photo in the file
//     "height_ratio": 0.4,          // viewport height as a fraction of its width
//     "border_radius": "0.5rem",
//     "caption_on_hover": true
//   }
//   :::
//
// `images` may be given inline instead of `source`, and takes precedence:
//
//   {
//     "images": [
//       {"src": "https://…/photo.jpg", "caption": "What is happening."},
//       "https://…/plain-url-also-works.jpg"
//     ],
//     "height_ratio": 0.6,
//     "border_radius": "0.5rem",
//     "caption_on_hover": false,    // true: reveal the caption on hover/focus
//     "type": "loop",               // "loop" wraps around, "slide" stops at the ends
//     "arrows": true,
//     "pagination": true,
//     "autoplay": false             // true, or a number of milliseconds
//   }
//
// See image-gallery.js for the full grid this shares its photo list with.
//
// This used to drive Splide from a CDN, which cannot work under {anywidget}:
// Splide is handed a CSS selector string and looks it up with
// document.querySelector, and its stylesheet went into document.head. Neither
// reaches into a shadow root. Rather than work around a dependency that wants
// the light DOM, the carousel is written out here — it is about as much code as
// the workarounds would have been, and it adds keyboard support, a reduced-motion
// path, and theming that follows the page.

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
.carousel { position: relative; }

.carousel--viewport {
  position: relative;
  overflow: hidden;
  touch-action: pan-y;
  cursor: grab;
  background: var(--cbl-surface);
}
.carousel--viewport.is-dragging { cursor: grabbing; }

.carousel--track {
  display: flex;
  height: 100%;
  will-change: transform;
}
.carousel--track.is-animated {
  transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.3, 1);
}

.carousel--slide {
  position: relative;
  flex: 0 0 100%;
  height: 100%;
  margin: 0;              /* <figure> carries a default margin */
}
.carousel--slide img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  user-select: none;
  -webkit-user-drag: none;
}

/* The chrome sits on top of photographs rather than on the page, so it is keyed
   to a dark scrim in both themes instead of to the palette — white on a photo is
   legible whatever the reader has the site set to. */
.carousel--caption {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  color: #fff;
  font-size: 0.875rem;
  line-height: 1.4;
  margin: 0;
  transition: opacity 0.25s ease;
}
.carousel.has-dots .carousel--caption { padding-bottom: 1.6rem; }
.carousel.caption-on-hover .carousel--caption { opacity: 0; }
.carousel.caption-on-hover .carousel--slide:hover .carousel--caption,
.carousel.caption-on-hover .carousel--viewport:focus-within .carousel--caption { opacity: 1; }

.carousel--arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 2.25rem; height: 2.25rem;
  display: flex; align-items: center; justify-content: center;
  border: 0; border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  cursor: pointer;
  padding: 0;
  transition: background 0.15s ease;
}
.carousel--arrow:hover { background: rgba(0, 0, 0, 0.75); }
.carousel--arrow[disabled] { opacity: 0.35; cursor: default; }
.carousel--arrow.prev { left: 0.5rem; }
.carousel--arrow.next { right: 0.5rem; }
.carousel--arrow svg { width: 1rem; height: 1rem; fill: currentColor; }

.carousel--dots {
  position: absolute;
  left: 0; right: 0; bottom: 0.5rem;
  display: flex; justify-content: center; gap: 0.4rem;
}
.carousel--dot {
  width: 9px; height: 9px;
  padding: 0; border: 0; border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
  box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.5), 0 1px 4px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
}
.carousel--dot[aria-current="true"] { background: #fff; transform: scale(1.5); }

@media (prefers-reduced-motion: reduce) {
  .carousel--track.is-animated { transition: none; }
  .carousel--caption { transition: none; }
}
`;

const CHEVRON_LEFT = "M9.78 12.78a.75.75 0 0 1-1.06 0L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 1 1 1.06 1.06L6.06 8l3.72 3.72a.75.75 0 0 1 0 1.06Z";
const CHEVRON_RIGHT = "M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z";

function arrowButton(direction, pathData, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `carousel--arrow ${direction}`;
  button.setAttribute("aria-label", label);
  button.innerHTML =
    `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="${pathData}"/></svg>`;
  return button;
}

/** Normalise an entry to `{src, caption}`, accepting bare URL strings. */
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
 * so a carousel given its photos inline never fetches a parser it cannot use.
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

/** Everything the widget needs to know about where its photographs come from. */
async function resolveImages(model, signal) {
  const inline = readImages(model.get("images"));
  const source = model.get("source");
  const images = inline.length || !source
    ? inline
    : await loadSource(source, model.get("key") || "gallery", signal);
  const limit = Number(model.get("limit")) || 0;
  return limit > 0 ? images.slice(0, limit) : images;
}

function buildSlide(image, label) {
  const slide = document.createElement("figure");
  slide.className = "carousel--slide";
  slide.setAttribute("role", "group");
  slide.setAttribute("aria-roledescription", "slide");
  if (label) slide.setAttribute("aria-label", label);

  const img = document.createElement("img");
  img.src = image.src;
  // A figcaption already names the photograph, so repeating it in `alt` would
  // have a screen reader read the same sentence twice.
  img.alt = image.caption ? "" : "Gallery photograph";
  img.loading = "lazy";
  img.decoding = "async";
  img.draggable = false;
  slide.appendChild(img);

  if (image.caption) {
    const caption = document.createElement("figcaption");
    caption.className = "carousel--caption";
    caption.textContent = image.caption;
    slide.appendChild(caption);
  }
  return slide;
}

export default {
  async render({model, el}) {
    const captionOnHover = model.get("caption_on_hover") ?? true;

    const {root, dispose} = createRoot(el, {
      className: `carousel${captionOnHover ? " caption-on-hover" : ""}`,
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
        console.error("image-carousel:", error);
        showError(root, `Could not load the photo list. ${error.message}`);
        return;
      }
      if (disposed || !images.length) return;
      teardown = build(root, images, model);
    })();

    return () => {
      disposed = true;
      controller.abort();
      teardown();
      dispose();
    };
  }
};

function build(root, images, model) {
    const heightRatio = Number(model.get("height_ratio") ?? 0.6) || 0.6;
    const borderRadius = model.get("border_radius") || "0";
    const type = model.get("type") || "loop";
    const wantArrows = (model.get("arrows") ?? true) && images.length > 1;
    const wantDots = (model.get("pagination") ?? true) && images.length > 1;
    const autoplayRaw = model.get("autoplay") ?? false;
    const autoplayMs = autoplayRaw === true ? 4000 : Number(autoplayRaw) || 0;

    // The caption bar only has to clear the dots when there are dots, and that
    // is not known until the photographs are in hand.
    if (wantDots) root.classList.add("has-dots");

    // A loop needs a copy of the last slide before the first and of the first
    // after the last, so a wrap can be animated in the direction it was asked
    // for and then snapped back onto the real slide while no transition runs.
    const loop = type === "loop" && images.length > 1;
    const order = loop ? [images.length - 1, ...images.keys(), 0] : [...images.keys()];
    const firstReal = loop ? 1 : 0;
    const lastReal = firstReal + images.length - 1;

    const viewport = document.createElement("div");
    viewport.className = "carousel--viewport";
    viewport.style.borderRadius = borderRadius;
    viewport.style.aspectRatio = `1 / ${heightRatio}`;
    viewport.tabIndex = 0;
    viewport.setAttribute("role", "group");
    viewport.setAttribute("aria-roledescription", "carousel");
    viewport.setAttribute("aria-label", model.get("label") || "Image carousel");

    const track = document.createElement("div");
    track.className = "carousel--track is-animated";
    order.forEach((imageIndex, position) => {
      const isClone = loop && (position === 0 || position === order.length - 1);
      const slide = buildSlide(
        images[imageIndex],
        isClone ? "" : `${imageIndex + 1} of ${images.length}`
      );
      if (isClone) slide.setAttribute("aria-hidden", "true");
      track.appendChild(slide);
    });
    // The slide that is on screen at load should not wait for the lazy loader.
    track.children[firstReal]?.querySelector("img")?.setAttribute("loading", "eager");
    viewport.appendChild(track);
    root.appendChild(viewport);

    let position = firstReal;   // index into `order`, clones included
    let width = 0;              // viewport width in px, the unit we translate by
    let dragDelta = 0;

    const logical = () => ((position - firstReal) % images.length + images.length) % images.length;

    function place(animate) {
      const wantAnimation = animate && !prefersReducedMotion();
      if (wantAnimation) {
        if (!track.classList.contains("is-animated")) {
          track.classList.add("is-animated");
          // A transition only runs when the property was already transitionable
          // at the previous style change. Re-enabling it and moving the track in
          // one task would jump; forcing a reflow between the two commits it.
          void track.offsetWidth;
        }
      } else {
        track.classList.remove("is-animated");
      }
      track.style.transform = `translate3d(${-position * width + dragDelta}px, 0, 0)`;
    }

    /** Step off a clone and onto the real slide it stands for, invisibly. */
    function normalise() {
      if (!loop) return;
      if (position === order.length - 1) position = firstReal;
      else if (position === 0) position = lastReal;
      else return;
      place(false);
    }
    track.addEventListener("transitionend", (event) => {
      if (event.propertyName === "transform") {
        normalise();
        updateChrome();
      }
    });

    function goTo(next, animate = true) {
      position = loop
        ? Math.max(0, Math.min(order.length - 1, next))
        : Math.max(firstReal, Math.min(lastReal, next));
      place(animate);
      // With no transition to wait on there is no transitionend to normalise in.
      if (!animate || prefersReducedMotion() || width === 0) {
        normalise();
      }
      updateChrome();
    }

    const next = () => goTo(position + 1);
    const previous = () => goTo(position - 1);

    let prevButton, nextButton, dots;
    if (wantArrows) {
      prevButton = arrowButton("prev", CHEVRON_LEFT, "Previous image");
      nextButton = arrowButton("next", CHEVRON_RIGHT, "Next image");
      prevButton.addEventListener("click", previous);
      nextButton.addEventListener("click", next);
      viewport.append(prevButton, nextButton);
    }
    if (wantDots) {
      dots = document.createElement("div");
      dots.className = "carousel--dots";
      images.forEach((_, i) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "carousel--dot";
        dot.setAttribute("aria-label", `Go to image ${i + 1} of ${images.length}`);
        dot.addEventListener("click", () => goTo(firstReal + i));
        dots.appendChild(dot);
      });
      viewport.appendChild(dots);
    }

    function updateChrome() {
      const current = logical();
      if (dots) {
        [...dots.children].forEach((dot, i) =>
          dot.setAttribute("aria-current", String(i === current))
        );
      }
      if (prevButton) {
        prevButton.disabled = !loop && position === firstReal;
        nextButton.disabled = !loop && position === lastReal;
      }
    }

    // Translating by pixels rather than percentages keeps the drag arithmetic in
    // the same units as the pointer, so the viewport width has to be measured.
    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      place(false);
    });
    resize.observe(viewport);

    viewport.addEventListener("keydown", (event) => {
      const handlers = {
        ArrowLeft: previous,
        ArrowRight: next,
        Home: () => goTo(firstReal),
        End: () => goTo(lastReal)
      };
      const handler = handlers[event.key];
      if (!handler) return;
      event.preventDefault();
      handler();
    });

    // Pointer drag: follow the finger, then commit to a neighbouring slide once
    // it has travelled far enough to read as a swipe rather than a tap.
    let dragging = false;
    let startX = 0;
    let pointerId = null;
    viewport.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest("button")) return;
      dragging = true;
      startX = event.clientX;
      pointerId = event.pointerId;
      dragDelta = 0;
      viewport.setPointerCapture(pointerId);
      viewport.classList.add("is-dragging");
      place(false);
    });
    viewport.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      dragDelta = event.clientX - startX;
      place(false);
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      viewport.classList.remove("is-dragging");
      if (pointerId !== null && viewport.hasPointerCapture(pointerId)) {
        viewport.releasePointerCapture(pointerId);
      }
      pointerId = null;
      const travelled = dragDelta;
      dragDelta = 0;
      if (Math.abs(travelled) > Math.max(40, width * 0.15)) {
        goTo(position + (travelled < 0 ? 1 : -1));
      } else {
        place(true);
      }
    }
    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);

    let timer = null;
    const canAutoplay = autoplayMs > 0 && images.length > 1 && !prefersReducedMotion();
    function startAutoplay() {
      if (!canAutoplay || timer) return;
      timer = setInterval(() => {
        if (!document.hidden) next();
      }, autoplayMs);
    }
    function stopAutoplay() {
      clearInterval(timer);
      timer = null;
    }
    if (canAutoplay) {
      viewport.addEventListener("pointerenter", stopAutoplay);
      viewport.addEventListener("pointerleave", startAutoplay);
      viewport.addEventListener("focusin", stopAutoplay);
      viewport.addEventListener("focusout", startAutoplay);
      startAutoplay();
    }

    updateChrome();

    return () => {
      stopAutoplay();
      resize.disconnect();
      viewport.remove();
    };
}
