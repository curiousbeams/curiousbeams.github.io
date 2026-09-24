---
title: Functional Imaging of Materials and Surfaces
short_title: Functional Imaging
label: functional-imaging
---

In addition to the electrostatic structure of materials, we are interested in measuring the functional properties of dose-sensitive specimens, such as electric and magnetic fields at high resolution, how a surface has rearranged itself, and biological structure in three dimensions.

(surface-diffraction)=
## Surface diffractive imaging

A clean surface rearranges its top layer into a cell larger than the one the bulk beneath it repeats with.
The Si(111) surface does it on a cell seven times larger in each direction [@https://doi.org/bzvszv], introducing extra "super-lattice" diffraction spots — fractional spots — at sevenths of the way between the substrate's.
Electrons that scatter elastically from the first few atomic layers and come back out carry those spots with them.
Focusing that beam and scanning it turns a diffraction measurement into an image of where the surface has reconstructed.

Press **play** to raster the beam across three islands of the reconstruction, or hover the map to drive it by hand.
The left panel is a zoom-in of the atomic model of the surface under the beam: tan adatoms over the two levels of the bilayer, with the corner holes of the 7×7 cell between them.
Cross an island edge and the adatoms disappear while the fractional spots leave the pattern, in the same step.

The **beam-width slider** is the trade this measurement has to make.
A beam of width σ spreads each spot by 1/2πσ, and the fractional spots are a seventh of a substrate spacing apart, so focusing past about a cell's width over π makes neighbouring spots overlap and the map washes out however finely the scan is stepped.

:::{anywidget} https://curiousbeams.github.io/em-widgets/observable-notebook.mjs
{
  notebook: "https://curiousbeams.github.io/em-widgets/notebooks/surface-diffraction.html",
  cells: ["controlsView", "surfaceView", "readoutView"],
}
:::

(magnetic-imaging)=
## Antiferromagnetic diffractive imaging

An antiferromagnet (AFM) has no net magnetisation, so there is no stray field outside the specimen to measure.
Electrons passing through an AFM encode this order as a small deflection that alternates with the magnetic sublattice, mixed in with the much larger deflection from the atoms themselves [@10.1107/s2053273321008792].
Separating the two is a signal-to-noise inverse problem [@10.1093/micmic/ozad067.128].

::::{grid} 1 2 3 3

:::{card} Electrostatic
![](./images/research/nio-electrostatic.gif)

The phase from the atoms.
:::

:::{card} Magnetic
![](./images/research/nio-magnetic.gif)

The phase from the antiferromagnetic order.
:::

:::{card} Combined
![](./images/research/nio-combined.gif)

Their sum, which is what is measured.
:::

::::

(ptycho-tomography)=
## Cryo STEM joint ptychographic tomography

A ptychographic reconstruction recovers the specimen's potential projected along one direction.
Recovering it in three dimensions takes many such directions, so the experiment is a tilt series: a 4D-STEM scan at every angle.

A diffraction measurement cannot see a constant added to the phase, so ptychography fixes each projection in shape and leaves it floating in height.
Reconstruct the tilt series **sequentially** — 2D ptychography at each tilt, then 3D tomography on the images it produces — and every projection invents its own offset, which back-projection then spreads through the volume.
Solve for the volume and its projections **jointly** and each one inherits the offset the rest of the series already agrees on [@10.1103/PhysRevApplied.19.054062].

The widget below shows a patch of membrane with proteins in it, of the kind used to plan a cryo-tomography experiment before taking one [@10.1016/j.jsb.2022.107921].
At each tilt the specimen is projected to an image, that image is measured by a 4D-STEM experiment at a specific dose and the measurement is inverted with the same [ePIE](#iterative-ptychography) used for iterative ptychography.

Drag either scene to turn both, so the reconstruction can be compared with the specimen from the same direction.
The specimen is drawn as a surface, while the reconstruction is drawn as a shaded volume.
The dashed line is the beam at the tilt being measured, the middle panel is one of the sixty-four diffraction patterns that tilt records, and the tilt range control is the missing wedge.

:::{anywidget} https://curiousbeams.github.io/em-widgets/observable-notebook.mjs
{
  notebook: "https://curiousbeams.github.io/em-widgets/notebooks/ptycho-tomography.html",
  cells: ["controlsView", "tomographyView", "readoutView"],
}
:::
