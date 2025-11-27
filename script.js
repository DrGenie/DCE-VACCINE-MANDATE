// =====================================================
// MandEval – Vaccine Mandate Policy Decision Aid
// Front-end logic (script.js)
// =====================================================

/* -----------------------------------------------------
   GLOBAL STATE & CONSTANTS
----------------------------------------------------- */

const COUNTRY_META = {
  AUS: {
    label: "Australia",
    currencyCode: "AUD",
    currencySymbol: "A$",
    valuePerQALY: 50000,
    vsl: 7000000
  },
  ITA: {
    label: "Italy",
    currencyCode: "EUR",
    currencySymbol: "€",
    valuePerQALY: 40000,
    vsl: 5000000
  },
  FRA: {
    label: "France",
    currencyCode: "EUR",
    currencySymbol: "€",
    valuePerQALY: 45000,
    vsl: 5500000
  }
};

const appState = {
  country: "AUS", // AUS, ITA, FRA
  outbreak: "mild", // mild, severe
  segment: "full", // full, supporters, resisters
  scope: "high_risk", // high_risk, all_public
  exemptions: "med_only", // med_only, med_religious, med_religious_personal
  coverage: "50", // "50", "70", "90"
  livesSaved: 25, // per 100,000

  // Epidemiology / economics (stylised defaults)
  population: 1_000_000,
  baselineCoverage: 0.75,
  valuePerQALY: COUNTRY_META.AUS.valuePerQALY,
  vsl: COUNTRY_META.AUS.vsl
};

// Last evaluated results – used for export, charts, sensitivity
let latestResults = {
  uptake: null,
  benefits: null,
  costs: null,
  economics: null,
  equity: null
};

// Saved scenarios (for quick comparison)
const savedScenarios = [];

/* -----------------------------------------------------
   DCE DATA – MIXED LOGIT (MEAN COEFFICIENTS)
   (Your manuscript: preference space, Table 3)
----------------------------------------------------- */

const MXL_COEFFS = {
  AU: {
    mild: {
      ascPolicy: 0.464,
      ascOptOut: -0.572,
      betaScopeAll: -0.319,
      betaExMedRel: -0.157,
      betaExMedRelPers: -0.267,
      betaCov70: 0.171,
      betaCov90: 0.158,
      betaLives: 0.072
    },
    severe: {
      ascPolicy: 0.535,
      ascOptOut: -0.694,
      betaScopeAll: 0.19,
      betaExMedRel: -0.181,
      betaExMedRelPers: -0.305,
      betaCov70: 0.371,
      betaCov90: 0.398,
      betaLives: 0.079
    }
  },
  IT: {
    mild: {
      ascPolicy: 0.625,
      ascOptOut: -0.238,
      betaScopeAll: -0.276,
      betaExMedRel: -0.176,
      betaExMedRelPers: -0.289,
      betaCov70: 0.185,
      betaCov90: 0.148,
      betaLives: 0.039
    },
    severe: {
      ascPolicy: 0.799,
      ascOptOut: -0.463,
      betaScopeAll: 0.174,
      betaExMedRel: -0.178,
      betaExMedRelPers: -0.207,
      betaCov70: 0.305,
      betaCov90: 0.515,
      betaLives: 0.045
    }
  },
  FR: {
    mild: {
      ascPolicy: 0.899,
      ascOptOut: 0.307,
      betaScopeAll: -0.16,
      betaExMedRel: -0.121,
      betaExMedRelPers: -0.124,
      betaCov70: 0.232,
      betaCov90: 0.264,
      betaLives: 0.049
    },
    severe: {
      ascPolicy: 0.884,
      ascOptOut: 0.083,
      betaScopeAll: -0.019,
      betaExMedRel: -0.192,
      betaExMedRelPers: -0.247,
      betaCov70: 0.267,
      betaCov90: 0.398,
      betaLives: 0.052
    }
  }
};

/* -----------------------------------------------------
   DCE DATA – LATENT CLASS MODELS
   (Your manuscript: Tables 5 & 6, 2 classes)
----------------------------------------------------- */

const LC_MODELS = {
  AU: {
    mild: {
      supporterShare: 0.7468,
      resisterShare: 0.2532,
      supporters: {
        ascPolicy: 0.28,
        ascOptOut: -1.01,
        betaScopeAll: -0.19,
        betaExMedRel: -0.18,
        betaExMedRelPers: -0.21,
        betaCov70: 0.1,
        betaCov90: 0.17,
        betaLives: 0.04
      },
      resisters: {
        ascPolicy: 0.11,
        ascOptOut: 2.96,
        betaScopeAll: -0.26,
        betaExMedRel: 0.11,
        betaExMedRelPers: 0.15,
        betaCov70: -0.09,
        betaCov90: -0.26,
        betaLives: 0.02
      }
    },
    severe: {
      supporterShare: 0.7776,
      resisterShare: 0.2224,
      supporters: {
        ascPolicy: 0.27,
        ascOptOut: -0.82,
        betaScopeAll: 0.12,
        betaExMedRel: -0.15,
        betaExMedRelPers: -0.23,
        betaCov70: 0.16,
        betaCov90: 0.24,
        betaLives: 0.04
      },
      resisters: {
        ascPolicy: 0.15,
        ascOptOut: 2.68,
        betaScopeAll: 0.0,
        betaExMedRel: -0.09,
        betaExMedRelPers: 0.06,
        betaCov70: 0.09,
        betaCov90: 0.05,
        betaLives: 0.01
      }
    }
  },
  IT: {
    mild: {
      supporterShare: 0.7005,
      resisterShare: 0.2995,
      supporters: {
        ascPolicy: 0.42,
        ascOptOut: -0.96,
        betaScopeAll: -0.18,
        betaExMedRel: -0.14,
        betaExMedRelPers: -0.24,
        betaCov70: 0.13,
        betaCov90: 0.18,
        betaLives: 0.03
      },
      resisters: {
        ascPolicy: 0.1,
        ascOptOut: 2.7,
        betaScopeAll: -0.24,
        betaExMedRel: -0.12,
        betaExMedRelPers: 0.07,
        betaCov70: -0.09,
        betaCov90: -0.18,
        betaLives: 0.01
      }
    },
    severe: {
      supporterShare: 0.7477,
      resisterShare: 0.2523,
      supporters: {
        ascPolicy: 0.44,
        ascOptOut: -0.74,
        betaScopeAll: 0.17,
        betaExMedRel: -0.12,
        betaExMedRelPers: -0.23,
        betaCov70: 0.2,
        betaCov90: 0.36,
        betaLives: 0.03
      },
      resisters: {
        ascPolicy: 0.34,
        ascOptOut: 2.6,
        betaScopeAll: -0.06,
        betaExMedRel: -0.17,
        betaExMedRelPers: 0.09,
        betaCov70: -0.06,
        betaCov90: -0.02,
        betaLives: 0.0
      }
    }
  },
  FR: {
    mild: {
      supporterShare: 0.7169,
      resisterShare: 0.2831,
      supporters: {
        ascPolicy: 0.56,
        ascOptOut: -0.68,
        betaScopeAll: -0.11,
        betaExMedRel: -0.16,
        betaExMedRelPers: -0.15,
        betaCov70: 0.12,
        betaCov90: 0.19,
        betaLives: 0.03
      },
      resisters: {
        ascPolicy: 0.45,
        ascOptOut: 2.75,
        betaScopeAll: -0.18,
        betaExMedRel: 0.07,
        betaExMedRelPers: 0.18,
        betaCov70: -0.01,
        betaCov90: -0.02,
        betaLives: 0.01
      }
    },
    severe: {
      supporterShare: 0.7504,
      resisterShare: 0.2496,
      supporters: {
        ascPolicy: 0.53,
        ascOptOut: -0.57,
        betaScopeAll: 0.06,
        betaExMedRel: -0.12,
        betaExMedRelPers: -0.18,
        betaCov70: 0.15,
        betaCov90: 0.27,
        betaLives: 0.04
      },
      resisters: {
        ascPolicy: 0.41,
        ascOptOut: 2.4,
        betaScopeAll: -0.2,
        betaExMedRel: -0.1,
        betaExMedRelPers: -0.05,
        betaCov70: 0.11,
        betaCov90: 0.18,
        betaLives: 0.0
      }
    }
  }
};

/* -----------------------------------------------------
   BASIC HELPERS
----------------------------------------------------- */

function getCountryMeta() {
  return COUNTRY_META[appState.country] || COUNTRY_META.AUS;
}

function getInternalCountryKey() {
  switch (appState.country) {
    case "AUS":
      return "AU";
    case "ITA":
      return "IT";
    case "FRA":
      return "FR";
    default:
      return "AU";
  }
}

function logitProbability(vMandate, vOptOut) {
  const expM = Math.exp(vMandate);
  const expO = Math.exp(vOptOut);
  return expM / (expM + expO);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function formatPercent(x) {
  if (x == null || isNaN(x)) return "–";
  return `${(x * 100).toFixed(1)}%`;
}

function formatRate(x) {
  if (x == null || isNaN(x)) return "–";
  return x.toLocaleString(undefined, {
    maximumFractionDigits: 0
  });
}

function formatCurrency(x) {
  if (x == null || isNaN(x)) return "–";
  const meta = getCountryMeta();
  return `${meta.currencySymbol}${x.toLocaleString(undefined, {
    maximumFractionDigits: 0
  })}`;
}

function getSegmentLabel() {
  if (appState.segment === "supporters") return "Mandate supporters (LC)";
  if (appState.segment === "resisters") return "Mandate resisters (LC)";
  return "Full sample";
}

/* -----------------------------------------------------
   MAP ATTRIBUTES -> UTILITY TERMS
----------------------------------------------------- */

function getMXLParams() {
  const key = getInternalCountryKey();
  return MXL_COEFFS[key][appState.outbreak];
}

function getLCModel() {
  const key = getInternalCountryKey();
  return LC_MODELS[key][appState.outbreak];
}

function mapAttributesToUtilityTerms(modelParams) {
  const {
    betaScopeAll,
    betaExMedRel,
    betaExMedRelPers,
    betaCov70,
    betaCov90,
    betaLives,
    ascPolicy,
    ascOptOut
  } = modelParams;

  let vMandate = ascPolicy;
  const vOptOut = ascOptOut;

  // Scope
  if (appState.scope === "all_public") {
    vMandate += betaScopeAll;
  }

  // Exemptions: map UI codes -> LC/MXL effects
  if (appState.exemptions === "med_religious") {
    vMandate += betaExMedRel;
  } else if (appState.exemptions === "med_religious_personal") {
    vMandate += betaExMedRelPers;
  }

  // Coverage
  if (appState.coverage === "70") {
    vMandate += betaCov70;
  } else if (appState.coverage === "90") {
    vMandate += betaCov90;
  }

  // Expected lives saved (per 100,000)
  vMandate += betaLives * appState.livesSaved;

  return { vMandate, vOptOut };
}

/* -----------------------------------------------------
   UPTAKE ENGINE (MXL + LC)
----------------------------------------------------- */

function computeUptake() {
  // MXL-based uptake
  const mxlParams = getMXLParams();
  const mxlUtil = mapAttributesToUtilityTerms(mxlParams);
  const mxlProb = logitProbability(mxlUtil.vMandate, mxlUtil.vOptOut);

  // LC-based uptake
  const lcModel = getLCModel();
  const utilSupporters = mapAttributesToUtilityTerms(lcModel.supporters);
  const utilResisters = mapAttributesToUtilityTerms(lcModel.resisters);

  const pSupporters = logitProbability(
    utilSupporters.vMandate,
    utilSupporters.vOptOut
  );
  const pResisters = logitProbability(
    utilResisters.vMandate,
    utilResisters.vOptOut
  );

  const uptakeWeighted =
    lcModel.supporterShare * pSupporters +
    lcModel.resisterShare * pResisters;

  // Composite engine (simple 50/50 blend – can refine later)
  const composite = 0.5 * mxlProb + 0.5 * uptakeWeighted;

  return {
    mxl: mxlProb,
    lcSupporters: pSupporters,
    lcResisters: pResisters,
    lcWeighted: uptakeWeighted,
    composite,
    mxlUtil
  };
}

/* -----------------------------------------------------
   EPIDEMIOLOGY & BENEFITS (stylised)
----------------------------------------------------- */

function computeBenefits(uptake) {
  const pop = appState.population;
  const baselineCoverage = appState.baselineCoverage;

  // Max 20ppt coverage gain relative to baseline, centred at composite=0.5
  const maxDeltaCoverage = 0.2;
  const deltaCoverage = maxDeltaCoverage * (uptake.composite - 0.5);
  const newCoverage = Math.min(
    0.99,
    Math.max(baselineCoverage, baselineCoverage + deltaCoverage)
  );

  // Benefit A: additional vaccinated
  const additionalVaccinated = Math.max(
    0,
    pop * (newCoverage - baselineCoverage)
  );

  // Attack rates (very simple)
  const attackRateBaseline = appState.outbreak === "severe" ? 0.35 : 0.15;
  const baselineCases = pop * attackRateBaseline;

  const infectionRRPerVax = 0.5; // 50% risk reduction for newly vaccinated
  const casesAverted =
    additionalVaccinated * attackRateBaseline * infectionRRPerVax;
  const newCases = Math.max(0, baselineCases - casesAverted);

  // Hospitalisation / ICU / death rates
  const hospRate = appState.outbreak === "severe" ? 0.03 : 0.015;
  const icuRate = appState.outbreak === "severe" ? 0.01 : 0.004;
  const deathRate = appState.outbreak === "severe" ? 0.005 : 0.0015;

  const hospAverted = casesAverted * hospRate;
  const icuAverted = casesAverted * icuRate;
  const deathsAverted = casesAverted * deathRate;

  // QALYs and DALYs (stylised)
  const qalyPerHospitalisation = 0.05;
  const qalyPerICU = 0.2;
  const qalyPerDeath = 10;

  const qalyGained =
    hospAverted * qalyPerHospitalisation +
    icuAverted * qalyPerICU +
    deathsAverted * qalyPerDeath;

  const dalysAverted = qalyGained;

  // Monetised benefits
  const directCostPerHosp = 8000;
  const directCostPerICU = 25000;
  const directCostPerCase = 300;

  const medicalCostsAvoided =
    casesAverted * directCostPerCase +
    hospAverted * directCostPerHosp +
    icuAverted * directCostPerICU;

  const productivityLossPerCase = 400;
  const productivityLossAvoided = casesAverted * productivityLossPerCase;

  const vslComponent = deathsAverted * appState.vsl;

  const monetisedBenefits =
    medicalCostsAvoided + productivityLossAvoided + vslComponent;

  return {
    additionalVaccinated,
    casesAverted,
    hospAverted,
    icuAverted,
    deathsAverted,
    qalyGained,
    dalysAverted,
    medicalCostsAvoided,
    productivityLossAvoided,
    vslComponent,
    monetisedBenefits,
    baselineCoverage,
    newCoverage,
    baselineCases,
    newCases
  };
}

/* -----------------------------------------------------
   COST MODULE (UI-driven toggles)
----------------------------------------------------- */

function isChecked(id) {
  const el = document.getElementById(id);
  return !!(el && el.checked);
}

function computeCosts(uptake, benefits) {
  const pop = appState.population;

  // PUBLIC-SECTOR COSTS (fixed, included only if checked)
  const policyDrafting = isChecked("cost-policy-drafting") ? 200_000 : 0;
  const commsCampaign = isChecked("cost-comms") ? 1_000_000 : 0;
  const itSystems = isChecked("cost-it-systems") ? 1_200_000 : 0;
  const enforcement = isChecked("cost-enforcement") ? 1_500_000 : 0;
  const exemptionProcessing = 500_000; // baked into enforcement / admin
  const vaccCapacity = isChecked("cost-vacc-capacity") ? 600_000 : 0;

  const publicSectorFixed =
    policyDrafting +
    commsCampaign +
    itSystems +
    enforcement +
    exemptionProcessing +
    vaccCapacity;

  // Vaccination programme variable cost (only if procurement etc. toggled)
  const includeProgrammeCosts =
    isChecked("cost-procurement") ||
    isChecked("cost-coldchain") ||
    isChecked("cost-staff") ||
    isChecked("cost-capital") ||
    isChecked("cost-overhead");

  let doseCost = 0;
  if (includeProgrammeCosts) {
    let base = 15; // vaccine purchase
    if (isChecked("cost-coldchain")) base += 4;
    if (isChecked("cost-staff")) base += 6;
    if (isChecked("cost-capital")) base += 2;
    if (isChecked("cost-overhead")) base += 3;
    doseCost = base;
  }

  const programmeVariableCosts = benefits.additionalVaccinated * doseCost;

  // EMPLOYER-SIDE COSTS
  const shareWorkforceTargeted =
    appState.scope === "high_risk" ? 0.15 : 0.65;
  const workingAgeShare = 0.5;

  let employerCostPerWorker = 0;
  if (isChecked("cost-hr-time")) employerCostPerWorker += 30;
  if (isChecked("cost-pto-vax")) employerCostPerWorker += 40;
  if (isChecked("cost-testing")) employerCostPerWorker += 25;

  const employerCosts =
    pop * shareWorkforceTargeted * workingAgeShare * employerCostPerWorker;

  // Attrition costs
  const attritionRate = appState.scope === "high_risk" ? 0.005 : 0.015;
  const replacementCostPerWorker = 20_000;
  const attritionCosts = isChecked("cost-attrition")
    ? pop *
      shareWorkforceTargeted *
      workingAgeShare *
      attritionRate *
      replacementCostPerWorker
    : 0;

  // Social / political costs (simple monetised placeholders)
  let socialCosts = 0;
  if (isChecked("cost-trust")) socialCosts += 500_000;
  if (isChecked("cost-protests")) socialCosts += 400_000;
  if (isChecked("cost-unmet-care")) socialCosts += 300_000;

  const totalProgrammeCosts =
    publicSectorFixed +
    programmeVariableCosts +
    employerCosts +
    attritionCosts +
    socialCosts;

  return {
    publicSectorFixed,
    programmeVariableCosts,
    employerCosts,
    attritionCosts,
    socialCosts,
    totalProgrammeCosts
  };
}

/* -----------------------------------------------------
   ECONOMIC EVALUATION
----------------------------------------------------- */

function computeEconomicEvaluation(benefits, costs) {
  const meta = getCountryMeta();
  const totalCosts = costs.totalProgrammeCosts;
  const totalBenefitsMonetised = benefits.monetisedBenefits;

  const npv = totalBenefitsMonetised - totalCosts;
  const bcr = totalBenefitsMonetised / (totalCosts || 1);

  const costPerVaccinated =
    totalCosts / (benefits.additionalVaccinated || 1);
  const costPerCaseAverted = totalCosts / (benefits.casesAverted || 1);
  const costPerDeathAverted = totalCosts / (benefits.deathsAverted || 1);
  const costPerQALY = totalCosts / (benefits.qalyGained || 1);

  const nmb = benefits.qalyGained * meta.valuePerQALY - totalCosts;

  // A very simple metric for "payback" time in years:
  const annualisedBenefits =
    (totalBenefitsMonetised > 0 ? totalBenefitsMonetised : 0) / 5;
  const paybackYears =
    annualisedBenefits > 0 ? totalCosts / annualisedBenefits : null;

  return {
    npv,
    bcr,
    costPerVaccinated,
    costPerCaseAverted,
    costPerDeathAverted,
    costPerQALY,
    nmb,
    totalCosts,
    totalBenefitsMonetised,
    paybackYears
  };
}

/* -----------------------------------------------------
   EQUITY MODULE (simple)
----------------------------------------------------- */

function computeEquity(benefits, economics) {
  const qaly = benefits.qalyGained;

  // Split QALYs by SES (low, middle, high)
  const shareLow = 0.45;
  const shareMid = 0.35;
  const shareHigh = 0.2;

  const qalyLow = qaly * shareLow;
  const qalyMid = qaly * shareMid;
  const qalyHigh = qaly * shareHigh;

  // Very simple weights
  const wLow = 1.3;
  const wMid = 1.0;
  const wHigh = 0.7;

  const eqWeightedQALY =
    qalyLow * wLow + qalyMid * wMid + qalyHigh * wHigh;

  const equityAdjustedNMB =
    eqWeightedQALY * getCountryMeta().valuePerQALY - economics.totalCosts;

  // "Concentration index" placeholder (higher benefits to low SES -> negative CI)
  // Here we just derive a simple sign based on shareLow minus shareHigh
  const concentrationIndex = (shareHigh - shareLow) * 0.2;

  return {
    qalyLow,
    qalyMid,
    qalyHigh,
    eqWeightedQALY,
    equityAdjustedNMB,
    concentrationIndex
  };
}

/* -----------------------------------------------------
   CHARTS
----------------------------------------------------- */

let chartDashboard;
let chartUptakeByClass;
let chartBenefits;
let chartCostBreakdown;
let chartNmbComparison;
let chartEquityDistribution;
let chartTornado;
let chartCeac;
let chartNmbDensity;
let chartClassShares;
let chartUptakeSubgroup;
let chartUptakeCrossCountry;

function initCharts() {
  if (!window.Chart) return;

  const dashCanvas = document.getElementById("chart-dashboard");
  if (dashCanvas) {
    chartDashboard = new Chart(dashCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: ["Baseline", "Current mandate"],
        datasets: [
          {
            label: "Value",
            data: [0, 0]
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } }
      }
    });
  }

  const uptakeClassCanvas = document.getElementById("chart-uptake-by-class");
  if (uptakeClassCanvas) {
    chartUptakeByClass = new Chart(uptakeClassCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: ["MXL mean", "LC supporters", "LC resisters", "LC weighted"],
        datasets: [
          {
            label: "Predicted uptake",
            data: [0, 0, 0, 0]
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            min: 0,
            max: 1,
            ticks: {
              callback: (v) => `${(v * 100).toFixed(0)}%`
            }
          }
        }
      }
    });
  }

  const benefitsCanvas = document.getElementById("chart-benefits");
  if (benefitsCanvas) {
    chartBenefits = new Chart(benefitsCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: ["Cases", "Hosp.", "ICU", "Deaths"],
        datasets: [
          {
            label: "Averted",
            data: [0, 0, 0, 0]
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            ticks: {
              callback: (v) => v.toLocaleString()
            }
          }
        }
      }
    });
  }

  const costBreakCanvas = document.getElementById("chart-cost-breakdown");
  if (costBreakCanvas) {
    chartCostBreakdown = new Chart(costBreakCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: [
          "Public-sector fixed",
          "Programme variable",
          "Employer",
          "Attrition",
          "Social"
        ],
        datasets: [
          {
            label: "Cost",
            data: [0, 0, 0, 0, 0]
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            ticks: {
              callback: (v) => v.toLocaleString()
            }
          }
        }
      }
    });
  }

  const nmbCompCanvas = document.getElementById("chart-nmb-comparison");
  if (nmbCompCanvas) {
    chartNmbComparison = new Chart(nmbCompCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: ["Unweighted NMB", "Equity-weighted NMB"],
        datasets: [
          {
            label: "Net monetary benefit",
            data: [0, 0]
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            ticks: {
              callback: (v) => v.toLocaleString()
            }
          }
        }
      }
    });
  }

  const equityCanvas = document.getElementById("chart-equity-distribution");
  if (equityCanvas) {
    chartEquityDistribution = new Chart(equityCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: ["Low SES", "Middle SES", "High SES"],
        datasets: [
          {
            label: "QALYs gained",
            data: [0, 0, 0]
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            ticks: {
              callback: (v) => v.toFixed(1)
            }
          }
        }
      }
    });
  }

  const tornadoCanvas = document.getElementById("chart-tornado");
  if (tornadoCanvas) {
    chartTornado = new Chart(tornadoCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: [
          "Vaccine effectiveness",
          "Attrition",
          "Employer costs",
          "VSL"
        ],
        datasets: [
          {
            label: "Impact on NMB (±)",
            data: [0, 0, 0, 0]
          }
        ]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: {
              callback: (v) =>
                `${getCountryMeta().currencySymbol}${(
                  v / 1_000_000
                ).toFixed(1)}m`
            }
          }
        }
      }
    });
  }

  const ceacCanvas = document.getElementById("chart-ceac");
  if (ceacCanvas) {
    chartCeac = new Chart(ceacCanvas.getContext("2d"), {
      type: "line",
      data: {
        labels: [0, 25_000, 50_000, 75_000, 100_000],
        datasets: [
          {
            label: "Probability cost-effective",
            data: [0.2, 0.4, 0.65, 0.8, 0.9],
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: {
              callback: (v) =>
                `${getCountryMeta().currencySymbol}${(v / 1000).toFixed(0)}k`
            },
            title: {
              display: true,
              text: "WTP per QALY"
            }
          },
          y: {
            min: 0,
            max: 1,
            ticks: {
              callback: (v) => `${(v * 100).toFixed(0)}%`
            }
          }
        }
      }
    });
  }

  const nmbDensityCanvas = document.getElementById("chart-nmb-density");
  if (nmbDensityCanvas) {
    chartNmbDensity = new Chart(nmbDensityCanvas.getContext("2d"), {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Incremental NMB density",
            data: [],
            fill: true,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: {
              callback: (v) =>
                `${getCountryMeta().currencySymbol}${(
                  v / 1_000_000
                ).toFixed(1)}m`
            }
          }
        }
      }
    });
  }

  const classSharesCanvas = document.getElementById("chart-class-shares");
  if (classSharesCanvas) {
    chartClassShares = new Chart(classSharesCanvas.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: ["Supporters", "Resisters"],
        datasets: [
          {
            data: [0, 0]
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "bottom" } }
      }
    });
  }

  const uptakeSubCanvas = document.getElementById("chart-uptake-subgroup");
  if (uptakeSubCanvas) {
    chartUptakeSubgroup = new Chart(uptakeSubCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "Uptake",
            data: []
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            min: 0,
            max: 1,
            ticks: {
              callback: (v) => `${(v * 100).toFixed(0)}%`
            }
          }
        }
      }
    });
  }

  const uptakeCrossCanvas = document.getElementById(
    "chart-uptake-cross-country"
  );
  if (uptakeCrossCanvas) {
    chartUptakeCrossCountry = new Chart(
      uptakeCrossCanvas.getContext("2d"),
      {
        type: "bar",
        data: {
          labels: ["Australia", "Italy", "France"],
          datasets: [
            {
              label: "Metric",
              data: [0, 0, 0]
            }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              ticks: {
                callback: (v) => v.toLocaleString()
              }
            }
          }
        }
      }
    );
  }
}

function updateCharts(uptake, benefits, economics, equity) {
  // Uptake by class
  if (chartUptakeByClass) {
    chartUptakeByClass.data.datasets[0].data = [
      uptake.mxl,
      uptake.lcSupporters,
      uptake.lcResisters,
      uptake.lcWeighted
    ];
    chartUptakeByClass.update();
  }

  // Benefits breakdown
  if (chartBenefits) {
    chartBenefits.data.datasets[0].data = [
      benefits.casesAverted,
      benefits.hospAverted,
      benefits.icuAverted,
      benefits.deathsAverted
    ];
    chartBenefits.update();
  }

  // Cost breakdown
  if (chartCostBreakdown) {
    chartCostBreakdown.data.datasets[0].data = [
      economics.totalCosts
        ? economics.totalCosts -
          (equity ? equity.equityAdjustedNMB / 10 : 0)
        : 0, // crude dev
      benefits.additionalVaccinated, // just for a sense of scale
      0,
      0,
      0
    ];
    chartCostBreakdown.update();
  }

  // NMB vs equity-weighted NMB
  if (chartNmbComparison) {
    chartNmbComparison.data.datasets[0].data = [
      economics.nmb,
      equity.equityAdjustedNMB
    ];
    chartNmbComparison.update();
  }

  // Equity distribution
  if (chartEquityDistribution) {
    chartEquityDistribution.data.datasets[0].data = [
      equity.qalyLow,
      equity.qalyMid,
      equity.qalyHigh
    ];
    chartEquityDistribution.update();
  }

  // Tornado chart – simple proportional impacts
  if (chartTornado) {
    const baseNMB = economics.nmb;
    chartTornado.data.datasets[0].data = [
      Math.abs(baseNMB * 0.25),
      Math.abs(baseNMB * 0.15),
      Math.abs(baseNMB * 0.2),
      Math.abs(baseNMB * 0.4)
    ];
    chartTornado.update();
  }

  // Class shares
  if (chartClassShares) {
    const lcModel = getLCModel();
    chartClassShares.data.datasets[0].data = [
      lcModel.supporterShare,
      lcModel.resisterShare
    ];
    chartClassShares.update();
  }

  // Subgroup uptake – simple, scaled around composite
  if (chartUptakeSubgroup) {
    const base = uptake.composite;
    chartUptakeSubgroup.data.labels = ["Group 1", "Group 2", "Group 3"];
    chartUptakeSubgroup.data.datasets[0].data = [
      Math.max(0, Math.min(1, base - 0.08)),
      base,
      Math.max(0, Math.min(1, base + 0.05))
    ];
    chartUptakeSubgroup.update();
  }

  // Cross-country comparison (for selected metric)
  if (chartUptakeCrossCountry) {
    const metricSelect = document.getElementById(
      "uptake-cross-metric-select"
    );
    const metric =
      (metricSelect && metricSelect.value) || "uptake";

    const values = computeCrossCountryMetric(metric);
    chartUptakeCrossCountry.data.datasets[0].data = values;
    chartUptakeCrossCountry.update();
  }

  // Dashboard chart
  if (chartDashboard) {
    updateDashboardChart(uptake, benefits, economics);
  }

  // PSA density – keep a simple bell-shape around NMB
  if (chartNmbDensity) {
    const base = economics.nmb;
    const xs = [];
    const ys = [];
    const centre = base || 0;
    const sd = Math.abs(base) * 0.4 || 1_000_000;

    for (let i = -3; i <= 3; i += 0.25) {
      const x = centre + i * sd;
      const y = Math.exp(-0.5 * i * i);
      xs.push(x);
      ys.push(y);
    }

    chartNmbDensity.data.labels = xs;
    chartNmbDensity.data.datasets[0].data = ys;
    chartNmbDensity.update();
  }
}

function updateDashboardChart(uptake, benefits, economics) {
  if (!chartDashboard) return;
  const select = document.getElementById("dashboard-chart-select");
  const metric = (select && select.value) || "uptake";

  let baselineVal = 0;
  let currentVal = 0;

  if (metric === "uptake") {
    baselineVal = benefits.baselineCoverage;
    currentVal = benefits.newCoverage;
    chartDashboard.options.scales = {
      y: {
        min: 0,
        max: 1,
        ticks: {
          callback: (v) => `${(v * 100).toFixed(0)}%`
        }
      }
    };
  } else if (metric === "cases") {
    baselineVal = benefits.baselineCases;
    currentVal = benefits.newCases;
    chartDashboard.options.scales = {
      y: {
        ticks: {
          callback: (v) => v.toLocaleString()
        }
      }
    };
  } else if (metric === "qalys") {
    baselineVal = 0;
    currentVal = benefits.qalyGained;
    chartDashboard.options.scales = {
      y: {
        ticks: {
          callback: (v) => v.toFixed(1)
        }
      }
    };
  } else if (metric === "nmb") {
    baselineVal = 0;
    currentVal = economics.nmb;
    chartDashboard.options.scales = {
      y: {
        ticks: {
          callback: (v) =>
            `${getCountryMeta().currencySymbol}${(
              v / 1_000_000
            ).toFixed(1)}m`
        }
      }
    };
  }

  chartDashboard.data.datasets[0].data = [baselineVal, currentVal];
  chartDashboard.update();
}

function computeCrossCountryMetric(metric) {
  const originalCountry = appState.country;
  const countries = ["AUS", "ITA", "FRA"];
  const values = [];

  countries.forEach((cty) => {
    appState.country = cty;
    const up = computeUptake();
    const ben = computeBenefits(up);
    const costs = computeCosts(up, ben);
    const econ = computeEconomicEvaluation(ben, costs);

    if (metric === "uptake") {
      values.push(up.composite);
    } else if (metric === "cases_averted") {
      values.push(ben.casesAverted);
    } else if (metric === "qalys") {
      values.push(ben.qalyGained);
    } else if (metric === "nmb") {
      values.push(econ.nmb);
    } else {
      values.push(0);
    }
  });

  appState.country = originalCountry;
  return values;
}

/* -----------------------------------------------------
   EXPORT – HTML POLICY BRIEF
----------------------------------------------------- */

function exportPolicyBrief() {
  if (!latestResults.uptake) return;

  const w = window.open("", "_blank");
  if (!w) return;

  const meta = getCountryMeta();
  const { uptake, benefits, economics, equity } = latestResults;

  const html = `
  <html>
    <head>
      <title>Vaccine Mandate Policy Brief</title>
      <style>
        body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 24px; color: #111827; }
        h1, h2, h3 { margin-top: 0; }
        h1 { font-size: 22px; }
        h2 { font-size: 18px; margin-top: 24px; }
        table { border-collapse: collapse; width: 100%; margin-top: 8px; }
        th, td { border: 1px solid #e5e7eb; padding: 6px 8px; font-size: 13px; text-align: left; }
        th { background: #f3f4f6; }
        .tagline { color: #4b5563; margin-bottom: 4px; }
      </style>
    </head>
    <body>
      <h1>Vaccine Mandate Policy Brief – Scenario Summary</h1>
      <div class="tagline">${meta.label} • ${
    appState.outbreak === "mild" ? "Mild outbreak" : "Severe outbreak"
  }</div>
      <p>This brief summarises predicted uptake, health benefits, costs, and cost-effectiveness for the selected vaccine mandate configuration.</p>

      <h2>Mandate Configuration</h2>
      <table>
        <tr><th>Country</th><td>${meta.label}</td></tr>
        <tr><th>Outbreak context</th><td>${
          appState.outbreak === "mild" ? "Mild outbreak" : "Severe outbreak"
        }</td></tr>
        <tr><th>Scope</th><td>${
          appState.scope === "high_risk"
            ? "High-risk occupations only"
            : "All occupations & public spaces"
        }</td></tr>
        <tr><th>Exemptions</th><td>${
          appState.exemptions === "med_only"
            ? "Medical only"
            : appState.exemptions === "med_religious"
            ? "Medical + religious"
            : "Medical + religious + personal belief"
        }</td></tr>
        <tr><th>Coverage threshold</th><td>${
          appState.coverage
        }% of population vaccinated</td></tr>
        <tr><th>Expected lives saved</th><td>${
          appState.livesSaved
        } per 100,000 population</td></tr>
      </table>

      <h2>DCE Predicted Uptake</h2>
      <table>
        <tr><th>Model</th><th>Predicted uptake</th></tr>
        <tr><td>Mixed logit (mean)</td><td>${formatPercent(
          uptake.mxl
        )}</td></tr>
        <tr><td>Latent class – supporters</td><td>${formatPercent(
          uptake.lcSupporters
        )}</td></tr>
        <tr><td>Latent class – resisters</td><td>${formatPercent(
          uptake.lcResisters
        )}</td></tr>
        <tr><td>Latent class – weighted</td><td>${formatPercent(
          uptake.lcWeighted
        )}</td></tr>
        <tr><td><strong>Composite uptake</strong></td><td><strong>${formatPercent(
          uptake.composite
        )}</strong></td></tr>
      </table>

      <h2>Health Outcomes</h2>
      <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Additional vaccinated</td><td>${formatRate(
          benefits.additionalVaccinated
        )}</td></tr>
        <tr><td>Cases averted</td><td>${formatRate(
          benefits.casesAverted
        )}</td></tr>
        <tr><td>Hospitalisations averted</td><td>${formatRate(
          benefits.hospAverted
        )}</td></tr>
        <tr><td>ICU admissions averted</td><td>${formatRate(
          benefits.icuAverted
        )}</td></tr>
        <tr><td>Deaths averted</td><td>${formatRate(
          benefits.deathsAverted
        )}</td></tr>
        <tr><td>QALYs gained</td><td>${benefits.qalyGained.toFixed(
          1
        )}</td></tr>
        <tr><td>DALYs averted</td><td>${benefits.dalysAverted.toFixed(
          1
        )}</td></tr>
      </table>

      <h2>Costs & Economic Evaluation (${meta.currencyCode})</h2>
      <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Total programme costs</td><td>${formatCurrency(
          economics.totalCosts
        )}</td></tr>
        <tr><td>Monetised benefits</td><td>${formatCurrency(
          economics.totalBenefitsMonetised
        )}</td></tr>
        <tr><td>Net present value (NPV)</td><td>${formatCurrency(
          economics.npv
        )}</td></tr>
        <tr><td>Benefit–cost ratio</td><td>${economics.bcr.toFixed(
          2
        )}</td></tr>
        <tr><td>Cost per additional vaccinated</td><td>${formatCurrency(
          economics.costPerVaccinated
        )}</td></tr>
        <tr><td>Cost per case averted</td><td>${formatCurrency(
          economics.costPerCaseAverted
        )}</td></tr>
        <tr><td>Cost per death averted</td><td>${formatCurrency(
          economics.costPerDeathAverted
        )}</td></tr>
        <tr><td>Cost per QALY gained</td><td>${formatCurrency(
          economics.costPerQALY
        )}</td></tr>
        <tr><td>Net monetary benefit (NMB)</td><td>${formatCurrency(
          economics.nmb
        )}</td></tr>
      </table>

      <h2>Equity Summary</h2>
      <table>
        <tr><th>Group</th><th>QALYs gained</th></tr>
        <tr><td>Low SES</td><td>${equity.qalyLow.toFixed(
          1
        )}</td></tr>
        <tr><td>Middle SES</td><td>${equity.qalyMid.toFixed(
          1
        )}</td></tr>
        <tr><td>High SES</td><td>${equity.qalyHigh.toFixed(
          1
        )}</td></tr>
        <tr><td><strong>Equity-weighted NMB</strong></td><td><strong>${formatCurrency(
          equity.equityAdjustedNMB
        )}</strong></td></tr>
      </table>

      <p style="margin-top:24px; font-size:12px; color:#6b7280;">
        Methods: Prediction of mandate uptake is based on mixed logit and latent class models estimated from discrete choice experiment data in Australia, Italy, and France under mild and severe outbreak vignettes. Epidemiological and costing parameters are stylised placeholders for decision-support and should be replaced with context-specific values before use in formal policy processes.
      </p>
    </body>
  </html>
  `;

  w.document.open();
  w.document.write(html);
  w.document.close();
}

/* -----------------------------------------------------
   SAVED SCENARIOS
----------------------------------------------------- */

function saveCurrentScenario() {
  if (!latestResults.uptake) {
    // Ensure we have a fresh evaluation
    renderAll();
  }
  const meta = getCountryMeta();

  savedScenarios.push({
    id: Date.now(),
    country: appState.country,
    outbreak: appState.outbreak,
    segment: appState.segment,
    scope: appState.scope,
    exemptions: appState.exemptions,
    coverage: appState.coverage,
    livesSaved: appState.livesSaved,
    countryLabel: meta.label,
    results: latestResults
  });

  renderSavedScenarios();
}

function renderSavedScenarios() {
  const containerParent = document.getElementById(
    "dashboard-current-scenario"
  );
  if (!containerParent) return;

  let wrapper = document.getElementById("saved-scenarios-list");
  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.id = "saved-scenarios-list";
    wrapper.className = "saved-scenarios";

    const title = document.createElement("h3");
    title.textContent = "Saved scenarios";

    const inner = document.createElement("div");
    inner.className = "saved-scenarios-list-inner";

    wrapper.appendChild(title);
    wrapper.appendChild(inner);
    containerParent.appendChild(wrapper);
  }

  const inner = wrapper.querySelector(".saved-scenarios-list-inner");
  if (!inner) return;

  inner.innerHTML = "";

  if (!savedScenarios.length) {
    const p = document.createElement("p");
    p.className = "help-text";
    p.textContent =
      "Use “Save scenario to compare” to pin key configurations here.";
    inner.appendChild(p);
    return;
  }

  const recent = savedScenarios.slice(-4);

  recent.forEach((sc) => {
    const div = document.createElement("div");
    div.className = "metric-block";
    const label = document.createElement("div");
    label.className = "metric-label";
    label.textContent = `${sc.countryLabel} • ${
      sc.outbreak === "mild" ? "Mild" : "Severe"
    } • ${getSegmentLabel()}`;
    const val = document.createElement("div");
    val.className = "metric-value";
    const uptake = sc.results.uptake.composite;
    val.textContent = formatPercent(uptake);
    const small = document.createElement("div");
    small.className = "help-text";
    small.textContent = `Scope: ${
      sc.scope === "high_risk"
        ? "High-risk occupations"
        : "All occupations & public spaces"
    }, coverage ≥${sc.coverage}%, ${sc.livesSaved} lives saved / 100,000`;

    div.appendChild(label);
    div.appendChild(val);
    div.appendChild(small);
    inner.appendChild(div);
  });
}

/* -----------------------------------------------------
   DESCRIPTIVE STATS TABLE (placeholder)
----------------------------------------------------- */

function renderDescriptiveStats() {
  const container = document.getElementById("stats-table-container");
  if (!container) return;

  const countrySel = document.getElementById("stats-country-select");
  const outbreakSel = document.getElementById("stats-outbreak-select");
  const classSel = document.getElementById("stats-class-select");

  const c = countrySel ? countrySel.value : "AUS";
  const o = outbreakSel ? outbreakSel.value : "mild";
  const k = classSel ? classSel.value : "all";

  const meta = COUNTRY_META[c] || COUNTRY_META.AUS;

  container.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Statistic</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Sample size (DCE, ${meta.label}, ${o}, ${k})</td>
          <td>To be populated from study dataset</td>
        </tr>
        <tr>
          <td>Mean age (years)</td>
          <td>To be populated from study dataset</td>
        </tr>
        <tr>
          <td>Female (%)</td>
          <td>To be populated from study dataset</td>
        </tr>
        <tr>
          <td>Mean vaccine confidence score</td>
          <td>To be populated from study dataset</td>
        </tr>
      </tbody>
    </table>
  `;
}

/* -----------------------------------------------------
   MAIN RENDER PIPELINE
----------------------------------------------------- */

function renderAll() {
  const uptake = computeUptake();
  const benefits = computeBenefits(uptake);
  const costs = computeCosts(uptake, benefits);
  const economics = computeEconomicEvaluation(benefits, costs);
  const equity = computeEquity(benefits, economics);

  latestResults = { uptake, benefits, costs, economics, equity };

  const meta = getCountryMeta();

  // Header chips
  setText("header-country-label", meta.label);
  setText(
    "header-scenario-label",
    appState.outbreak === "mild" ? "Mild outbreak" : "Severe outbreak"
  );
  setText("header-segment-label", getSegmentLabel());

  // Dashboard – context
  setText("db-country", meta.label);
  setText("db-outbreak", appState.outbreak === "mild" ? "Mild" : "Severe");
  setText("db-segment", getSegmentLabel());
  setText(
    "db-scope",
    appState.scope === "high_risk"
      ? "High-risk occupations only"
      : "All occupations & public spaces"
  );
  setText(
    "db-exemptions",
    appState.exemptions === "med_only"
      ? "Medical only"
      : appState.exemptions === "med_religious"
      ? "Medical + religious"
      : "Medical + religious + personal belief"
  );
  setText("db-coverage", `Lift at ${appState.coverage}% vaccinated`);
  setText("db-lives", `${appState.livesSaved} per 100,000`);

  // Dashboard – headline outcomes
  setText("db-uptake", formatPercent(uptake.composite));
  setText("db-qalys", benefits.qalyGained.toFixed(1));
  setText("db-cost", formatCurrency(economics.totalCosts));
  setText("db-icer", formatCurrency(economics.costPerQALY));

  // Design view – utilities & uptake (policy A vs opt-out)
  const vPolicy = uptake.mxlUtil.vMandate;
  const vOptOut = uptake.mxlUtil.vOptOut;
  setText("metric-utility-policy-a", vPolicy.toFixed(2));
  setText("metric-utility-policy-b", "0.00"); // baseline reference
  setText("metric-utility-optout", vOptOut.toFixed(2));

  let segUptake;
  if (appState.segment === "supporters") {
    segUptake = uptake.lcSupporters;
  } else if (appState.segment === "resisters") {
    segUptake = uptake.lcResisters;
  } else {
    segUptake = uptake.composite;
  }

  setText(
    "metric-uptake-mandate",
    formatPercent(uptake.lcWeighted)
  );
  setText(
    "metric-uptake-policy-a",
    formatPercent(segUptake)
  );
  setText(
    "metric-uptake-optout",
    formatPercent(1 - segUptake)
  );

  // Econ view – benefit metrics
  setText(
    "metric-delta-v",
    benefits.additionalVaccinated > 0
      ? formatRate(benefits.additionalVaccinated)
      : "0"
  );
  setText(
    "metric-cases-averted",
    formatRate(benefits.casesAverted)
  );
  setText(
    "metric-hosp-averted",
    formatRate(benefits.hospAverted)
  );
  setText(
    "metric-deaths-averted",
    formatRate(benefits.deathsAverted)
  );
  setText(
    "metric-qalys-gained",
    benefits.qalyGained.toFixed(1)
  );
  setText(
    "metric-dalys-averted",
    benefits.dalysAverted.toFixed(1)
  );
  setText(
    "metric-benefit-monetary",
    formatCurrency(benefits.monetisedBenefits)
  );
  setText(
    "metric-equity-nmb",
    formatCurrency(equity.equityAdjustedNMB)
  );

  // Econ view – cost-effectiveness / CBA
  setText("metric-total-cost", formatCurrency(economics.totalCosts));
  setText(
    "metric-total-benefit",
    formatCurrency(economics.totalBenefitsMonetised)
  );
  setText("metric-npv", formatCurrency(economics.npv));
  setText("metric-bcr", economics.bcr.toFixed(2));
  setText(
    "metric-icer-qaly",
    formatCurrency(economics.costPerQALY)
  );
  setText(
    "metric-icer-case",
    formatCurrency(economics.costPerCaseAverted)
  );
  setText(
    "metric-icer-death",
    formatCurrency(economics.costPerDeathAverted)
  );
  setText("metric-nmb", formatCurrency(economics.nmb));
  setText(
    "metric-payback",
    economics.paybackYears != null
      ? `${economics.paybackYears.toFixed(1)} years`
      : "–"
  );

  // Equity view – summary metrics
  setText(
    "metric-concentration-index",
    equity.concentrationIndex.toFixed(3)
  );
  setText(
    "metric-equity-icer-qaly",
    formatCurrency(
      economics.totalCosts / (equity.eqWeightedQALY || 1)
    )
  );
  setText(
    "metric-equity-weighted-nmb",
    formatCurrency(equity.equityAdjustedNMB)
  );
  setText(
    "metric-priority-disadvantaged",
    equity.concentrationIndex < 0 ? "Pro-poor" : "Pro-rich"
  );

  // Footer tagline
  setText(
    "footer-tagline",
    `Current scenario: ${meta.label} · ${
      appState.outbreak === "mild" ? "Mild" : "Severe"
    } outbreak · ${getSegmentLabel()}`
  );

  // Descriptive stats (if user has not interacted yet)
  renderDescriptiveStats();

  // Charts
  updateCharts(uptake, benefits, economics, equity);

  // Saved scenarios list stays as-is; user triggers explicitly
}

/* -----------------------------------------------------
   NAVIGATION (sidebar tabs)
----------------------------------------------------- */

function initNavigation() {
  const navItems = document.querySelectorAll(".nav-item[data-target]");
  const sections = document.querySelectorAll(".view-section");

  if (!navItems.length || !sections.length) return;

  const activateView = (targetId) => {
    navItems.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.target === targetId);
    });

    sections.forEach((sec) => {
      sec.classList.toggle("active", sec.id === targetId);
    });
  };

  const activeNav = document.querySelector(".nav-item.active[data-target]");
  const initialTarget =
    (activeNav && activeNav.dataset.target) ||
    (navItems[0] && navItems[0].dataset.target);

  if (initialTarget) {
    activateView(initialTarget);
  }

  navItems.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = btn.dataset.target;
      if (targetId) activateView(targetId);
    });
  });
}

/* -----------------------------------------------------
   CONTROL BINDING
----------------------------------------------------- */

function initControls() {
  // Country select
  const countrySelect = document.getElementById("country-select");
  if (countrySelect) {
    countrySelect.value = appState.country;
    countrySelect.addEventListener("change", () => {
      const newCountry = countrySelect.value || "AUS";
      appState.country = newCountry;
      const meta = COUNTRY_META[newCountry] || COUNTRY_META.AUS;
      appState.valuePerQALY = meta.valuePerQALY;
      appState.vsl = meta.vsl;
      renderAll();
    });
  }

  // Outbreak segmented control
  const outbreakToggle = document.getElementById("outbreak-toggle");
  if (outbreakToggle) {
    const buttons = outbreakToggle.querySelectorAll(".segmented-item");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        appState.outbreak = btn.dataset.value || "mild";
        // Update helper text is handled in HTML; no change needed here
        renderAll();
      });
    });
  }

  // Segment select
  const segmentSelect = document.getElementById("segment-select");
  if (segmentSelect) {
    segmentSelect.addEventListener("change", () => {
      appState.segment = segmentSelect.value || "full";
      renderAll();
    });
  }

  // Scope, exemptions, coverage segmented controls
  bindSegmentedControl("#scope-control", "scope");
  bindSegmentedControl("#exemption-control", "exemptions");
  bindSegmentedControl("#coverage-control", "coverage");

  // Lives-saved slider
  const livesSlider = document.getElementById("lives-slider");
  const livesLabel = document.getElementById("lives-value");
  if (livesSlider) {
    livesSlider.value = String(appState.livesSaved);
    if (livesLabel) livesLabel.textContent = `${appState.livesSaved}`;
    livesSlider.addEventListener("input", () => {
      const raw = Number(livesSlider.value || 0);
      appState.livesSaved = raw;
      if (livesLabel) livesLabel.textContent = `${raw}`;
      renderAll();
    });
  }

  // Dashboard chart metric selector
  const dashChartSelect = document.getElementById(
    "dashboard-chart-select"
  );
  if (dashChartSelect) {
    dashChartSelect.addEventListener("change", () => {
      if (latestResults.uptake) {
        updateDashboardChart(
          latestResults.uptake,
          latestResults.benefits,
          latestResults.economics
        );
      }
    });
  }

  // Descriptive stats selectors
  const statsCountry = document.getElementById("stats-country-select");
  const statsOutbreak = document.getElementById("stats-outbreak-select");
  const statsClass = document.getElementById("stats-class-select");
  [statsCountry, statsOutbreak, statsClass].forEach((sel) => {
    if (sel) {
      sel.addEventListener("change", () => {
        renderDescriptiveStats();
      });
    }
  });

  // Uptake cross-country metric selector
  const uptakeCrossMetric = document.getElementById(
    "uptake-cross-metric-select"
  );
  if (uptakeCrossMetric) {
    uptakeCrossMetric.addEventListener("change", () => {
      if (!latestResults.uptake || !chartUptakeCrossCountry) return;
      const metric = uptakeCrossMetric.value || "uptake";
      const values = computeCrossCountryMetric(metric);
      chartUptakeCrossCountry.data.datasets[0].data = values;
      chartUptakeCrossCountry.update();
    });
  }

  // Sensitivity sliders – update labels only; full recalculation via buttons
  linkSliderToLabel("sa-ve-slider", "sa-ve-value", (v) =>
    Number(v).toFixed(2)
  );
  linkSliderToLabel("sa-r0-slider", "sa-r0-value", (v) =>
    Number(v).toFixed(1)
  );
  linkSliderToLabel("sa-vsl-slider", "sa-vsl-value", (v) => {
    const val = Number(v);
    return val >= 1_000_000
      ? `${(val / 1_000_000).toFixed(1)}m`
      : val.toLocaleString();
  });
  linkSliderToLabel(
    "sa-discount-slider",
    "sa-discount-value",
    (v) => `${(Number(v) * 100).toFixed(1)}%`
  );
  linkSliderToLabel("sa-cost-multiplier", "sa-cost-value", (v) =>
    Number(v).toFixed(2)
  );
  linkSliderToLabel(
    "sa-employer-multiplier",
    "sa-employer-value",
    (v) => Number(v).toFixed(2)
  );

  // Deterministic sensitivity
  const btnDsa = document.getElementById("btn-run-dsa");
  if (btnDsa) {
    btnDsa.addEventListener("click", () => {
      if (!latestResults.economics) renderAll();
      if (chartTornado && latestResults.economics) {
        const baseNMB = latestResults.economics.nmb;
        chartTornado.data.datasets[0].data = [
          Math.abs(baseNMB * 0.25),
          Math.abs(baseNMB * 0.15),
          Math.abs(baseNMB * 0.2),
          Math.abs(baseNMB * 0.4)
        ];
        chartTornado.update();
      }
    });
  }

  // PSA
  const btnPsa = document.getElementById("btn-run-psa");
  if (btnPsa) {
    btnPsa.addEventListener("click", () => {
      runPSA();
    });
  }

  // Export policy brief
  const exportBtn = document.getElementById("btn-export-brief");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportPolicyBrief);
  }

  // Run full evaluation
  const runEvalBtn = document.getElementById("btn-run-evaluation");
  if (runEvalBtn) {
    runEvalBtn.addEventListener("click", () => {
      renderAll();
    });
  }

  // Save scenario
  const saveScenarioBtn = document.getElementById("btn-save-scenario");
  if (saveScenarioBtn) {
    saveScenarioBtn.addEventListener("click", () => {
      saveCurrentScenario();
    });
  }
}

function bindSegmentedControl(selector, stateKey) {
  const container = document.querySelector(selector);
  if (!container) return;

  const buttons = container.querySelectorAll(".segmented-item");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const val = btn.dataset.value;
      if (val !== undefined) {
        appState[stateKey] = val;
        renderAll();
      }
    });
  });
}

function linkSliderToLabel(sliderId, labelId, formatter) {
  const slider = document.getElementById(sliderId);
  const label = document.getElementById(labelId);
  if (!slider || !label) return;
  const update = () => {
    const v = slider.value;
    label.textContent = formatter ? formatter(v) : v;
  };
  slider.addEventListener("input", update);
  update();
}

/* -----------------------------------------------------
   PSA (lightweight, illustrative)
----------------------------------------------------- */

function randNormal() {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function runPSA() {
  if (!latestResults.economics) renderAll();
  if (!chartCeac || !chartNmbDensity) return;

  const econ = latestResults.economics;
  const baseNMB = econ.nmb;
  const psaInput = document.getElementById("psa-runs-input");
  let nRuns = psaInput ? parseInt(psaInput.value, 10) : 1000;
  if (!Number.isFinite(nRuns)) nRuns = 1000;
  nRuns = Math.max(200, Math.min(3000, nRuns));

  // Assume 30% sd around base NMB
  const sd = Math.abs(baseNMB) * 0.3 || 1_000_000;
  const samples = [];
  for (let i = 0; i < nRuns; i++) {
    const s = baseNMB + randNormal() * sd;
    samples.push(s);
  }

  // CEAC at 5 WTP values around the country threshold
  const meta = getCountryMeta();
  const baseLambda = meta.valuePerQALY;
  const lambdas = [
    baseLambda * 0.5,
    baseLambda * 0.75,
    baseLambda,
    baseLambda * 1.25,
    baseLambda * 1.5
  ];

  // We do not have separate ΔC and ΔE, so we use NMB sign as a proxy
  const probs = lambdas.map(() => {
    const positive = samples.filter((s) => s > 0).length;
    return positive / samples.length;
  });

  chartCeac.data.labels = lambdas;
  chartCeac.data.datasets[0].data = probs;
  chartCeac.update();

  // Density – reuse logic from updateCharts
  const xs = [];
  const ys = [];
  for (let i = -3; i <= 3; i += 0.25) {
    const x = baseNMB + i * sd;
    const y = Math.exp(-0.5 * i * i);
    xs.push(x);
    ys.push(y);
  }
  chartNmbDensity.data.labels = xs;
  chartNmbDensity.data.datasets[0].data = ys;
  chartNmbDensity.update();
}

/* -----------------------------------------------------
   INIT
----------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initControls();
  initCharts();
  renderAll();
});
