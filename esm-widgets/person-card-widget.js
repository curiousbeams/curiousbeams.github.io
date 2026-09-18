// person_card_widget.js — anywidget for MyST

// ── Font Awesome 7 icon geometry, inlined ───────────────────────────────────
//
// These used to be fetched from raw.githubusercontent.com on every render — five
// requests per card, and eight cards on an acknowledgements slide. The paths are
// static, so they live here and are drawn with `currentColor`.
const ICONS = {
    email: {viewBox: "0 0 512 512", d: "M61.4 64C27.5 64 0 91.5 0 125.4 0 126.3 0 127.1 .1 128L0 128 0 384c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-256-.1 0c0-.9 .1-1.7 .1-2.6 0-33.9-27.5-61.4-61.4-61.4L61.4 64zM464 192.3L464 384c0 8.8-7.2 16-16 16L64 400c-8.8 0-16-7.2-16-16l0-191.7 154.8 117.4c31.4 23.9 74.9 23.9 106.4 0L464 192.3zM48 125.4C48 118 54 112 61.4 112l389.2 0c7.4 0 13.4 6 13.4 13.4 0 4.2-2 8.2-5.3 10.7L280.2 271.5c-14.3 10.8-34.1 10.8-48.4 0L53.3 136.1c-3.3-2.5-5.3-6.5-5.3-10.7z"},
    linkedin: {viewBox: "0 0 448 512", d: "M100.3 448l-92.9 0 0-299.1 92.9 0 0 299.1zM53.8 108.1C24.1 108.1 0 83.5 0 53.8 0 39.5 5.7 25.9 15.8 15.8s23.8-15.8 38-15.8 27.9 5.7 38 15.8 15.8 23.8 15.8 38c0 29.7-24.1 54.3-53.8 54.3zM447.9 448l-92.7 0 0-145.6c0-34.7-.7-79.2-48.3-79.2-48.3 0-55.7 37.7-55.7 76.7l0 148.1-92.8 0 0-299.1 89.1 0 0 40.8 1.3 0c12.4-23.5 42.7-48.3 87.9-48.3 94 0 111.3 61.9 111.3 142.3l0 164.3-.1 0z"},
    orcid: {viewBox: "0 0 512 512", d: "M294.7 188.2l-45.9 0 0 153.8 47.5 0c67.6 0 83.1-51.3 83.1-76.9 0-41.6-26.5-76.9-84.7-76.9zM256 8a248 248 0 1 0 0 496 248 248 0 1 0 0-496zM175.2 368.8l-29.8 0 0-207.5 29.8 0 0 207.5zM160.3 98.5a19.6 19.6 0 1 1 0 39.2 19.6 19.6 0 1 1 0-39.2zM300 369l-81 0 0-207.7 80.6 0c76.7 0 110.4 54.8 110.4 103.9 0 53.3-41.7 103.9-110 103.9z"},
    github: {viewBox: "0 0 512 512", d: "M216.5 362.5c-66-8-112.5-55.5-112.5-117 0-25 9-52 24-70-6.5-16.5-5.5-51.5 2-66 20-2.5 47 8 63 22.5 19-6 39-9 63.5-9s44.5 3 62.5 8.5c15.5-14 43-24.5 63-22 7 13.5 8 48.5 1.5 65.5 16 19 24.5 44.5 24.5 70.5 0 61.5-46.5 108-113.5 116.5 17 11 28.5 35 28.5 62.5l0 52C323 491.5 335.5 500 350.5 494 441 459.5 512 369 512 257 512 115.5 397 0 255.5 0S0 115.5 0 257c0 111 70.5 203 165.5 237.5 13.5 5 26.5-4 26.5-17.5l0-40c-7 3-16 5-24 5-33 0-52.5-18-66.5-51.5-5.5-13.5-11.5-21.5-23-23-6-.5-8-3-8-6 0-6 10-10.5 20-10.5 14.5 0 27 9 40 27.5 10 14.5 20.5 21 33 21s20.5-4.5 32-16c8.5-8.5 15-16 21-21z"},
    website: {viewBox: "0 0 512 512", d: "M351.9 280l-190.9 0c2.9 64.5 17.2 123.9 37.5 167.4 11.4 24.5 23.7 41.8 35.1 52.4 11.2 10.5 18.9 12.2 22.9 12.2s11.7-1.7 22.9-12.2c11.4-10.6 23.7-28 35.1-52.4 20.3-43.5 34.6-102.9 37.5-167.4zM160.9 232l190.9 0C349 167.5 334.7 108.1 314.4 64.6 303 40.2 290.7 22.8 279.3 12.2 268.1 1.7 260.4 0 256.4 0s-11.7 1.7-22.9 12.2c-11.4 10.6-23.7 28-35.1 52.4-20.3 43.5-34.6 102.9-37.5 167.4zm-48 0C116.4 146.4 138.5 66.9 170.8 14.7 78.7 47.3 10.9 131.2 1.5 232l111.4 0zM1.5 280c9.4 100.8 77.2 184.7 169.3 217.3-32.3-52.2-54.4-131.7-57.9-217.3L1.5 280zm398.4 0c-3.5 85.6-25.6 165.1-57.9 217.3 92.1-32.7 159.9-116.5 169.3-217.3l-111.4 0zm111.4-48C501.9 131.2 434.1 47.3 342 14.7 374.3 66.9 396.4 146.4 399.9 232l111.4 0z"},
};

/** An inline SVG icon that takes its colour from `currentColor`. */
function icon(key) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", ICONS[key].viewBox);
    svg.setAttribute("fill", "currentColor");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", ICONS[key].d);
    svg.appendChild(path);
    return svg;
}

// ── Inline markdown link renderer ────────────────────────────────────────────
function renderMarkdown(text, container) {
    const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
    let last = 0,
        m;
    while ((m = linkRe.exec(text)) !== null) {
        if (m.index > last)
            container.appendChild(document.createTextNode(text.slice(last, m.index)));
        const a = document.createElement("a");
        a.href = m[2];
        a.textContent = m[1];
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        container.appendChild(a);
        last = linkRe.lastIndex;
    }
    if (last < text.length)
        container.appendChild(document.createTextNode(text.slice(last)));
}

// ── CSS (injected as <style> inside el, not document.head) ──────────────────
const CSS = `
:host, .pc-root {
  all: initial;
  font-family: Georgia, 'Times New Roman', serif;
  display: block;
}
.pc-card {
  --pc-bg:          #ffffff;
  --pc-border:      #dde3ec;
  --pc-text:        #1e293b;
  --pc-muted:       #64748b;
  --pc-accent:      #0f6fbe;
  --pc-avatar-size: 138px;

  background: var(--pc-bg);
  border: 1px solid var(--pc-border);
  border-radius: 10px;
  padding: 1.25rem 1.4rem;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto 1fr auto;
  column-gap: 1.4rem;
  max-width: 680px;
  color: var(--pc-text);
  box-shadow: 0 1px 3px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.04);
}

/* Keyed to the attribute trackTheme writes rather than to prefers-color-scheme:
   the reader's site-wide toggle is a class on <html>, which no media query
   inside the shadow root can see, so a card styled from the media query alone
   stayed light on a page switched to dark, and went dark on a page switched to
   light. trackTheme resolves the OS preference as well, so nothing is lost by
   dropping the query. (No backticks in this block: it is a template literal.) */
.pc-card[data-theme="dark"] {
  --pc-bg:     #1e2433;
  --pc-border: #2d3748;
  --pc-text:   #e2e8f0;
  --pc-muted:  #94a3b8;
  --pc-accent: #60a5fa;
  color-scheme: dark;
}

/* header */
.pc-header { grid-column: 1; grid-row: 1; margin-bottom: .55rem; }
.pc-name-row { display: flex; align-items: baseline; gap: .45rem; flex-wrap: wrap; margin: 0; }
.pc-name { font-size: 1.15rem; font-weight: 700; letter-spacing: -.01em; margin: 0; }
.pc-pronouns { font-size: .78rem; color: var(--pc-muted); font-style: italic; }
.pc-position {
  font-size: .68rem; font-weight: 600; color: var(--pc-muted);
  margin: .18rem 0 0; font-family: system-ui, sans-serif;
  letter-spacing: .06em; text-transform: uppercase;
}

/* body */
.pc-body {
  grid-column: 1; grid-row: 2;
  font-size: .875rem; line-height: 1.65;
  color: var(--pc-text); margin: 0 0 .8rem;
}
.pc-body a {
  color: var(--pc-accent); text-decoration: underline;
  text-decoration-color: transparent; text-underline-offset: 2px;
}
.pc-body a:hover { text-decoration-color: var(--pc-accent); }

/* icon row */
.pc-icons { grid-column: 1; grid-row: 3; display: flex; gap: .5rem; align-items: center; }
.pc-icon-link {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px;
  color: var(--pc-muted);
  border-radius: 5px;
  text-decoration: none;
  transition: color .15s, background .15s;
}
.pc-icon-link:hover {
  color: var(--pc-accent);
  background: color-mix(in srgb, var(--pc-accent) 10%, transparent);
}
.pc-icon-link svg { width: 16px; height: 16px; fill: currentColor; }

/* avatar */
.pc-avatar-wrap {
  grid-column: 2; grid-row: 1 / 4;
  display: flex; align-items: flex-start; padding-top: .15rem;
}
.pc-avatar {
  width: var(--pc-avatar-size); height: var(--pc-avatar-size);
  border-radius: 50%; object-fit: cover;
  border: 2px solid var(--pc-border);
}
.pc-avatar-placeholder {
  width: var(--pc-avatar-size); height: var(--pc-avatar-size);
  border-radius: 50%; background: var(--pc-border);
  display: flex; align-items: center; justify-content: center;
  font-size: 2rem; color: var(--pc-muted);
}
`;

// ── Theme ────────────────────────────────────────────────────────────────────

/** True when the host page is in dark mode. */
function isDark() {
    const root = document.documentElement;
    if (root.classList.contains("dark")) return true; // MyST book-theme / Tailwind
    if (root.dataset.theme === "dark") return true;
    if (root.dataset.theme === "light") return false;
    return matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

/** Mirror the host page's light/dark mode onto `el.dataset.theme`. */
function trackTheme(el) {
    const apply = () => {
        el.dataset.theme = isDark() ? "dark" : "light";
    };
    apply();
    const mq = matchMedia?.("(prefers-color-scheme: dark)");
    mq?.addEventListener("change", apply);
    const mo = new MutationObserver(apply);
    mo.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class", "data-theme"]
    });
    return () => {
        mq?.removeEventListener("change", apply);
        mo.disconnect();
    };
}

// ── Build card DOM ───────────────────────────────────────────────────────────
function buildCard(data, el) {
    const style = document.createElement("style");
    style.textContent = CSS;
    el.appendChild(style);

    const card = document.createElement("div");
    card.className = "pc-card";

    const header = document.createElement("div");
    header.className = "pc-header";

    const nameRow = document.createElement("div");
    nameRow.className = "pc-name-row";
    const nameEl = document.createElement("h3");
    nameEl.className = "pc-name";
    nameEl.textContent = data.name || "";
    nameRow.appendChild(nameEl);
    if (data.pronouns) {
        const pr = document.createElement("span");
        pr.className = "pc-pronouns";
        pr.textContent = `(${data.pronouns})`;
        nameRow.appendChild(pr);
    }
    header.appendChild(nameRow);

    if (data.position) {
        const pos = document.createElement("p");
        pos.className = "pc-position";
        pos.textContent = data.position;
        header.appendChild(pos);
    }
    card.appendChild(header);

    if (data.body) {
        const body = document.createElement("p");
        body.className = "pc-body";
        renderMarkdown(data.body, body);
        card.appendChild(body);
    }

    const linkDefs = [
        data.email && {
            href: `mailto:${data.email}`,
            key: "email",
            title: "Email"
        },
        data.linkedin && {
            href: `https://linkedin.com/in/${data.linkedin}`,
            key: "linkedin",
            title: "LinkedIn"
        },
        data.orcid && {
            href: `https://orcid.org/${data.orcid}`,
            key: "orcid",
            title: "ORCID"
        },
        data.github && {
            href: `https://github.com/${data.github}`,
            key: "github",
            title: "GitHub"
        },
        data.website && {
            href: data.website,
            key: "website",
            title: "Website"
        },
    ].filter(Boolean);

    if (linkDefs.length) {
        const iconsEl = document.createElement("div");
        iconsEl.className = "pc-icons";
        linkDefs.forEach(({
            href,
            key,
            title
        }) => {
            const a = document.createElement("a");
            a.className = "pc-icon-link";
            a.href = href;
            a.title = title;
            a.setAttribute("aria-label", title);
            if (!href.startsWith("mailto:")) {
                a.target = "_blank";
                a.rel = "noopener noreferrer";
            }
            a.appendChild(icon(key));
            iconsEl.appendChild(a);
        });
        card.appendChild(iconsEl);
    }

    const avatarWrap = document.createElement("div");
    avatarWrap.className = "pc-avatar-wrap";
    if (data.image) {
        const img = document.createElement("img");
        img.className = "pc-avatar";
        img.src = data.image;
        img.alt = data.name ? `Photo of ${data.name}` : "Profile photo";
        avatarWrap.appendChild(img);
    } else {
        const ph = document.createElement("div");
        ph.className = "pc-avatar-placeholder";
        ph.textContent = (data.name || "?")[0].toUpperCase();
        avatarWrap.appendChild(ph);
    }
    card.appendChild(avatarWrap);

    el.appendChild(card);
    return {card, style};
}

export default {
    render({model, el}) {
        const fields = ["name", "position", "pronouns", "image",
            "github", "email", "linkedin", "orcid", "website", "body"
        ];

        const getData = () =>
            Object.fromEntries(fields.map(f => [f, model.get(f) || ""]));

        let parts = buildCard(getData(), el);
        let untrack = trackTheme(parts.card);

        // Live-update on trait changes. Only this widget's own nodes are torn
        // down — clearing `el` outright would also take the stylesheet link the
        // renderer puts there when the directive carries a `:css:` option.
        const refresh = () => {
            untrack();
            parts.card.remove();
            parts.style.remove();
            parts = buildCard(getData(), el);
            untrack = trackTheme(parts.card);
        };
        fields.forEach(f => model.on(`change:${f}`, refresh));

        return () => {
            untrack();
            parts.card.remove();
            parts.style.remove();
        };
    },
};
