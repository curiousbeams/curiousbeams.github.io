// image-carousel.js — anywidget ESM module using Splide.js

const SPLIDE_CSS = "https://cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/dist/css/splide.min.css";
const SPLIDE_JS  = "https://cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/dist/js/splide.min.js";

function loadResource(tag, attrs) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(tag === "link" ? `link[href="${attrs.href}"]` : `script[src="${attrs.src}"]`)) {
      resolve(); return;
    }
    const el = document.createElement(tag);
    Object.assign(el, attrs);
    el.onload = resolve;
    el.onerror = () => reject(new Error(`Failed to load ${attrs.href || attrs.src}`));
    document.head.appendChild(el);
  });
}

async function ensureSplide() {
  await loadResource("link", { rel: "stylesheet", href: SPLIDE_CSS });
  if (!window.Splide) await loadResource("script", { src: SPLIDE_JS });
}

let _count = 0;

export default {
  async initialize({ model }) {
    await ensureSplide();
    return () => {};
  },

  async render({ model, el }) {
    await ensureSplide();

    const images       = model.get("images")        || [];
    const heightRatio  = Number(model.get("height_ratio") ?? 0.5);
    const borderRadius = model.get("border_radius") || "0";
    const type         = model.get("type")          || "loop";
    const autoplay     = model.get("autoplay")      ?? true;
    const arrows       = model.get("arrows")        ?? true;
    const pagination   = model.get("pagination")    ?? true;

    const uid = `splide-${++_count}`;

    const style = document.createElement("style");
    style.textContent = `
      #${uid} { width: 100%; }
      #${uid} .splide__track { border-radius: ${borderRadius}; overflow: hidden; }
      #${uid} .splide__slide { background-size: cover; background-position: center; }
      #${uid} .splide__arrow { background: rgba(0,0,0,0.45); opacity: 1; }
      #${uid} .splide__arrow:hover { background: rgba(0,0,0,0.75); }
      #${uid} .splide__arrow svg { fill: #fff; }
      #${uid} .splide__pagination__page { background: rgba(255,255,255,0.5); }
      #${uid} .splide__pagination__page.is-active { background: #fff; transform: scale(1.25); }
    `;
    el.appendChild(style);

    const section = document.createElement("section");
    section.id = uid;
    section.className = "splide";
    section.setAttribute("aria-label", "Image carousel");
    section.innerHTML = `
      <div class="splide__track">
        <ul class="splide__list">
          ${images.map((src, i) => `
            <li class="splide__slide">
              <img src="${src.trim()}" alt="Slide ${i + 1}" loading="lazy">
            </li>`).join("")}
        </ul>
      </div>`;
    el.appendChild(section);

    const splide = new window.Splide(`#${uid}`, {
      type,
      perPage:      1,
      heightRatio,
      cover:        true,   // converts <img> src → background-image, fills slide
      autoplay,
      arrows,
      pagination,
      rewind:       type !== "loop",
      pauseOnHover: true,
    });

    splide.mount();

    return () => { splide.destroy(); style.remove(); section.remove(); };
  },
};