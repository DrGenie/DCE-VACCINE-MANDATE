// script.js
(() => {
  "use strict";

  // ---------------------------------------------------------------------------
  // GLOBAL STATE & PLACEHOLDER DATA STRUCTURES
  // ---------------------------------------------------------------------------

  const state = {
    country: "Australia",
    context: "mild",
    benefitMetric: "A",
    mandate: {
      type: "soft",
      targetGroup: "all_adults",
      enforcementIntensity: 5,
      incentives: 5,
      exemptions: "balanced",
      testingOption: "none",
    },
    epi: {
      population: 1_000_000,
      baselineUptake: 0.7,
      attackRate: 0.25,
      r0: 4,
      ve: 0.85,
      ifr: 0.005,
      hospRisk: 0.05,
      icuRisk: 0.01,
    },
    econ: {
      wtpQaly: 50_000,
      discountRate: 0.03,
      vsl: 7_000_000,
      vsly: 250_000,
      qalyLossDeath: 8,
      qalyLossCase: 0.02,
    },
    psa: {
      runs: 1000,
      variationPct: 20,
      results: null,
    },
    costs: {
      policyDrafting: { active: true, value: 500_000 },
      legalPrep: { active: true, value: 300_000 },
      communications: { active: true, value: 800_000 },
      itSystems: { active: true, value: 1_200_000 },
      exemptionProcessing: { active: true, value: 400_000 },
      enforcement: { active: true, value: 900_000 },
      extraCapacity: { active: true, value: 1_500_000 },

      managementTime: { active: true, value: 600_000 },
      ptoVaccination: { active: true, value: 500_000 },
      ptoSideEffects: { active: true, value: 400_000 },
      recordKeeping: { active: true, value: 250_000 },
      testingCosts: { active: true, value: 700_000 },
      staffingDisruptions: { active: true, value: 800_000 },

      vaccineProcurement: { active: true, value: 2_000_000 },
      coldChain: { active: true, value: 500_000 },
      logistics: { active: true, value: 600_000 },
      vaccinators: { active: true, value: 800_000 },
      trainingSupervision: { active: true, value: 300_000 },
      capitalEquipment: { active: true, value: 400_000 },
      utilitiesOverhead: { active: true, value: 350_000 },
      wasteDisposal: { active: true, value: 150_000 },

      trustErosion: { active: false, value: 0 },
      polarisation: { active: false, value: 0 },
      protests: { active: false, value: 0 },
      unmetCare: { active: false, value: 0 },
    },
  };

  // Placeholder DCE results: structure only. Replace with real estimates.
  const dceResults = {
    Australia: {
      mild: {
        // Example latent classes
        latentClasses: [
          {
            name: "Mandate supporters",
            share: 0.75,
            // Placeholder intercept and weights – replace with MXL/LC estimates
            baseIntercept: 0.7,
            mandateIntensityWeight: 0.12,
            incentiveWeight: 0.06,
            enforcementWeight: 0.08,
          },
          {
            name: "Mandate resisters",
            share: 0.25,
            baseIntercept: 0.3,
            mandateIntensityWeight: 0.04,
            incentiveWeight: 0.02,
            enforcementWeight: -0.02,
          },
        ],
      },
      severe: {
        latentClasses: [
          {
            name: "Mandate supporters",
            share: 0.8,
            baseIntercept: 0.8,
            mandateIntensityWeight: 0.16,
            incentiveWeight: 0.08,
            enforcementWeight: 0.1,
          },
          {
            name: "Mandate resisters",
            share: 0.2,
            baseIntercept: 0.4,
            mandateIntensityWeight: 0.06,
            incentiveWeight: 0.03,
            enforcementWeight: 0,
          },
        ],
      },
    },
    France: {
      mild: {
        latentClasses: [
          {
            name: "Mandate supporters",
            share: 0.7,
            baseIntercept: 0.65,
            mandateIntensityWeight: 0.1,
            incentiveWeight: 0.05,
            enforcementWeight: 0.07,
          },
          {
            name: "Mandate resisters",
            share: 0.3,
            baseIntercept: 0.28,
            mandateIntensityWeight: 0.03,
            incentiveWeight: 0.02,
            enforcementWeight: -0.02,
          },
        ],
      },
      severe: {
        latentClasses: [
          {
            name: "Mandate supporters",
            share: 0.78,
            baseIntercept: 0.75,
            mandateIntensityWeight: 0.14,
            incentiveWeight: 0.07,
            enforcementWeight: 0.09,
          },
          {
            name: "Mandate resisters",
            share: 0.22,
            baseIntercept: 0.35,
            mandateIntensityWeight: 0.05,
            incentiveWeight: 0.03,
            enforcementWeight: 0,
          },
        ],
      },
    },
    Italy: {
      mild: {
        latentClasses: [
          {
            name: "Mandate supporters",
            share: 0.72,
            baseIntercept: 0.68,
            mandateIntensityWeight: 0.11,
            incentiveWeight: 0.06,
            enforcementWeight: 0.08,
          },
          {
            name: "Mandate resisters",
            share: 0.28,
            baseIntercept: 0.3,
            mandateIntensityWeight: 0.04,
            incentiveWeight: 0.02,
            enforcementWeight: -0.02,
          },
        ],
      },
      severe: {
        latentClasses: [
          {
            name: "Mandate supporters",
            share: 0.8,
            baseIntercept: 0.78,
            mandateIntensityWeight: 0.15,
            incentiveWeight: 0.08,
            enforcementWeight: 0.1,
          },
          {
            name: "Mandate resisters",
            share: 0.2,
            baseIntercept: 0.38,
            mandateIntensityWeight: 0.06,
            incentiveWeight: 0.03,
            enforcementWeight: 0,
          },
        ],
      },
    },
  };

  // Placeholder descriptive statistics – plug your own country-specific values
  const descriptiveStats = {
    Australia: {
      overall: {
        "Sample size (N)": 2000,
        "Mean age (years)": 52.3,
        "Female (%)": 0.51,
        "University degree (%)": 0.38,
        "High vaccine confidence (%)": 0.62,
        "Left-of-centre political orientation (%)": 0.41,
      },
      mild: {
        "Sample size (N)": 1000,
        "Mean age (years)": 51.8,
        "Female (%)": 0.52,
      },
      severe: {
        "Sample size (N)": 1000,
        "Mean age (years)": 52.8,
        "Female (%)": 0.50,
      },
      classes: {
        "Mandate supporters": {
          "Class share (%)": 0.75,
          "High vaccine confidence (%)": 0.82,
        },
        "Mandate resisters": {
          "Class share (%)": 0.25,
          "High vaccine confidence (%)": 0.12,
        },
      },
    },
    France: {
      overall: {
        "Sample size (N)": 2000,
        "Mean age (years)": 49.1,
        "Female (%)": 0.52,
      },
      mild: {
        "Sample size (N)": 1000,
      },
      severe: {
        "Sample size (N)": 1000,
      },
      classes: {
        "Mandate supporters": {
          "Class share (%)": 0.7,
        },
        "Mandate resisters": {
          "Class share (%)": 0.3,
        },
      },
    },
    Italy: {
      overall: {
        "Sample size (N)": 2000,
        "Mean age (years)": 50.2,
        "Female (%)": 0.5,
      },
      mild: {
        "Sample size (N)": 1000,
      },
      severe: {
        "Sample size (N)": 1000,
      },
      classes: {
        "Mandate supporters": {
          "Class share (%)": 0.72,
        },
        "Mandate resisters": {
          "Class share (%)": 0.28,
        },
      },
    },
  };

  // Placeholder equity parameters (replace with SES/age-specific results)
  const equityParams = {
    subgroups: ["Low SES", "Middle SES", "High SES"],
    weights: {
      "Low SES": 1.3,
      "Middle SES": 1.0,
      "High SES": 0.8,
    },
    // Distribution of QALY gains will be derived proportional to weights by default
  };

  // ---------------------------------------------------------------------------
  // DOM CACHE
  // ---------------------------------------------------------------------------
  const dom = {};

  function cacheDom() {
    dom.countrySelect = document.getElementById("country-select");
    dom.contextSelect = document.getElementById("context-select");
    dom.benefitMetricSelect = document.getElementById("benefit-metric-select");

    dom.mandateTypeSelect = document.getElementById("mandate-type-select");
    dom.targetGroupSelect = document.getElementById("target-group-select");
    dom.enforcementRange = document.getElementById("enforcement-intensity-range");
    dom.incentivesRange = document.getElementById("incentives-range");
    dom.exemptionsSelect = document.getElementById("exemptions-select");
    dom.testingOptionSelect = document.getElementById("testing-option-select");

    dom.populationInput = document.getElementById("population-input");
    dom.baselineUptakeInput = document.getElementById("baseline-uptake-input");
    dom.attackRateInput = document.getElementById("attack-rate-input");
    dom.r0Input = document.getElementById("r0-input");
    dom.veInput = document.getElementById("ve-input");
    dom.ifrInput = document.getElementById("ifr-input");
    dom.hospRiskInput = document.getElementById("hosp-risk-input");
    dom.icuRiskInput = document.getElementById("icu-risk-input");

    dom.wtpInput = document.getElementById("wtp-input");
    dom.discountRateInput = document.getElementById("discount-rate-input");
    dom.vslInput = document.getElementById("vsl-input");
    dom.vslyInput = document.getElementById("vsly-input");
    dom.qalyLossDeathInput = document.getElementById("qaly-loss-death-input");
    dom.qalyLossCaseInput = document.getElementById("qaly-loss-case-input");

    dom.costToggles = document.querySelectorAll(".cost-toggle");
    dom.costInputs = document.querySelectorAll(".cost-input");

    dom.psaRunsInput = document.getElementById("psa-runs-input");
    dom.psaVariationInput = document.getElementById("psa-variation-input");
    dom.runPsaBtn = document.getElementById("run-psa-btn");
    dom.psaStatus = document.getElementById("psa-status");

    dom.kpiUptakePm = document.getElementById("kpi-uptake-pm");
    dom.kpiUptakeDelta = document.getElementById("kpi-uptake-delta");
    dom.kpiAdditionalVaccinated = document.getElementById("kpi-additional-vaccinated");
    dom.kpiCasesAverted = document.getElementById("kpi-cases-averted");
    dom.kpiQalysGained = document.getElementById("kpi-qalys-gained");
    dom.kpiTotalCost = document.getElementById("kpi-total-cost");
    dom.kpiNmb = document.getElementById("kpi-nmb");

    dom.lcUptakeTableBody = document.getElementById("lc-uptake-table-body");

    dom.tblCasesAverted = document.getElementById("tbl-cases-averted");
    dom.tblHospAverted = document.getElementById("tbl-hosp-averted");
    dom.tblIcuAverted = document.getElementById("tbl-icu-averted");
    dom.tblDeathsAverted = document.getElementById("tbl-deaths-averted");
    dom.tblQalysGained = document.getElementById("tbl-qalys-gained");
    dom.tblDalysAverted = document.getElementById("tbl-dalys-averted");
    dom.tblMonetisedBenefits = document.getElementById("tbl-monetised-benefits");

    dom.tblPublicCosts = document.getElementById("tbl-public-costs");
    dom.tblEmployerCosts = document.getElementById("tbl-employer-costs");
    dom.tblProgrammeCosts = document.getElementById("tbl-programme-costs");
    dom.tblSocialCosts = document.getElementById("tbl-social-costs");
    dom.tblTotalCosts = document.getElementById("tbl-total-costs");

    dom.tblCerVaccinated = document.getElementById("tbl-cer-vaccinated");
    dom.tblCerCase = document.getElementById("tbl-cer-case");
    dom.tblCerDeath = document.getElementById("tbl-cer-death");
    dom.tblCerQaly = document.getElementById("tbl-cer-qaly");
    dom.tblCerDaly = document.getElementById("tbl-cer-daly");
    dom.tblBcr = document.getElementById("tbl-bcr");
    dom.tblPayback = document.getElementById("tbl-payback");

    dom.equityTableBody = document.getElementById("equity-table-body");
    dom.descriptiveScopeSelect = document.getElementById("desc-scope-select");
    dom.descriptiveTableBody = document.getElementById("descriptive-table-body");

    dom.tabs = document.querySelectorAll(".tab");
    dom.tabContents = document.querySelectorAll(".tab-content");

    dom.methodsDrawer = document.getElementById("methods-drawer");
    dom.toggleMethodsBtn = document.getElementById("toggle-methods-btn");
    dom.closeMethodsBtn = document.getElementById("close-methods-btn");
    dom.exportPolicyBriefBtn = document.getElementById("export-policy-brief-btn");

    // Charts
    dom.uptakeChartCanvas = document.getElementById("uptake-chart");
    dom.benefitChartCanvas = document.getElementById("benefit-chart");
    dom.economicChartCanvas = document.getElementById("economic-chart");
    dom.equityChartCanvas = document.getElementById("equity-chart");
    dom.tornadoChartCanvas = document.getElementById("tornado-chart");
    dom.ceacChartCanvas = document.getElementById("ceac-chart");
  }

  // ---------------------------------------------------------------------------
  // EVENT BINDING
  // ---------------------------------------------------------------------------
  function bindEvents() {
    dom.countrySelect.addEventListener("change", () => {
      state.country = dom.countrySelect.value;
      updateAll();
    });

    dom.contextSelect.addEventListener("change", () => {
      state.context = dom.contextSelect.value;
      updateAll();
    });

    dom.benefitMetricSelect.addEventListener("change", () => {
      state.benefitMetric = dom.benefitMetricSelect.value;
      updateAll();
    });

    dom.mandateTypeSelect.addEventListener("change", () => {
      state.mandate.type = dom.mandateTypeSelect.value;
      updateAll();
    });
    dom.targetGroupSelect.addEventListener("change", () => {
      state.mandate.targetGroup = dom.targetGroupSelect.value;
      updateAll();
    });
    dom.enforcementRange.addEventListener("input", () => {
      state.mandate.enforcementIntensity = toNumber(dom.enforcementRange.value);
      updateAll();
    });
    dom.incentivesRange.addEventListener("input", () => {
      state.mandate.incentives = toNumber(dom.incentivesRange.value);
      updateAll();
    });
    dom.exemptionsSelect.addEventListener("change", () => {
      state.mandate.exemptions = dom.exemptionsSelect.value;
      updateAll();
    });
    dom.testingOptionSelect.addEventListener("change", () => {
      state.mandate.testingOption = dom.testingOptionSelect.value;
      updateAll();
    });

    // Epidemiology
    dom.populationInput.addEventListener("input", () => {
      state.epi.population = clampPositiveInt(dom.populationInput.value, 0);
      updateAll();
    });
    dom.baselineUptakeInput.addEventListener("input", () => {
      state.epi.baselineUptake = clamp(dom.baselineUptakeInput.value, 0, 1);
      updateAll();
    });
    dom.attackRateInput.addEventListener("input", () => {
      state.epi.attackRate = clamp(dom.attackRateInput.value, 0, 1);
      updateAll();
    });
    dom.r0Input.addEventListener("input", () => {
      state.epi.r0 = clampPositive(dom.r0Input.value, 0);
      updateAll();
    });
    dom.veInput.addEventListener("input", () => {
      state.epi.ve = clamp(dom.veInput.value, 0, 1);
      updateAll();
    });
    dom.ifrInput.addEventListener("input", () => {
      state.epi.ifr = clamp(dom.ifrInput.value, 0, 0.1);
      updateAll();
    });
    dom.hospRiskInput.addEventListener("input", () => {
      state.epi.hospRisk = clamp(dom.hospRiskInput.value, 0, 0.5);
      updateAll();
    });
    dom.icuRiskInput.addEventListener("input", () => {
      state.epi.icuRisk = clamp(dom.icuRiskInput.value, 0, 0.5);
      updateAll();
    });

    // Econ
    dom.wtpInput.addEventListener("input", () => {
      state.econ.wtpQaly = clampPositive(dom.wtpInput.value, 0);
      updateAll();
    });
    dom.discountRateInput.addEventListener("input", () => {
      state.econ.discountRate = clamp(dom.discountRateInput.value, 0, 0.1);
      updateAll();
    });
    dom.vslInput.addEventListener("input", () => {
      state.econ.vsl = clampPositive(dom.vslInput.value, 0);
      updateAll();
    });
    dom.vslyInput.addEventListener("input", () => {
      state.econ.vsly = clampPositive(dom.vslyInput.value, 0);
      updateAll();
    });
    dom.qalyLossDeathInput.addEventListener("input", () => {
      state.econ.qalyLossDeath = clampPositive(dom.qalyLossDeathInput.value, 0);
      updateAll();
    });
    dom.qalyLossCaseInput.addEventListener("input", () => {
      state.econ.qalyLossCase = clampPositive(dom.qalyLossCaseInput.value, 0);
      updateAll();
    });

    // Costs
    dom.costToggles.forEach((toggle) => {
      toggle.addEventListener("change", () => {
        const id = toggle.dataset.costId;
        if (state.costs[id]) {
          state.costs[id].active = toggle.checked;
          updateAll();
        }
      });
    });
    dom.costInputs.forEach((input) => {
      input.addEventListener("input", () => {
        const id = input.dataset.costId;
        if (state.costs[id]) {
          state.costs[id].value = clampPositive(input.value, 0);
          updateAll();
        }
      });
    });

    // PSA controls
    dom.psaRunsInput.addEventListener("input", () => {
      state.psa.runs = clampPositiveInt(dom.psaRunsInput.value, 100);
    });
    dom.psaVariationInput.addEventListener("input", () => {
      state.psa.variationPct = clampPositive(dom.psaVariationInput.value, 1);
    });
    dom.runPsaBtn.addEventListener("click", () => {
      runProbabilisticSensitivity();
    });

    // Tabs
    dom.tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.tab;
        dom.tabs.forEach((t) => t.classList.remove("active"));
        dom.tabContents.forEach((c) => c.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById(target).classList.add("active");
      });
    });

    // Methods drawer
    dom.toggleMethodsBtn.addEventListener("click", () => {
      dom.methodsDrawer.classList.add("open");
    });
    dom.closeMethodsBtn.addEventListener("click", () => {
      dom.methodsDrawer.classList.remove("open");
    });
    dom.methodsDrawer.addEventListener("click", (e) => {
      if (e.target === dom.methodsDrawer) {
        dom.methodsDrawer.classList.remove("open");
      }
    });

    // Descriptive stats
    dom.descriptiveScopeSelect.addEventListener("change", () => {
      renderDescriptiveStats();
    });

    // Export
    dom.exportPolicyBriefBtn.addEventListener("click", () => {
      exportPolicyBrief();
    });
  }

  // ---------------------------------------------------------------------------
  // NUMERIC HELPERS
  // ---------------------------------------------------------------------------
  function toNumber(val) {
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
  }

  function clamp(val, min, max) {
    const n = toNumber(val);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function clampPositive(val, min) {
    const n = toNumber(val);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, n);
  }

  function clampPositiveInt(val, min) {
    return Math.round(clampPositive(val, min));
  }

  function formatNumber(num, decimals = 0) {
    if (!Number.isFinite(num)) return "–";
    return num.toLocaleString(undefined, {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    });
  }

  // ---------------------------------------------------------------------------
  // DCE UPTAKE ENGINE
  // ---------------------------------------------------------------------------
  function computeMandateIntensity(mandate) {
    // Simple index combining type, enforcement, incentives, exemptions, and testing
    let score = 0;

    switch (mandate.type) {
      case "none":
        score += 0;
        break;
      case "soft":
        score += 1;
        break;
      case "sectoral":
        score += 2;
        break;
      case "broad":
        score += 3;
        break;
    }

    switch (mandate.targetGroup) {
      case "all_adults":
        score += 1.5;
        break;
      case "older_adults":
        score += 1;
        break;
      case "health_workers":
      case "essential_workers":
        score += 1.2;
        break;
    }

    score += mandate.enforcementIntensity / 4; // 0–2.5
    score += mandate.incentives / 5; // 0–2

    switch (mandate.exemptions) {
      case "lenient":
        score -= 0.5;
        break;
      case "balanced":
        break;
      case "strict":
        score += 0.5;
        break;
    }

    switch (mandate.testingOption) {
      case "none":
        score += 0.3;
        break;
      case "weekly":
        score += 0.1;
        break;
      case "frequent":
        score += 0;
        break;
    }

    return score;
  }

  function logistic(x) {
    return 1 / (1 + Math.exp(-x));
  }

  function computeDceUptake() {
    const countryData = dceResults[state.country]?.[state.context];
    const { baselineUptake } = state.epi;

    if (!countryData || !countryData.latentClasses) {
      return {
        pm: baselineUptake,
        deltaP: 0,
        classUptake: [],
      };
    }

    const intensity = computeMandateIntensity(state.mandate);

    let pm = 0;
    const classUptake = [];

    countryData.latentClasses.forEach((cls) => {
      // Placeholder linear utility mapping – replace with full U = ASC + βX
      const u =
        cls.baseIntercept +
        cls.mandateIntensityWeight * intensity +
        cls.incentiveWeight * (state.mandate.incentives / 10) +
        cls.enforcementWeight * (state.mandate.enforcementIntensity / 10);

      const uptake = logistic(u); // between 0 and 1
      pm += cls.share * uptake;
      classUptake.push({
        name: cls.name,
        share: cls.share,
        uptake,
      });
    });

    // Ensure not below baseline in "no mandate" scenario
    if (state.mandate.type === "none") {
      pm = baselineUptake;
      classUptake.forEach((c) => {
        c.uptake = baselineUptake;
      });
    }

    const deltaP = pm - baselineUptake;

    return {
      pm,
      deltaP,
      classUptake,
    };
  }

  // ---------------------------------------------------------------------------
  // BENEFITS & EPIDEMIOLOGY
  // ---------------------------------------------------------------------------
  function computeBenefits(uptakeResult) {
    const { epi, econ, benefitMetric, country, context } = {
      epi: state.epi,
      econ: state.econ,
      benefitMetric: state.benefitMetric,
      country: state.country,
      context: state.context,
    };

    const { population, baselineUptake, attackRate, ve, ifr, hospRisk, icuRisk } =
      epi;
    const { qalyLossDeath, qalyLossCase, vsl, vsly } = econ;

    const pm = uptakeResult.pm;
    const deltaP = uptakeResult.deltaP;

    // BENEFIT METRIC A — Additional vaccinated
    const deltaV = population * deltaP;

    // Cases averted using static attack-rate approximation
    const casesNoMandate = population * attackRate * (1 - baselineUptake * ve);
    const casesMandate = population * attackRate * (1 - pm * ve);
    const casesAverted = Math.max(0, casesNoMandate - casesMandate);

    // Hospitalisations, ICU, deaths averted (approx)
    const hospAverted = casesAverted * hospRisk;
    const icuAverted = casesAverted * icuRisk;
    const deathsNoMandate = casesNoMandate * ifr;
    const deathsMandate = casesMandate * ifr;
    const deathsAverted = Math.max(0, deathsNoMandate - deathsMandate);

    // QALYs gained: mortality + morbidity (acute + long-COVID placeholder)
    const qalyMortality = deathsAverted * qalyLossDeath;
    const qalyMorbidity = casesAverted * qalyLossCase;
    const qalyGained = qalyMortality + qalyMorbidity;

    // Simplified DALYs averted (YLL ~ qalyMortality, YLD ~ qalyMorbidity)
    const dalysAverted = qalyGained;

    // Monetised benefits: mortality + morbidity monetised
    const monetisedMortality = deathsAverted * vsl;
    const monetisedMorbidity = qalyMorbidity * vsly;
    const monetisedBenefits = monetisedMortality + monetisedMorbidity;

    // Equity-weighted metrics will be added downstream
    const benefitBundle = {
      country,
      context,
      pm,
      deltaP,
      deltaV,
      casesAverted,
      hospAverted,
      icuAverted,
      deathsAverted,
      qalyGained,
      dalysAverted,
      monetisedBenefits,
    };

    // Benefit metric selection (for robustness comparisons the whole bundle is returned)
    benefitBundle.activeMetric = benefitMetric;

    return benefitBundle;
  }

  // ---------------------------------------------------------------------------
  // COSTS & ECONOMIC EVALUATION
  // ---------------------------------------------------------------------------
  function computeCosts() {
    let publicCosts = 0;
    let employerCosts = 0;
    let programmeCosts = 0;
    let socialCosts = 0;

    const addIfActive = (key, type) => {
      const item = state.costs[key];
      if (!item) return;
      if (!item.active) return;
      const value = Number(item.value) || 0;
      if (type === "public") publicCosts += value;
      if (type === "employer") employerCosts += value;
      if (type === "programme") programmeCosts += value;
      if (type === "social") socialCosts += value;
    };

    // Public
    addIfActive("policyDrafting", "public");
    addIfActive("legalPrep", "public");
    addIfActive("communications", "public");
    addIfActive("itSystems", "public");
    addIfActive("exemptionProcessing", "public");
    addIfActive("enforcement", "public");
    addIfActive("extraCapacity", "public");

    // Employer
    addIfActive("managementTime", "employer");
    addIfActive("ptoVaccination", "employer");
    addIfActive("ptoSideEffects", "employer");
    addIfActive("recordKeeping", "employer");
    addIfActive("testingCosts", "employer");
    addIfActive("staffingDisruptions", "employer");

    // Programme
    addIfActive("vaccineProcurement", "programme");
    addIfActive("coldChain", "programme");
    addIfActive("logistics", "programme");
    addIfActive("vaccinators", "programme");
    addIfActive("trainingSupervision", "programme");
    addIfActive("capitalEquipment", "programme");
    addIfActive("utilitiesOverhead", "programme");
    addIfActive("wasteDisposal", "programme");

    // Social
    addIfActive("trustErosion", "social");
    addIfActive("polarisation", "social");
    addIfActive("protests", "social");
    addIfActive("unmetCare", "social");

    const totalCosts = publicCosts + employerCosts + programmeCosts + socialCosts;

    return {
      publicCosts,
      employerCosts,
      programmeCosts,
      socialCosts,
      totalCosts,
    };
  }

  function computeEconomicEvaluation(benefits, costs) {
    const { econ } = state;
    const { wtpQaly } = econ;

    const { deltaV, casesAverted, deathsAverted, qalyGained, dalysAverted, monetisedBenefits } =
      benefits;
    const { totalCosts } = costs;

    const costPerVaccinated =
      deltaV > 0 ? totalCosts / deltaV : Number.POSITIVE_INFINITY;
    const costPerCase = casesAverted > 0 ? totalCosts / casesAverted : Number.POSITIVE_INFINITY;
    const costPerDeath =
      deathsAverted > 0 ? totalCosts / deathsAverted : Number.POSITIVE_INFINITY;
    const costPerQaly =
      qalyGained > 0 ? totalCosts / qalyGained : Number.POSITIVE_INFINITY;
    const costPerDaly =
      dalysAverted > 0 ? totalCosts / dalysAverted : Number.POSITIVE_INFINITY;

    const nmb = qalyGained * wtpQaly - totalCosts;
    const bcr = totalCosts > 0 ? monetisedBenefits / totalCosts : null;

    // Simple payback (years) from monetised benefits vs initial costs
    const annualBenefits = monetisedBenefits;
    const paybackTime =
      annualBenefits > 0 ? totalCosts / annualBenefits : Number.POSITIVE_INFINITY;

    return {
      costPerVaccinated,
      costPerCase,
      costPerDeath,
      costPerQaly,
      costPerDaly,
      nmb,
      bcr,
      paybackTime,
    };
  }

  // ---------------------------------------------------------------------------
  // EQUITY MODULE
  // ---------------------------------------------------------------------------
  function computeEquity(benefits) {
    const totalQalys = benefits.qalyGained;
    if (!Number.isFinite(totalQalys) || totalQalys <= 0) {
      return {
        subgroupResults: [],
        equityWeightedQalys: 0,
      };
    }

    const { subgroups, weights } = equityParams;
    const totalWeight = subgroups.reduce((acc, g) => acc + (weights[g] || 1), 0);

    const subgroupResults = subgroups.map((group) => {
      const w = weights[group] || 1;
      const share = w / totalWeight;
      const qalys = totalQalys * share;
      const weightedQalys = qalys * w;
      return {
        group,
        weight: w,
        qalys,
        weightedQalys,
      };
    });

    const equityWeightedQalys = subgroupResults.reduce(
      (acc, r) => acc + r.weightedQalys,
      0
    );

    return {
      subgroupResults,
      equityWeightedQalys,
    };
  }

  // ---------------------------------------------------------------------------
  // SENSITIVITY & PSA
  // ---------------------------------------------------------------------------
  function runDeterministicSensitivity(benefits, costs, econEval) {
    // Simple tornado: vary a subset of key parameters ± variationPct
    const variation = state.psa.variationPct / 100;
    const baseCostPerQaly = econEval.costPerQaly;

    const drivers = [
      {
        key: "ve",
        label: "Vaccine effectiveness",
        type: "epi",
      },
      {
        key: "attackRate",
        label: "Attack rate",
        type: "epi",
      },
      {
        key: "vsl",
        label: "Value of statistical life",
        type: "econ",
      },
      {
        key: "qalyLossDeath",
        label: "QALY loss per death",
        type: "econ",
      },
      {
        key: "totalCosts",
        label: "Programme & implementation costs",
        type: "costs",
      },
    ];

    const bars = [];

    drivers.forEach((driver) => {
      const { key, label, type } = driver;

      // Clone state
      const originalEpi = { ...state.epi };
      const originalEcon = { ...state.econ };
      const originalCosts = { ...costs };

      // Base value
      let baseVal;
      if (type === "epi") baseVal = originalEpi[key];
      else if (type === "econ") baseVal = originalEcon[key];
      else baseVal = originalCosts[key];

      const lowVal = baseVal * (1 - variation);
      const highVal = baseVal * (1 + variation);

      const computeCostPerQalyFor = (val) => {
        if (type === "epi") state.epi[key] = val;
        if (type === "econ") state.econ[key] = val;
        if (type === "costs") {
          const factor = val / baseVal;
          Object.keys(state.costs).forEach((cKey) => {
            state.costs[cKey].value *= factor;
          });
        }

        const uptakeRes = computeDceUptake();
        const benefitsRes = computeBenefits(uptakeRes);
        const costsRes = computeCosts();
        const econRes = computeEconomicEvaluation(benefitsRes, costsRes);
        return econRes.costPerQaly;
      };

      const lowCostPerQaly = computeCostPerQalyFor(lowVal);
      const highCostPerQaly = computeCostPerQalyFor(highVal);

      // Restore
      state.epi = originalEpi;
      state.econ = originalEcon;
      Object.keys(state.costs).forEach((cKey) => {
        state.costs[cKey].value = costs[cKey]?.value ?? state.costs[cKey].value;
      });

      bars.push({
        label,
        low: lowCostPerQaly,
        high: highCostPerQaly,
        base: baseCostPerQaly,
      });
    });

    // Sort by width
    bars.sort((a, b) => {
      const rangeA = Math.abs(a.high - a.low);
      const rangeB = Math.abs(b.high - b.low);
      return rangeB - rangeA;
    });

    renderTornadoChart(bars);
  }

  function runProbabilisticSensitivity() {
    const runs = state.psa.runs;
    const variation = state.psa.variationPct / 100;

    dom.psaStatus.textContent = "Running PSA...";
    dom.runPsaBtn.disabled = true;

    // Short delay to allow UI to update
    setTimeout(() => {
      const { epi, econ } = state;
      const { wtpQaly } = econ;

      const results = [];

      for (let i = 0; i < runs; i++) {
        // Sample key parameters with uniform ±variation
        const epiSample = {
          ...epi,
          ve: epi.ve * randomFactor(variation),
          attackRate: epi.attackRate * randomFactor(variation),
          ifr: epi.ifr * randomFactor(variation),
        };
        const econSample = {
          ...econ,
          qalyLossDeath: econ.qalyLossDeath * randomFactor(variation),
          qalyLossCase: econ.qalyLossCase * randomFactor(variation),
        };

        // Temporarily override state
        const originalEpi = state.epi;
        const originalEcon = state.econ;
        state.epi = epiSample;
        state.econ = econSample;

        const uptakeRes = computeDceUptake();
        const benefits = computeBenefits(uptakeRes);
        const costs = computeCosts();
        const econEval = computeEconomicEvaluation(benefits, costs);

        const nmb = econEval.nmb;
        const costPerQaly = econEval.costPerQaly;

        results.push({
          nmb,
          costPerQaly,
        });

        // Restore
        state.epi = originalEpi;
        state.econ = originalEcon;
      }

      state.psa.results = results;

      renderCeacChart(results, wtpQaly);
      dom.psaStatus.textContent = `PSA completed with ${runs.toLocaleString()} runs.`;
      dom.runPsaBtn.disabled = false;
    }, 50);
  }

  function randomFactor(variation) {
    const u = Math.random() * 2 - 1; // [-1, 1]
    return 1 + variation * u;
  }

  // ---------------------------------------------------------------------------
  // CHARTS
  // ---------------------------------------------------------------------------
  const charts = {
    uptake: null,
    benefit: null,
    economic: null,
    equity: null,
    tornado: null,
    ceac: null,
  };

  function initCharts() {
    // Uptake chart – cross-country comparison under current context & mandate intensity
    charts.uptake = new Chart(dom.uptakeChartCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: ["Australia", "France", "Italy"],
        datasets: [
          {
            label: "Predicted uptake (pₘ)",
            data: [0.7, 0.7, 0.7],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { intersect: false, mode: "index" },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 1,
          },
        },
      },
    });

    charts.benefit = new Chart(dom.benefitChartCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: [
          "Additional vaccinated",
          "Cases averted",
          "QALYs gained",
          "DALYs averted",
          "Monetised benefits",
        ],
        datasets: [
          {
            label: "Value",
            data: [0, 0, 0, 0, 0],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });

    charts.economic = new Chart(dom.economicChartCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: ["Total costs", "Monetised benefits"],
        datasets: [
          {
            label: "Amount",
            data: [0, 0],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });

    charts.equity = new Chart(dom.equityChartCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: equityParams.subgroups,
        datasets: [
          {
            label: "Weighted QALYs",
            data: [0, 0, 0],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });

    charts.tornado = new Chart(dom.tornadoChartCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "Low",
            data: [],
          },
          {
            label: "High",
            data: [],
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        plugins: {
          legend: { display: true },
        },
        scales: {
          x: {
            beginAtZero: true,
          },
        },
      },
    });

    charts.ceac = new Chart(dom.ceacChartCanvas.getContext("2d"), {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Pr(cost-effective)",
            data: [],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 1,
          },
        },
      },
    });
  }

  function renderUptakeChart(currentUptake) {
    const labels = ["Australia", "France", "Italy"];
    const data = labels.map((country) => {
      const originalCountry = state.country;
      state.country = country;
      const res = computeDceUptake();
      state.country = originalCountry;
      return res.pm;
    });

    charts.uptake.data.datasets[0].data = data;
    charts.uptake.update();
  }

  function renderBenefitChart(benefits) {
    charts.benefit.data.datasets[0].data = [
      benefits.deltaV,
      benefits.casesAverted,
      benefits.qalyGained,
      benefits.dalysAverted,
      benefits.monetisedBenefits,
    ];
    charts.benefit.update();
  }

  function renderEconomicChart(benefits, costs) {
    charts.economic.data.datasets[0].data = [
      costs.totalCosts,
      benefits.monetisedBenefits,
    ];
    charts.economic.update();
  }

  function renderEquityChart(equity) {
    const labels = equity.subgroupResults.map((r) => r.group);
    const data = equity.subgroupResults.map((r) => r.weightedQalys);

    charts.equity.data.labels = labels;
    charts.equity.data.datasets[0].data = data;
    charts.equity.update();
  }

  function renderTornadoChart(bars) {
    const labels = bars.map((b) => b.label);
    const lowVals = bars.map((b) => b.low);
    const highVals = bars.map((b) => b.high);

    charts.tornado.data.labels = labels;
    charts.tornado.data.datasets[0].data = lowVals;
    charts.tornado.data.datasets[1].data = highVals;
    charts.tornado.update();
  }

  function renderCeacChart(results, wtpQaly) {
    if (!results || results.length === 0) return;

    // For simplicity, CEAC across WTP grid by scaling around current wtpQaly
    const thresholds = [];
    const probs = [];

    for (let i = 0; i <= 8; i++) {
      const factor = 0.25 + i * 0.15; // 0.25–1.45
      const lambda = wtpQaly * factor;
      thresholds.push(lambda);

      const nmbs = results.map((r) => r.costPerQaly);
      const prob = results.filter((r) => r.costPerQaly <= lambda).length / results.length;
      probs.push(prob);
    }

    charts.ceac.data.labels = thresholds.map((t) =>
      t.toLocaleString(undefined, { maximumFractionDigits: 0 })
    );
    charts.ceac.data.datasets[0].data = probs;
    charts.ceac.update();
  }

  // ---------------------------------------------------------------------------
  // RENDERING DOM TABLES & KPI
  // ---------------------------------------------------------------------------
  function renderKpis(benefits, costs, econEval) {
    const { pm, deltaP, deltaV, casesAverted, qalyGained } = benefits;
    const { totalCosts } = costs;
    const { nmb } = econEval;

    dom.kpiUptakePm.textContent = formatNumber(pm, 2);
    dom.kpiUptakeDelta.textContent = `Δ uptake vs baseline: ${formatNumber(
      deltaP * 100,
      1
    )} pp`;
    dom.kpiAdditionalVaccinated.textContent = formatNumber(deltaV, 0);
    dom.kpiCasesAverted.textContent = formatNumber(casesAverted, 0);
    dom.kpiQalysGained.textContent = formatNumber(qalyGained, 2);
    dom.kpiTotalCost.textContent = `\$${formatNumber(totalCosts, 0)}`;
    dom.kpiNmb.textContent = `\$${formatNumber(nmb, 0)}`;
  }

  function renderLcTable(uptakeRes) {
    const rows = uptakeRes.classUptake
      .map(
        (cls) => `
      <tr>
        <td>${cls.name}</td>
        <td>${formatNumber(cls.share * 100, 1)}%</td>
        <td>${formatNumber(cls.uptake, 2)}</td>
      </tr>`
      )
      .join("");
    dom.lcUptakeTableBody.innerHTML = rows || "<tr><td colspan='3'>No LC results defined.</td></tr>";
  }

  function renderBenefitsTable(benefits) {
    dom.tblCasesAverted.textContent = formatNumber(benefits.casesAverted, 0);
    dom.tblHospAverted.textContent = formatNumber(benefits.hospAverted, 0);
    dom.tblIcuAverted.textContent = formatNumber(benefits.icuAverted, 0);
    dom.tblDeathsAverted.textContent = formatNumber(benefits.deathsAverted, 0);
    dom.tblQalysGained.textContent = formatNumber(benefits.qalyGained, 2);
    dom.tblDalysAverted.textContent = formatNumber(benefits.dalysAverted, 2);
    dom.tblMonetisedBenefits.textContent = `\$${formatNumber(
      benefits.monetisedBenefits,
      0
    )}`;
  }

  function renderCostsTable(costs, benefits, econEval) {
    dom.tblPublicCosts.textContent = `\$${formatNumber(costs.publicCosts, 0)}`;
    dom.tblEmployerCosts.textContent = `\$${formatNumber(costs.employerCosts, 0)}`;
    dom.tblProgrammeCosts.textContent = `\$${formatNumber(costs.programmeCosts, 0)}`;
    dom.tblSocialCosts.textContent = `\$${formatNumber(costs.socialCosts, 0)}`;
    dom.tblTotalCosts.textContent = `\$${formatNumber(costs.totalCosts, 0)}`;

    dom.tblCerVaccinated.textContent = isFinite(econEval.costPerVaccinated)
      ? `\$${formatNumber(econEval.costPerVaccinated, 0)}`
      : "Not defined";
    dom.tblCerCase.textContent = isFinite(econEval.costPerCase)
      ? `\$${formatNumber(econEval.costPerCase, 0)}`
      : "Not defined";
    dom.tblCerDeath.textContent = isFinite(econEval.costPerDeath)
      ? `\$${formatNumber(econEval.costPerDeath, 0)}`
      : "Not defined";
    dom.tblCerQaly.textContent = isFinite(econEval.costPerQaly)
      ? `\$${formatNumber(econEval.costPerQaly, 0)}`
      : "Not defined";
    dom.tblCerDaly.textContent = isFinite(econEval.costPerDaly)
      ? `\$${formatNumber(econEval.costPerDaly, 0)}`
      : "Not defined";

    dom.tblBcr.textContent =
      econEval.bcr && Number.isFinite(econEval.bcr)
        ? formatNumber(econEval.bcr, 2)
        : "Not defined";
    dom.tblPayback.textContent = Number.isFinite(econEval.paybackTime)
      ? formatNumber(econEval.paybackTime, 2)
      : "Not defined";
  }

  function renderEquityTable(equity) {
    const rows = equity.subgroupResults
      .map(
        (r) => `
      <tr>
        <td>${r.group}</td>
        <td>${formatNumber(r.qalys, 2)}</td>
        <td>${formatNumber(r.weight, 2)}</td>
        <td>${formatNumber(r.weightedQalys, 2)}</td>
      </tr>`
      )
      .join("");
    dom.equityTableBody.innerHTML = rows || "<tr><td colspan='4'>No equity data.</td></tr>";
  }

  function renderDescriptiveStats() {
    const countryStats = descriptiveStats[state.country];
    if (!countryStats) {
      dom.descriptiveTableBody.innerHTML =
        "<tr><td colspan='2'>No descriptive statistics defined.</td></tr>";
      return;
    }

    const scope = dom.descriptiveScopeSelect.value;
    let dataObj;

    if (scope === "overall") {
      dataObj = countryStats.overall;
    } else if (scope === "context") {
      dataObj = countryStats[state.context] || countryStats.overall;
    } else {
      // class-level
      const classes = countryStats.classes || {};
      const rows = Object.entries(classes)
        .map(([clsName, obj]) => {
          const inner = Object.entries(obj)
            .map(
              ([k, v]) =>
                `<tr><td>${clsName} – ${k}</td><td>${formatNumberIfNeeded(v)}</td></tr>`
            )
            .join("");
          return inner;
        })
        .join("");
      dom.descriptiveTableBody.innerHTML =
        rows || "<tr><td colspan='2'>No latent class descriptive statistics.</td></tr>";
      return;
    }

    const rows = Object.entries(dataObj || {})
      .map(
        ([k, v]) =>
          `<tr><td>${k}</td><td>${formatNumberIfNeeded(v)}</td></tr>`
      )
      .join("");

    dom.descriptiveTableBody.innerHTML =
      rows || "<tr><td colspan='2'>No descriptive statistics.</td></tr>";
  }

  function formatNumberIfNeeded(v) {
    if (typeof v === "number") {
      // Heuristic: treat 0–1 as proportion
      if (v >= 0 && v <= 1 && v !== 0 && v !== 1) {
        return `${formatNumber(v * 100, 1)}%`;
      }
      return formatNumber(v, 2);
    }
    return String(v);
  }

  // ---------------------------------------------------------------------------
  // EXPORT POLICY BRIEF (PDF)
  // ---------------------------------------------------------------------------
  async function exportPolicyBrief() {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) return;

    const uptakeRes = computeDceUptake();
    const benefits = computeBenefits(uptakeRes);
    const costs = computeCosts();
    const econEval = computeEconomicEvaluation(benefits, costs);
    const equity = computeEquity(benefits);

    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const margin = 14;
    let y = margin;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Vaccine Mandate Policy Decision-Aid – Policy Brief", margin, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      `Country: ${state.country} · Outbreak context: ${state.context} · Mandate type: ${state.mandate.type}`,
      margin,
      y
    );
    y += 6;

    doc.text(
      `Target group: ${state.mandate.targetGroup} · Enforcement: ${state.mandate.enforcementIntensity}/10 · Incentives: ${state.mandate.incentives}/10`,
      margin,
      y
    );
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("1. DCE-based uptake", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.text(
      `Baseline uptake (p₀): ${formatNumber(state.epi.baselineUptake, 2)} · Uptake with mandate (pₘ): ${formatNumber(
        benefits.pm,
        2
      )} · Δ uptake: ${formatNumber(benefits.deltaP * 100, 1)} percentage points`,
      margin,
      y
    );
    y += 6;
    doc.text(
      `Additional vaccinated (ΔV): ${formatNumber(benefits.deltaV, 0)}`,
      margin,
      y
    );
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("2. Health outcomes", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.text(
      `Cases averted: ${formatNumber(benefits.casesAverted, 0)} · Hospitalisations averted: ${formatNumber(
        benefits.hospAverted,
        0
      )}`,
      margin,
      y
    );
    y += 6;
    doc.text(
      `ICU admissions averted: ${formatNumber(
        benefits.icuAverted,
        0
      )} · Deaths averted: ${formatNumber(benefits.deathsAverted, 0)}`,
      margin,
      y
    );
    y += 6;
    doc.text(
      `QALYs gained: ${formatNumber(benefits.qalyGained, 2)} · DALYs averted: ${formatNumber(
        benefits.dalysAverted,
        2
      )}`,
      margin,
      y
    );
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("3. Costs and economic evaluation", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.text(
      `Total incremental cost: $${formatNumber(costs.totalCosts, 0)} (public: $${formatNumber(
        costs.publicCosts,
        0
      )}, employer: $${formatNumber(costs.employerCosts, 0)}, programme: $${formatNumber(
        costs.programmeCosts,
        0
      )}, social: $${formatNumber(costs.socialCosts, 0)})`,
      margin,
      y
    );
    y += 6;
    doc.text(
      `Cost per QALY gained: ${
        Number.isFinite(econEval.costPerQaly)
          ? "$" + formatNumber(econEval.costPerQaly, 0)
          : "Not defined"
      }`,
      margin,
      y
    );
    y += 6;
    doc.text(
      `Net monetary benefit (λ = $${formatNumber(
        state.econ.wtpQaly,
        0
      )}/QALY): $${formatNumber(econEval.nmb, 0)}`,
      margin,
      y
    );
    y += 6;
    doc.text(
      `Benefit–cost ratio: ${
        econEval.bcr && Number.isFinite(econEval.bcr)
          ? formatNumber(econEval.bcr, 2)
          : "Not defined"
      } · Payback time: ${
        Number.isFinite(econEval.paybackTime)
          ? formatNumber(econEval.paybackTime, 2) + " years"
          : "Not defined"
      }`,
      margin,
      y
    );
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("4. Equity impacts", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    equity.subgroupResults.forEach((r) => {
      doc.text(
        `${r.group}: QALYs = ${formatNumber(r.qalys, 2)}, weight = ${formatNumber(
          r.weight,
          2
        )}, weighted QALYs = ${formatNumber(r.weightedQalys, 2)}`,
        margin,
        y
      );
      y += 5;
    });

    y += 4;
    doc.text(
      `Equity-weighted QALYs (sum): ${formatNumber(equity.equityWeightedQalys, 2)}`,
      margin,
      y
    );
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("5. Interpretation notes", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.text(
      "All results depend on the DCE parameters, epidemiological assumptions, and costing inputs specified in the dashboard. Sensitivity and probabilistic analyses should be consulted for robustness.",
      margin,
      y,
      { maxWidth: 180 }
    );

    doc.save("vaccine-mandate-policy-brief.pdf");
  }

  // ---------------------------------------------------------------------------
  // MAIN UPDATE PIPELINE
  // ---------------------------------------------------------------------------
  function updateAll() {
    const uptakeRes = computeDceUptake();
    const benefits = computeBenefits(uptakeRes);
    const costs = computeCosts();
    const econEval = computeEconomicEvaluation(benefits, costs);
    const equity = computeEquity(benefits);

    renderKpis(benefits, costs, econEval);
    renderLcTable(uptakeRes);
    renderBenefitsTable(benefits);
    renderCostsTable(costs, benefits, econEval);
    renderEquityTable(equity);

    renderUptakeChart(uptakeRes);
    renderBenefitChart(benefits);
    renderEconomicChart(benefits, costs);
    renderEquityChart(equity);
    runDeterministicSensitivity(benefits, costs, econEval);
    renderDescriptiveStats();
  }

  // ---------------------------------------------------------------------------
  // INIT
  // ---------------------------------------------------------------------------
  function init() {
    cacheDom();
    bindEvents();
    initCharts();
    updateAll();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
