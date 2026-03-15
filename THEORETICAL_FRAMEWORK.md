# Climate-Credit Feedback Model: Theoretical Framework

## 1. Setup: Two-Period Model

Consider a representative agricultural district $i$ with a risk-neutral lending institution (NABARD) and a representative farmer.

**Period 1 (Planning).** NABARD observes a climate signal $C_i$ and sets lending terms $r_i(C_i)$. The farmer chooses adaptation investment $a_i \in \{0, \bar{a}\}$ — irrigation infrastructure, drought-tolerant varieties, or crop diversification — financed by credit at rate $r_i$. The farmer's borrowing constraint is $a_i \leq L_i(r_i)$, where $L_i$ is the credit limit, decreasing in $r_i$.

**Period 2 (Realization).** A climate shock $\tilde{C}_i$ realizes. Agricultural yield follows:

$$Y_i = f(C_i, a_i, \varepsilon_i) = \exp\!\Big[\alpha_i + \beta\, C_i + \delta\, a_i \cdot C_i + \varepsilon_i\Big]$$

where $\alpha_i$ is district-specific productivity, $\beta < 0$ captures climate damage, $\delta > 0$ is the *adaptation elasticity* (credit-funded adaptation buffers climate shocks), and $\varepsilon_i$ is idiosyncratic noise. Revenue is $R_i = p \cdot Y_i$. The farmer repays if $R_i \geq (1 + r_i) \cdot a_i$.

**Default probability:**

$$\text{PD}_i = \Pr\big[R_i < (1 + r_i) \cdot a_i\big] = \Pr\big[\varepsilon_i < \underline{\varepsilon}_i(C_i, a_i, r_i)\big]$$

## 2. The Information Problem

Without decomposition, NABARD observes the *composite* climate signal $C_i$ but cannot distinguish its components. Following Burney et al. and our empirical decomposition, $C_i$ admits the representation:

$$C_{it} = \underbrace{\tau_i \cdot t}_{\text{trend}} + \underbrace{\omega_t}_{\text{covariate shock}} + \underbrace{\varepsilon_{it}^C}_{\text{idiosyncratic shock}}$$

where $\tau_i$ is the district-specific long-run trend (warming rate), $\omega_t$ is the aggregate (covariate) shock common to all districts in a region (e.g., monsoon failure), and $\varepsilon_{it}^C$ is the district-specific residual climate shock.

Each component demands a *distinct* risk management instrument:

| Component | Character | Optimal Instrument | Information Requirement |
|---|---|---|---|
| $\tau_i \cdot t$ | Predictable, non-diversifiable | Long-term adaptation investment | $\hat{\beta}_{\text{trend}} \times \hat{\tau}_i$ |
| $\omega_t$ | Unpredictable, correlated | Parametric index insurance | $\hat{\beta}_{\text{cov}} \times \widehat{\text{Var}}(\omega)$ |
| $\varepsilon_{it}^C$ | Unpredictable, diversifiable | Credit risk adjustment (CRAF) | $\hat{\beta}_{\text{idio}} \times \widehat{\text{Var}}(\varepsilon^C_i)$ |

**Current NABARD approach:** All climate risk is treated as homogeneous — a single "climate exposure" flag determines priority-sector lending rates. This conflates insurable covariate risk with trend-driven adaptation needs, leading to systematic misallocation.

## 3. The Decomposition Solution

Substituting the decomposed climate signal into the yield equation:

$$\log Y_{it} = \alpha_i + \gamma_t + \beta_{\text{trend}}\, \tau_i t + \beta_{\text{cov}}\, \omega_t + \beta_{\text{idio}}\, \varepsilon_{it}^C + \delta \cdot a_i \cdot C_{it} + u_{it}$$

Our empirical framework (notebooks 04–07) estimates $\hat{\beta}_{\text{trend}}$, $\hat{\beta}_{\text{cov}}$, $\hat{\beta}_{\text{idio}}$, and the adaptation elasticity $\hat{\delta}$ from interaction regressions with irrigation. These are the **sufficient statistics** for optimal instrument allocation.

**Proposition (Optimal Risk Portfolio).** The expected-loss-minimizing portfolio for district $i$ allocates across instruments in proportion to the *variance share* of each decomposed component, weighted by the adaptation elasticity:

1. **Adaptation investment need:** $A_i^* \propto \hat{\beta}_{\text{trend}} \times \tau_i \times (1 - \hat{\delta} \cdot \text{irrig}_i)$. Districts with high trend exposure and low existing irrigation require long-term infrastructure lending at *concessional* rates. Raising $r_i$ for these districts is counterproductive — it restricts adaptation that would reduce future default.

2. **Parametric insurance demand:** $I_i^* \propto \hat{\beta}_{\text{cov}} \times \widehat{\text{Var}}(\omega) \times \text{area}_i$. The optimal strike price for a rainfall-index product is derived from $\hat{\beta}_{\text{cov}}$ and the covariate shock distribution. This component is *transferable* to insurers/reinsurers and should not load onto NABARD's credit portfolio.

3. **Residual credit risk adjustment (CRAF):** $\Delta r_i \propto \hat{\beta}_{\text{idio}} \times \widehat{\text{Var}}(\varepsilon^C_i) \times (1 - \hat{\delta} \cdot \text{irrig}_i)$. Only the idiosyncratic, non-insurable residual should adjust the lending rate. This is the *true* credit risk — diversifiable across NABARD's portfolio but relevant for individual district pricing.

## 4. The Feedback Loop

A critical feature absent from standard credit risk models: **the lending rate itself affects default probability through adaptation.** When NABARD raises $r_i$ in response to perceived climate risk:

$$r_i \uparrow \;\Longrightarrow\; L_i \downarrow \;\Longrightarrow\; a_i \downarrow \;\Longrightarrow\; \text{PD}_i \uparrow$$

This is a *credit-climate doom loop*: districts most exposed to climate trends face higher rates, which constrain adaptation investment, which increases vulnerability, which further raises rates. The decomposition breaks this loop by identifying which component of $C_i$ is addressable by adaptation (trend) versus insurable (covariate) versus genuine credit risk (idiosyncratic).

## 5. Value of Information

Let $\mathcal{L}^H$ denote NABARD's expected portfolio loss under homogeneous pricing (current regime) and $\mathcal{L}^D$ under decomposition-based pricing. The value of the ClimateStack is:

$$\text{VoI} = \mathcal{L}^H - \mathcal{L}^D$$

**Back-of-envelope.** NABARD's outstanding agricultural credit is approximately ₹5 lakh crore. If homogeneous pricing induces 0.5–1.0 percentage points of excess NPAs in climate-exposed districts (through the doom loop above), the annual cost is ₹2,500–5,000 crore. Even capturing 10–20% of this mispricing through better decomposition yields ₹250–1,000 crore in annual loss reduction — a conservative lower bound on VoI, before accounting for welfare gains to farmers from appropriate adaptation investment.

## References

- Burke, M. & Emerick, K. (2016). Adaptation to climate change: Evidence from US agriculture. *American Economic Journal: Economic Policy*, 8(3), 106–140. — Adaptation measurement via long-difference estimator.
- Conley, T. G. (1999). GMM estimation with cross sectional dependence. *Journal of Econometrics*, 92(1), 1–45. — Spatial HAC inference for climate panels.
- Dell, M., Jones, B. F., & Olken, B. A. (2014). What do we learn from the weather? The new climate-economy literature. *Journal of Economic Literature*, 52(3), 740–798. — Canonical framework for climate-economy panels.
- Merton, R. C. (1974). On the pricing of corporate debt: The risk structure of interest rates. *Journal of Finance*, 29(2), 449–470. — Structural credit risk model underlying PD framework.
- Schlenker, W. & Roberts, M. J. (2009). Nonlinear temperature effects indicate severe damages to U.S. crop yields under climate change. *PNAS*, 106(37), 15594–15598. — Nonlinear yield-temperature relationship motivating our specification.
