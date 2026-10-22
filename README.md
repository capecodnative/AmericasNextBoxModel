# America’s Next Box Model

An interactive biogeochemical modeling workbench for learning about box models, material flows in closed and open systems, and time-dependent behaviors. Local browser computation; no accounts, services, or build step.

## Run locally

From this directory:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open http://127.0.0.1:4173 in a modern browser. Use HTTP rather than opening `index.html` directly, because the solver runs in a module worker.

## Explore and instructions

- Open any of six editable examples, from linear accumulation to nutrient recycling and scavenging.
- Use **Diagram font size** to adjust text. Drag the separator below the diagram to resize its height, use Up/Down keys on the separator, or enter **Pane height**. **Reset view** restores the defaults; these preferences persist in this browser.
- Select a reservoir to edit **Display name** (box and legend), **Variable name** (inventory symbol in equations; brackets denote concentration), initial inventory, or compartment volume. Names update as you type; variable names must be unique. Stable internal IDs preserve connections. Drag to rearrange, or focus a box and use arrow keys.
- Select a process or equation term to inspect its law and coefficient. Diagram selection highlights the corresponding equation terms.
- Build your own model using **Reservoir**, **Draw connection**, and **Process**. Draw a connection by dragging between boxes or selecting donor then recipient. Keyboard users can activate boxes with Enter. Escape cancels drawing. Process endpoint dropdowns also support boundary sources/sinks.
- Edits rerun from initial conditions. Inspect inventory or concentration above a dedicated flux graph, scrub time, or play/pause the trajectory. Click a legend entry to cycle its curve through highlighted, hidden, then normal; all curves start visible. Highlighted curves are thicker and dim other curves in that graph. Each graph has its own logarithmic-axis controls.
- Pin a baseline before changing parameters. Compatible pool IDs overlay with the saved parameter snapshot. Different models do not overlay. Clear the baseline when finished.
- Save/open portable JSON files, export trajectories as CSV, or export a readable model/equation summary. Edits are also autosaved in this browser; JSON is the portable record.
- Undo/redo scientific edits and layout moves. A duplicated pool shares its original compartment; a newly added reservoir creates a new compartment.

All initial examples use illustrative (if not realistic) parameters. Choose inventory, volume, and time units under **Model units** in the sidebar. Inventory uses a base unit (mol or g) plus a prefix: milli, none, kilo, mega, giga, tera, or peta. All unit selectors, including prefixes, relabel values without rescaling any numbers. No conversion constants are needed. For example, changing yr to day leaves k = 0.2 numerically unchanged and interprets it as 0.2 day⁻¹. Volumes support L, m³, or km³; time supports yr/day/h/s. Inventory, concentration, flux, equation, axis, forcing, and export labels stay consistent with the selected units. JSON saves store values in the selected model units plus their labels. Each preset opens with its original mol/m³/yr defaults. A pulse means a finite change in input rate, not an instantaneous inventory addition. First-order processes transfer material only; advective processes carry water and must balance each compartment’s water budget.

See [implementation record](docs/IMPLEMENTATION.md) for schema, scientific budgets, solver methods, source attribution, milestone status, and remaining work. The original [handoff](biogeochemical_box_models_codex_handoff.md) remains project context.

Click **Build your own model** to create an entry under **Your models**. Edit its title at the top of the workbench; the sidebar updates live. Custom models and their edits save in this browser, so you can switch between them or reload. **Remove Model** in the model-actions dropdown removes an entry, with Undo/Redo available during the session. Use **Save model** to export a JSON backup.

**Open model** imports a JSON file as a new entry under **Your models**, preserving existing models. Opening the same file again creates another independent copy.

Guided explorations offer **Reset Example** to restore their original configuration after edits, and **Save As…** to keep the current version as a named custom model. Reset can be undone.

Use the caret beside **Your models** in the sidebar, or **Your model** above a custom title, for **Open Model**, **Save Model**, and **Remove Model**. Removal is available only for the selected custom model.

Click or drag inside either response graph to scrub to that time and pause playback. Both graphs and the diagram update together; logarithmic time axes are supported. The time readout sits below the slider to keep the slider length stable during playback.

Use **+ Compartment** and drag around two or more reservoirs to share one physical volume. You can also select members with Space/click and press Enter. Select the tinted compartment to edit its Volume; drag its background to move the group. A reservoir can **Leave compartment** from its properties.

**Exclude from Mixing+Advection** keeps a reservoir out of water-based transport; it defaults on for particles. Material transfers still work. A mixing or advective connection carries all included reservoirs between distinct compartments, using the shared volumes. With several included material forms, pair the corresponding reservoirs in Flux properties; both sides must have matching included counts. One water coefficient applies to all forms and is counted once in the water budget. Advection still needs balanced return water flow. Compartment groups and exclusions save with your model.

Select a reservoir or compartment, then drag its lower-right corner handle to resize its box. Focus a handle and use arrow keys to adjust width/height. Compartments keep enough room for their members; reservoir titles wrap and scientific values are unchanged. Box sizes are saved and support Undo/Redo. Hover over the excluded symbol for its explanation.

Select a mixing or advective flux to reveal its two circular attachment handles. Drag them around the box borders, or use arrow keys, to adjust the routing. Double-click a handle to restore automatic placement. Attachments follow boxes when moved/resized and save with the model. Flux endpoint handles appear only for the selected flux. Compartment name/volume labels seek clear positions to avoid other diagram elements.

Click blank space in the model diagram to deselect all objects and hide their handles. Creation buttons show the object type beneath their text: arrow, solid reservoir box, or dashed compartment enclosure.

Multiple fluxes between the same boxes use separate routes: two opposing curves, a centerline for the third, then wider curves for additional connections. Their labels stay near their own paths and slide along them to avoid collisions.
