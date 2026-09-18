# Curious Beams Landing Content

This project stores the MyST Markdown content that powers the Curious Beams research site.

## Editing Content

1. Update the relevant `.md` page(s) with your changes.
2. If you add a new page, remember to update the table of contents in `curvenote.yml` (`project.toc`) so the file is included in builds and navigation.
3. Run the following commands to update the landing page content:
    ```bash
    curvenote work push --public -y
    curvenote site init curious-beams --set-content
    ```

## Adding a Photograph

Put the image in `images/gallery/` and add an entry to the top of `gallery.yml`:

```yaml
gallery:
  - src: ./images/gallery/20260507_pico-triple-point.jpeg
    caption: PICO 2026, tri-country point hike.
```

That is the only place the list lives. The gallery page shows all of them and the
home page shows the first four, both by fetching the file at runtime, so newest
first is what you want. Both also need the file pushed to GitHub, since they read
it from `https://curiousbeams.github.io/gallery.yml` rather than from the build.

## Widgets

`esm-widgets/` holds the interactive components the pages embed, served from
GitHub Pages and fetched by URL at runtime. Two things about them are worth
knowing before editing one:

- **Embed with `{anywidget}`.** It renders under `curvenote start` as well as
  when deployed, which is what makes a change checkable before it ships.
  `{any:bundle}` and `{any:widget}` still work, but they render a placeholder
  locally, so the widget can only be seen once it is live.
- **A widget must be one self-contained file.** The build downloads the module it
  is pointed at and re-serves it from the site's own origin under a content hash,
  copying nothing beside it, so a relative import inside that copy resolves to a
  path that does not exist and the widget fails to load. Absolute-URL imports
  from a CDN are fine. `{anywidget}` also always mounts in a shadow root, so
  styles have to go in the element the widget is handed, never `document.head`.

That cache is keyed on the URL and never on the contents. After pushing a change
to a widget, `rm _build/site/public/*.mjs` or the local preview will go on
serving the copy it already has.