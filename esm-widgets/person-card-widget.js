// person_card_widget.js — anywidget for MyST

// ── Font Awesome 7 raw SVG URLs ──────────────────────────────────────────────
const FA_BASE = "https://raw.githubusercontent.com/FortAwesome/Font-Awesome/7.x/svgs";
const ICON_URLS = {
    email: `${FA_BASE}/regular/envelope.svg`,
    linkedin: `${FA_BASE}/brands/linkedin-in.svg`,
    orcid: `${FA_BASE}/brands/orcid.svg`,
    github: `${FA_BASE}/brands/github.svg`,
    website: `${FA_BASE}/solid/globe.svg`,
};

async function fetchSVG(url) {
    try {
        const r = await fetch(url);
        return await r.text();
    } catch {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="currentColor" opacity=".3"/></svg>`;
    }
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

@media (prefers-color-scheme: dark) {
  .pc-card {
    --pc-bg:     #1e2433;
    --pc-border: #2d3748;
    --pc-text:   #e2e8f0;
    --pc-muted:  #94a3b8;
    --pc-accent: #60a5fa;
  }
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

// ── Build card DOM ───────────────────────────────────────────────────────────
async function buildCard(data, el) {
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
        const svgs = await Promise.all(linkDefs.map(d => fetchSVG(ICON_URLS[d.key])));
        const iconsEl = document.createElement("div");
        iconsEl.className = "pc-icons";
        linkDefs.forEach(({
            href,
            title
        }, i) => {
            const a = document.createElement("a");
            a.className = "pc-icon-link";
            a.href = href;
            a.title = title;
            a.setAttribute("aria-label", title);
            if (!href.startsWith("mailto:")) {
                a.target = "_blank";
                a.rel = "noopener noreferrer";
            }
            a.innerHTML = svgs[i];
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
}

export default {
    async initialize({
        model
    }) {
        return () => {};
    },

    async render({
        model,
        el
    }) {
        const fields = ["name", "position", "pronouns", "image",
            "github", "email", "linkedin", "orcid", "website", "body"
        ];

        const getData = () =>
            Object.fromEntries(fields.map(f => [f, model.get(f) || ""]));

        await buildCard(getData(), el);

        // Live-update on trait changes
        const refresh = async () => {
            el.innerHTML = "";
            await buildCard(getData(), el);
        };
        fields.forEach(f => model.on(`change:${f}`, refresh));

        return () => {
            el.innerHTML = "";
        };
    },
};
