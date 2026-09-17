# Geometric Model Picker Implementation Plan

**Goal:** Move model choice to a separate icon/dialog and make Shapes continuously morph between real geometric paths.

- [ ] Add a floating Model icon under AI settings and an accessible Blob/Shapes icon-tile dialog.
- [ ] Keep AI settings limited to AI status; persist model selection as before.
- [ ] Replace the paired-point Canvas path routine with complete closed-path traversal.
- [ ] Define every Shapes state with the same ordered 16-point topology; interpolate from the current rendered frame using an ease-in-out transition.
- [ ] Add regression tests for all-point drawing, equal model topology, dialog selection, and an interrupted path morph.
- [ ] Run tests, typecheck, lint, build, and the browser extension test.
