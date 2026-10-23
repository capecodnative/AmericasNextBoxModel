# America’s Next Box Model: science and teaching roadmap

Research and implementation brief • 22 October 2026 • Draft for discussion

## Recommendation

Keep the six introductory examples as a foundations sequence. Improve their scientific interpretation and diagnostics, add a small set of examples that use the existing engine, then implement explicitly defined nonlinear laws. Treat multi-element stoichiometry, carbonate chemistry and circulation feedbacks as separate later milestones.

The immediate priority is not more interface decoration. It is helping learners distinguish inventory from concentration, internal recycling from permanent removal, steady state from equilibrium, and several different meanings of “time scale.” Every new feature should unlock a named teaching example with a numerical acceptance test.

This document proposes work; it does not change the site or authorize deployment. It supplements the original handoff and the implementation record.

## What was reviewed

- The published site, https://capecodnative.github.io/AmericasNextBoxModel/, was inspected in a fresh browser tab. All six examples’ setup descriptions, budget equations and experiment lists were checked.
- The matching local presets, rate-law evaluation, transport validation, unit handling and adaptive solver were inspected. Numerical checks below were run against those local presets; they are calculations for the current implementation, not published environmental observations.
- University teaching notes and primary research/model documentation were opened. Sources and limits of the review are listed at the end. Recommendations and proposed defaults here are original adaptations, not claims that the source authors used these exact teaching designs.

### Current scientific scope

The engine has prescribed constant fluxes, first-order material transfer, signed symmetric exchange, and internal advection. Forcing supports constant, step, finite-rate pulse and sinusoidal modulation. All volumes are fixed. Advective water budgets must balance; external advective endpoints and time-varying advection are currently rejected.

Several material reservoirs can share one physical compartment. Mixing/advection transport all included forms through explicitly paired reservoirs. One global inventory currency is assumed; a dissolved and particulate form can represent the same element, but independent C, N, P and oxygen budgets are not yet supported. Excluding particles from water transport is a model assumption, not a universal property of particles.

The numerical integrator is adaptive RK4 with step doubling, scheduled forcing boundaries and a work limit. It rejects negative accepted inventories rather than clipping them. It is not a dedicated stiff solver. Graph and diagram synchronization, custom model storage, JSON import/export and baseline comparison already exist and should be preserved.

## 1. Edits to the existing examples

| Example | Recommended change | Concept made visible |
| --- | --- | --- |
| 01 Constant accumulation | Add an optional slope readout and cumulative-input overlay. Offer a concentration view experiment that doubles volume while holding input and initial inventory fixed. State that the positive-input case has no finite steady state. | dM/dt = I versus dC/dt = I/V; inventory and concentration respond differently to geometry. |
| 02 Constant input and first-order loss | Add optional steady-state line, adjustment-time marker and half-life readout. Keep existing reference text contextual and collapsed by default. Compare two models with the same I/k but different I and k. | A steady inventory can have substantial ongoing throughput. Identical steady states need not have identical dynamics or identify the rates. |
| 03 A changing supply | Offer named step, finite pulse and seasonal subcases, plus a visible forcing trace. Add a “pulse amount” calculation, and distinguish it from an instantaneous injection. | Reservoirs filter forcings: amplitude attenuation, phase lag and recovery. Compare forcing period with adjustment time. |
| 04 Two exchanging reservoirs | Offer gross-exchange arrows/readout alongside the existing signed net arrow. Add the predicted common concentration and a concentration-difference plot. | Equal concentration does not imply equal inventory. A zero net mixing flux does not imply that gross exchange stops. |
| 05 Surface–deep nutrient cycle | Explicitly label the present export/remineralization arrow as a lumped pathway; identify burial as a permanent-removal proxy. Add a surface recycling route in an optional variant. Supply separate short-transient and long-adjustment run presets. | Uptake, regeneration, export and burial are different processes. Large internal cycling need not determine the whole-ocean removal time. |
| 06 Dissolved–particulate tracer | Identify adsorption as pseudo-first-order under fixed carrier abundance. State that “Particle-bound tracer” is the tracer on particles, not the particle carrier mass itself. Offer export-off and closed-partitioning variants. | Kinetic partitioning, reversible scavenging and irreversible removal. Equilibrium partitioning and transient response are distinct. |

### Quantitative checkpoints for the existing defaults

These are implementation-derived examples, using the currently selected model units.

- Example 02: I = 4, k = 0.2, so M* = 20, tau = 5 years, and half-life = ln(2)/k ≈ 3.47 years. A perturbation is about 63% relaxed after tau; this interpretation applies to this one-box linear model. Doney’s introductory lecture is a particularly close teaching reference [S1].
- Example 04: total inventory = 50 and total volume = 50, so C* = 1. Final inventories are 10 and 40, not equal. With E = 2, the concentration difference decays with tau = 1/[E(1/V1 + 1/V2)] = 4 years. This is not simply either box’s V/E.
- Example 05: the existing linear equations give the equilibrium inventories Surface = 15, Particles = 10, Deep = 550. Total equilibrium inventory is 575; the default 40-year simulation ends near total 87.34, starting from 72. This is not a solver failure: a 40-year run cannot even accumulate more than 20 additional units from the 0.5-unit/year input before burial. A short run illustrates a transient, not whole-system equilibrium. Keep it, but label its purpose and offer a longer run.
- Example 06: if deposition and export are off, the present rates imply M_bound/M_dissolved = 0.15/0.3 = 0.5 at equilibrium. With deposition = 1 and export coefficient = 0.1, the steady state is Bound = 10 and Dissolved = 20. Show which relation applies to which configuration.

JModels provides a useful next-step comparison for Example 05: its phosphorus documentation includes phosphate-limited phytoplankton growth and surface regeneration [S2]. It should be described as inspiration; the present linear three-state example is not a reproduction of that model.

Do not add large blocks of permanent explanatory text back into the diagram. Use a concise setup summary, optional concept cards, tooltips and expandable “Model assumptions / sources” material. Do not reinstate the removed “Predict First” banner.

## 2. New examples, ranked by teaching value and dependencies

### A. Balanced circulation and a tagged tracer — next release

**Question:** How does the route of transport affect the response even when all water volumes stay constant?

Use three physical compartments in a closed directed loop A → B → C → A, each carrying the same water flux Q. Start a conservative tagged tracer in A and follow its redistribution. Optional comparison: a symmetric mixing network with the same total inventory and matched gross outflow scale.

This uses the existing laws and water-budget validator. Provide a water-budget table showing each compartment’s incoming Q, outgoing Q and zero residual. Selecting a water flow should show the transported material forms.

**Important:** Two equal opposing advective flows between two well-mixed boxes yield Q(C1 − C2), exactly the same net tracer equations as symmetric exchange with E = Q. Do not promise different tracer trajectories for those matched two-box cases. This equivalence itself makes a useful short concept card. A three-box loop better exposes circulation direction and pathway dependence.

**Acceptance:** closed tracer inventory remains constant; every compartment’s water budget balances; intentionally deleting a return leg produces a clear error. Compare loop circulation and symmetric mixing without claiming that a well-mixed box has a single parcel travel time. MIT’s adapted three-box handout supplies the larger oceanographic context [S3].

### B. Fast and slow organic matter — next release

**Question:** Why can a system contain a long-lived tail even though each individual process is first order?

Place labile organic C, slowly reacting organic C and DIC in one shared volume. Two independent first-order transfers feed DIC. Optional first variant uses modest rate contrasts; a separate advanced variant explores stronger contrasts within the solver’s practical limits.

**Concepts:** multi-exponential relaxation, operational pool definitions, hidden heterogeneity and the error of assigning one universal lifetime to a mixture. A straight line on a semilog plot applies to a single exponential; curvature can indicate multiple pools. Doney’s DOM notes distinguish multiple organic-matter reactivity classes [S4].

**Acceptance:** total C is conserved; each organic pool matches its exponential reference; the total organic pool matches the sum of the references. Inventory magnitudes and rate constants are illustrative until a particular published parameter set is deliberately adopted.

### C. A radionuclide budget with production, decay and scavenging — near term

**Question:** How do competing removal processes change a radioactive tracer’s inventory?

Use a tracked radionuclide produced at rate P, lost to radioactive decay lambda M, and optionally removed by scavenging k_s M. Then M* = P/(lambda + k_s) and the one-box relaxation time is 1/(lambda + k_s).

This can be prototyped numerically with existing laws, but needs process categories so radioactive destruction is not displayed as physical boundary export. Keep inventories in moles of the tracked isotope initially; do not relabel activity as mol or assume summed activities are conserved. Any adopted isotope half-life and production rate must have an explicit checked source and time unit.

A 234Th-inspired deficit example is attractive because the primary-production teaching notes connect a radionuclide deficit to removal on particles [S5]. A later radiocarbon example can address mixing and ventilation. Tracer age must not be presented as a universal clock or mean water age; the Stanford exercise and Waugh’s tracer notes provide complementary teaching material [S6, S7].

**Acceptance:** exponential decay and constant-production analytical solutions; separate integrated physical-export and decay tallies; zero physical transport must not report water leaving the box.

### D. Nutrient-limited growth and recycling — first nonlinear release

**Question:** Why does uptake saturate, and why does biomass matter as well as nutrient inventory?

Use inorganic nutrient N, phytoplankton nutrient inventory B, and optional detrital nutrient D in one volume V. Every reservoir initially uses the same elemental currency (e.g. mol N). Growth transfers N → B at

    F_growth = mu_max * [N] / (K_N + [N]) * M_B

with [N] = M_N/V. B modifies the rate but is not an additional consumed reactant. Mortality transfers B → D and remineralization transfers D → N.

Start with a closed nutrient–biomass system; then add supply/removal and optional prescribed light modulation. A full chemostat variant needs the external-water feature below. Do not claim that nutrient saturation alone creates a realistic seasonal bloom. Monod/chemostat lectures support the growth structure [S8]; NPZD models provide a later ecological extension [S9, S10].

**Acceptance:** N + B + D conserved in the closed configuration; zero nutrient or zero biomass gives zero growth; at high nutrient F/M_B approaches mu_max; K_N has concentration units; all intermediates remain admissible.

### E. Particle-abundance-dependent scavenging — first nonlinear release

**Question:** When is an apparent first-order scavenging coefficient actually hiding another variable?

Retain dissolved and particle-bound tracer, then expose a prescribed carrier particle concentration P_carrier. Use

    F_ads = k_ads * P_carrier * M_dissolved
    F_des = k_des * M_bound

At fixed P_carrier this reduces to Example 06’s pseudo-first-order adsorption. Varying carrier abundance should change partitioning and removal. Carrier mass is distinct from adsorbed tracer; initially make it a parameter/forcing field with explicitly declared carrier units, not another pool silently summed into the tracer budget.

A later extension can make carrier particles dynamic, after multi-currency support exists. The NEMO–ProThorP paper provides a research example linking particle abundance/composition, reversible scavenging and transport [S11]. Its equilibrium treatment is not the same as a kinetic two-pool implementation; label the adaptation accordingly.

**Acceptance:** no carrier means no adsorption; dissolved + bound tracer is conserved without sources/export/decay; constant carrier reproduces the equivalent first-order case; particles are not accidentally consumed merely because they modify adsorption.

### F. Air–sea gas equilibration — subsequent release

**Question:** How do mixed-layer depth, gas exchange and internal sources affect equilibration?

Use a prescribed atmospheric-equilibrium concentration C_eq and area A:

    F_into_water = k_gas * A * (C_eq − C_water)

The boundary flux can reverse. At constant conditions without other processes, tau = V/(k_gas A) = H/k_gas for a uniform layer. Clearly distinguish transfer velocity (length/time), area-integrated flux (amount/time) and areal flux density (amount/area/time).

Start with an inert-gas analogue or a clearly specified O2 equilibration problem; extend later to oxygen consumption. Atmospheric pCO2 and total DIC cannot be treated as interchangeable concentrations. Full carbon chemistry needs DIC, alkalinity, temperature/salinity and an equilibrium/speciation calculation. Gas-exchange lectures and Wanninkhof supply the physical context [S12, S13]; the paleoceanography slides explain why carbon speciation adds another layer [S14].

**Acceptance:** the sign reverses correctly, the analytical relaxation is reproduced and the boundary integral closes the tracked gas budget. An infinite prescribed atmosphere is a boundary condition, not a conserved finite atmosphere box.

### G. Sediment pore-water exchange / recycling — later topic library

Add a water compartment and a pore-water compartment, particulate deposition, remineralization, dissolved return and permanent burial. Initially keep one elemental currency and fixed geometry. This separates export across a selected depth, sediment storage and ultimate burial. Do not add redox ladders until stoichiometric multi-substrate reactions exist. The marine chemistry lecture collection provides sediment-diagenesis starting points [S15].

### H. Advanced modules to defer

- NPZD with explicit grazing and egestion; eventually N–P competition, limitation and fixation/denitrification [S9, S10, S16].
- Coupled nutrient–oxygen–carbon budgets with explicit elemental stoichiometry and oxygen availability.
- Stommel circulation feedbacks, multiple steady states and hysteresis [S17]. This requires state-dependent water transport and compatible heat/salt representations; it is not just another tracer flux selector.
- Carbonate chemistry, buffering and the biological/solubility pumps [S14]. Avoid shipping a generic “CO2” transfer that hides speciation assumptions.

## 3. Which missing features matter most?

### First: scientific diagnostics and inspectable experiments

1. **Water and material budgets separately.** Show water inflow/outflow per physical compartment and tracked-material inputs, physical exports and transformations. Distinguish gross mixing terms from signed net exchange.
2. **Contextual time scales.** One-box adjustment time and half-life where valid; flushing V/Q for balanced throughflow; process turnover M/F when the relevant positive loss is defined; whole-system inventory divided by external removal; and linear-system relaxation modes where available. Do not divide by signed net mixing and call that residence time.
3. **Optional steady-state overlays.** State whether an equilibrium exists and whether the current run approaches it. Closed linear models need a conservation constraint; accumulation with positive net input has no finite equilibrium. A small derivative only indicates near-steady behavior over a stated scale, not proof of a unique stable solution.
4. **Forcing and cumulative flux views.** Plot source forcing, cumulative process transfer, and optional anomalies relative to a reference. Signed net mixing integrals and gross counter-exchange integrals are different quantities.
5. **Experiments with named assumptions.** Compact optional concept cards, referenced parameter provenance and model limitations. Add a source link per example, rather than putting everything only in global credits.
6. **Comparison and inference.** Multiple named runs, normalized/anomaly plots, parameter sweeps and a later observation overlay. Demonstrate identifiability explicitly: M* constrains I/k, not I and k separately. Use synthetic observations before connecting real datasets or adding parameter fitting.

### Second: a small, explicit rate-law library

| Law | Proposed material flux | Parameters and scope |
| --- | --- | --- |
| Quadratic removal/transfer | F = k_2 V C_A^2 = k_2 M_A^2/V | k_2 has volume/(amount·time). A useful phenomenological concentration-dependent law, not automatically an elementary 2A reaction. |
| Saturating transfer without dynamic biomass | F = F_max C_A/(K + C_A) | F_max is amount/time; K is concentration. Suitable for a fixed-capacity process. Do not label this complete phytoplankton growth. |
| Biomass-dependent Monod transfer | F = mu_max C_N/(K_N + C_N) M_B | mu_max is 1/time; B is an explicit modifier reservoir in the same compartment. N → B transfers nutrient currency. |
| Particle-modulated adsorption | F = k_ads P_carrier M_dissolved | P_carrier’s units must be explicit; k_ads has inverse carrier-concentration/time units. Carrier is not the bound tracer. |
| Boundary relaxation | F = gamma V(C_boundary − C_A) | gamma is 1/time; boundary concentration is prescribed; flux is signed. Equivalent physical parameterization k_gas A can follow once area/length units are supported. |
| External water transport | F_in,s = Q C_in,s; F_out,s = Q C_box,s | Q is volume/time; outflow carries every non-excluded form. Water must balance in each fixed-volume compartment, including boundary flows. |

These definitions are proposed dimensional conventions. If an inventory-based k M^2 variant is also offered, label its different coefficient units explicitly; do not silently reuse k_2 between conventions.

**Two-reactant chemistry needs more than an extra selector.** For A + B → products, a rate r = k V[A][B] must debit both reactants and credit products using the reaction’s stoichiometric coefficients. Adding a B factor to an A → B arrow does not accomplish this. More generally, separate substrates (consumed), modifiers (affect rate) and products (created). Reactions must be local to a physical compartment unless an explicit transport process connects them.

### Third: events, boundaries and environmental controls

- Add instantaneous inventory injections separately from finite input-rate pulses. Apply events exactly at scheduled times; define whether exported samples at the event time are pre- or post-event values.
- Let parameters or boundary concentrations use a named forcing. Add linear ramps and tabulated time series after the existing step/pulse/seasonal forms. Clearly define interpolation and endpoints.
- Support balanced open-box water budgets; avoid representing an infinite external boundary by an unexplained enormous internal reservoir.
- Later add temperature/light limitation as explicit modifiers with dimensions and validity ranges, rather than unrestricted JavaScript formulas.
- Variable compartment volumes require dV/dt and dC/dt = (dM/dt − C dV/dt)/V. Do not imply that editing a constant volume implements dilution or entrainment dynamically.

### Fourth: coupled currencies, reactions and numerical tools

- Explicit species/tracer identities and elemental composition; budgets per conserved element, not a sum of unlike pool inventories.
- A stoichiometric reaction representation, dM/dt = S r + transport + boundaries. Represent decay as an explicit transformation/sink for the tracked radionuclide rather than physical export. Nuclear parent/daughter accounting requires its own conserved quantities; total activity is not generally conserved.
- Phase-plane plots, nullclines, equilibrium/Jacobian analysis and parameter continuation for advanced nonlinear examples. Do not report a transport-matrix eigenvalue as the stability of a full nonlinear ecosystem.
- Solver diagnostics: minimum step, attempted/rejected steps, positivity failure and possible stiffness. Add per-pool tolerances/scaling before adopting very tiny isotope inventories alongside bulk stocks. A stiff method or justified equilibrium partitioning may eventually be needed for very fast adsorption/desorption; an arbitrary timestep cap is not a scientific substitute.
- Preserve current label-only unit behavior. Dimensional validation of new laws is useful without converting user numbers automatically. Published parameter sets must be inserted in a consistent explicitly chosen unit system. Do not add mol↔g conversion or mandatory molar masses as an incidental change.

## 4. Implementation milestones for Codex

### Milestone 1 — teaching upgrades and low-risk examples

- Add stable preset IDs and source/assumption/objective metadata; migrate legacy presets by known title only as a compatibility fallback. Stop using editable titles as permanent preset identity. Remove hard-coded six-example counts.
- Group the sidebar into Foundations and an expandable Topic library; preserve the current initial Example 01 and existing user models.
- Implement the six example revisions, the water-budget display and context-specific one-/two-box reference diagnostics.
- Add the balanced three-compartment tracer loop and fast/slow organic-matter examples. Include optional short/long run presets; do not automatically rerun huge time horizons when editing.
- Maintain the current concise diagram, optional explanations and synchronized mini-view.

**Done when:** original six models import and behave as before; conservation/reference checkpoints above pass; circulation loop rejects an intentionally unbalanced leg; both new examples include sources, assumptions and original experiment prompts. Existing unit-label and UI tests pass.

### Milestone 2 — rate-law definitions and minimal nonlinear examples

- Create one shared rate-law definition layer for evaluation, parameter schema, dependencies, dimensional labels, endpoint restrictions and equation descriptions. Keep scientific equations and displayed equations consistent.
- Retain adapters for the four existing law types and old JSON files; introduce only the metadata required for new parameters/modifiers. Treat migration as part of the feature.
- Implement quadratic, fixed-capacity saturating and biomass-dependent Monod transfers separately, with explicit unit definitions. Add the nutrient-limited growth example and its closed-system conservation test.
- Implement prescribed carrier-abundance adsorption and its equivalent-first-order regression case.
- Validate modifier/substrate locations, missing dependencies and nonnegative parameters. Ensure rejected numerical steps cannot produce invalid evaluations of nonlinear laws; do not silently clip accepted state inventories.

**Done when:** quadratic removal matches C(t) = C0/(1 + k_2 C0 t); saturating/Monod limiting cases and all closed budgets pass; JSON round-trips retain modifier references; deleting a required modifier yields a useful validation error; large rate contrasts yield a clear numerical diagnostic rather than plausible-looking corrupted curves.

### Milestone 3 — physical boundaries, transformation diagnostics and applied examples

- Add external water inflow/outflow with per-form boundary concentrations and complete water-budget validation. Add a one-compartment flushing example; extend to a nutrient-limited chemostat.
- Add process categories that separate physical boundary exchange from decay/reaction loss. Implement the radionuclide production/decay/scavenging example.
- Add signed boundary relaxation, followed by gas-transfer area/depth parameters with explicit dimensional handling. Implement an inert-gas equilibration example before carbon chemistry.
- Add instantaneous tracer-injection events and required integrated-budget accounting.

**Done when:** balanced inflow/outflow produces analytical flushing; unbalanced fixed-volume cases are blocked; decay and boundary losses are distinct in diagnostics; boundary-relaxation sign and timescale checks pass; injection mass jumps and cumulative boundary accounting close.

### Milestone 4 — model comparison and inverse reasoning

- Add named comparable runs and one-/two-parameter sweeps with transparent parameter snapshots.
- Add synthetic observation points with uncertainty and residual plots. Demonstrate steady-state non-identifiability and how transient measurements add information.
- Only then consider a small bounded fitting tool, with explicit assumptions and no claim that a best fit uniquely establishes a mechanism.

**Done when:** known synthetic parameters can be recovered in an identifiable case; a deliberately underdetermined case reports the limitation; fitted and manual trajectories use the same solver and model representation.

### Milestone 5 — advanced reaction and ecosystem architecture

- Add elemental composition, stoichiometric reactions and per-element budget residuals.
- Implement a single-currency NPZD example before coupled N–P/C/O2 variants. Validate elemental conservation and limiting-substrate behavior.
- Decide separately whether the next scientific target is sediment redox, carbonate chemistry or Stommel feedbacks. Each needs its own reference implementation and acceptance suite; do not bundle all three.

## 5. Suggested first Codex implementation prompt

> Read this roadmap, the original handoff and the implementation record, then inspect repository instructions and the current code. Implement Milestone 1 only. Preserve the buildless local-browser workflow, existing portable model files, label-only units, saved user models and current diagram/graph/mini-view interactions. Add stable preset identities and provenance metadata with a compatibility path for existing models. Improve the current example descriptions and optional diagnostics, add the balanced three-compartment conservative tracer loop and the fast/slow organic-matter example, and remove fixed six-example assumptions. Use the numerical checkpoints and conservation requirements here as acceptance tests. Do not introduce nonlinear laws, unit conversions, external services or deployment in this milestone. Record changes and verification in docs/IMPLEMENTATION.md and report any scientific choices that remain unresolved.

The remaining milestones can each become a separate Codex prompt after the relevant scientific conventions are accepted. Milestone 2 needs an explicit choice of first nonlinear law and its coefficient convention; the proposed defaults above are concentration-based.

## 6. Sources reviewed and intended use

[S1] Scott Doney, MIT Marine Chemistry, Lecture 1, “Determinants of Seawater Composition.” PDF marked Fall 2004, hosted in the Fall 2006 course. Well-mixed budgets, first-order adjustment and turnover-time teaching. [Source](https://ocw.mit.edu/courses/12-742-marine-chemistry-fall-2006/f29ad06348cb69625f4a7011dffa72f4_lec1.pdf)

[S2] National Oceanography Centre, JModels, “Phosphorus model details.” Three state variables, phosphate-limited phytoplankton growth, regeneration and simplifying assumptions. Reviewed page text; equation/parameter images were not transcribed, so no claim of numerical reproduction. [Source](https://projects.noc.ac.uk/jmodels/documentation/phosphorus-model/phosphorus-model-details)

[S3] MIT Paleoceanography (2008), “Introduction to Ocean Carbon System Box Models: The Toggweiler–Sarmiento 3-Box Model.” The handout explicitly identifies its model as an adaptation; includes balanced water flows, nutrient budgets and a system-wide conservation equation replacing a dependent box equation. [Source](https://ocw.mit.edu/courses/12-740-paleoceanography-spring-2008/9c513047c551f0b212e3e2d81e5cf39c_3_box_model.pdf)

[S4] Scott Doney, MIT Marine Chemistry DOM/water-column notes. Multiple DOM reactivity classes, preformed/remineralized components and tracer-age caveats. The resource filename and PDF lecture numbering differ; cite the actual content rather than asserting a consistent lecture number. [Source](https://ocw.mit.edu/courses/12-742-marine-chemistry-fall-2006/2c151f7860e76a19580e89174b42420f_lecture17_18.pdf)

[S5] Scott Doney, MIT Marine Chemistry, Lecture 14, “Primary Production (Continued).” New/regenerated/export production and 234Th removal budgets. [Source](https://ocw.mit.edu/courses/12-742-marine-chemistry-fall-2006/f5fcad0aa61e1c8006b2d244aabc2428_lec14.pdf)

[S6] Stanford chemical oceanography, Lecture 15 radioactive-isotope exercise, especially the two-layer deep-ocean radiocarbon budget. It is an instructional simplification, not a modern observation dataset or a universal ocean-age calculation. [Source](https://ocean.stanford.edu/courses/bomc/chem/lecture_15_qa.pdf)

[S7] Darryn Waugh’s tracer-course notes, “Transport Times in Subpolar North Atlantic Ocean.” Explains broad transit-time distributions and why tracer ages can differ from mean transit times; refers to Waugh et al. (2003). Reviewed the course notes, not every linked paper. [Source](https://ftp.soest.hawaii.edu/kelvin/tracer_course/Transient_tracers_and_age/waugh_lecture_notes/ttd_ocean.html)

[S8] MIT Ecology I, “Population Growth in Chemostats,” Fall 2009. Monod resource limitation, balanced inflow/outflow, dilution rate and washout. Adapt inventories into a common nutrient currency rather than copying cell-count/biomass units into the present model unchanged. [Source](https://ocw.mit.edu/courses/1-018j-ecology-i-the-earth-system-fall-2009/46984021a8ccf3cef0d5f77e4677dfda_MIT1_018JF09_Lec14_chemo.pdf)

[S9] Fasham, Ducklow & McKelvie (1990), “A nitrogen-based model of plankton dynamics in the oceanic mixed layer,” Journal of Marine Research 48, 591–639. Reviewed the authors’ university-hosted abstract and model description. This is a seven-component nitrogen model, not a four-pool template to reproduce without further equation review. [Source](https://elischolar.library.yale.edu/journal_of_marine_research/1981/)

[S10] Ocean Carbon & Biogeochemistry’s overview of Fennel et al. (2022), “Ocean biogeochemical modelling,” Nature Reviews Methods Primers 2, 76. Useful for the progression from one-currency NPZD to multi-currency models and model evaluation. The OCB overview was read; the full Nature article could not be accessed in this review. [Source](https://www.us-ocb.org/bgc-modeling-primer/)

[S11] van Hulten, Dutay & Roy-Barman (2018), “A global scavenging and circulation ocean model of thorium-230 and protactinium-231 with improved particle dynamics (NEMO–ProThorP 0.1),” Geoscientific Model Development 11, 3537–3556. Particle-dependent partitioning, production/decay and physical transport; paper uses fast-equilibrium scavenging assumptions. [Source](https://gmd.copernicus.org/articles/11/3537/2018/)

[S12] Scott Doney, MIT Marine Chemistry gas-exchange notes. Gas-transfer velocity, concentration gradients and mixed-layer budgets. [Source](https://ocw.mit.edu/courses/12-742-marine-chemistry-fall-2006/5cafb7ffbdc9962c602ef05d0e5016fe_lec_11_gas_exch.pdf)

[S13] Wanninkhof (2014), “Relationship between wind speed and gas exchange over the ocean revisited,” Limnology and Oceanography: Methods 12, 351–362. Reviewed publisher abstract; do not adopt a wind-speed parameterization without its units, averaging convention, Schmidt-number dependence and validity range. [Source](https://aslopubs.onlinelibrary.wiley.com/doi/10.4319/lom.2014.12.351)

[S14] MIT Paleoceanography (2008), “Atmospheric CO2 and Ocean Chemistry” lecture slides. Carbon speciation, alkalinity, gas equilibration and biological-pump stoichiometry. [Source](https://ocw.mit.edu/courses/12-740-paleoceanography-spring-2008/c5040d5c3c20372c8f6225d75e95674d_lec10_slide.pdf)

[S15] MIT Marine Chemistry lecture collection: gas exchange, nutrient cycling and early diagenesis. The sediment-diagenesis topic is a candidate extension; its detailed equations were not audited here. [Source](https://ocw.mit.edu/courses/12-742-marine-chemistry-fall-2006/pages/lecture-notes/)

[S16] National Oceanography Centre, JModels, “Nitrogen-phosphorus model details.” Motivation for nutrient-specific budgets and competing phytoplankton types. Equation figures/parameter sets require review before a faithful implementation. [Source](https://projects.noc.ac.uk/jmodels/documentation/nitrogen-phosphorus-model/nitrogen-phosphorus-model-details)

[S17] Markus Meier / Leibniz Institute for Baltic Sea Research, “Buoyancy-driven circulation,” including Stommel’s two-box model. Advanced temperature/salinity feedback and circulation context. [Source](https://iow-lectures.pages.iow.de/climateoftheearth/lecture/06_Buoyancy-driven_circulation.html)

Reimplement diagrams and explanatory text originally. Attribute adaptations and parameter provenance; check source-specific reuse terms before copying figures, code or lengthy passages. None of these sources validates a new parameter set merely because it motivates an example.

[S1]: https://ocw.mit.edu/courses/12-742-marine-chemistry-fall-2006/f29ad06348cb69625f4a7011dffa72f4_lec1.pdf
[S2]: https://projects.noc.ac.uk/jmodels/documentation/phosphorus-model/phosphorus-model-details
[S3]: https://ocw.mit.edu/courses/12-740-paleoceanography-spring-2008/9c513047c551f0b212e3e2d81e5cf39c_3_box_model.pdf
[S4]: https://ocw.mit.edu/courses/12-742-marine-chemistry-fall-2006/2c151f7860e76a19580e89174b42420f_lecture17_18.pdf
[S5]: https://ocw.mit.edu/courses/12-742-marine-chemistry-fall-2006/f5fcad0aa61e1c8006b2d244aabc2428_lec14.pdf
[S6]: https://ocean.stanford.edu/courses/bomc/chem/lecture_15_qa.pdf
[S7]: https://ftp.soest.hawaii.edu/kelvin/tracer_course/Transient_tracers_and_age/waugh_lecture_notes/ttd_ocean.html
[S8]: https://ocw.mit.edu/courses/1-018j-ecology-i-the-earth-system-fall-2009/46984021a8ccf3cef0d5f77e4677dfda_MIT1_018JF09_Lec14_chemo.pdf
[S9]: https://elischolar.library.yale.edu/journal_of_marine_research/1981/
[S10]: https://www.us-ocb.org/bgc-modeling-primer/
[S11]: https://gmd.copernicus.org/articles/11/3537/2018/
[S12]: https://ocw.mit.edu/courses/12-742-marine-chemistry-fall-2006/5cafb7ffbdc9962c602ef05d0e5016fe_lec_11_gas_exch.pdf
[S13]: https://aslopubs.onlinelibrary.wiley.com/doi/10.4319/lom.2014.12.351
[S14]: https://ocw.mit.edu/courses/12-740-paleoceanography-spring-2008/c5040d5c3c20372c8f6225d75e95674d_lec10_slide.pdf
[S15]: https://ocw.mit.edu/courses/12-742-marine-chemistry-fall-2006/pages/lecture-notes/
[S16]: https://projects.noc.ac.uk/jmodels/documentation/nitrogen-phosphorus-model/nitrogen-phosphorus-model-details
[S17]: https://iow-lectures.pages.iow.de/climateoftheearth/lecture/06_Buoyancy-driven_circulation.html
