// person_card.js — anywidget for MyST
// Renders a profile card: name/position/pronouns, body text (markdown links),
// social icons, and a circular avatar photo.

// ── Markdown-link renderer (inline only: [text](url)) ──────────────────────
function renderMarkdown(text, container) {
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0, m;
  while ((m = linkRe.exec(text)) !== null) {
    if (m.index > last) {
      container.appendChild(document.createTextNode(text.slice(last, m.index)));
    }
    const a = document.createElement('a');
    a.href = m[2];
    a.textContent = m[1];
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    container.appendChild(a);
    last = linkRe.lastIndex;
  }
  if (last < text.length) {
    container.appendChild(document.createTextNode(text.slice(last)));
  }
}

// ── SVG icon paths (inline, no external deps) ───────────────────────────────
const ICONS = {
  email: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>`,
  linkedin: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
  </svg>`,
  orcid: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1.44
     14.605H8.98V9.154h1.58v7.451zm-.79-8.539a.919.919 0 1 1 0-1.838.919.919 0 0 1 0
     1.838zm6.77 8.539h-1.573v-3.643c0-.868-.016-1.985-1.209-1.985-1.211 0-1.396.946-1.396
     1.922v3.706h-1.572V9.154h1.509v1.023h.022c.21-.398.722-.817 1.487-.817 1.589 0 1.882
     1.047 1.882 2.408v3.837z"/>
  </svg>`,
  github: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682
     -.483 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.155-1.11
     -1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.031 1.531 1.031.892
     1.528 2.341 1.087 2.91.831.091-.646.349-1.086.636-1.336-2.22-.253-4.555-1.111-4.555
     -4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75
     1.025A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025
     2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.841-2.337
     4.687-4.565 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18
     .578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
  </svg>`,
  website: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10
             A15.3 15.3 0 0 1 8 12a15.3 15.3 0 0 1 4-10z"/>
  </svg>`,
};

// ── Default CSS injected once ────────────────────────────────────────────────
const CSS = `
.pc-card {
  --pc-bg:          #ffffff;
  --pc-border:      #e2e8f0;
  --pc-text:        #1e293b;
  --pc-muted:       #64748b;
  --pc-accent:      #0f6fbe;
  --pc-icon-hover:  #0f6fbe;
  --pc-avatar-size: 96px;
  --pc-radius:      10px;

  font-family: 'Georgia', 'Times New Roman', serif;
  background: var(--pc-bg);
  border: 1px solid var(--pc-border);
  border-radius: var(--pc-radius);
  padding: 1.25rem 1.5rem;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto 1fr auto;
  column-gap: 1.5rem;
  max-width: 680px;
  color: var(--pc-text);
  box-shadow: 0 1px 3px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.04);
  transition: box-shadow .2s;
}
.pc-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,.09), 0 8px 24px rgba(0,0,0,.07);
}

/* dark-mode auto-support */
@media (prefers-color-scheme: dark) {
  .pc-card {
    --pc-bg:      #1e2433;
    --pc-border:  #2d3748;
    --pc-text:    #e2e8f0;
    --pc-muted:   #94a3b8;
    --pc-accent:  #60a5fa;
  }
}

/* header: name + pronouns + position */
.pc-header {
  grid-column: 1;
  grid-row: 1;
  margin-bottom: .6rem;
}
.pc-name-row {
  display: flex;
  align-items: baseline;
  gap: .5rem;
  flex-wrap: wrap;
}
.pc-name {
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -.01em;
  margin: 0;
}
.pc-pronouns {
  font-size: .8rem;
  color: var(--pc-muted);
  font-style: italic;
}
.pc-position {
  font-size: .82rem;
  font-weight: 600;
  color: var(--pc-muted);
  margin: .2rem 0 0;
  font-family: 'system-ui', sans-serif;
  letter-spacing: .02em;
  text-transform: uppercase;
  font-size: .7rem;
}

/* body text */
.pc-body {
  grid-column: 1;
  grid-row: 2;
  font-size: .88rem;
  line-height: 1.65;
  color: var(--pc-text);
  margin: 0 0 .75rem;
}
.pc-body a {
  color: var(--pc-accent);
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 2px;
  transition: text-decoration-color .15s;
}
.pc-body a:hover {
  text-decoration-color: var(--pc-accent);
}

/* icon row */
.pc-icons {
  grid-column: 1;
  grid-row: 3;
  display: flex;
  gap: .6rem;
  align-items: center;
}
.pc-icon-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  color: var(--pc-muted);
  border-radius: 5px;
  transition: color .15s, background .15s;
  text-decoration: none;
}
.pc-icon-link:hover {
  color: var(--pc-icon-hover);
  background: color-mix(in srgb, var(--pc-accent) 12%, transparent);
}
.pc-icon-link svg {
  width: 18px;
  height: 18px;
}

/* avatar */
.pc-avatar-wrap {
  grid-column: 2;
  grid-row: 1 / 4;
  display: flex;
  align-items: flex-start;
  padding-top: .2rem;
}
.pc-avatar {
  width: var(--pc-avatar-size);
  height: var(--pc-avatar-size);
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--pc-border);
  flex-shrink: 0;
}
.pc-avatar-placeholder {
  width: var(--pc-avatar-size);
  height: var(--pc-avatar-size);
  border-radius: 50%;
  background: var(--pc-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: var(--pc-muted);
  flex-shrink: 0;
}
`;

let cssInjected = false;
function ensureCSS() {
  if (cssInjected) return;
  cssInjected = true;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
}

// ── Build the card DOM ───────────────────────────────────────────────────────
function buildCard(data) {
  const card = document.createElement('div');
  card.className = 'pc-card';

  // ── Left column ──
  // Header
  const header = document.createElement('div');
  header.className = 'pc-header';

  const nameRow = document.createElement('div');
  nameRow.className = 'pc-name-row';
  const nameEl = document.createElement('h3');
  nameEl.className = 'pc-name';
  nameEl.textContent = data.name || '';
  nameRow.appendChild(nameEl);

  if (data.pronouns) {
    const pronounsEl = document.createElement('span');
    pronounsEl.className = 'pc-pronouns';
    pronounsEl.textContent = `(${data.pronouns})`;
    nameRow.appendChild(pronounsEl);
  }
  header.appendChild(nameRow);

  if (data.position) {
    const posEl = document.createElement('p');
    posEl.className = 'pc-position';
    posEl.textContent = data.position;
    header.appendChild(posEl);
  }
  card.appendChild(header);

  // Body
  if (data.body) {
    const bodyEl = document.createElement('p');
    bodyEl.className = 'pc-body';
    renderMarkdown(data.body, bodyEl);
    card.appendChild(bodyEl);
  }

  // Icons
  const links = [
    data.email    && { href: `mailto:${data.email}`,                       key: 'email',    title: 'Email' },
    data.linkedin && { href: `https://linkedin.com/in/${data.linkedin}`,   key: 'linkedin', title: 'LinkedIn' },
    data.orcid    && { href: `https://orcid.org/${data.orcid}`,            key: 'orcid',    title: 'ORCID' },
    data.github   && { href: `https://github.com/${data.github}`,          key: 'github',   title: 'GitHub' },
    data.website  && { href: data.website,                                  key: 'website',  title: 'Website' },
  ].filter(Boolean);

  if (links.length > 0) {
    const iconsEl = document.createElement('div');
    iconsEl.className = 'pc-icons';
    links.forEach(({ href, key, title }) => {
      const a = document.createElement('a');
      a.className = 'pc-icon-link';
      a.href = href;
      a.title = title;
      a.setAttribute('aria-label', title);
      if (!href.startsWith('mailto:')) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      a.innerHTML = ICONS[key] || '';
      iconsEl.appendChild(a);
    });
    card.appendChild(iconsEl);
  }

  // ── Right column: avatar ──
  const avatarWrap = document.createElement('div');
  avatarWrap.className = 'pc-avatar-wrap';

  if (data.image) {
    const img = document.createElement('img');
    img.className = 'pc-avatar';
    img.src = data.image;
    img.alt = data.name ? `Photo of ${data.name}` : 'Profile photo';
    avatarWrap.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'pc-avatar-placeholder';
    placeholder.textContent = (data.name || '?')[0].toUpperCase();
    avatarWrap.appendChild(placeholder);
  }
  card.appendChild(avatarWrap);

  return card;
}

// ── anywidget export ─────────────────────────────────────────────────────────
export default {
  async initialize({ model }) {
    return () => {};
  },

  async render({ model, el }) {
    ensureCSS();

    // Collect all supported fields from the model
    const data = {
      name:     model.get('name')     || '',
      position: model.get('position') || '',
      pronouns: model.get('pronouns') || '',
      image:    model.get('image')    || '',
      github:   model.get('github')   || '',
      email:    model.get('email')    || '',
      linkedin: model.get('linkedin') || '',
      orcid:    model.get('orcid')    || '',
      website:  model.get('website')  || '',
      body:     model.get('body')     || '',
    };

    const card = buildCard(data);
    el.appendChild(card);

    // Re-render if any trait changes (live updates in notebook)
    const fields = Object.keys(data);
    const cleanup = () => card.remove();

    fields.forEach(field => {
      model.on(`change:${field}`, () => {
        cleanup();
        const newData = Object.fromEntries(
          fields.map(f => [f, model.get(f) || ''])
        );
        el.appendChild(buildCard(newData));
      });
    });

    return cleanup;
  },
};
