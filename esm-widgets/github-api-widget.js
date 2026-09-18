// github-api-widget.js — cards for GitHub organizations, repositories and users.
//
//   :::{anywidget} https://curiousbeams.github.io/esm-widgets/github-api-widget.js
//   {
//     "organizations": ["curiousbeams", "msa-em"],
//     "repos": ["abtem/abtem"],
//     "users": ["gvarnavi"],
//     "max_width": 320,        // optional: cap each card, else the grid fills
//     "headings": true         // optional: the widget's own section headings
//   }
//   :::
//
// Two things about the old version could not survive the move to {anywidget},
// which always mounts inside a shadow root:
//
//  - Its stylesheet went into document.head, which the shadow tree cannot see.
//  - Dark mode was written as `.dark .github-card`, and `.dark` sits on <html>,
//    outside the tree — a descendant selector cannot cross the boundary. The
//    theme is watched explicitly instead, by `trackTheme` below.
//
// The octicons were also two <img> elements per icon fetched from
// raw.githubusercontent.com, one inverted for dark mode and hidden with Tailwind
// classes that likewise do not reach inside a shadow root. They are inline SVG
// paths now, taking their colour from currentColor, which removes about a dozen
// requests per card as well.

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


// @primer/octicons 19.11.0, 16px.
const ICONS = {
  repo: "M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z",
  star: "M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z",
  fork: "M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z",
  people: "M2 5.5a3.5 3.5 0 1 1 5.898 2.549 5.508 5.508 0 0 1 3.034 4.084.75.75 0 1 1-1.482.235 4 4 0 0 0-7.9 0 .75.75 0 0 1-1.482-.236A5.507 5.507 0 0 1 3.102 8.05 3.493 3.493 0 0 1 2 5.5ZM11 4a3.001 3.001 0 0 1 2.22 5.018 5.01 5.01 0 0 1 2.56 3.012.749.749 0 0 1-.885.954.752.752 0 0 1-.549-.514 3.507 3.507 0 0 0-2.522-2.372.75.75 0 0 1-.574-.73v-.352a.75.75 0 0 1 .416-.672A1.5 1.5 0 0 0 11 5.5.75.75 0 0 1 11 4Zm-5.5-.5a2 2 0 1 0-.001 3.999A2 2 0 0 0 5.5 3.5Z",
  person: "M10.561 8.073a6.005 6.005 0 0 1 3.432 5.142.75.75 0 1 1-1.498.07 4.5 4.5 0 0 0-8.99 0 .75.75 0 0 1-1.498-.07 6.004 6.004 0 0 1 3.431-5.142 3.999 3.999 0 1 1 5.123 0ZM10.5 5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z",
  code: "m11.28 3.22 4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L13.94 8l-3.72-3.72a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215Zm-6.56 0a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L2.06 8l3.72 3.72a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L.47 8.53a.75.75 0 0 1 0-1.06Z"
};

const CSS = `
.gh { display: grid; gap: 1.5rem; }
.gh--section { display: grid; gap: 0.6rem; }

.gh--heading {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--cbl-text);
}

.gh--grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
  gap: 0.75rem;
}

.gh--card,
.gh--card:link,
.gh--card:visited {
  display: grid;
  gap: 0.7rem;
  align-content: start;
  padding: 0.85rem;
  border: 1px solid var(--cbl-border);
  border-radius: var(--cbl-radius);
  background: var(--cbl-bg);
  color: inherit;
  text-decoration: none;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.gh--card:hover {
  border-color: var(--cbl-border-strong);
  background: var(--cbl-surface);
}

.gh--header { display: flex; align-items: center; gap: 0.8rem; min-width: 0; }
.gh--avatar {
  width: 48px; height: 48px;
  flex: none;
  border-radius: 50%;
  background: var(--cbl-surface);
  object-fit: cover;
}
.gh--title { min-width: 0; }
.gh--name {
  font-weight: 650;
  /* A long repository name has nowhere to wrap, so let it break rather than
     widen the card past its grid track. */
  overflow-wrap: anywhere;
}
.gh--owner { color: var(--cbl-muted); font-weight: 400; }
.gh--blurb {
  display: block;
  font-size: 0.82rem;
  line-height: 1.4;
  color: var(--cbl-text-secondary);
}

.gh--stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 1rem;
  font-size: 0.8rem;
  color: var(--cbl-muted);
}
.gh--stat { display: inline-flex; align-items: center; gap: 0.3rem; }
.gh--stat svg { flex: none; }

.gh--top { font-size: 0.8rem; }
.gh--top-label {
  color: var(--cbl-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.68rem;
  font-weight: 600;
}
.gh--top ul { list-style: none; margin: 0.35rem 0 0; padding: 0; display: grid; gap: 0.2rem; }
.gh--top li { display: flex; align-items: center; gap: 0.3rem; }
.gh--top li span:first-child { overflow-wrap: anywhere; }
.gh--top li .gh--stat { margin-left: auto; }

.gh--note {
  font-size: 0.8rem;
  color: var(--cbl-muted);
}

/* Placeholders while the API is answering, so the page does not jump when the
   cards arrive. */
.gh--card.is-skeleton { pointer-events: none; }
.gh--bone {
  background: var(--cbl-surface);
  border-radius: 4px;
  color: transparent;
  animation: gh-pulse 1.4s ease-in-out infinite;
}
.gh--card.is-skeleton .gh--avatar { animation: gh-pulse 1.4s ease-in-out infinite; }
@keyframes gh-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
@media (prefers-reduced-motion: reduce) {
  .gh--bone, .gh--card.is-skeleton .gh--avatar { animation: none; }
}
`;

const number = (value) => (typeof value === "number" ? value.toLocaleString() : "—");

/** "1 fork", "27 forks", "— forks" when the API did not say. */
const counted = (value, noun) =>
  `${number(value)} ${value === 1 ? noun : `${noun}s`}`;

function stat(iconPath, text, label) {
  const span = document.createElement("span");
  span.className = "gh--stat";
  span.appendChild(svgIcon(iconPath));
  span.appendChild(document.createTextNode(text));
  if (label) span.setAttribute("aria-label", `${text} ${label}`);
  return span;
}

function card({href, title, owner, blurb, avatar, stats, extra, maxWidth}) {
  const a = document.createElement("a");
  a.className = "gh--card";
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  if (maxWidth) a.style.maxWidth = `${maxWidth}px`;

  const header = document.createElement("div");
  header.className = "gh--header";
  if (avatar) {
    const img = document.createElement("img");
    img.className = "gh--avatar";
    img.src = avatar;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    header.appendChild(img);
  }

  const titleBox = document.createElement("div");
  titleBox.className = "gh--title";
  const name = document.createElement("div");
  name.className = "gh--name";
  name.textContent = title;
  if (owner) {
    const ownerEl = document.createElement("span");
    ownerEl.className = "gh--owner";
    ownerEl.textContent = ` ${owner}`;
    name.appendChild(ownerEl);
  }
  titleBox.appendChild(name);
  if (blurb) {
    const blurbEl = document.createElement("small");
    blurbEl.className = "gh--blurb";
    blurbEl.textContent = blurb;
    titleBox.appendChild(blurbEl);
  }
  header.appendChild(titleBox);
  a.appendChild(header);

  if (stats?.length) {
    const statsEl = document.createElement("div");
    statsEl.className = "gh--stats";
    stats.forEach((s) => statsEl.appendChild(s));
    a.appendChild(statsEl);
  }
  if (extra) a.appendChild(extra);
  return a;
}

function skeletonCard(maxWidth) {
  const el = document.createElement("div");
  el.className = "gh--card is-skeleton";
  el.setAttribute("aria-hidden", "true");
  if (maxWidth) el.style.maxWidth = `${maxWidth}px`;
  el.innerHTML = `
    <div class="gh--header">
      <div class="gh--avatar"></div>
      <div class="gh--title" style="flex:1">
        <div class="gh--bone" style="height:1em; width:60%">&nbsp;</div>
        <div class="gh--bone" style="height:0.8em; width:90%; margin-top:0.35rem">&nbsp;</div>
      </div>
    </div>
    <div class="gh--bone" style="height:0.8em; width:70%">&nbsp;</div>`;
  return el;
}

function failedCard(name, message, maxWidth) {
  const el = document.createElement("div");
  el.className = "gh--card";
  if (maxWidth) el.style.maxWidth = `${maxWidth}px`;
  const title = document.createElement("div");
  title.className = "gh--name";
  title.textContent = name;
  const note = document.createElement("div");
  note.className = "gh--note";
  note.textContent = message;
  el.append(title, note);
  return el;
}

/**
 * Fetch one GitHub API resource.
 *
 * Unauthenticated calls are capped at 60 an hour per address, so a reader who
 * has been busy on github.com can easily arrive at a rate-limited page. That
 * has to read as one card that says so rather than as a section that silently
 * fails to appear, which is what the old version did.
 */
async function api(path, signal) {
  const response = await fetch(`https://api.github.com/${path}`, {
    signal,
    headers: {Accept: "application/vnd.github+json"}
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const rateLimited = response.status === 403 && /rate limit/i.test(body.message ?? "");
    throw new Error(
      rateLimited
        ? "GitHub's hourly rate limit has been reached; the card will return shortly."
        : `GitHub answered ${response.status}.`
    );
  }
  return response.json();
}

function orgStats(repos) {
  return {
    repoCount: repos.length,
    stars: repos.reduce((sum, r) => sum + (r.stargazers_count ?? 0), 0),
    forks: repos.reduce((sum, r) => sum + (r.forks_count ?? 0), 0),
    topRepos: [...repos]
      .sort((a, b) => (b.stargazers_count ?? 0) - (a.stargazers_count ?? 0))
      .slice(0, 3)
  };
}

function topRepoList(repos) {
  if (!repos.length) return null;
  const box = document.createElement("div");
  box.className = "gh--top";
  const label = document.createElement("div");
  label.className = "gh--top-label";
  label.textContent = "Top repositories";
  const list = document.createElement("ul");
  repos.forEach((repo) => {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = repo.name;
    li.append(name, stat(ICONS.star, number(repo.stargazers_count), "stars"));
    list.appendChild(li);
  });
  box.append(label, list);
  return box;
}

async function orgCard(name, maxWidth, signal) {
  const [org, repos] = await Promise.all([
    api(`orgs/${name}`, signal),
    api(`orgs/${name}/repos?per_page=100`, signal)
  ]);
  const stats = orgStats(Array.isArray(repos) ? repos : []);
  return card({
    href: org.html_url,
    title: org.name || org.login,
    blurb: org.description,
    avatar: org.avatar_url,
    maxWidth,
    stats: [
      stat(ICONS.repo, counted(stats.repoCount, "repo"), "repositories"),
      stat(ICONS.star, counted(stats.stars, "star"), "stars"),
      stat(ICONS.fork, counted(stats.forks, "fork"), "forks")
    ],
    extra: topRepoList(stats.topRepos)
  });
}

async function repoCard(name, maxWidth, signal) {
  const repo = await api(`repos/${name}`, signal);
  return card({
    href: repo.html_url,
    title: repo.name,
    owner: repo.owner?.login,
    blurb: repo.description,
    avatar: repo.owner?.avatar_url,
    maxWidth,
    stats: [
      stat(ICONS.star, number(repo.stargazers_count), "stars"),
      stat(ICONS.fork, number(repo.forks_count), "forks"),
      repo.language ? stat(ICONS.code, repo.language, "language") : null
    ].filter(Boolean)
  });
}

async function userCard(name, maxWidth, signal) {
  const user = await api(`users/${name}`, signal);
  return card({
    href: user.html_url,
    title: user.name || user.login,
    blurb: `@${user.login}`,
    avatar: user.avatar_url,
    maxWidth,
    stats: [
      stat(ICONS.repo, counted(user.public_repos, "repo"), "repositories"),
      stat(ICONS.people, counted(user.followers, "follower"), "followers"),
      stat(ICONS.person, `${number(user.following)} following`, "following")
    ]
  });
}

/**
 * Render one section's worth of cards.
 *
 * Each card is fetched and placed independently, so one name that 404s or one
 * org that trips the rate limit costs its own card and nothing else.
 */
function section(root, {heading, names, build, maxWidth, signal}) {
  const wrapper = document.createElement("section");
  wrapper.className = "gh--section";
  if (heading) {
    const h = document.createElement("h2");
    h.className = "gh--heading";
    h.textContent = heading;
    wrapper.appendChild(h);
  }
  const grid = document.createElement("div");
  grid.className = "gh--grid";
  wrapper.appendChild(grid);
  root.appendChild(wrapper);

  const slots = names.map((name) => {
    const placeholder = skeletonCard(maxWidth);
    grid.appendChild(placeholder);
    return {name, placeholder};
  });

  return Promise.all(
    slots.map(async ({name, placeholder}) => {
      try {
        placeholder.replaceWith(await build(name, maxWidth, signal));
      } catch (error) {
        if (error.name === "AbortError") return;
        console.warn("github-api-widget:", name, error);
        placeholder.replaceWith(failedCard(name, error.message, maxWidth));
      }
    })
  );
}

export default {
  async render({model, el}) {
    const organizations = model.get("organizations") ?? [];
    const repos = model.get("repos") ?? [];
    const users = model.get("users") ?? [];
    const maxWidth = model.get("max_width") ?? null;
    const headings = model.get("headings") ?? true;

    const {root, dispose} = createRoot(el, {className: "gh", css: CSS});
    const controller = new AbortController();
    const signal = controller.signal;

    const sections = [
      {heading: "Open Source Organizations", names: organizations, build: orgCard},
      {heading: "Open Source Repositories", names: repos, build: repoCard},
      {heading: "GitHub Users", names: users, build: userCard}
    ].filter((s) => Array.isArray(s.names) && s.names.length);

    if (!sections.length) {
      showError(root, "github-api-widget: give it `organizations`, `repos` or `users`.");
      return () => dispose();
    }

    // Started together rather than section after section: the three sets of
    // requests are independent, and GitHub answers them in parallel. The
    // promises are deliberately not awaited — returning the cleanup function
    // straight away is what lets an unmount abort requests that are still in
    // flight, and the skeleton cards hold the layout until they land.
    sections.forEach((s) =>
      section(root, {...s, heading: headings ? s.heading : null, maxWidth, signal})
    );

    return () => {
      controller.abort();
      dispose();
    };
  }
};
