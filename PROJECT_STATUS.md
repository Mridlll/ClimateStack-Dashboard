# ClimateStack — Project Status & Summary

**Date:** 15 March 2026
**Author:** Mridul
**Dashboard:** https://mridlll.github.io/ClimateStack/
**Repository:** https://github.com/Mridlll/ClimateStack

---

## What We Built (in one session)

A complete climate-agriculture econometric framework + interactive dashboard, from zero to deployed, covering:

1. Data pipeline (8 scripts)
2. Burney-McIntosh spatiotemporal decomposition
3. Panel fixed-effects yield regressions (3 specifications)
4. Irrigation × climate interaction analysis
5. CMIP6 GCM-based forward projections (35-model ensemble)
6. Interactive scrollytelling dashboard on GitHub Pages

---

## Research Coverage

### Data Stack

| Source | What | Coverage | Resolution |
|--------|------|----------|-----------|
| ERA5-Land (Copernicus) | Temperature + precipitation | All India, 1997-2020 | 0.1° (~10km), monthly |
| Crop APY (data.gov.in) | Area, production, yield | 706 districts, 54 crops, 1997-2020 | District × crop × season × year |
| District shapefiles | Census 2011 boundaries | 735 districts | Polygon |
| Irrigation (LUS 2023-24) | Gross irrigated area % | 684 districts | Cross-sectional |
| NEX-GDDP-CMIP6 | Climate projections | All India, SSP2-4.5 + SSP5-8.5 | 0.25°, 35-GCM ensemble median |
| DiCRA (UNDP) | NDVI, LULC, soil, LST | 9 states (portal), all-India via GEE | 10m-9km depending on layer |

### Panel Dimensions

| Dimension | Scope |
|-----------|-------|
| Climate decomposition | **719 districts**, all India, 24 years |
| Yield regressions | **151 districts** (pilot: MH, UP, KA), 12 crops, 23 years |
| Irrigation interactions | **144 districts** with irrigation data |
| CMIP6 projections | **719 districts**, SSP2-4.5 + SSP5-8.5 |
| Shock explorer | **150 districts** with per-district regression coefficients |

### Methodology

**Burney-McIntosh Spatiotemporal Decomposition** (adapted from PNAS 2024):
- 5 components: baseline (μ), trend (τ), seasonal (s), covariate shock (ω), idiosyncratic shock (ε)
- Validated against known climate events: 2002 drought (-150mm), 2009 drought (-92mm), 2014-15 consecutive droughts, 2019 excess monsoon (+121mm)
- Temperature: 94.6% of districts warming, national average 0.13°C/decade (Kharif)

**Panel Fixed Effects Regressions** (3 specifications):
- Spec 1: log(yield) = district FE + year FE + temp + precip + precip²
- Spec 2: + precipitation CV, temp range, max monthly precip (extreme-event proxies)
- Spec 3 (decomposed): log(yield) = district FE + trend + covariate shock + idiosyncratic shock

**Irrigation Interactions:**
- log(yield) = district FE + climate components + (climate × irrigation share)
- δ_idiosyncratic(temp) = +0.020*** — irrigated districts buffer local heat shocks
- Split-sample: rainfed districts suffer ~2× the climate damage

---

## Key Findings

### 1. Yield-Climate Sensitivity (Pooled)

| | Kharif (n=36,346) | Rabi (n=8,875) |
|---|---|---|
| Temperature | **-4.2% per 1σ** (p<0.001) | **-7.2% per 1σ** (p<0.001) |
| Precipitation | **-7.8% per 1σ** (p<0.001) | **-18.0% per 1σ** (p<0.001) |

### 2. Most Heat-Sensitive Crops

| Crop | Yield loss per 1σ temp shock | Significant |
|------|------------------------------|-------------|
| Moong (Green Gram) | -18.9% | Yes |
| Gram | -18.1% | Yes |
| Wheat | -16.0% | Yes |
| Arhar/Tur | -15.9% | Yes |
| Soyabean | -10.6% | Yes |
| Bajra | -9.7% | Yes |
| Maize | -9.0% | Yes |
| Groundnut | -8.2% | Yes |
| Rice | -1.9% | No |

### 3. Decomposition Results

- **Covariate precipitation shocks dominate yield damage for 7/10 Kharif crops** → parametric insurance target
- **Idiosyncratic temperature shocks** are the primary heat damage channel (-4.1% pooled Kharif)
- R² improvement over raw climate: Arhar/Tur +213%, Wheat massive improvement

### 4. Irrigation as Climate Buffer

- Irrigated districts buffer local heat shocks: δ = +0.020 (p<0.001)
- Arhar/Tur: -0.112 (high irrigation) vs -0.200 (low irrigation) — almost half the damage
- Irrigation is also an adaptation mechanism for long-run warming (δ_trend = +0.038***)
- **31 districts in RED ZONE** (high vulnerability + low irrigation) — Marathwada belt

### 5. CMIP6 Forward Projections (35-GCM Ensemble Median)

| | SSP2-4.5 | SSP5-8.5 |
|---|---|---|
| National Kharif warming by 2035 | +0.50°C | +0.55°C |
| National Kharif yield impact | -4.8% | -5.3% |
| National Rabi yield impact | -7.1% | -7.0% |
| Districts with negative impact | 100% | 100% |

**Parbhani spotlight (SSP5-8.5):** +0.44°C → -4.2% Kharif. Most impacted: northern mountain districts (Leh: +1.22°C, -11.2%).

---

## Dashboard Sections

| # | Section | Content |
|---|---------|---------|
| 01 | Hero | Stats (725 climate districts + 151 pilot), decomposition equation (μ+τ+s+ω+ε) |
| 02 | The Problem | NABARD credit risk framing, 2 paragraphs |
| 02B | Data Architecture | 4-card grid: DiCRA, ERA5, Crop APY, Irrigation |
| 03 | Warming Map | All-India choropleth (temp trend °C/decade), component badge τ |
| 04 | Precipitation Volatility | All-India choropleth (idiosyncratic precip shock), dark theme, 24-year covariate timeline bar chart with drought/flood labels |
| 05 | Heat Shock Damage | All-India choropleth (idiosyncratic temp shock), crop coefficient dot-and-whisker plot with 90% CIs |
| 06 | Irrigation Buffer | Pilot states choropleth (irrigation %), irrigated vs rainfed comparison chart, most vulnerable / most buffered callouts |
| 06B | Projected 2035 | All-India choropleth (CMIP6 ensemble yield impact), GCM vs trend explanation callout, Parbhani spotlight |
| 07B | Shock Explorer | Interactive sliders (temp -2 to +3°C, precip -300 to +300mm), season toggle, live-recoloring map with per-district coefficients |
| 06C | Vulnerability Scatter | Irrigation vs projected yield decline, state-colored dots, quadrant labels, Marathwada districts labeled |
| 07 | Deep Dive | Pre-loaded Parbhani decomposition (temp + precip timeseries), click any district to explore |
| 08 | Use Cases | Credit risk (CRAF), insurance triggers, adaptation investment — with CRAF pipeline walkthrough for Parbhani |
| 09 | Methodology | Decomposition table, data/panel/estimation details, DiCRA row |

### Interactive Features

- **Hover** any district on any map → tooltip with key stats
- **Click** any district → scroll to deep dive with decomposed timeseries
- **Search** bar (floating, top-right) → find any district by name
- **Shock sliders** → drag to simulate climate scenarios, map recolors live
- **Season toggle** (Kharif/Rabi) on shock explorer

---

## Scripts (Numbered Pipeline)

| Script | Purpose | Input | Output |
|--------|---------|-------|--------|
| 01 | Clean crop APY panel | CSV (345K rows) | crop_panel_pilot.parquet |
| 02 | Download ERA5-Land | CDS API | era5_india_{year}.nc (24 files) |
| 03 | Zonal aggregation | ERA5 + shapefile | district_climate_panel.parquet |
| 04 | Merge crop + climate | Both panels | merged_panel_pilot.parquet |
| 05 | Burney-McIntosh decomposition | Monthly climate | district_climate_decomposed.parquet |
| 06 | Irrigation interactions | Decomposed + irrigation | panel_with_irrigation.parquet |
| 07 | Export dashboard GeoJSON | All panels | dashboard/data/*.geojson |
| 08 | Generate dashboard extras | All panels | projected_2035, vulnerability_scatter, crop_coefficients, covariate_timeline, parbhani_decomposition |
| 09 | CMIP6 projections | NEX-GDDP-CMIP6 (AWS COG) | cmip6_projections.json |
| 10 | GCM delta computation | THREDDS OpenDAP | Alternative GCM deltas |
| 11 | Shock response coefficients | Per-district regressions | shock_response_coefficients.json |

---

## What's Working

- All 4+ choropleth maps render with hover tooltips and click-to-deep-dive
- Covariate timeline (24 years) renders as diverging bar chart
- Crop sensitivity with confidence intervals and whisker lines
- Vulnerability scatterplot with quadrant labels and Marathwada annotations
- Shock explorer with live slider interaction
- Parbhani pre-loaded as featured decomposition example
- CRAF pipeline walkthrough
- District search (725 districts)
- GitHub Pages deployment (auto-rebuilds on push)

---

## What's Left / Could Be Improved

### Analysis Extensions
- [ ] Scale yield regressions to all 700+ districts (need district crosswalk for full harmonization)
- [ ] Add technology proxy to separate warming trend from yield growth trend
- [ ] Daily ERA5 for proper extreme-event metrics (95th percentile exceedance, GDD, consecutive dry days)
- [ ] Multi-GCM uncertainty bands (currently using ensemble median — could show spread)
- [ ] Crop-specific CMIP6 projections (currently uses pooled Kharif/Rabi coefficients)

### Dashboard Polish
- [ ] Colorblind-safe palettes (viridis/inferno for sequential maps)
- [ ] Mobile touch interactions (tap-to-zoom on maps)
- [ ] Legend tick marks at interpretable values (not just endpoints)
- [ ] Consistent section numbering visual weight
- [ ] Sticky decomposition mini-legend alongside maps
- [ ] Static scenario comparison maps (side-by-side SSP2-4.5 vs SSP5-8.5)
- [ ] Remove debug console.log statements before submission

### Data Gaps
- [ ] DiCRA layer integration as actual map overlays (currently only referenced in methodology)
- [ ] Post-2020 crop data (thin for non-rice/wheat)
- [ ] ICRISAT district-level database for time-varying irrigation panel

---

## Git History (25 commits)

```
a2c85f0 Update projection callouts to match 35-GCM ensemble median numbers
fd18f65 Use CMIP6 ensemble median projections (35 GCMs) instead of single-model
a80f49f GCM-based CMIP6 projections + shock slider + Kharif season labels
75475f6 Fix Parbhani preload: lazy render charts via IntersectionObserver
4c164cf Fix 3 rendering bugs: covariate timeline, CI plot, projected map
3cb6706 Fix data architecture section: card grid instead of plain text tree
3310131 Sync CMIP6 projection data and scripts to docs/
40798c5 Major dashboard rebuild: DiCRA, projections, CRAF walkthrough, scatterplot
9be59a6 Fix covariate map: use precip idiosyncratic (spatially varying)
55765f4 Hover tooltips on districts, click-to-deep-dive, fallback stats
bbf416a Fix tooltip labels: plain English
4cb42a8 Rebuild dashboard: lazy map init via IntersectionObserver
864adb9 Flatten docs/ for GitHub Pages root serving
f16f67d Fix dashboard: match GeoJSON properties, remove CEEW attribution
d10b80e Update research log with decomposition, interactions, dashboard
6755c22 Add Leaflet/CartoDB dashboard for climate risk visualization
213aac9 Implement Burney-McIntosh decomposition and irrigation interactions
9a73be4 Add comprehensive Phase 1-3 results document
73432de Full 23-year panel regressions
42b02f6 Add extreme-event proxy metrics to zonal aggregation pipeline
e35d13c Add extreme rainfall metrics to regression spec (Spec 2)
bfdbb03 Init ClimateStack project with Phase 1 data audit
```

---

## Technical Stack

- **Python 3.14:** pandas, geopandas, xarray, rasterio, netCDF4, pyarrow, statsmodels, linearmodels
- **Data access:** cdsapi (ERA5), imdlib (IMD), s3fs (CMIP6 COG), xarray OpenDAP (CMIP6 THREDDS)
- **Frontend:** Leaflet.js, Chart.js, CartoDB basemaps, vanilla JS (no framework)
- **Deployment:** GitHub Pages from /docs
- **Version control:** Git, 25 commits
