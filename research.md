---
title: Research
---

## Overview

We develop methods and instrumentation for diffractive imaging in electron microscopy, combining experiment, computation, and theory.

In our measurements, a converged electron probe is scanned across a thin specimen.
At each probe position, we record the far-field diffraction pattern, i.e. the probability density of the scattered electron wavefunction, producing a rich four-dimensional dataset (two scan dimensions and two diffraction dimensions).

From these diffraction intensities, we computationally reconstruct the underlying scattering sources inside the material. 
This enables quantitative recovery of structure, electromagnetic fields, and phase information that are not directly observable.
These approaches are powerful for both functional materials in the physical sciences and dose-sensitive samples in the life sciences, where maximizing information per electron is essential.

## Physical & Computational Ideas

This page introduces the key physical and computational ideas behind our work through interactive visualizations, and concludes with the open questions that drive our current research efforts.

### A 4D-STEM experiment

Gold nanoparticles on an amorphous carbon film, with the probe converging through the specimen onto the detector below — and *which part* of that detector you add up decides what the image shows.

Press **scan** to raster the probe across the field and fill the four signal panels, or hover over the scene to drive it yourself and click to pin it.
Nothing here is precomputed: the atoms, their projected potential, the exit wave, the diffraction pattern and every detector signal are computed in your browser, using the same multislice `abtem` runs and agreeing with it to one part in a million.

::::{div}
:class: col-page

:::{anywidget} https://curiousbeams.github.io/em-widgets/observable-notebook.mjs
{
  // the body is JSON5 — comments and unquoted keys are fine
  notebook: "https://curiousbeams.github.io/em-widgets/notebooks/stem-experiment.html",
  cells: ["stemExperiment", "readoutView"],
}
:::
::::

## Current Research Efforts

:::{warning} _Under construction_
This page is left as an exercise for the reader.
If successful, publish! [@feynman1972statistical]
:::