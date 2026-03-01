---
title: WL Embedder Test
---

:::{any:bundle} https://curiousbeams.github.io/esm-widgets/wolfram-notebook-embedder.js

{
  "url": "https://www.wolframcloud.com/obj/gvarnavi/Published/3029-SP22__L18__surface-energy-anisotropy__04-06-22.nb",
  "allowInteract": true,
  "showBorder": false
}

:::


## Paraxial Ray Equation

### Introduction

In electron optics, the trajectory of an electron moving predominantly along the optic axis $z$ can be described by a paraxial approximation, in which transverse displacements $r(z)$ remain small and ray angles are shallow. Under this assumption, the full Lorentz equations reduce to a second-order ordinary differential equation for the transverse coordinate $r(z)$, which incorporates both electrostatic acceleration and magnetic focusing.

For an axially symmetric system with on-axis electrostatic potential $\phi (z)$ and axial magnetic field $B(z)$, the paraxial ray equation takes the form:

$$
r''(z) + \frac{\phi'(z)}{2 \phi(z)}r'(z) + \left[\frac{\phi''(z)}{4 \phi(z)} + \frac{\eta^2 B^2(z)}{4 \phi_0} \right] r(z) =0,
$$

where primes denote derivatives with respect to $z$, $\phi _0$ is the accelerating potential at the optical axis, and $\eta  = \sqrt{\frac{|e|}{2m}}$ collects physical constants. This equation provides the foundation for paraxial electron-optical analysis: its solutions describe primary and marginal rays, and its coefficients encode the focusing properties of electrostatic and magnetic lenses. 

**Coding aside:**
Notice we used pattern-matching (Mathematica's equivalent of multiple dispatch), to define the same function with three different call signatures to cover the special cases where there's only electrostatic or magnetic fields
```mathematica
linearizedODE[\[Phi]0_, \[Eta]_][\[Phi]_, B_] := 
 Block[{r, z}, 
  r''[z] + \[Phi]'[z]/(2 \[Phi][z]) r'[z] 
         + (\[Phi]''[z]/(4 \[Phi][z]) 
         + (\[Eta]^2 B[z]^2)/(4 \[Phi]0)) r[z] == 0
  ]
         
linearizedODE[\[Phi]0_, \[Eta]_][B_] := 
 Block[{r, z}, r''[z] + (\[Eta]^2 B[z]^2)/(4 \[Phi]0) r[z] == 0]

linearizedODE[\[Phi]0_][\[Phi]_] := 
 Block[{r, z}, 
  r''[z] + \[Phi]'[z]/(2 \[Phi][z]) r'[z] 
         + \[Phi]''[z]/(4 \[Phi][z]) r[z] == 0
  ]
```

**Coding aside:**
Notice we used a RuleDelayed (:>) trick to ensure that $\eta$, which depends on other constants is only evaluated once queried, i.e. after the Association has been created and thus able to query the other constants.

```mathematica
physicalConstants = <|
   "e" -> QuantityMagnitude[Quantity["ElementaryCharge"], "SIBase"],
   "m" -> QuantityMagnitude[Quantity["ElectronMass"], "SIBase"],
   "c" -> QuantityMagnitude[Quantity["SpeedOfLight"], "SIBase"],
   "\[Eta]" :> Sqrt[Abs[physicalConstants["e"]]/(2 physicalConstants["m"])]
  |>;
```

### Analytical Axial Fields

To build intuition and enable reproducible calculations, we begin by working with analytical expressions for the on-axis fields of idealized electron lenses. These models capture the essential physics of focusing while remaining simple enough to manipulate symbolically and solve numerically.

#### Magnetic round lens (Glaser field)

A widely used model for the axial magnetic field of a rotationally symmetric magnetic lens is the **Glaser bell-shaped field**, given by

$$
B_{\mathrm{Glaser}}(z) = \frac{B_0}{1 + \left(z/a\right)^2},
$$
where $B_0$ is the peak axial magnetic field strength, and $a$ sets the effective half-width of the lens and controls how rapidly the field falls off along the optic axis.

This field approximates the axial field produced by a solenoidal magnetic lens with finite pole-piece separation. While it does not correspond to an exact coil geometry, it closely reproduces the focusing properties of practical magnetic round lenses and is widely used in analytical aberration theory.

```mathematica
magneticField["glaser"][a_, B0_][z_] = B0/(1 + (z/a)^2);

With[{a = 0.0075, B0 = 0.01}, 
   Plot[
    magneticField["glaser"][a, B0][z], {z, -0.1, 0.1}, 
    PlotRange -> All, 
    Frame -> True, 
    FrameLabel -> {"axial position, z(m)", "magnetic field, B(T)"}, 
    FrameStyle -> 16, 
    ImageSize -> 600 
   ] 
  ]
```
