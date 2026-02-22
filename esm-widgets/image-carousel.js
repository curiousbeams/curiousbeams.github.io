// image-carousel.js — anywidget ESM module using Splide.js

const SPLIDE_CSS = "https://cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/dist/css/splide.min.css";
const SPLIDE_JS = "https://cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/dist/js/splide.min.js";

function loadResource(tag, attrs) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(tag === "link" ? `link[href="${attrs.href}"]` : `script[src="${attrs.src}"]`)) {
            resolve();
            return;
        }
        const el = document.createElement(tag);
        Object.assign(el, attrs);
        el.onload = resolve;
        el.onerror = () => reject(new Error(`Failed to load ${attrs.href || attrs.src}`));
        document.head.appendChild(el);
    });
}

async function ensureSplide() {
    await loadResource("link", {
        rel: "stylesheet",
        href: SPLIDE_CSS
    });
    if (!window.Splide) {
        await loadResource("script", {
            src: SPLIDE_JS
        });
        // onload fires when the script is fetched, but window.Splide may not be
        // assigned yet if the browser hasn't finished parsing it. Poll briefly.
        await new Promise((resolve, reject) => {
            const start = Date.now();
            const check = () => {
                if (window.Splide) {
                    resolve();
                    return;
                }
                if (Date.now() - start > 5000) {
                    reject(new Error("Splide failed to initialise"));
                    return;
                }
                requestAnimationFrame(check);
            };
            check();
        });
    }
}

let _count = 0;

export default {
    async initialize({
        model
    }) {
        await ensureSplide();
        return () => {};
    },

    async render({
        model,
        el
    }) {
        await ensureSplide();

        // Accept either:
        //   images: ["url1", "url2"]
        //   images: [{ src: "url1", caption: "text" }, ...]
        const raw = model.get("images") || [];
        const images = raw.map(item =>
            typeof item === "string" ? {
                src: item,
                caption: null
            } : item
        );

        const heightRatio = Number(model.get("height_ratio") ?? 0.6);
        const borderRadius = model.get("border_radius") || "0";
        const captionOnHover = model.get("caption_on_hover") ?? true; // false = always visible
        const type = model.get("type") || "loop";
        const autoplay = model.get("autoplay") ?? false;
        const arrows = model.get("arrows") ?? true;
        const pagination = model.get("pagination") ?? true;

        const uid = `splide-${++_count}`;

        const style = document.createElement("style");
        style.textContent = `
      #${uid} { width: 100%; }
      #${uid} .splide__track { border-radius: ${borderRadius}; overflow: hidden; }
      #${uid} .splide__slide { background-size: cover; background-position: center; position: relative; }

      /* Caption */
      #${uid} .slide-caption {
        position: absolute;
        bottom: 0; left: 0; right: 0;
        padding: 0.5rem 0.75rem;
        background: rgba(0, 0, 0, 0.45);
        color: #fff;
        font-size: 0.875rem;
        line-height: 1.4;
        backdrop-filter: blur(2px);
        -webkit-backdrop-filter: blur(2px);
        transition: opacity 0.25s ease;
        ${captionOnHover ? "opacity: 0;" : "opacity: 1;"}
      }
      ${captionOnHover ? `
      #${uid} .splide__slide:hover .slide-caption { opacity: 1; }
      ` : ""}

      /* Arrow / pagination */
      #${uid} .splide__arrow { background: rgba(0,0,0,0.45); opacity: 1; }
      #${uid} .splide__arrow:hover { background: rgba(0,0,0,0.75); }
      #${uid} .splide__arrow svg { fill: #fff; }
      #${uid} .splide__pagination {
        bottom: 2rem;  /* lift above caption bar */
      }
      #${uid} .splide__pagination__page {
        background: rgba(255,255,255,0.55);
        box-shadow: 0 0 0 1.5px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.5);
        width: 9px; height: 9px;
      }
      #${uid} .splide__pagination__page.is-active {
        background: #fff;
        transform: scale(1.5);
        box-shadow: 0 0 0 1.5px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.5);
      }
    `;
        el.appendChild(style);

        const section = document.createElement("section");
        section.id = uid;
        section.className = "splide";
        section.setAttribute("aria-label", "Image carousel");
        section.innerHTML = `
      <div class="splide__track">
        <ul class="splide__list">
          ${images.map((img, i) => `
            <li class="splide__slide">
              <img src="${img.src.trim()}" alt="${img.caption || `Slide ${i + 1}`}" loading="lazy">
              ${img.caption ? `<div class="slide-caption">${img.caption}</div>` : ""}
            </li>`).join("")}
        </ul>
      </div>`;
        el.appendChild(section);

        const splide = new window.Splide(`#${uid}`, {
            type,
            perPage: 1,
            heightRatio,
            cover: true,
            autoplay,
            arrows,
            pagination,
            rewind: type !== "loop",
            pauseOnHover: true,
        });

        splide.mount();

        return () => {
            splide.destroy();
            style.remove();
            section.remove();
        };
    },
};