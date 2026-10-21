# Implementation record

## Plan and assumptions
1. A: Define one canonical inventory schema and six illustrative budgets.
2. B: Verify adaptive integration, analytical one-box reference, and integrated boundary budget.
3. C: Add editable diagram, process inspector, and linked equations/results.
4. D: Add forcing, six presets, comparison, JSON persistence and CSV export.

Local-only, buildless ES modules were selected for small classroom systems: no install, external services, or runtime dependencies. SVG supports readable diagrams and plots. A Web Worker isolates integration. Fixed volumes, mol inventory, m³ volume, year time, one elemental currency per model. No implicit unit conversions. Physical compartments and material pools are separate records. Layout is separate from physics.

## Six budgets and verification
All parameters are illustrative, not ocean calibrations. Every preset is an editable instance of the same model schema.

| Lesson | Budget | Baseline check |
|---|---|---|
| Accumulation | dM/dt = I | M0 + It |
| Adjustment | dM/dt = I − kM | I/k + (M0 − I/k)exp(−kt), zero-k branch |
| Changing supply | dM/dt = I(t) − kM | pulse/step timing, seasonal nonnegative supply |
| Exchange | dM1/dt = −E(C1−C2), dM2/dt = +E(C1−C2) | total conserved; concentrations converge |
| Nutrient cycle | surface → particles → deep → surface; supply and burial | internal P conservation; open budget |
| Scavenging | dissolved ⇄ particles → outside | internal tracer conservation; boundary loss |

## Schema v1
Model: `schemaVersion`, title, question, experiments, `compartments[{id,name,volume}]`, `pools[{id,name,compartment,initial}]`, `processes[{id,name,from,to,law,value,forcing}]`, `layout{poolId:{x,y}}`, `simulation{duration,samples,rtol,atol}`. Null endpoint is the external boundary. Laws: constant (mol/yr), firstOrder (1/yr), exchange and advection (m³/yr). Exchange needs two pools. Advection requires a balanced water budget in each fixed-volume compartment. Other processes move material only. All pools share mol of the selected currency. JSON files include reproducible settings and forcing.

Forcing multiplies a process coefficient: constant; step (factor after start); finite rate pulse (factor within [start,end)); seasonal (1 + amplitude sin(2πt/period)). Pulses are rates, never instantaneous inventory jumps. All forcing factors are nonnegative. Advection forcing is deferred to avoid unbalanced water flows.

## Numerical method
Classical RK4 with step doubling, adaptive error control on the difference divided by 15; accepted state is the two half-step result. Relative/absolute tolerances default 1e-7/1e-9. External net input is integrated as an extra state using exactly the same stages. Steps end at output times and step/pulse boundaries; left limits are used at discontinuity endpoints and right limits at the next interval start. Seasonal steps are capped to period/20. No inventory clipping. Negative accepted inventories cause failure. Work limits and minimum step checks report unsupported or stiff cases. This is a nonstiff solver, not a universal chemical kinetics solver.

## Teaching source
Original exposition and SVG artwork. Mathematical foundation checked against Scott Doney, MIT 12.742 Lecture 1 (PDF marked Fall 2004; course Fall 2006): https://ocw.mit.edu/courses/12-742-marine-chemistry-fall-2006/f29ad06348cb69625f4a7011dffa72f4_lec1.pdf . No source assets or code copied. Other handoff sources are prospective references, not claimed adaptations.

## Deferred work
Advanced equilibrium families/matrix analysis, nonlinear laws, multi-element stoichiometry, stiff solvers, continuation after perturbation, assignment authoring, and public deployment. Playback animates a completed run; it does not pause integration. Prescribed outflow exhaustion fails explicitly. Baselines retain model snapshots and overlay only when pool IDs and units match.

## Milestone status · 21 October 2026
A: specification, schema, numerical method, and six explicit budgets recorded.
B: one-box engine, controls, live equations, analytical overlay, and budget diagnostic implemented; numerical acceptance checks pass.
C: generic graph engine and editor implemented, including dragging boxes/connections, keyboard construction, endpoint dropdowns, process inspection, and diagram/equation linking.
D: six presets, pulse/step/seasonal forcing, local autosave, portable JSON, CSV, text model summary, baseline snapshots, undo/redo, and playback implemented. Initial local increment is ready for browser review; it is not yet a classroom-validated release.

Validation: `node --test` passes 10 tests, including a 48-case one-box parameter grid, closed-system conservation, unequal-volume equilibration, open boundary budgets, donor-concentration advection/water balance, P/tracer conservation, discontinuity timing, seasonal integration, nonnegative-state failure, tolerance convergence, and JSON reproducibility. `node --check src/app.js` passes. The server returned HTTP 200 using a local-only Python HTTP server. The in-app browser initially timed out, then recovered. Desktop screenshot and browser checks verified initial rendering, analytical plotting, equation-to-process selection, keyboard coefficient editing, baseline pinning/overlay, and keyboard construction and integration of a two-box model from blank (reported budget residual zero). Touch, narrow-screen layout, and download/upload round-trips remain unverified. The captured desktop view is `docs/workbench-preview.png`. No deployment or external service registration occurred.

### Next concrete tasks
1. Complete browser workflow checks for pointer/touch dragging and a narrow viewport. Keyboard connection construction, coefficient editing, term selection, and desktop layout have passed initial review. Fix any remaining layout/interaction findings.
2. Exercise actual JSON file download/upload, CSV export, local reload, and undo/redo across pool deletion in the browser. Baseline pinning/overlay passed initial review.
3. Add plot selection linking back to diagram terms, per-pool slope readouts, explicit forcing-function equations, and editable solver settings in an advanced inspector. Currently plots support quantity switching and time scrubbing; solver settings can be changed in model JSON.
4. Improve scientific teaching polish: display each preset’s assumptions/laws in a dedicated lesson view; add explicit equilibrium classification for supported linear systems. General model assumptions and illustrative labels are already shown.

Known interface limits: units are a fixed supported system rather than free-form dimensional algebra; diagrams use a fixed-size viewBox (20-pool engine limit exceeds a comfortable diagram size); no graph pan/zoom or collision routing; playback speed is fixed; imported invalid metadata is rejected. Pinned baselines are session-local and not included in saved model files. The editor can temporarily form an invalid configuration and reports validation errors before simulation. Extreme rates may fail the nonstiff solver rather than complete a run.

## Graph and diagram refinements · 21 October 2026
Added independent logarithmic X/Y controls with base-10 transforms, quantity-specific Y-axis labels, and visible nonpositive-value handling. Zero/negative data are omitted on the applicable log axis, paths break across invalid points, and no-positive-data cases show a message. Values in simulations, readouts and CSV files are unchanged. Analytical and baseline curves use the same transforms. Budget derivatives and introductory ratios use accessible stacked fractions. Diagram arrows now intersect expanded node rectangles using their approach direction; markers use fixed drawing units and remain outside box borders. A Show coefficients checkbox displays the base process coefficient, law symbol, units and g(t) when forced. These are view settings rather than scientific model changes.

Verification: 13 tests pass (10 scientific tests plus log mapping, nonpositive path gaps, and arrow boundary geometry). Browser checks verified both log controls, the changed axis label, coefficient labels and stacked fractions. Screenshot: `docs/graph-controls-preview.png`.

## Volume and exchange labels · 21 October 2026
Added Show volume to label each pool’s compartment volume as V = … m³ beneath the box. Concentration readouts now use [pool ID] = … mol/m³; the inventory readout remains in mol. Shared-compartment pools display the same volume. Symmetric exchange labels now say “Exchange E,” the property field names the exchange coefficient explicitly, and the inspector explains its volume/time units, net concentration-gradient flux, sign convention and fixed-volume interpretation. Budget guidance connects bracketed concentrations to the C[pool] equation notation. Syntax and live browser checks passed, including the volume checkbox, concentration notation, exchange coefficient field, and rendered definition. Screenshot: `docs/volume-exchange-preview.png`.

## Consistent palette · 21 October 2026
Reserved orange for selected processes, including arrowheads, equation-term highlighting, and the selected flux series when plotting fluxes. Reservoirs use a deterministic ten-color palette in pool order (teal, blue, purple, green, magenta, cyan, indigo, olive, plum, slate; repeats after ten). Box borders, light fills, inventory/concentration curves and legend dots share that assignment; selecting a box thickens its border without changing its color. Browser verification in example 04 confirmed Surface teal (#227c75), Deep blue (#426fb0), matching plot curves, and selected Mixing orange (#cd8d3f) with an orange marker. Syntax check passed. Screenshot: `docs/palette-preview.png`.

## Default coefficient equations · 21 October 2026
Show coefficients is now enabled by default. Diagram process labels display the flux law on its own line (F = kM for first-order loss), followed by a separate coefficient value with clear units (k = 0.2 yr⁻¹). Prescribed, exchange, and advective processes likewise display their symbolic flux laws, with g(t) applied to the law for forced coefficients. The current numerical flux remains a separate mol/yr readout. The inspector names first-order removal/transfer rate constants explicitly, defines donor inventory, and gives the 5-year adjustment time for example 02. Adjustment-time language is restricted to the supported one-box constant-coefficient model. All 13 tests and syntax checks passed; browser checks confirmed default visibility, F = kM, yr⁻¹ notation and the named inspector field. Screenshot: `docs/rate-law-preview.png`.

## Readability · 21 October 2026
Raised base UI text to 16 px, most controls/notes to 14–15 px, and supporting labels to 12–14 px. Increased diagram annotations, inventory values, and plot axis text; increased supporting-text contrast. Scientific SVGs retain a minimum readable width with local horizontal scrolling on narrow screens. Medium-width layouts stack the inspector below the diagram and let toolbars wrap. Diagram label placement now searches nearby free space to avoid reservoir boxes and other process labels as the larger text needs more room. Long reservoir names use an ellipsis with the full name retained in the accessible label. Syntax and browser layout checks passed for examples 02 and 04; scientific calculations were unchanged. Screenshot: `docs/readability-preview.png`.

## Named concentration notation · 21 October 2026
Exchange flux annotations now use the actual pool IDs in brackets, e.g. F = E([surface] − [deep]), matching box concentration readouts. Advective annotations likewise use the donor’s bracketed concentration. Displayed budget terms, exchange inspector explanations, and budget guidance use consistent bracket notation; internal model expressions and solver semantics are unchanged. Dynamic labels are HTML-escaped. Syntax and browser checks confirmed example 04’s diagram and inspector text. Screenshot: `docs/exchange-notation-preview.png`.

## Sidebar credits and diagram view controls · 21 October 2026
Removed “Small boxes. Big questions.” Added sidebar-bottom credit to Dan Ohnemus (capecodnative), the repository URL verified from origin (https://github.com/capecodnative/AmericasNextBoxModel), and “Developed with AI assistance from OpenAI Codex.”

Diagram font size is adjustable from 11–20 nominal SVG pixels. Labels, inventories, boxes and arrow intersection geometry scale together; label collision spacing accounts for the selected size. The diagram pane resizes vertically from 260–1000 px using its bottom separator or numeric height input. The separator supports pointer/touch dragging and Up/Down/Home/End keys. The expanded viewport supports moving boxes into added vertical space. Reset view restores 14 px and 350 px. Font/height preferences persist locally in a separate view-settings record; scientific model settings and exported inputs are unchanged.

All 13 existing tests and the syntax check passed. Browser checks confirmed the removed slogan, repository/AI credits, changed font sizes, resized pane, keyboard operation, persistence through reload, and no console errors. Screenshot: `docs/diagram-view-controls-preview.png`.

## Simplified controls · 21 October 2026
Diagram font/height/reset controls now live in a View options disclosure, collapsed by default. The resize handle remains available directly below the diagram. Sidebar heading changed to “A Box Modeling Workbench,” and the bottom “Build a diagram…” slogan was removed. Browser checks confirmed the closed disclosure, revised heading and absent footer. Screenshot: `docs/compact-controls-preview.png`.

## Editable display and variable names · 21 October 2026
Pools now carry optional `variableName` presentation metadata separate from stable `id` and editable `name`. Schema v1 remains compatible: older files without variableName fall back to the existing pool ID. New presets initialize variableName to their previous visible labels; newly created/duplicated reservoirs receive unique editable variable names. Process endpoints, compartment links, layout and numerical state addressing continue to use internal IDs.

The inspector separates Display name (box/legend text) and Variable name (inventory symbol in equations and bracketed concentration labels), with a short explanation. Valid edits update during typing without rebuilding the focused input or rerunning/resetting the trajectory. Run metadata tracks current labels; pinned baseline input snapshots remain intact. Undo groups each focused naming edit. Variable names support Unicode letters/subscripts, digits, underscores and primes (1–24 characters, letter/underscore first); empty, ambiguous and duplicate names show inline validation while preserving the last valid model value. Variable names appear consistently in derivative fractions, process laws, equations, concentration readouts, relevant inspector explanations and exports. In particular a variable Pₛ has inventory Pₛ and concentration [Pₛ]; the generic M prefix is no longer forced onto user symbols.

All 16 tests pass, including new checks for unchanged trajectories/connectivity under renaming, legacy compatibility, JSON round trips, and rejection of duplicate/invalid variable labels. Browser checks verified live Pₛ equations and concentration labels while retaining input focus, independent live display-name/legend edits, duplicate-name feedback, and undo restoring the original example. Test edits were reverted after capturing `docs/editable-names-preview.png`.

## Arrowhead taper · 21 October 2026
Moved SVG marker anchoring from the triangle tip to its midpoint. Flux strokes now terminate inside the arrowhead where it is wider than the thickest selected stroke, eliminating the blunt line protrusion at the tip. Marker tips retain clearance from reservoir borders. Syntax check and browser visual check passed for normal and selected fluxes in example 02. Screenshot: `docs/arrowhead-preview.png`.

## Explicit products · 21 October 2026
Coefficient/flux laws, displayed budget expressions, inspector explanations and text exports use a literal * between factors (e.g. F = k * M, F = E * ([surface] − [deep]), and * g(t) for forcing). Numerical integration is unchanged. All 16 tests pass; browser checks confirmed the updated diagram notation. Screenshot: `docs/explicit-products-preview.png`.

## Full reservoir titles · 21 October 2026
Removed title ellipses. Boxes measure their title text, widen up to a comfortable title width, wrap longer names at word boundaries (splitting overlong single words when necessary), and grow vertically for additional lines. Concentration labels also contribute to minimum width. Inventory/concentration rows and optional volume labels follow the new dimensions. Arrow intersections, process-label obstacles, and pointer/keyboard drag bounds now use the actual box geometry. Scientific model data and saved coordinates are unchanged. All 16 tests pass; browser checks verified full default titles and a live two-line “Dissolved ocean tracer reservoir” title with a taller box and correctly positioned inventory. Temporary test renaming was undone. Screenshot: `docs/wrapped-titles-preview.png`.

## Property description tooltips · 21 October 2026
Moved static property-description paragraphs into mouseover/focus tooltips on property label headers. Display name carries the requested naming explanation; Variable name, inventory, compartment volume, endpoints, process law, coefficient and forcing controls have contextual help. Small ? buttons support touch/click and keyboard focus; Escape and clicking elsewhere dismiss the tooltip. Hidden text descriptions remain associated with inputs for assistive technology. Tooltips use the browser top layer to avoid clipping by the properties panel. Validation errors remain visible inline. Syntax and browser checks confirmed no static note paragraphs in Properties, the Display name explanation, and Escape dismissal. Screenshot: `docs/property-tooltips-preview.png`.

## Parenthesized derivatives · 21 October 2026
Budget fraction numerators now show d(variable), e.g. d(Surface), with dt below. Accessible math labels and the exported text summary use the same notation. Syntax and browser checks passed.

## Capitalized preset variables · 21 October 2026
Examples 04–06 initialize variable names with capital first letters (Surface, Deep, Particles, Dissolved). Stable IDs and existing saved/autosaved model labels are unchanged. Reopening an example loads its updated defaults. All 17 tests pass, including the preset capitalization check.

## Configurable physical units · 21 October 2026
Added Model units controls in the left sidebar. Inventory choices: mol, mmol, µmol, kmol, g, mg, kg. Volume choices: m³, L, mL, km³. Time choices: yr, day, h, s; a year is explicitly defined as 365.25 days. Mass units require a positive user-supplied conserved-tracer molar mass (g/mol), shared by all pools. No element/molecule mass is guessed. Selecting a mass unit first prompts for molar mass; existing values remain in their previous units until it is provided. Changing molar mass preserves molar amounts and converts displayed masses accordingly.

Schema v1 gains optional `displayUnits:{amount,volume,time,molarMass?}`. Canonical model inventories, volumes, rates, forcing times and duration remain in mol, m³ and yr; existing files need no migration. A centralized conversion layer applies dimensionally correct factors to inventories, concentrations, fluxes, k, E/Q, time, inspector entry, diagram labels, equations, analytical references, baseline plots and budgets. Numeric inputs invert the same conversion before updating canonical values. Unit changes do not rerun or reset trajectories. JSON saves include canonical inputs plus the chosen units; CSV and readable summaries export converted values with matching headers. Solver tolerances remain canonical. Opening a preset resets units to its original canonical defaults; saved/autosaved models restore their own unit selection. Undo includes unit changes.

All 21 tests pass, including dimensional-factor/input round trips, g/mg/kg conversion and molar-mass validation, unchanged canonical trajectories, JSON unit persistence, and physically equivalent one-box/forced/exchange solutions when expressed in alternate units. Browser checks confirmed 30 mol → 929.1 g with an illustrative test molar mass of 30.97 g/mol, 10 m³ → 10,000 L, 40 yr → 14,610 day, the transformed rate coefficient, equation budgets and matching plot axes. This test molar mass is not a calibration of the tracer preset. Original canonical units and absence of an assumed molar mass were restored after testing. Screenshot: `docs/unit-controls-preview.png`.

## Inventory prefixes and compact volume choices · 21 October 2026
Replaced the long inventory unit list with separate prefix and base-unit selectors. Prefixes: milli (m), none, kilo (k), mega (M), giga (G), tera (T), peta (P). Base units remain mol or g; all mass prefixes continue to require molar mass. Volume choices are L, m³, km³. All derived values, fluxes, concentrations and exports use the combined prefixed symbol. Schema displayUnits now stores optional `prefix` alongside the base `amount`. Legacy combined amounts (mmol, kmol, mg, kg) normalize without altering physical values. Existing µmol or mL selections remain loadable and get a legacy-only selector entry, rather than silently changing the saved choice. All 22 tests pass, including prefix factors through 10¹⁵ for both mass and molar inventories. Browser check confirmed the selector lists and live Mmol labels; the prior inventory prefix was restored after testing. Screenshot: `docs/inventory-prefix-preview.png`.

## Compact reservoir padding · 21 October 2026
Reservoir widths now use visible title, inventory and concentration text plus 12 nominal drawing pixels per side (scales with the diagram font). Removed the large 152-pixel minimum and the placeholder concentration-width reservation; retained a small 96-pixel minimum for very short labels. Full title wrapping and dimension-aware arrow endpoints remain intact. Browser measurement on the current one-box example showed width reduced from about 172 to 121 rendered pixels for a 93-pixel label. Syntax and browser checks passed. Screenshot: `docs/compact-box-padding-preview.png`.

## Rounded linear graph ticks · 21 October 2026
Linear axes now round their bounds outward to readable 1/2/2.5/5/10 step sizes rather than taking exact quarters of the trajectory range. A near-equilibrium maximum of 19.996 yields 0, 5, 10, 15, 20 instead of 4.999 and 9.998. Decimal and signed ranges are supported, and values remain inside the plotted domain. Logarithmic scaling is unchanged. All 23 tests pass, including new near-equilibrium, small-value and signed-range checks. Browser preview was unavailable in the previous tab session; numerical view tests verify the tick labels.

## Sidebar credit organization · 21 October 2026
Removed the unit summary and “Illustrative parameters” from Inside this lab. Its scientific assumptions remain. Added a Credits heading, labeled Dan Ohnemus with “Created by,” and moved Methods & teaching sources into Credits alongside the repository and AI attribution. Removed the obsolete unit-summary DOM update to avoid a startup error. Syntax and browser checks passed. Screenshot: `docs/sidebar-credits-preview.png`.

## Opposing two-box preset layouts · 21 October 2026
Examples 04 and 06 now place their boxes at x = 120 and 640 on the same y = 170 row, spreading the diagram toward the left/right sides while keeping boundary labels visible. Reduced the SVG minimum width to 640 px so both ends fit medium-width panes more readily. Existing saved coordinates remain unchanged; reopening either preset loads its revised arrangement. Versioned the preset-data import so previously cached definitions refresh. Syntax and browser checks confirmed both preset coordinates and the visible example 06 layout. Screenshot: `docs/two-box-layout-preview.png`.

## Mirrored reciprocal fluxes · 21 October 2026
Opposing directed transfers now receive equal curvature on opposite sides instead of making the first line straight and only the reverse line curved. Label groups use matching outward offsets from each curve’s midpoint and remain centered between the boxes, with collision fallback for crowded custom layouts. Browser checks of example 06 confirmed matching adsorption/desorption path geometry reflected across the reservoir centerline and aligned label x positions. Syntax check passed. Screenshot: `docs/mirrored-fluxes-preview.png`.

## Inventory label selection instead of molar-mass conversion · 21 October 2026
Per revised teaching behavior, mol/g now selects the inventory currency label without converting numeric values. Switching 30 mol to g displays 30 g, and derived concentration/flux units relabel consistently. This reinterprets the model’s inventory unit; it is not a chemical mol-to-mass conversion. Removed the molar-mass control, requirements, prompts and text export line. Old molarMass metadata is ignored by unit normalization; stored inventories and rates are not rescaled. Prefix changes continue to apply numeric factors, as do volume and time changes. Storage uses unprefixed inventory units with the chosen mol/g label, m³ and years. This supersedes the earlier molar-mass-based conversion behavior.

All 23 tests pass, including exact mol/g factor equality, unchanged trajectories, legacy metadata being ignored, and mass prefixes. Browser checks confirmed 30 mol → 30 g and 2 mol → 2 g without a constant, matching concentration labels, and a successful run with zero budget residual. Screenshot: `docs/inventory-label-units-preview.png`.

## All unit selectors are label-only · 21 October 2026
Extended the revised inventory-label behavior to inventory prefixes, volume and time. Every selector now reinterprets the units attached to the model’s existing numbers; none rescales inventories, volumes, coefficients, forcing times, duration, outputs or tolerances. Derived labels remain dimensionally consistent: selecting kg, L, day gives kg/L concentrations, kg/day fluxes, day⁻¹ first-order coefficients and L/day exchange/transport coefficients. For example, k = 0.2 stays 0.2 and means day⁻¹ after choosing days. This changes the physical interpretation rather than converting the same physical setup. Sidebar help and README state that distinction. Storage and exports use the selected model units; previously saved numeric values are retained but old conversion-oriented unit metadata follows the new label-only semantics. This supersedes all earlier numeric prefix/volume/time conversion behavior.

All 23 tests pass, including label-only behavior for every derived dimension and prefix, unchanged numeric trajectories, forcing/settings preservation and saved unit choices. Browser verification confirmed 30 kg and 2 kg, concentrations 3 and 0.2 kg/L, unchanged coefficients 0.15/0.3/0.1 day⁻¹, and unchanged duration 40 day. Prior unit selections were restored after testing. Screenshot: `docs/all-units-label-only-preview.png`.

## External flux drawing and particulate dust input · 21 October 2026
Example 06 now sends dust deposition to the particulate pool. Renamed the drawing action to “+ Flux.” While active, all four diagram margins become highlighted external-boundary targets. Click or drag from a boundary to a reservoir for a constant external input, from a reservoir to a boundary for a first-order external loss, or between reservoirs for a first-order transfer. Enter/Space selects endpoints; Escape cancels from the diagram. Boundary-to-boundary and self transfers are rejected. External anchor coordinates are saved in `layout[process.id]`, separate from scientific endpoints, and survive save/load and undo/redo. Existing external processes retain their automatic positioning unless drawn with an explicit boundary anchor. Preset changes apply when reopening example 06; saved custom models are preserved.

All 26 tests pass, including drawn-process budget closure, invalid connections and dust recipient. Browser checks verified click-created external inputs, keyboard-created external losses, dragging a reservoir to the bottom boundary, and visible edge cues. Kept instruction text stable during endpoint selection to prevent layout movement mid-drag. Screenshot: `docs/boundary-flux-preview.png`.

## First-visit default · 21 October 2026
A browser without a saved model now opens Example 01, Constant accumulation. Valid browser-saved models still take precedence. Confirmed the initial pool selection matches Example 01 and the application passes its syntax check.
