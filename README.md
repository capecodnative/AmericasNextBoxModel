# America’s Next Box Model

An interactive biogeochemical modeling workbench for teaching the connection between reservoir diagrams, budgets, and time-dependent behavior. Local browser computation; no accounts, services, or build step.

## Run locally

From this directory:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open http://127.0.0.1:4173 in a modern browser. Use HTTP rather than opening `index.html` directly, because the solver runs in a module worker.

## Explore

- Open any of six editable examples, from linear accumulation to nutrient recycling and scavenging.
- Use **Diagram font size** to adjust text. Drag the separator below the diagram to resize its height, use Up/Down keys on the separator, or enter **Pane height**. **Reset view** restores the defaults; these preferences persist in this browser.
- Select a reservoir to edit **Display name** (box and legend), **Variable name** (inventory symbol in equations; brackets denote concentration), initial inventory, or compartment volume. Names update as you type; variable names must be unique. Stable internal IDs preserve connections. Drag to rearrange, or focus a box and use arrow keys.
- Select a process or equation term to inspect its law and coefficient. Diagram selection highlights the corresponding equation terms.
- Build your own model using **Reservoir**, **Draw connection**, and **Process**. Draw a connection by dragging between boxes or selecting donor then recipient. Keyboard users can activate boxes with Enter. Escape cancels drawing. Process endpoint dropdowns also support boundary sources/sinks.
- Edits rerun from initial conditions. Inspect inventory, concentration, or flux plots, scrub time, or play/pause the trajectory.
- Pin a baseline before changing parameters. Compatible pool IDs overlay with the saved parameter snapshot. Different models do not overlay. Clear the baseline when finished.
- Save/open portable JSON files, export trajectories as CSV, or export a readable model/equation summary. Edits are also autosaved in this browser; JSON is the portable record.
- Undo/redo scientific edits and layout moves. A duplicated pool shares its original compartment; a newly added reservoir creates a new compartment.

All initial examples use illustrative parameters. Choose inventory, volume, and time units under **Model units** in the sidebar. Inventory uses a base unit (mol or g) plus a prefix: milli, none, kilo, mega, giga, tera, or peta. Mass units require the conserved tracer’s molar mass in g/mol. Volumes support L, m³, or km³; time supports years/days/hours/seconds (1 year = 365.25 days). Inputs, coefficients, equations, plots, diagnostics, CSV files and text summaries convert together. JSON files preserve canonical mol/m³/year values plus the chosen display units and molar mass. Changing units preserves the physical model; each preset opens with its original mol/m³/year defaults. A pulse means a finite change in input rate, not an instantaneous inventory addition. First-order processes transfer material only; advective processes carry water and must balance each compartment’s water budget.

## Verify

Node.js 20+ is sufficient; no npm packages are needed:

```sh
node --test
```

On this workstation the system Node installation has a missing dynamic library. The bundled runtime successfully runs the tests:

```sh
/Users/DCO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test
```

See [implementation record](docs/IMPLEMENTATION.md) for schema, scientific budgets, solver methods, source attribution, milestone status, and remaining work. The original [handoff](biogeochemical_box_models_codex_handoff.md) remains project context.
