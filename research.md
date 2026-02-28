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

::::{tip} Converged Probes
:class: dropdown

:::{any:bundle} https://curiousbeams.github.io/esm-widgets/observable-notebook.js

{
  "notebook": "https://api.observablehq.com/@gvarnavi/stem-probes-psf-ctf.js?v=4",
  "cells": [
    "viewof params",
    "visualization_output"
  ],
  "dependencies": [
    "aberrationCoefs",
    "wavelength",
    "probeFS"
  ],
  "overrides": {
    "viz_width": "=width * 0.99"
  }
}

:::
::::

## Current Research Efforts

:::{warning} _Under construction_
This page is left as an exercise for the reader.
If successful, publish! [@feynman1972statistical]
:::