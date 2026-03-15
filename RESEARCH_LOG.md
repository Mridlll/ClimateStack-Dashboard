# Research Log

Chronological record of decisions, findings, and progress.

---

## 2026-03-14: Project Kickoff — Phase 1 Data Audit

### Decision: Pilot States
Selected **Maharashtra, Uttar Pradesh, Karnataka** for pilot panel.
- Why: Climate diversity (semi-arid, alluvial plain, Deccan plateau), good data coverage, mix of irrigated/rainfed agriculture.

### Data Audit Results

**Crop Yields — READY**
- Source: `crop-wise-area-production-yield.csv` from CEEW agriculture project
- 345K rows, 706 districts, 54 crops, 1997-2020, zero nulls
- Pilot: 153 districts, 41.9K rows for 12 major crops
- Gap: post-2020 data thin for non-rice/wheat crops

**IMD Rainfall — ACCESSIBLE (server flaky)**
- `imdlib` package works, 0.25° daily gridded rainfall, 1901-2024
- IMD Pune server was unreachable during testing — known infrastructure issue
- Fallback: ERA5 precipitation or CHIRPS

**ERA5 Temperature — WORKING**
- 0.1° (~10km) resolution, monthly means via CDS API
- Verified: Delhi 32°C, Mumbai 27.5°C, Bangalore 23.7°C for June 2020
- Much better resolution than IMD temperature (1.0°)
- Decision: **Use ERA5-Land as primary climate source for both temp and precip**

**DiCRA — USEFUL BUT LIMITED**
- Only 9 states on portal, no irrigation/crop type/elevation layers
- NDVI (250m), LULC (10m), soil (250m) available
- GEE scripts on GitHub could be forked for all-India
- Decision: useful for interaction terms later, not critical for pilot

**District Crosswalks — SOURCED**
- User has `vedshastry/india-bridge` starred (1951-2011 crosswalk)
- User has `vijayshree-jayaraman/-bsr-district-panel` forked (Census 2001 harmonized)
- ICRISAT-TCI has pre-apportioned panels at consistent boundaries
- Decision: will integrate crosswalk when scaling beyond pilot

### Decision: Climate Baseline
Adopting **1982-2011** as reference period, consistent with existing CEEW climate risk work (monsoon trend analysis, heatwave mapping). This means our "extreme event" thresholds will be calibrated to the same baseline CEEW has already published on.

---

## 2026-03-14: Pipeline Build — Phase 2

### Scripts Created
1. `01_prepare_crop_panel.py` — cleans APY data, filters to pilot states + 12 major crops
2. `02_download_era5_climate.py` — downloads ERA5-Land monthly means year-by-year
3. `03_zonal_aggregation.py` — spatial join approach (avoids GDAL dependency) for grid-to-district aggregation
4. `04_merge_crop_climate_panel.py` — fuzzy matching of district names, season-aware join

### Pipeline Test (2018-2020)
- 152/153 districts matched (99.4%)
- Only unmatched: Sant Ravidas Nagar (renamed Bhadohi)
- Climate values plausible: Kharif temp ~26°C, precip ~1,197mm

### Decision: Zonal Aggregation Method
Used point-in-polygon spatial join instead of rasterstats raster masking.
- Why: rasterstats requires GDAL/fiona which fails to build on Windows
- How: create grid of ERA5 centroids, assign to districts via geopandas sjoin, groupby district
- Trade-off: slightly less precise at district boundaries (centroid assignment vs area-weighted), acceptable for 0.1° grid vs district size

---

## 2026-03-14: Proof-of-Concept Regressions — Phase 3

### Model
```
log(yield_it) = α_i + γ_t + β₁·temp + β₂·precip + β₃·precip² + ε_it
```
District FE + year FE, clustered SEs, estimated separately by crop.

### Results (2 years only — low power)
**Kharif pooled (n=4,096):**
- Temperature: -1.9% yield per 1σ (p=0.069) — correctly signed
- Precipitation: -14.1% per 1σ (p<0.001) with significant quadratic — inverted-U
- R² = 0.64

**Crop highlights:**
- Jowar: strong heat sensitivity (β=-0.26, p=0.005)
- Moong: strong heat sensitivity (β=-0.21, p<0.001)
- Groundnut: precipitation dominates (R²=0.33)

**Rabi pooled:** correctly signed but insignificant (insufficient variation with 2 years)

### Assessment
Framework runs end-to-end. Coefficients correctly signed and magnitudes consistent with literature (Burney et al.). Full 23-year panel needed for proper identification.

---

## 2026-03-14: CEEW Monsoon Study Review

Reviewed CEEW's published monsoon trend analysis (Keerthana A.S., Anurag Sahu, Shravan Prabhu, June 2025).
- Tehsil-level, IMD data, 1982-2011 baseline
- Finding: 55% tehsils saw >10% monsoon increase, 64% more heavy rainfall days

### Decision: Add Extreme Rainfall Metrics
Adding to regression specification:
- Precipitation CV (rainfall erraticness within season)
- Max monthly precipitation (heavy rainfall concentration)
- Temperature range (within-season volatility)

Framing: ClimateStack builds on CEEW's established climate mapping by adding the economic translation layer (from "rainfall changed" to "yield/revenue/repayment impact").

---

---

## 2026-03-14: Full Panel Regressions — Phase 3 (continued)

### ERA5 Download Complete
All 24 years (1997-2020) downloaded successfully. 72 MB total, ~3 MB/year. No issues.

### Full Pipeline Run
- Zonal aggregation: 18,150 district-year rows, 720 districts, 24 years
- Extended metrics included: temp_range, precip_cv, precip_max_month
- Merge: 152/153 pilot districts matched (99.4%), 45,761 rows with climate data
- Fixed merge script to carry through extended climate columns dynamically (was hardcoded to only temp_c and precip_mm)

### Full Panel Regression Results (n=45,221 after outlier removal)

**Specification 1 — Baseline (district FE + year FE)**

| | Kharif (n=36,346) | Rabi (n=8,875) |
|---|---|---|
| Temperature | -4.2% per 1σ (p<0.001) | -7.2% per 1σ (p<0.001) |
| Precipitation | -7.8% per 1σ (p<0.001) | -18.0% per 1σ (p<0.001) |
| Precip² | +2.6% (p<0.001) | +7.3% (p<0.001) |

Rabi crops more temperature-sensitive than Kharif — consistent with wheat's terminal heat stress vulnerability.

**Specification 2 — Extended (adding extreme-event proxies)**

Precipitation CV (rainfall erraticness) is significant in both seasons:
- Kharif: +6.5% per 1σ (p<0.001)
- Rabi: +3.3% per 1σ (p<0.001)

Positive sign interpretation: more erratic rainfall (high CV = concentrated monsoon pulse) correlates with higher yields because a strong monsoon pulse delivers more total water even if unevenly distributed. Districts with low CV often had weak monsoons.

**Crop-specific highlights:**
- Moong: strongest heat sensitivity (-19% per 1σ temp, p<0.001)
- Maize: -9% per 1σ temp (p<0.001), temp_range significant in Spec 2
- Wheat: -16% per 1σ temp (p=0.05), precip CV significant
- Jowar & Soyabean: classic inverted-U precipitation (significant quadratic)
- Groundnut: precipitation dominates (R²=0.24), precip CV highly significant
- Bajra: weak signal in Spec 1, but Spec 2 reveals precip CV (p=0.003) and max-month precip (p=0.011) matter — extreme metrics unlock signal that means miss

### Assessment
Coefficients correctly signed, statistically significant, magnitudes consistent with Burney et al. and Hultgren et al. The extended Spec 2 adds real information — precip CV in particular. Framework is viable.

### Decision: Precip CV sign
The positive precip_cv coefficient is counterintuitive at first but defensible. Will need to verify this holds after the spatiotemporal decomposition separates trend from shock components. If the sign persists, it's a publishable finding about monsoon concentration vs. distribution.

---

---

## 2026-03-14: Burney-McIntosh Decomposition — Phase 3A

### Implementation
Decomposed monthly district-level temperature and precipitation into 5 components:
1. Baseline mean (μ_i) — district climatology
2. Local trend (τ_it) — district-specific linear time trend
3. Seasonal deviation (s_im) — normal monthly cycle after detrending
4. Covariate shock (ω_t) — national mean of detrended/deseasonalized residuals
5. Idiosyncratic shock (ε_it) — local unpredictable residual

### Validation
- Average warming rate: 0.129°C/decade, 681/719 districts warming
- Variance decomposition (temp): baseline 55%, seasonality 43%, covariate 0.8%, idiosyncratic 1.2%
- Known climate events correctly identified:
  - 2002 drought: -150mm precip covariate shock
  - 2009 drought: -92mm
  - 2014, 2015 droughts: -108mm, -93mm
  - 2019 floods: +121mm

### Decomposed Yield Regressions

Key finding: **precipitation covariate shocks dominate yield damage for 7/10 Kharif crops** — confirms the insurance hypothesis. Temperature idiosyncratic shocks are the primary heat damage channel (-4.1% pooled Kharif).

### Decision: No year FE with decomposed components
The covariate shock component is identical across districts within a year, making it collinear with year FE. Correct spec uses district FE only — the decomposed components explicitly replace year effects.

### Decision: Positive temperature trend coefficient
Trend coefficient came out positive for most crops — absorbs both warming AND technology adoption correlated with time. Future refinement: add technology proxy (e.g., fertilizer use, HYV adoption rate) to separate these channels.

---

## 2026-03-14: Irrigation Interactions — Phase 3C

### Data Source
Best irrigation data: PROFESSIONAL_District_Analysis_20251201_174527.xlsx
- Column: Gross_Irrigated_Area_Pct (GIA/GCA, not NIA/NSA)
- 684 districts, cross-sectional (2023-24), mean 30%, median 25%
- Cross-sectional is fine — irrigation is slow-moving, works as time-invariant interaction

### Results — All Three Hypotheses Tested

**Hypothesis 1 — Irrigated districts buffer local heat shocks: CONFIRMED**
- δ_idio(temp) = +0.020*** (pooled)
- Arhar/Tur: low-irrigation districts suffer 2x damage (-0.200 vs -0.112)
- Implication: credit risk should penalize rainfed districts for temp volatility

**Hypothesis 2 — Irrigated districts buffer covariate shocks: PARTIALLY CONFIRMED**
- Marginal at pooled level, but crop-specific effects strong (Maize, Groundnut)
- Implication: insurance triggers may need crop × irrigation differentiation

**Hypothesis 3 — Trend interaction: SIGNIFICANT (surprising)**
- δ_trend(temp) = +0.038*** — irrigation is an adaptation mechanism for gradual warming
- High-irrigation trend coefficient +0.107*** vs +0.028** for low-irrigation

---

## 2026-03-14: Visualization Dashboard

Built Leaflet/CartoDB scrollytelling dashboard (dashboard/index.html):
- 4 choropleth maps: warming trends (all-India), covariate shocks, idiosyncratic shocks, irrigation overlay
- Chart.js: drought year timeline, irrigation split comparison, crop sensitivity
- Narrative sections connecting each component to a financial instrument
- GitHub Pages ready

Data: 719 districts all-India climate GeoJSON (3.2MB), 141 pilot districts with irrigation (683KB)

---

## Next Steps
- [x] Full ERA5 download (1997-2020)
- [x] Full pipeline run with extended climate metrics
- [x] Full panel regressions (Spec 1 + Spec 2)
- [x] Burney-McIntosh spatiotemporal decomposition
- [x] Irrigation × climate interactions
- [x] Visualization dashboard
- [ ] Test CMIP6 projection pipeline (NEX-GDDP-CMIP6)
- [ ] Scale beyond 3 pilot states to all-India
- [ ] Add technology proxy to separate warming from yield trend
- [ ] Daily ERA5 for proper extreme-event metrics
- [ ] Push to GitHub and enable Pages
