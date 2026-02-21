// image-carousel.js — anywidget ESM module using Splide.js
// Usage in MyST:
//
// :::{any:bundle} https://curiousbeams.github.io/esm-widgets/image-carousel.js
// :class: w-full
// {
//   "images": ["img1.jpg", "img2.jpg"],
//   "width": "100%",
//   "height_ratio": 0.5,
//   "object-fit": "cover",
//   "border_radius": "0.5rem",
//   "type": "loop",
//   "autoplay": true,
//   "arrows": true,
//   "pagination": true
// }
// :::
//
// Height options (pick one):
//   "height_ratio": 0.5    → height = 50% of carousel width (responsive, recommended)
//   "height": "400px"      → fixed height
//   (neither)              → natural image height, no cropping
//
// Rounded corners: "border_radius": "0.75rem"  (any CSS value)

const SPLIDE_CSS_URL = "https://cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/dist/css/splide.min.css";
const SPLIDE_JS_URL  = "https://cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/dist/js/splide.min.js";

function loadResource(tag, attrs) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(
      tag === "link" ? `link[href="${attrs.href}"]` : `script[src="${attrs.src}"]`
    );
    if (existing) { resolve(); return; }
    const el = document.createElement(tag);
    Object.assign(el, attrs);
    el.onload  = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load: ${attrs.href || attrs.src}`));
    document.head.appendChild(el);
  });
}

async function ensureSplide() {
  await loadResource("link", { rel: "stylesheet", href: SPLIDE_CSS_URL });
  if (!window.Splide) {
    await loadResource("script", { src: SPLIDE_JS_URL, async: false });
  }
}

let _carouselCount = 0;

export default {
  async initialize({ model }) {
    await ensureSplide();
    return () => {};
  },

  async render({ model, el }) {
    await ensureSplide();

    // --- Read & coerce model properties ---
    const images         = model.get("images")        || [];
    const width          = model.get("width")         || "100%";
    const heightRatioRaw = model.get("height_ratio")  ?? null;
    // MyST may pass numeric JSON values as strings — coerce defensively
    const heightRatio    = heightRatioRaw != null ? Number(heightRatioRaw) : null;
    const height         = model.get("height")        || null;  // e.g. "400px"
    const objectFit      = model.get("object-fit")    || "cover";
    const borderRadius   = model.get("border_radius") || null;  // e.g. "0.5rem"
    const type           = model.get("type")          || "loop";
    const autoplay       = model.get("autoplay")      ?? false;
    const arrows         = model.get("arrows")        ?? true;
    const pagination     = model.get("pagination")    ?? true;
    const perPage        = Number(model.get("per_page") ?? 1);
    const gap            = model.get("gap")           || "0";

    // Splide's `cover: true` option converts the <img> src into a background-image
    // on the slide <li>, then sizes it with background-size. This is the correct
    // Splide-native way to get one cropped, aspect-ratio-locked image per slide.
    const useCoverMode = heightRatio != null || height != null;

    const uid = `splide-carousel-${++_carouselCount}`;

    const style = document.createElement("style");
    style.textContent = `
      #${uid} {
        width: ${width};
      }
      ${borderRadius ? `
      /* Clip the track so slides get rounded corners */
      #${uid} .splide__track {
        border-radius: ${borderRadius};
        overflow: hidden;
      }` : ""}
      ${useCoverMode ? `
      /* cover mode: Splide sets background-image; control sizing via background-size */
      #${uid} .splide__slide {
        background-size: ${objectFit};
        background-position: center;
        background-repeat: no-repeat;
      }` : `
      /* natural mode: size the <img> directly */
      #${uid} .splide__slide img {
        width: 100%;
        height: ${height || "auto"};
        object-fit: ${objectFit};
        display: block;
      }`}
      #${uid} .splide__arrow {
        background: rgba(0, 0, 0, 0.45);
        opacity: 1;
        transition: background 0.2s;
      }
      #${uid} .splide__arrow:hover {
        background: rgba(0, 0, 0, 0.75);
      }
      #${uid} .splide__arrow svg {
        fill: #fff;
      }
      #${uid} .splide__pagination__page {
        background: rgba(255, 255, 255, 0.5);
      }
      #${uid} .splide__pagination__page.is-active {
        background: #fff;
        transform: scale(1.25);
      }
    `;
    el.appendChild(style);

    // --- Build DOM ---
    const section = document.createElement("section");
    section.id        = uid;
    section.className = "splide";
    section.setAttribute("aria-label", "Image carousel");

    const track = document.createElement("div");
    track.className = "splide__track";

    const list = document.createElement("ul");
    list.className = "splide__list";

    images.forEach((src, i) => {
      const li = document.createElement("li");
      li.className = "splide__slide";

      // Always include an <img>. In cover mode Splide reads its src and converts
      // it to a CSS background-image on the parent <li>; the <img> itself is hidden.
      const img = document.createElement("img");
      img.src     = src.trim();
      img.alt     = `Slide ${i + 1}`;
      img.loading = "lazy";
      li.appendChild(img);

      list.appendChild(li);
    });

    track.appendChild(list);
    section.appendChild(track);
    el.appendChild(section);

    // --- Mount ---
    const splideOptions = {
      type,
      perPage,
      gap,
      autoplay,
      arrows,
      pagination,
      rewind:       type !== "loop",
      pauseOnHover: true,
      cover:        useCoverMode,  // ← Splide converts <img> src → background-image
    };

    if (heightRatio != null) splideOptions.heightRatio = heightRatio;
    if (height != null && heightRatio == null) splideOptions.height = height;

    const splide = new window.Splide(`#${uid}`, splideOptions);
    splide.mount();

    return () => {
      splide.destroy();
      style.remove();
      section.remove();
    };
  },
};