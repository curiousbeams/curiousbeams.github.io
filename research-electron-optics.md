---
title: Electron Optics Instrumentation
short_title: Electron Optics
label: electron-optics
---

The [phase-retrieval methods](#em-method-development) we develop are sensitive to the incoming illumination, so we also develop electron optics that tune the probe.
The widgets here go from the ray diagram of a whole column down to the field of a single lens and the aberrations it carries.

(electron-column)=
## The column

An SEM column and a scanning transmission electron microscope (STEM) column use a similar set of electro-optical components with different settings.
Drag the lenses and apertures to move the crossovers, converge the probe, and change the working distance.

:::{anywidget} https://curiousbeams.github.io/em-widgets/observable-notebook.mjs
{
  notebook: "https://curiousbeams.github.io/em-widgets/notebooks/electron-column.html",
  cells: ["electronColumn", "readoutView"],
}
:::

(paraxial-rays)=
## Rays through a real lens

Ray-transfer matrices treat a lens as a thin plane with a specific focal length.
A real lens is a field that the electron is integrated through, and this widget integrates it: the axial field of a magnetic (Glaser) or electrostatic (Schiske) lens, and the paraxial equation of motion, which together say where the rays cross.

:::{anywidget} https://curiousbeams.github.io/em-widgets/observable-notebook.mjs
{
  notebook: "https://curiousbeams.github.io/em-widgets/notebooks/paraxial-rays.html",
  cells: ["paraxialRays", "readoutView"],
}
:::

(non-paraxial-rays)=
## What the paraxial approximation leaves out

The same field, with the coupled three-dimensional ray equations carried to third order.
Two things appear that the paraxial equation cannot show: the bundle rotates about the optic axis as it passes through a magnetic lens, and rays that enter further from the axis cross it sooner than rays that enter close to it.

Drag the scene to turn it, and move the detector away from the waist to see the spot the aberration leaves.

:::{anywidget} https://curiousbeams.github.io/em-widgets/observable-notebook.mjs
{
  notebook: "https://curiousbeams.github.io/em-widgets/notebooks/non-paraxial-rays.html",
  cells: ["nonParaxialRays", "readoutView"],
}
:::

::::{dropdown} Principle of Reciprocity

The [phase-retrieval techniques](#em-method-development) rely on the principle of reciprocity [@10.1063/1.1652901]:
Reversing every ray in the column and swapping the source for the detector turns a bright-field STEM measurement into a tilted TEM measurement, which is what this widget does.

:::{anywidget} https://curiousbeams.github.io/em-widgets/observable-notebook.mjs
{
  notebook: "https://curiousbeams.github.io/em-widgets/notebooks/reciprocity.html",
  cells: ["reciprocity", "readoutView"],
}
:::
::::
