---
title: Research
label: overview
---

We develop methods and instrumentation for diffractive imaging in electron microscopy, combining experiment, computation, and theory.

In our measurements, a converged electron probe is scanned across a thin specimen.
At each probe position, we record the far-field diffraction pattern, i.e. the probability density of the scattered electron wavefunction, producing a rich four-dimensional dataset (two scan dimensions and two diffraction dimensions) [@10.1017/s1431927619000497].

From these diffraction intensities, we computationally reconstruct the underlying scattering sources inside the material.
This enables quantitative recovery of structure, electromagnetic fields, and phase information that are not directly observable.
These approaches are powerful for both functional materials in the physical sciences and dose-sensitive samples in the life sciences, where maximizing information per electron is essential.

(stem-experiment)=
## A 4D-STEM experiment

The interactive widget below simulates a converged electron probe scattering through gold nanoparticles on an amorphous carbon film.

Press **scan** to raster the probe across the field and fill the four signal panels, or hover over the scene to drive it yourself and click to pin it.

:::{anywidget} https://curiousbeams.github.io/em-widgets/observable-notebook.mjs
{
  // the body is JSON5 — comments and unquoted keys are fine
  notebook: "https://curiousbeams.github.io/em-widgets/notebooks/stem-experiment.html",
  cells: ["stemExperiment", "readoutView"],
}
:::

## Research directions

Each of our three research directions has its own page:

- [Electron microscopy method development](./research-em-method-dev.md): developing novel algorithms to extract phase information from diffractive measurements efficiently.
- [Electron optics instrumentation](./research-electron-optics.md): pushing the limits of probe-forming electron-optical components.
- [Functional imaging of materials and surfaces](./research-functional-imaging.md): investigating surface reconstructions, antiferromagnetic order, and biological structure in three dimensions.

:::{warning} _Under construction_
The following pages are left as an exercise for the reader.
If successful, publish! [@feynman1972statistical]
:::