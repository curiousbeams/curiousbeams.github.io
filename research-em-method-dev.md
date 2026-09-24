---
title: Electron Microscopy Method Development
short_title: EM Method Development
label: em-method-development
---

A physical detector records intensities, so the phase of the scattered wave, which carries most of the physics, is never measured directly.
Recovering it is what turns a set of diffraction patterns into a quantitative image of the specimen, and is possible due to the large diversity and redundancy in [4D-STEM measurements](#stem-experiment) [@10.1557/s43577-026-01100-3].

The three widgets below illustrate where such phase information lives in the measurement, how to invert it in a single step, and what to do when a single step is not enough.

(aperture-overlap)=
## The aperture overlap

Two parts of the converged beam that leave the specimen in the same direction arrive at the same detector pixel and interfere there.
The overlap function describes that interference, and the direct methods are built on it [@10.1098/rsta.1992.0050].

Drag the marker on the bright-field disc to choose a detector pixel, and the marker on the frequency plane to choose a spatial frequency.
Phase information is carried where two or three of the aperture discs overlap, and the aberration panels illustrate how the lens encodes additional interference.

:::{anywidget} https://curiousbeams.github.io/em-widgets/observable-notebook.mjs
{
  notebook: "https://curiousbeams.github.io/em-widgets/notebooks/aperture-overlap.html",
  cells: ["overlapView", "readoutView"],
}
:::

(direct-ptychography)=
## Direct methods

Under the weak-phase object approximation (WPOA) [@10.1016/j.ultramic.2013.08.002], the aperture overlap function above can be inverted directly in a single step using one of five estimators: single side band (SSB) [@10.1016/j.ultramic.2014.09.013; @10.1016/j.ultramic.2016.09.002], optimum bright field (OBF) [@10.1016/j.ultramic.2020.113133], parallax and phase-flipped parallax [@10.1038/s41592-025-02834-9; @10.1093/mam/ozaf139], and integrated centre of mass (iCOM) [@10.1016/j.ultramic.2015.10.011].
The widget below illustrates the unified direct ptychography algorithm as a loop over bright-field (BF) pixels [@10.1557/s43577-026-01100-3].

Press **play** to sweep the detector pixel across the bright-field disc while the reconstruction accumulates.

:::{anywidget} https://curiousbeams.github.io/em-widgets/observable-notebook.mjs
{
  notebook: "https://curiousbeams.github.io/em-widgets/notebooks/direct-ptychography.html",
  cells: ["controlsView", "pipelineView", "readoutView"],
}
:::

(iterative-ptychography)=
## Iterative ptychography

The direct methods invert a linear estimator under the WPOA. 
The ptychographical iterative engine (ePIE) [@10.1016/j.ultramic.2009.05.012] solves the nonlinear inverse problem by model-based iterative optimization.
It keeps a guess at the specimen and, for each scan position, models the detector intensities, replaces the modelled amplitude with the measured one, and pushes the phase difference back into the specimen guess.

**Hover the specimen** to put the probe somewhere and take one update there, which shows what a single scan position contributes.
**Play** visits every position in a shuffled order.
**Inspect** runs the calculation at each position you pass over without applying it, so a converged reconstruction can be asked what it still sees.

:::{anywidget} https://curiousbeams.github.io/em-widgets/observable-notebook.mjs
{
  notebook: "https://curiousbeams.github.io/em-widgets/notebooks/iterative-ptychography.html",
  cells: ["controlsView", "cycleView", "errorView", "readoutView"],
}
:::

::::{dropdown} Proximal Gradient Methods
The step that replaces the modelled amplitude with the measured one is a projection: it returns the nearest wave with the amplitude that was recorded.
Alternating projections between two sets converges to a point in both of them when the sets are convex, and the sets in a phase-retrieval problem are not.

This widget runs the same operation in two dimensions, where the whole trajectory fits on the screen and the iterate can be watched stalling at a point that satisfies neither constraint.
The relaxations that get it moving again, such as the difference map and RAAR, are proximal gradient methods applied to the same two projections [@10.1364/ao.21.002758; @10.1364/josaa.20.000040].

:::{anywidget} https://curiousbeams.github.io/em-widgets/observable-notebook.mjs
{
  notebook: "https://curiousbeams.github.io/em-widgets/notebooks/projection-sets.html",
  cells: ["controlsView", "parametersView", "playbackView", "legendView", "sceneView", "convergenceView", "readoutView"],
}
:::
::::
