# Implementation Plan — Submission Push

## Execution Order (dependency-aware)

### Wave 1: Scale + Rerun (everything downstream depends on this)
**[1] Scale regressions to all 700+ districts**
- Remove 3-state filter in script 01
- Re-run: 01 → 03 (already done for all India) → 04 → 05 → 06
- ~30 min pipeline run
- Updates every downstream number

### Wave 2: Parallel improvements (after Wave 1 data is ready)
Run simultaneously:

**[2] DiCRA NDVI trend as technology control**
- Pull NDVI time series from GEE or compute from existing DiCRA layers
- Add as control in yield regression: log(Y) = ... + β_ndvi · NDVI_trend
- Report attenuation of temperature trend coefficient

**[3] Crop-specific CMIP6 projections**
- Use crop-specific coefficients × district crop area shares
- Weighted composite yield impact per district
- Update projection map

**[4] Leave-one-state-out cross-validation**
- 5 iterations (MH, UP, KA, + 2 more once scaled)
- Report RMSE and correlation
- 10 lines of code

**[5] Conley spatial SEs**
- 200km kernel on main specification
- Report alongside entity-clustered

### Wave 3: Theory + Dashboard (while Wave 2 runs)

**[6-7] Theory writeup**
- 2-period credit-adaptation model
- Instrument matching proposition
- Add to dashboard as methodology extension

**[8-10] Dashboard updates**
- Fix hero stats post-scale
- DiCRA NDVI map overlay
- NDVI-control callout

### Wave 4: Tier 2 cherry-picks (if time)
- [13] Multi-GCM uncertainty bands on Parbhani spotlight
- [17] Vulnerability scatter with 700+ districts
- [19] Side-by-side SSP maps
- [20] Variance decomposition chart

### Wave 5: Polish
- [29] Remove console.log
- [23] Colorblind palettes
- [30] CIs on stat callouts
