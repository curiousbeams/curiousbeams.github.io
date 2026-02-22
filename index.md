---
title: Home
site:
  hide_outline: true
  hide_title_block: true
---

:::{hero .col-screen} Curious Beams Lab
:background-image: ./images/banners/cbl-banner.svg
:kicker: Delft University of Technology
:max-width: 100, 80, 50, 50
:overlay: 80, 30, 30, 20
:actions: [Team](./team.md) [Research](./research.md) [Open Science](./open-science.md)

Welcome to the **Curious Beams Lab** -- where we use *electron beams and advanced algorithms* to explore the structure and function of materials at the nanoscale.

:::

We’re part of the [Imaging Physics Department](https://www.tudelft.nl/tnw/over-faculteit/afdelingen/imphys/) at **Delft University of Technology**, and our research lies at the intersection of physics, computation, and materials science.
Our goal is to make high-resolution electron microscopy robust and accessible -- combining modeling, simulation, and instrumentation to reveal how materials behave, atom by atom.

:::{div .text-center}

**Recent Interactive Content**

:::

```{cn:articles}
:venue: curious-beams
:collection: presentations
:limit: 3
:show-thumbnails:
:show-date:
:show-authors:
```

:::{div .text-center}

{button}`See All Presentations <interactive-content.md#presentations>`

:::

:::{div .text-center}

:::

```{cn:articles}
:venue: curious-beams
:collection: articles
:limit: 3
:show-thumbnails:
:show-date:
:show-authors:
```

:::{div .text-center}

{button}`See All Computational Articles <./interactive-content.md#computational-articles>`

:::

:::{div .text-center}

**Recent News**

:::

::::{template:list} news.yml
:path: news
:parent: {"type": "grid", "columns": [1,2,2,2]}
:limit: 2

:::{card:blog} {{title}}
:link: {% if url %}{{url}}{% endif %}
:image: {% if image %}{{image}}{% endif %}
:date: {% if date %}{{date}}{% endif %}
:tags: {% if tags %}{{tags.join(',')}}{% endif %}

{% if description -%}{{description}}{%- endif %}
:::
::::

:::{div .text-center}

{button}`See All News <./news.md>`

:::

::::{hero .col-screen} 
:max-width: 100, 80, 50, 50
:overlay: 80, 30, 30, 20

:::{any:bundle} https://curiousbeams.github.io/esm-widgets/image-carousel.js
:class: w-full
{
  "images": [
    "https://curiousbeams.github.io/images/gallery/20251215_holiday-dinner.jpeg",
    "https://curiousbeams.github.io/images/gallery/20251219_mathijs-bep.jpeg",
    "https://curiousbeams.github.io/images/gallery/20260120_nwo-physics.jpeg",
    "https://curiousbeams.github.io/images/gallery/20260219_bep-mep-market.jpeg"
  ],
  "height_ratio": 0.6,
  "border_radius": "0.5rem"
}
:::
::::