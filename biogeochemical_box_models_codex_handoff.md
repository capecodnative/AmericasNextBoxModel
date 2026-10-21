# Biogeochemical Box Models — Codex Project Handoff

Prepared 21 October 2026. This is a curated project context and implementation brief, not a verbatim conversation transcript. No application has been built yet.

## 1. Starter prompt for the building agent

You are helping me build an interactive educational website about biogeochemical box models, their dynamics, and their mathematics. Treat this document as the project context. Read any repository instructions and inspect the existing project before changing it. If starting from an empty workspace, choose a maintainable architecture appropriate for a browser-based scientific teaching application and document the choice.

Build a functioning modeling workbench, with guided examples that use the same model representation and solver as user-created models. Users must be able to place reservoirs, draw connections, assign process laws and parameters, see automatically generated equations, run simulations, and explore linked plots. Scientific correctness and the connection between diagrams, equations, and behavior are central requirements.

Start by producing a concise implementation plan and recording key assumptions. Then implement a working vertical slice: an editable one-box model with a constant source and first-order loss, live equations, numerical integration, an analytical reference curve, adjustable initial inventory and parameters, and a mass-budget diagnostic. Continue through the staged first-release scope below. Do not stop after a static mockup or a plan. Work in small verifiable increments and keep the application usable as features are added.

Use reasonable defaults for reversible implementation decisions. Ask focused questions when a decision materially changes scientific scope or intended teaching behavior. Do not require repeated approval of routine choices. At each meaningful milestone, report what works, how it was verified, and any limitations. If the entire first release cannot be completed in the available session, finish and document a coherent runnable increment, with precise remaining tasks.

Keep an implementation record in the repository, including setup instructions, model schema, numerical methods, teaching sources, tests, and known limitations. Preserve this handoff as project context. Do not deploy publicly or add external services merely because the app is ready; deployment environment and public access are not yet specified.

## 2. User request and agreement

Original request:

> I’d like to create and interactive website for teaching about biogeochemical box models, their dynamics, and their corresponding mathematics. The website would be fully interactive and can solve for solutions based on user-drawn configurations, but it would also have some pre-configured setups demonstrating increasingly complex behaviors (for teaching and examples of how-to-use). Before building, let’s consider available teaching materials online (from lectures, pdfs) and scope out the work plan.

Follow-up after reviewing the proposed scope:

> Sounds great. Let's write a prompt and/or conversation archive/context for Codex, as I'd like to work with an agent there for building the site

The user is a university chemical oceanographer teaching oceanography and global biogeochemical cycles. Suitable scientific examples include nutrient cycling, export and remineralization, dust deposition, dissolved–particulate exchange, scavenging, and radioactive tracers. This background should inform examples without narrowing the application to a single element.

The user endorsed the overall proposed direction. The detailed architecture, exact lesson count, interface, and technical stack remain recommendations to implement and refine, rather than separately approved design decisions.

## 3. Product purpose and teaching approach

Create an interactive modeling workbench with a guided teaching sequence. Students should understand how a physical or biogeochemical description becomes a budget, how that budget becomes an equation, and why its solution behaves as it does.

Working audience assumption: upper-level undergraduates, with optional graduate-level mathematical detail. Do not assume familiarity with matrix algebra on entry. Make advanced mathematics available progressively.

The defining interaction is bidirectional linking among:

1. A model diagram.
2. Its governing equations.
3. Simulated inventories, concentrations, and process fluxes.

Selecting an arrow highlights its contributions to the equations. Selecting an equation term highlights the process on the diagram. Scrubbing simulation time updates the diagram and numerical flux/inventory readouts. Use labels and highlighting as well as color.

The examples must be editable instances of the same workbench, not separate hard-coded demonstrations. Learners should be able to open a preset, understand it, change its structure, and save their own model.

Interpret “user-drawn” initially as placing boxes and dragging connections, with touch support and accessible alternatives. Handwriting/sketch recognition is outside the initial scope.

## 4. Teaching materials identified in the scoping conversation

These links were retrieved during the preceding research conversation. They are teaching references, not specifications whose every equation or claim should be accepted without checking. Reopen the relevant source before implementing a faithful adaptation. Write original explanatory text and diagrams, attribute model origins, and check reuse terms before copying source assets or code.

### A. MIT Marine Chemistry: Scott Doney introductory lecture

- PDF: https://ocw.mit.edu/courses/12-742-marine-chemistry-fall-2006/f29ad06348cb69625f4a7011dffa72f4_lec1.pdf
- Course: https://ocw.mit.edu/courses/12-742-marine-chemistry-fall-2006/
- The course is listed as Fall 2006; the lecture PDF itself is marked Fall 2004.
- Covers well-mixed reservoirs, inventory versus concentration, constant input, first-order loss, steady state, exponential adjustment, residence time, and elemental cycling.
- Use as the mathematical foundation for introductory lessons.

### B. MIT Paleoceanography: adapted Toggweiler–Sarmiento three-box model

- PDF: https://ocw.mit.edu/courses/12-740-paleoceanography-spring-2008/9c513047c551f0b212e3e2d81e5cf39c_3_box_model.pdf
- Landing page: https://ocw.mit.edu/courses/12-740-paleoceanography-spring-2008/resources/3_box_model/
- The handout is an adapted/simplified treatment, not an exact reproduction of the original model.
- Covers salt and nutrient budgets, matrix formulation, whole-system conservation constraints, unit consistency, and extensions to ocean carbon chemistry.
- Use for coupled budgets and the transition to linear algebra. Pay particular attention to dependent equations in closed systems.

### C. Southampton/NOC JModels

- Home: https://projects.noc.ac.uk/jmodels/
- Phosphorus details: https://projects.noc.ac.uk/jmodels/documentation/phosphorus-model/phosphorus-model-details
- Nitrogen–phosphorus details: https://projects.noc.ac.uk/jmodels/documentation/nitrogen-phosphorus-model/nitrogen-phosphorus-model-details
- Provides graphical phosphorus, nitrogen–phosphorus, silicon–phosphorus, and carbon models, with explanatory documentation and linked worksheets.
- The phosphorus model includes surface phosphate, deep phosphate, and surface phytoplankton biomass.
- The distributed applications are downloaded Java programs; this project should offer a modern browser-based teaching workflow.
- Strongest precedent for a sequence of increasingly coupled biogeochemical examples.
- Worksheet links were identified, but their contents could not be reliably retrieved during initial research. Do not claim those worksheets were reviewed.

### D. Quantitative Environmental Science: Ocean Carbon

- Three-box introduction: https://quantitative-environmental-science.github.io/Notes/06_oceancarbon/01_3box.html
- Solubility pump: https://quantitative-environmental-science.github.io/Notes/06_oceancarbon/02_solubility.html
- Links ocean circulation boxes to atmospheric exchange and subsequent carbon-cycle processes.
- Useful for staged construction and explicitly volume-weighted transport equations.
- Independently check mathematical claims: adding a third box does not by itself make analytical treatment impossible.

### E. IOW Climate of the Earth: buoyancy-driven circulation

- https://iow-lectures.pages.iow.de/climateoftheearth/lecture/06_Buoyancy-driven_circulation.html
- Introduces Stommel’s two-box model, density-dependent circulation, equilibrium branches, and tipping behavior.
- Use as an advanced feedback/stability example, not an initial implementation dependency.
- Distinguish dimensionless formulations from dimensional water transport when adapting equations.

### F. Fennel et al. ocean biogeochemical modeling primer

- OCB introduction: https://www.us-ocb.org/bgc-modeling-primer/
- Article DOI: https://doi.org/10.1038/s43586-022-00154-2
- Fennel et al. (2022), “Ocean biogeochemical modelling,” Nature Reviews Methods Primers, 2, 76.
- Useful background on ecosystem model construction, NPZD structure, model–data comparison, parameter estimation, and code examples.
- The OCB overview was reviewed in the scoping conversation; the full primer was not comprehensively reviewed.

### G. Insight Maker as an interaction benchmark

- Stock-and-flow concepts: https://insightmaker.com/docs/systemdynamics
- Units: https://insightmaker.com/docs/units
- Useful precedent for distinguishing material flows, variables, and information dependencies in a browser-based editor.
- This is a benchmark, not a commitment to use or embed its software.

## 5. Scientific model representation

Distinguish three concepts in both schema and interface:

- Physical compartments: surface ocean, deep ocean, atmosphere.
- Material pools within compartments: dissolved phosphate, phytoplankton phosphorus, particulate phosphorus.
- Processes: transport, transformation, external supply, and external removal.

At introductory level a node can appear to be a single reservoir. Internally leave room for multiple pools/tracers within a compartment. Do not require advanced multi-element chemistry to use the simple editor.

Maintain one canonical model definition containing stable IDs, compartment properties, pool inventories, parameter values and units, processes, forcing schedules, simulation settings, and diagram layout. Separate scientific meaning from diagram coordinates. Derive solver equations and rendered mathematics from the same process representation so they cannot silently diverge.

Store a schema version for saved files. A saved model must include the inputs required to reproduce its run, including solver settings and forcing. Differentiate restart-from-initial-state from continuing a run after a perturbation. Undo/redo and duplicate-model actions should preserve scientific semantics.

## 6. Core mathematics and process semantics

Use inventory internally. For tracer pool i:

    dM_i/dt = sum_j F_(j→i) − sum_j F_(i→j) + S_i − L_i
    C_i = M_i / V_i

M is amount, C is concentration, V is compartment volume, and all F/S/L terms have units of amount per time. For a mass-based concentration, use the appropriate reservoir mass rather than silently treating it as volume-based concentration.

Supported initial process laws:

| Process | Mathematical meaning |
|---|---|
| Prescribed source or transfer | F = F0, or a supported time-dependent forcing |
| First-order transfer/removal | F = k M_donor |
| Advective transport | F = Q C_donor, with Q in volume/time |
| Symmetric exchange | Signed net F = E(C_i − C_j), with E in volume/time |
| External sink | Explicit loss from the modeled system |

Every internal transfer must remove exactly the amount added to its recipient for the conserved tracer. If a signed exchange flux changes sign, the material direction must reverse consistently. Avoid double-counting a net exchange as two independent net fluxes.

Water transport and material-only transfer are different. For fixed-volume compartments, require balanced net water transport or an explicitly modeled compensating boundary flow. A prescribed source of dissolved tracer does not automatically add water.

Fixed volumes are the initial default. Variable-volume models require:

    d(VC)/dt = V dC/dt + C dV/dt

Do not introduce variable volumes until their dilution/concentration effects and water budgets are implemented and taught.

Later process laws can include Monod uptake, grazing, reversible adsorption/desorption, radioactive production/decay, stoichiometric transformations, and density-dependent circulation. For example:

    F_uptake = μ_max [N/(K_N + N)] B

Here N and K_N must have compatible concentration units; B is biomass expressed in a compatible elemental inventory. Uptake must debit nutrient and credit biomass using explicit stoichiometry. Account for each conserved element rather than assuming all state variables share one currency.

For a constant source I and first-order loss k > 0:

    dM/dt = I − kM
    M* = I/k
    M(t) = M* + (M0 − M*) exp(−kt)
    τ = 1/k

Handle k = 0 separately. Explain that τ = 1/k and equivalence between inventory/flux and adjustment time belong to this particular simple model; they are not universal identities for all nonlinear or coupled systems. Chemical residence time, water flushing time, and dynamical relaxation time may differ.

For constant-coefficient linear systems expose, optionally:

    dM/dt = A M + b

For nonlinear systems, advanced stability analysis uses the Jacobian at an equilibrium. Do not present eigenvalues of a transport matrix as a substitute for the full coupled Jacobian.

## 7. What “solve” means

The product should distinguish:

1. Analytical solutions for selected simple examples, with their assumptions.
2. Numerical initial-value solutions for supported user-built models.
3. Steady-state calculations for supported model classes.
4. Advanced stability analysis and parameter sweeps in a later phase.

A closed exchanging system can have a singular steady-state matrix because total inventory is conserved. Use conservation constraints to select the relevant equilibrium instead of blindly inverting a matrix. Distinguish a unique equilibrium, a family of equilibria, no equilibrium, and a solver failure.

A nonlinear trajectory reaching one equilibrium does not prove that no other equilibria exist. Label simulation endpoints and numerical equilibrium estimates accurately. Do not advertise a universal symbolic solver for arbitrary user expressions.

## 8. Interface and classroom workflow

Use three linked areas: diagram, mathematics, and results. A parameter/property inspector can accompany the selected object. On narrow screens, use tabs or a deliberate stacked layout rather than shrinking everything.

Core actions:

- Add, rename, move, duplicate, and delete reservoirs/pools.
- Draw and edit typed process connections, including sources/sinks outside the modeled boundary.
- Specify volumes, initial conditions, rate laws, parameters, and units.
- Adjust sliders with exact numeric input; show scientifically useful ranges.
- Run, pause, restart, and scrub; distinguish animation speed from integration step size.
- Choose pulse, step, and sinusoidal forcing, with explicit units and timing.
- Inspect inventories, concentrations, fluxes, and whole-system budgets.
- Overlay baseline and modified runs, preserving each run’s parameter snapshot.
- Save/load a model file; export trajectories and a readable equation/model summary.

Progressive mathematical detail:

- Plain-language budget: “input minus loss.”
- Symbolic equation.
- Equation with current parameter values and units.
- Matrix form and stability details when applicable.

Forcing semantics must be explicit: an instantaneous inventory addition is different from a finite-duration input-rate pulse. Document which is supported. Handle scheduled discontinuities without allowing the solver to skip them.

Teaching affordances:

- Predict-before-running prompts and suggested experiments.
- Assumptions, model boundary, and conserved quantities displayed clearly.
- A visible connection between curve slope and instantaneous net flux.
- Lecture-friendly presentation with readable equations and graphs.
- Pointer/touch support, keyboard alternatives, and accessible labels.
- Clear warnings tied to the relevant process or box, rather than unexplained error messages.

Do not clutter the student experience with implementation details. Do expose scientific assumptions and diagnostic information where they help interpretation.

## 9. Preset curriculum

Increase dynamical complexity intentionally. More boxes alone do not imply oscillations, instability, or multiple stable states.

### First-release target: six editable examples

1. Constant input to one reservoir: linear accumulation and derivative as net flux.
2. Constant input plus first-order loss: equilibrium, exponential adjustment, and parameter dependence.
3. Pulse, step, and seasonal forcing: transient response, attenuation, and lag.
4. Two exchanging reservoirs: conservation, unequal volumes, and concentration versus inventory.
5. Surface–deep nutrient cycle: uptake/export/remineralization and the distinction between internal recycling and burial loss. Start with transparent prescribed/first-order laws; nonlinear biomass is an extension.
6. Dissolved–particulate tracer: reversible scavenging, sinking/export, and competing timescales.

Each preset needs a scientific question, diagram, assumptions, explicit rate laws, parameter units, initial conditions, a verified baseline, editable controls, and several guided experiments. Label illustrative parameter sets as illustrative rather than presenting them as a calibrated ocean model.

### Later examples

- Nutrient–phytoplankton–zooplankton–detritus systems: nonlinear dynamics, phase space, and damped/sustained oscillations only in verified parameter regimes.
- Parent–daughter radionuclide production and decay, with activity/inventory distinctions explicit.
- Coupled nitrogen–phosphorus feedbacks.
- Three-box ocean carbon cycling, with atmospheric exchange and carbonate chemistry added only when properly specified and validated.
- Stommel-type density-dependent circulation: multiple equilibria and hysteresis; label it as an idealized conceptual model.

## 10. Numerical reliability and acceptance checks

Use a numerical solver suitable for smooth nonstiff ODEs in the initial supported range, with documented tolerances and failure conditions. Do not rely on an unchecked large fixed-step Euler integration for production results. An educational Euler comparison can be added separately. Stiff systems may require a later solver extension; do not silently claim all timescale combinations are supported.

Run integration away from the UI thread if necessary to keep interaction responsive. Limit unreasonable run sizes and return useful diagnostic messages.

Required scientific checks:

- One-box integration agrees with the analytical solution over tested parameter ranges.
- Zero-loss and zero-input edge cases behave correctly.
- A closed internal transfer conserves total amount within documented numerical tolerance.
- Unequal-volume exchange approaches equal concentration while preserving total inventory.
- An open-system budget closes after accounting for integrated external inputs and losses.
- Water transport carries donor concentration and satisfies the selected volume assumptions.
- Nutrient transformation conserves its elemental currency, including explicit external losses.
- Results converge appropriately as tolerances are tightened.
- Scheduled pulses/steps occur at the intended times.
- Equations displayed to students represent the processes actually integrated.
- Save/load preserves the model and reproducible settings.

Do not silently clip negative inventories to zero: this can conceal an invalid model, numerical failure, or broken conservation. Reject invalid configurations or report failure clearly. Prescribed outflows that exhaust a pool need an explicit supported policy, not an undocumented correction.

For multi-element reactions, test element-weighted conservation. For radioactive examples, identify which quantities decay and which conservation expectations no longer apply.

## 11. Staged implementation plan

| Stage | Deliverable | Exit condition |
|---|---|---|
| A | Short teaching specification, schema, and architecture decision | First six examples have explicit budget definitions and verification plans. |
| B | One-box vertical slice | Editable source/loss model, live equations, analytical comparison, and budget diagnostic work end to end. |
| C | General graph-to-equation engine and editor | User can construct a valid two-box model from a blank canvas and simulate it. |
| D | Introductory teaching release | Six editable presets, forcing, run comparison, local persistence/import/export, and meaningful scientific checks work. |
| E | Advanced dynamics | Nonlinear ecosystems, phase plots, parameter sweeps, and selected verified stability/hysteresis lessons. |

Prefer vertical slices so the user can review a working experience early. Build teaching content alongside the engine rather than leaving it until the end.

## 12. Initial technical scope and deferred decisions

Recommended starting scope:

- Browser-based computation for small educational systems.
- Fixed compartment volumes.
- A small, explicit process-law library with unit checks.
- One conserved elemental currency per simple model, with schema room to extend.
- Local saving and portable model files; no account required for the initial release.
- Static hosting compatibility if feasible.

These are recommendations, not a mandatory framework choice. Respect an existing repository’s stack. If selecting new graph, plotting, equation-rendering, or solver dependencies, check current documentation and licenses, then explain the choice briefly.

Deferred unless the user redirects scope:

- Handwritten diagram recognition.
- Arbitrary user code or unrestricted formula execution.
- Full symbolic solutions for arbitrary configurations.
- Variable-volume systems.
- Full carbonate equilibrium chemistry.
- Universal stiff integration.
- Parameter fitting, uncertainty ensembles, or observational data assimilation.
- Accounts, multiplayer editing, LMS/gradebook integration, hosted model galleries, and public publishing.
- MATLAB/Python code export; useful later, but not needed for the initial workbench.

Open decisions to revisit when they matter: visual identity/name, preferred hosting/repository, balance between ecological and chemical examples, breadth of multi-tracer support, instructor assignment authoring, and sharing requirements. None prevents the one-box vertical slice.

## 13. Definition of a successful handoff implementation

A student can open an example, trace each arrow into its budget equation, predict a response, change the model, run it, and explain the result. A student can also start from a blank canvas and construct a supported model without editing code. The application identifies invalid or unsupported configurations and exposes enough budget information to assess whether results are credible.

The result must be a scientific teaching tool, not merely a diagram editor with decorative charts. Preserve that priority throughout implementation.
