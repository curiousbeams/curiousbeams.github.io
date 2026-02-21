// image-carousel.js — anywidget ESM module using Splide.js
// Usage in MyST:
//
// :::{any:bundle} https://curiousbeams.github.io/esm-widgets/image-carousel.js
// :class: w-full
// {
//   "images": ["img1.jpg", "img2.jpg"],
//   "width": "100%",
//   "height": "500px",
//   "object-fit": "cover",
//   "type": "loop",
//   "autoplay": false,
//   "arrows": true,
//   "pagination": true
// }
// :::

const SPLIDE_CSS_URL = "https://cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/dist/css/splide.min.css";
const SPLIDE_JS_URL  = "https://cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/dist/js/splide.min.js";

function loadResource(tag, attrs) {
  return new Promise((resolve, reject) => {
    // Avoid loading duplicates
    const existing = document.querySelector(
      tag === "link"
        ? `link[href="${attrs.href}"]`
        : `script[src="${attrs.src}"]`
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

// Unique ID counter so multiple carousels on one page don't collide
let _carouselCount = 0;

export default {
  async initialize({ model }) {
    // Pre-load Splide as early as possible
    await ensureSplide();
    return () => {};
  },

  async render({ model, el }) {
    await ensureSplide();

    // --- Read model properties ---
    const images    = model.get("images")     || [];
    const width     = model.get("width")      || "100%";
    const height    = model.get("height")     || "auto";
    const objectFit = model.get("object-fit") || "cover";
    const type      = model.get("type")       || "loop";   // loop | fade | slide
    const autoplay  = model.get("autoplay")   ?? false;
    const arrows    = model.get("arrows")     ?? true;
    const pagination= model.get("pagination") ?? true;
    const perPage   = model.get("per_page")   ?? 1;
    const gap       = model.get("gap")        || "0";

    // --- Build DOM ---
    const uid = `splide-carousel-${++_carouselCount}`;

    // Scoped styles — use the uid to avoid global leakage
    const style = document.createElement("style");
    style.textContent = `
      #${uid} {
        width: ${width};
      }
      #${uid} .splide__slide img {
        width: 100%;
        height: ${height};
        object-fit: ${objectFit};
        display: block;
      }
      /* Tasteful arrow & pagination overrides */
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
      #${uid} .splide__pagination__page.is-active {
        background: #fff;
        transform: scale(1.25);
      }
      #${uid} .splide__pagination__page {
        background: rgba(255,255,255,0.5);
      }
    `;
    el.appendChild(style);

    // Carousel root
    const section = document.createElement("section");
    section.id        = uid;
    section.className = "splide";
    section.setAttribute("aria-label", "Image carousel");

    const track = document.createElement("div");
    track.className   = "splide__track";

    const list = document.createElement("ul");
    list.className    = "splide__list";

    images.forEach((src, i) => {
      const li  = document.createElement("li");
      li.className    = "splide__slide";

      const img = document.createElement("img");
      img.src         = src.trim();
      img.alt         = `Slide ${i + 1}`;
      img.loading     = "lazy";

      li.appendChild(img);
      list.appendChild(li);
    });

    track.appendChild(list);
    section.appendChild(track);
    el.appendChild(section);

    // --- Mount Splide ---
    const splide = new window.Splide(`#${uid}`, {
      type,
      perPage,
      gap,
      autoplay,
      arrows,
      pagination,
      rewind: type !== "loop",
      pauseOnHover: true,
      lazyLoad: "nearby",
    });

    splide.mount();

    // --- Cleanup ---
    return () => {
      splide.destroy();
      style.remove();
      section.remove();
    };
  },
};