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

## Dedicated flux response graph and interactive legends · 21 October 2026
The response section now always displays two graphs: reservoir inventory/concentration, and process fluxes. Both use the same run, scrubbed time and pinned baseline, with independent logarithmic-axis controls. Removed flux from the reservoir quantity dropdown. Each color/value legend entry is an accessible toggle button, supporting click, Enter and Space. Hidden curves also hide corresponding pinned baselines and analytical references, and are excluded from autoscaling. The all-hidden state explains how to restore curves. Visibility persists across runs, scrubbing, unit changes and inventory/concentration selection; opening a preset, blank model or model file resets all curves to visible. Visibility affects only presentation, not solver values or exports.

All 26 existing tests pass and syntax checks pass. Browser checks verified all six example 06 curves initially visible across the two graphs, independent pool/flux toggles, keyboard restoration, an empty all-hidden graph without baseline paths, independent logarithmic Y controls, concentration selection, and updated flux legend values at the final scrubbed time. Screenshot: `docs/dual-response-preview.png`.

## Triangular nutrient layout and movable external endpoints · 21 October 2026
Example 05 now follows the user's arranged diagram: surface phosphate and organic phosphorus across the top, deep phosphate beneath. Opening a model expands the diagram pane as needed to fit its reservoir coordinates; subsequent manual resizing remains available. Default external inputs originate above their reservoir and external losses end directly beneath it, including burial in 05 and sinking export in 06. Explicit saved external coordinates still take precedence.

External processes expose small open circular endpoint handles. Dragging a handle, or focusing it and using arrow keys, updates only diagram coordinates. Changes autosave, support undo/redo, and preserve scientific connectivity and trajectories. Handles remain open so sink arrowheads stay visible; label placement avoids handles and places long exchange labels first to reduce collisions in the triangular layout. Existing custom layouts remain intact until reopening a preset.

All 26 tests pass. Syntax check passed. Browser checks confirmed the 05 preset coordinates, vertical output paths for 05 and 06, input/output keyboard movement, endpoint dragging, undo, and persistence after reload. Screenshot: `docs/external-endpoints-preview.png`.

## Wider nutrient preset arrangement · 21 October 2026
Updated Example 05 to match the user's revised arrangement: surface phosphate at (130,180), organic phosphorus at (620,180), deep phosphate at (350,425), river input above the surface box at (130,14), and burial extending downward at (620,510). Initial pane fitting now includes explicitly positioned external endpoints so the longer burial arrow remains visible. Syntax and browser checks confirmed the preset loads these positions with readable labels. Screenshot: `docs/nutrient-layout-preview.png`.

## External labels stay beside their arrows · 21 October 2026
External input/output label placement now first tries positions immediately beside the process shaft, on either side and at several locations along the line, before considering the general collision-avoidance positions. The preferred side faces available canvas space; placement accounts for label dimensions and endpoint handles. Labels recompute as endpoints move. Browser checks confirmed closer labels in examples 01, 05 and 06 and that a moved export endpoint brings its label with it. Syntax check passed. Screenshot: `docs/close-external-labels-preview.png`.

## Custom models in the sidebar · 21 October 2026
“Build your own model” now creates a distinct entry under “Your models,” with an editable overall title at the top of the workbench. New entries receive stable workspace IDs; identical titles do not confuse selection or preset highlighting. Title edits update the sidebar live and preserve the current simulation. Custom model snapshots persist in browser storage (`anbm-custom-models`); all existing autosave paths update the active entry. Switching entries or examples first saves the active model. Reload restores both the library and current selection. A custom-only “Remove model” action supports Undo/Redo through workspace snapshots, including sidebar contents. JSON export includes the workspace ID as metadata; importing now assigns a fresh ID as described below.

All 26 tests pass; syntax and browser checks passed. Verified multiple independent entries, live naming, a committed numeric inventory edit surviving model switching and reload, and removal/undo/redo. Removed temporary verification entries and left a fresh “Untitled model.” Screenshot: `docs/custom-models-preview.png`.

## Open model creates a new entry · 21 October 2026
Opening a valid JSON file now adds and selects a new “Your models” entry with a fresh workspace ID. Existing custom models are saved before switching and are never overwritten by matching imported IDs or names. Reopening the same file creates another independent entry. Invalid imports still leave the current workspace unchanged. Browser verification imported the same JSON twice, confirmed three independent entries including the original, then removed the two temporary imports and restored the original selection. Syntax check passed. Screenshot: `docs/import-new-entry-preview.png`.

## Valid laws for external inputs · 21 October 2026
The Properties law selector now follows endpoint requirements: external inputs offer only prescribed flux; external sinks offer prescribed flux or first-order loss; internal transfers retain all supported laws. Changing endpoints to make the current law inapplicable switches to prescribed flux and resets its coefficient to 1 in inventory/time units, avoiding reuse of a coefficient with different dimensions. External-input help explains the absence of a modeled donor inventory and retains time-dependent coefficient forcing. The scientific validator already rejects first-order sources; it remains the final guard for saved files.

All 27 tests pass. Browser checks confirmed source/sink law options and conversion of an internal first-order transfer into a prescribed external input when its donor becomes the boundary. Screenshot: `docs/boundary-laws-preview.png`.

## Reset and Save As for guided examples · 21 October 2026
Guided explorations now show “Reset Example” and “Save As…”. Reset enables when model data differ from the original preset, including diagram movement, endpoint positions, names, coefficients, units and structural changes. It restores the full preset and resets curve visibility; Undo restores the edited state. Save As creates an independent custom model with the current configuration and a unique “copy” title, then focuses its editable title. Returning to the guided example loads the original; the copy remains under Your models. Custom models retain their existing controls.

Syntax and browser checks passed: a moved reservoir enabled Reset; resetting restored its original position; Undo recovered the move; Save As preserved that move in a separate custom entry; switching between preset and copy confirmed independent positions. Removed the temporary verification copy. Screenshot: `docs/example-actions-preview.png`.

## Model actions in dropdown menus · 21 October 2026
Moved Open Model, Save Model and Remove Model into caret dropdowns beside Your Models in the sidebar and Your Model above the active custom model title. The sidebar menu remains available even with no custom entries and can export the active guided example. Removal appears only for a selected custom model. Removed the old header file buttons and title-row removal button, and constrained the title/action layout with a narrow-screen wrap so titles no longer collide with controls. Both menus share the same import/export/removal handlers, close after an action or an outside click, and support native keyboard navigation plus Escape. Opening one closes the other.

Syntax and browser checks passed. Verified title/control bounding boxes do not overlap for a long custom title, Escape dismissal, Save Model dismissal, Remove Model, and Open Model through the sidebar file picker. Removed temporary verification entries and restored the previously selected custom copy. Screenshot: `docs/model-actions-menu-preview.png`.

## Graph scrubbing and stable playback slider · 21 October 2026
Clicking or dragging inside either response graph now selects the nearest available simulation sample at that horizontal position, pauses playback, and updates both graphs, legends, diagnostics and the model diagram. Scrubbing uses the same displayed time scale as the graph, including independent logarithmic X scales and pinned-baseline domains. Zero-time samples remain excluded on log axes. Pointer capture supports dragging beyond the chart boundary with clamping to the available samples.

The Time slider now occupies its own full-width control row, with the numeric time readout below it. Its grid column is independent of readout length and uses tabular numerals. Browser checks measured an identical 683.23px slider width at 0, 46.25 and 100 yr, verified clicks on both graphs, logarithmic scrubbing, dragging to 75.75 yr and pausing active playback when scrubbing. All 28 tests pass, including linear/log nearest-sample selection and edge cases. Screenshot: `docs/graph-scrubbing-preview.png`.

## Drawable shared-volume compartments and transport exclusions · 21 October 2026
Added + Compartment: draw an enclosure around two or more reservoir centers, or select members with Space/click and press Enter. The lightly tinted enclosure follows its member boxes and can be moved as a group by dragging or arrow keys. Compartments have one editable Volume and no inventory. Grouping preserves member inventories and starts with the first member's existing volume (it does not sum volumes); editing this shared volume changes all member concentrations. Reservoir properties show the shared-volume relationship and allow leaving a compartment, retaining its previous volume and inventory. New reservoirs receive their own compartment and are placed outside existing groups where space permits. Existing shared compartments in examples 05/06 are now visible.

Reservoirs have an Exclude from Mixing+Advection checkbox and an exclusion marker in the diagram. Particle reservoirs default excluded; explicit choices override the default. Legacy defaults are normalized once on load so later renaming cannot change transport behavior. Exclusion affects volume-based laws only; prescribed and first-order material transfers remain available.

Per the user's choice, each mixing/advection connection carries all included forms between two distinct physical compartments. Water-flow arrows attach to compartment boundaries and their endpoint controls identify compartments. Drawing a flux from a compartment creates a mixing connection; select advection in Flux properties when desired. A singleton reservoir acts as its own physical compartment. If each side has one included form it is paired automatically; when multiple forms are included, Flux properties requires explicit one-to-one source/recipient pairing with equal included counts, preventing silent interconversion. One E or Q applies to every paired form. Each form receives its own conservative budget contribution; the diagram/flux graph show their summed tracer flux. Advective water transport is counted once per connection, not once per form, and still requires balanced water flow. Intra-compartment volume transport is rejected, closing the CheckExample loophole.

Added optional `grouped` metadata to compartments, `excludeFromTransport` to pools and `transportPairs` to volume-based processes. Saved/imported structurally valid drafts can retain transport errors for editing; strict validation still blocks simulation until corrected. This preserves CheckExample and flags its existing Uptake advection instead of dropping the saved model. No scientific settings in that user model were changed; its 20 m³ shared volume remains intact.

All 35 tests pass, including grouping/detaching, multi-form mixing and balanced advection, exclusion defaults/overrides, per-form conservation, explicit pairing requirements, and intra-compartment rejection. Browser checks covered manual enclosure drawing, shared volume changes reflected in both concentrations, reload persistence, a compartment-to-reservoir mixing connection with particle budget unchanged, explicit pairing of two transported forms, exclusion mismatch warnings, leaving/undo, and group keyboard movement. Removed temporary verification models and restored CheckExample. Screenshot: `docs/compartments-preview.png`.

## Resizable boxes, exclusion tooltip and contacting arrows · 21 October 2026
The excluded-reservoir symbol now exposes the exact hover tooltip “This reservoir is excluded from volume-based exchanges (mixing and advection)” and accepts pointer events despite the surrounding diagram text being non-interactive. Reservoir and compartment boxes have lower-right resize handles, supporting pointer dragging and arrow-key width/height adjustments. Reservoir dimensions retain room for inventory/concentration text and wrap titles; compartment dimensions cannot shrink below their enclosed members. Resizing a reservoir anchors its upper-left corner. Compartments expand with resized members and can also be enlarged independently. Dimensions are stored separately as optional `diagramSizes.pools` and `diagramSizes.compartments` metadata, avoiding collisions between shared compartment/pool IDs. Undo/Redo, Reset Example and saved-model persistence include these dimensions. No scientific values change during resizing.

Flux geometry now intersects the actual rounded box border. Source shafts start on that border; arrowheads at receiving boxes and either end of symmetric exchange use an exact six-unit marker offset along the local ray, so tips meet the border. Curved connections iterate control/contact geometry to keep the tangent and marker alignment consistent after resizing. This replaces the former visible nine-unit source clearance.

All 37 tests pass, including rounded source contact, exact marker offset in diagonal directions, size validation/round-trip and unchanged scientific trajectories. Browser checks verified the tooltip string, reservoir/compartment keyboard and drag resizing, Undo/Redo, persistence after reload and arrows meeting resized box borders. Reset the temporary guided-example geometry and restored CheckExample. Screenshot: `docs/resizable-boxes-preview.png`.

## Adjustable volume-flux attachments and selected-only handles · 21 October 2026
Mixing and advection connections now expose independently adjustable source/receiving attachments. Select the flux, then drag its circular handles around the reservoir/compartment borders or use arrow keys. Attachments remain on the visible rounded border and are stored as normalized positions in optional `diagramPorts[process.id].from/to` metadata, so they follow box movement and resizing. Manual attachments use cubic curves with outward-facing control points and marker offsets that keep the arrow tips against the selected borders. Double-click a handle to restore automatic placement for that end. Edits autosave, support Undo/Redo and preserve scientific values.

Per the follow-up request, all flux endpoint handles—including external input/output handles—are invisible unless their particular flux is selected. Box resize controls remain separate. Compartment name/volume labels now try clear positions along the top/header, above the frame or near its lower edge. Placement avoids reservoirs, sampled arrow geometry, flux-label blocks and other compartment labels; crowded diagrams use the candidate with the least overlap.

All 40 tests pass, covering normalized attachment geometry, movement/resizing, metadata validation and unchanged simulation results, plus label collision choices. Browser checks confirmed manual port changes on mixing/advection, Undo/Redo and persistence, per-end reset to automatic placement, no handles with a reservoir selected, exactly two on a selected mixing flux, and one external handle only when its input is selected. The compartment label shifted away from the river arrow in the example 05 view. Screenshot: `docs/selected-flux-handles-preview.png`.

## Blank-space deselection and creation-button cues · 21 October 2026
Clicking blank SVG diagram space clears the current selection, inspector and handle overlays. Pointer-down tracking distinguishes a true blank-space click from the SVG-retargeted click following an object drag, so finishing a drag does not deselect the object. Reservoir/compartment resize handles now appear only for the selected box, just as flux endpoints appear only for the selected flux. Opening or resetting a model starts with no object selected; creating a reservoir/compartment/flux still selects the newly created item.

Creation buttons now include small SVG symbols below their labels: arrow for Flux, solid box for Reservoir, dashed enclosure for Compartment. Compartment is the rightmost button, with a dashed button border as an additional cue. Icons are hidden from the accessibility name and do not intercept pointer events.

Syntax and browser checks passed: no handles initially, exactly one resize handle on a selected reservoir/compartment, only the selected flux's endpoint handles when a flux is selected, and zero handles plus an empty Properties state after a blank-space click. Verified button order Flux → Reservoir → Compartment and inspected the visual symbols. Screenshot: `docs/selection-controls-preview.png`.

## Persistent external endpoint circles · 21 October 2026
Restored always-visible circles at external source/sink ends, independent of selection. Their drag behavior and selection highlighting remain intact. Internal mixing/advection attachment handles and box resize handles remain selection-only. Browser verification showed both external circles in example 05 with zero resize/internal attachment handles after reload and no selection. Syntax check passed. Screenshot: `docs/external-circles-preview.png`.

## Separate routes and compact labels for shared-endpoint fluxes · 21 October 2026
Fluxes sharing the same visible source/recipient boxes now receive distinct physical lanes in model order, independent of their direction: the first two occupy opposing curves, the third follows the centerline, and additional connections fan outward. Adding the third connection preserves the first two lanes. Routing keys use the rendered compartment boundary for volume-based laws and reservoir boxes for material transfers. Explicitly moved volume-flux attachments remain respected.

Labels now use measured text widths instead of character-count estimates. Shared-endpoint label candidates follow sampled points on their own quadratic/cubic curve, use a small edge-to-label gap, and try sliding along the preferred side before switching sides. The center connection can use a centered label block. Placement chooses nearby candidates with minimal overlap rather than jumping to distant global positions. Removed blanket reservation of the entire compartment header strip: its label already relocates around flux labels and arrows, so the empty strip is available for clear flux labels. This prevents common configurations from pushing upper-curve labels onto an inner curve or far away.

All 41 tests pass, including direction-independent separation, stable first/second lanes, centerline routing for the third flux, and unique lanes for five connections. Browser verification temporarily duplicated Adsorption in example 06, confirmed three different paths with the third straight through y=170, and visually checked compact, nonoverlapping label blocks on the upper/middle/lower routes. Removed the temporary duplicate and retained the original four processes. Screenshot: `docs/parallel-fluxes-preview.png`.

### Example setup summaries and graph emphasis

Example 05 now defaults to the approved arrangement: surface phosphate and organic phosphorus across the top, deep phosphate below at (255, 436), with the mixing source attached near the lower-left of the surface compartment. Existing saved user models retain their layouts. All six guided examples use simple setup summaries under “Model setup” in place of “Predict first” prompts; older saved guided examples also display the updated summaries.

Reservoir and flux legend buttons now cycle normal → highlighted → hidden → normal. Highlighted trajectories draw last at increased width, dimming other curves in that graph; multiple curves can be highlighted together. Baselines and analytical references follow the corresponding curve’s emphasis and visibility. Hidden curves remain excluded from autoscaling. Buttons expose their state and next action to assistive technology. Opening a model resets the legend states.

Inventory prefix/base-unit dropdowns share a fixed height and bottom alignment even when their labels wrap. The primary brand title is enlarged to 22 px (19 px on small screens). Verified both graph cycles in the browser, exact dropdown alignment, the Example 05 default, and the enlarged title; all 41 tests and the app syntax check pass. Screenshot: `docs/model-setup-legend-preview.png`.

### Floating diagram preview (22 October 2026)

Scrolling past the main diagram panel shows a read-only floating diagram with Small/Medium/Large controls. Hide collapses it to a Show diagram button; returning to the main editor hides both automatically. The header supports pointer dragging and keyboard arrow movement, constrained to the viewport. The preview fits the rendered diagram contents and limits its height on smaller screens.

The preview mirrors current inventories, concentrations, flux values, selected budget terms and selected diagram objects. Highlighted graph reservoirs receive thicker borders, and highlighted graph fluxes receive the selected-flux treatment. A source SVG mutation observer keeps playback, scrubbing and edits synchronized; legend clicks also refresh emphasis. Cloned marker IDs are namespaced, and editing handles and duplicate keyboard targets are removed. Preview changes do not affect the model or saved diagram layout.

Browser checks verified automatic appearance/disappearance across the editor boundary, all three sizes, hiding/restoring, keyboard movement, matching budget/curve emphasis and updated values at the final time sample. All 41 tests and JS syntax checks pass. Screenshot: `docs/floating-diagram-preview.png`.

### Selectable, minimized diagram preview

The floating diagram’s Minimize button leaves a prominent fixed lower-right Show diagram button. This restore control remains available after scrolling back to the editor, and explicitly restoring the preview opens it even alongside the main diagram. Automatic visibility still applies during ordinary scrolling.

Miniature reservoirs, fluxes, compartments and boundary circles now support click and Enter/Space selection through the editor’s existing selection handler. Properties, diagram selection and budget terms stay synchronized without moving or resizing the model. Keyboard focus is restored after the live SVG refresh. Resize/port editing handles remain exclusive to the main diagram. Browser checks verified minimized restoration both below and beside the editor, mouse selection of fluxes, keyboard reservoir/compartment selection, matching budget terms and retained focus. JS syntax checks pass. Screenshot: `docs/selectable-mini-preview.png`.

### Linked diagram and graph selection

Reservoir/flux selection in the main or floating diagram temporarily highlights its graph curve. Selection overlays legend choices without mutating them: a hidden selected curve is temporarily shown, other highlights in the same graph are temporarily suppressed, and deselection or switching to another object restores the previous presentation. Explicit legend clicks continue the normal highlight/hide/restore cycle, clearing the matching diagram selection when necessary.

Both graphs now include wider transparent curve hit targets, with Enter/Space keyboard activation. Clicking a trajectory selects the matching reservoir/flux and highlights it across diagram, mini-view, budget and graph. Pointer clicks and drags retain existing time scrubbing. Selected curves draw last, including their hit targets.

All 42 tests pass, including a regression for restoring hidden/highlighted legend choices after temporary selection. Browser checks verified temporary revelation of a hidden reservoir, restoration of its hidden state and an earlier different highlight on deselection, keyboard curve selection, and pointer selection of Mixing while scrubbing to 10 years. Screenshot: `docs/linked-curve-selection-preview.png`.

Flux groups in the main and miniature diagrams no longer draw browser focus rectangles around their SVG bounds. Orange arrow selection remains the visual indication; fluxes retain keyboard focus and activation.

Main and floating diagram controls now use the same labels, “Show coefficients” and “Show volumes.” Each pair of checkboxes stays synchronized; changing either copy redraws both diagrams. Browser checks verified coefficient labels disappear in both views, volume labels appear in both views, and main-to-mini synchronization. App syntax check passed. Screenshot: `docs/synced-diagram-options-preview.png`.

The mini-view display checkboxes are now inside a Display dropdown aligned to the right of the Small/Medium/Large button row, removing their separate row. The synchronized main-diagram controls remain available.

### Manual mini-view sizing

The floating diagram has a bottom-right resize grip supporting pointer dragging and keyboard arrows (20 px steps). Width and height can be set independently; the SVG scales proportionally within the resulting window. Custom dimensions stay within the viewport, with a 280 × 180 px minimum where space allows. Size presets clear custom dimensions and restore automatic proportions. Browser checks verified dragging from 420 × 389 to 320 × 329, keyboard expansion to 340 × 349, and Large resetting width to 600 px. JS syntax check passed. Screenshot: `docs/resizable-mini-preview.png`.

### Immediate mini-view updates on model changes

The main diagram now refreshes the miniature synchronously after each render. Removed the deferred SVG mutation observer and the visibility guard that skipped hidden/minimized refreshes, preventing old model snapshots from persisting during sidebar navigation. Live playback and selection use the same render path. Browser checks verified Example 01 while minimized, switching to Example 06 with matching reservoirs/fluxes in both diagrams, opening a saved nutrient-cycle model, and returning to Example 05. All 42 tests and JS syntax checks pass. Screenshot: `docs/mini-model-switch-preview.png`.

### Resizable sidebar

Added a right-edge separator with pointer capture, Left/Right resizing, Home/End limits and Enter/double-click reset. Width is stored locally and clamped between 180 px and the smaller of 460 px or 40% of the viewport. Window resizing reapplies the stored preference within those bounds. Below 701 px the separator is hidden and the existing stacked layout remains. Browser checks verified dragging to 340 px, retaining that width after reload, keyboard expansion to 350 px, reset to 255 px and a final drag to 320 px. JS syntax check passed. Screenshot: `docs/resizable-sidebar-preview.png`.

### Floating-window viewport containment

Mini-view positioning now uses the visible viewport (including zoom/pan offsets and scrollbar-aware width), with an 8 px inset. Bounds are reapplied synchronously on diagram refresh, when window dimensions change, and on viewport resize/pan, rather than only during manual movement. All size modes support height limits and shrinking diagram content within the available space. This prevents model changes or later content growth from pushing a previously placed preview offscreen.

Added regression coverage for all four edges, content growth and offset viewports; all 44 tests pass. Browser checks dragged the preview beyond the upper-left and lower-right bounds and enlarged it at the lower-right edge; the complete window remained within the visible viewport. Screenshot: `docs/mini-viewport-bounds-preview.png`.

### Response layout and linked time axes (23 October 2026)

Both logarithmic X-axis checkboxes now update together; logarithmic Y-axis controls stay independent. Moved the Inventory/Concentration selector into the Reservoirs heading row and removed Export Summary and its unused click handler. JSON model saves and CSV exports remain available.

Added a left-edge separator for the entire response panel. Dragging right creates a left inset, keeping the panel’s right edge fixed and scaling both SVG graphs to their available width without horizontal graph scrolling. Keyboard Left/Right changes the inset; Home/Enter or double-click resets it; End reserves the maximum space while retaining at least 480 px for the panel. The inset persists locally, adapts to sidebar/window resizing, and is disabled in the stacked mobile layout.

Browser checks verified X-axis synchronization in both directions, concentration selection in the Reservoirs section, absence of the summary button, pointer resizing to a 330 px inset, keyboard expansion to 340 px, persistence after reload, and a floating diagram placed entirely to the left of the graphs. All 44 tests and JS syntax checks pass. Screenshot: `docs/response-layout-preview.png`.
