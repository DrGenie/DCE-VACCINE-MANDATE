// =====================================================
// VACCINE MANDATE DECISION-AID TOOL
// Front-end logic (script.js)
// =====================================================

/* -----------------------------------------------------
   GLOBAL STATE
----------------------------------------------------- */

const appState = {
  country: "AU", // AU, IT, FR
  outbreak: "mild", // mild, severe
  scope: "high_risk", // high_risk, all_public
  exemptions: "medical_only", // medical_only, med_relig, med_relig_personal
  coverage: "50", // "50", "70", "90"
  livesSaved: 25, // per 100,000
  benefitModel: "all", // UI can switch between definitions
  epiModel: "static", // static, seir, longcovid (placeholder)
  discountRate: 0.03,
  population: 1_000_000,
  baselineCoverage: 0.75,
  valuePerQALY: 50_000,
  vsl: 7_000_000,
  includeControversialCosts: true
};

// Cache of latest results (used for export, charts, etc.)
let latestResults = {
  uptake: null,
  benefits: null,
  costs: null,
  economics: null,
  equity: null
};

/* -----------------------------------------------------
   DCE DATA – MIXED LOGIT (MEAN COEFFICIENTS)
   From Table 3 in your manuscript
   - All coefficients in preference space
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
   From Tables 5 & 6 (preference space, 2 classes)
   - We store preference parameters and class shares.
   - Class membership covariates are not used here but
     can be added later.
----------------------------------------------------- */

const LC_MODELS = {
  AU: {
    mild: {
      // From Table 5 – Australia, mild
      supporterShare: 0.7468,
      resisterShare: 0.2532,
      supporters: {
        ascPolicy: 0.28,
        ascOptOut: -1.01,
        betaScopeAll: -0.19,
        betaExMedRel: -0.18,
        betaExMedRelPers: -0.21,
        betaCov70: 0.10,
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
      // From Table 6 – Australia, severe
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
        betaScopeAll: -0.0,
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
        ascPolicy: 0.10,
        ascOptOut: 2.70,
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
        betaCov70: 0.20,
        betaCov90: 0.36,
        betaLives: 0.03
      },
      resisters: {
        ascPolicy: 0.34,
        ascOptOut: 2.60,
        betaScopeAll: -0.06,
        betaExMedRel: -0.17,
        betaExMedRelPers: 0.09,
        betaCov70: -0.06,
        betaCov90: -0.02,
        betaLives: 0.00
      }
    }
  },
  FR: {
    mild: {
      supporterShare: 0.7169,
      resisterShare: 0.2831,
      // In France mild, Class 2 = supporters, Class 1 = resisters
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
      // In France severe, Class 2 = supporters, Class 1 = resisters
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
        ascOptOut: 2.40,
        betaScopeAll: -0.20,
        betaExMedRel: -0.10,
        betaExMedRelPers: -0.05,
        betaCov70: 0.11,
        betaCov90: 0.18,
        betaLives: 0.00
      }
    }
  }
};

/* -----------------------------------------------------
   HELPER FUNCTIONS
----------------------------------------------------- */

function logitProbability(vMandate, vOptOut) {
  const expM = Math.exp(vMandate);
  const expO = Math.exp(vOptOut);
  return expM / (expM + expO);
}

function getMXLParams() {
  return MXL_COEFFS[appState.country][appState.outbreak];
}

function getLCModel() {
  return LC_MODELS[appState.country][appState.outbreak];
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

  let utility = ascPolicy;
  let optOut = ascOptOut;

  // Scope
  if (appState.scope === "all_public") {
    utility += betaScopeAll;
  }

  // Exemptions
  if (appState.exemptions === "med_relig") {
    utility += betaExMedRel;
  } else if (appState.exemptions === "med_relig_personal") {
    utility += betaExMedRelPers;
  }

  // Coverage
  if (appState.coverage === "70") {
    utility += betaCov70;
  } else if (appState.coverage === "90") {
    utility += betaCov90;
  }

  // Expected lives saved
  utility += betaLives * appState.livesSaved;

  return { vMandate: utility, vOptOut: optOut };
}

/* -----------------------------------------------------
   UPTAKE ENGINE
   - Computes uptake using MXL means
   - Computes class-specific uptake using LC models
   - Composite uptake = average of MXL & LC-weighted
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

  // Composite engine (simple 50/50 blend – can be updated later)
  const composite = 0.5 * mxlProb + 0.5 * uptakeWeighted;

  return {
    mxl: mxlProb,
    lcSupporters: pSupporters,
    lcResisters: pResisters,
    lcWeighted: uptakeWeighted,
    composite
  };
}

/* -----------------------------------------------------
   EPIDEMIOLOGY & BENEFIT METRICS
   NOTE: these are deliberately simple, transparent
   placeholders so that you can plug in your own
   calibrated parameters later.
----------------------------------------------------- */

function computeBenefits(uptake) {
  const pop = appState.population;
  const baselineCoverage = appState.baselineCoverage;

  // Map composite uptake (preference for mandate) -> new coverage
  // Here we assume that, at most, the mandate can increase coverage
  // by 20 percentage points over baseline.
  const maxDeltaCoverage = 0.2;
  const deltaCoverage = maxDeltaCoverage * (uptake.composite - 0.5); // centred at 0.5
  const newCoverage = Math.min(0.99, Math.max(baselineCoverage, baselineCoverage + deltaCoverage));

  // BENEFIT A: Additional vaccinated
  const additionalVaccinated = Math.max(
    0,
    pop * (newCoverage - baselineCoverage)
  );

  // Attack rates (very simple defaults)
  const attackRateBaseline = appState.outbreak === "severe" ? 0.35 : 0.15;
  const infectionRRPerVax = 0.5; // 50% risk reduction for those newly vaccinated

  const baselineCases = pop * attackRateBaseline;
  const casesAverted =
    additionalVaccinated * attackRateBaseline * infectionRRPerVax;

  // Hospitalisation / ICU / death (age-standardised placeholders)
  const hospRate = appState.outbreak === "severe" ? 0.03 : 0.015;
  const icuRate = appState.outbreak === "severe" ? 0.01 : 0.004;
  const deathRate = appState.outbreak === "severe" ? 0.005 : 0.0015;

  const hospAverted = casesAverted * hospRate;
  const icuAverted = casesAverted * icuRate;
  const deathsAverted = casesAverted * deathRate;

  // QALYs and DALYs (very stylised)
  const qalyPerHospitalisation = 0.05;
  const qalyPerICU = 0.2;
  const qalyPerDeath = 10;

  const qalyGained =
    hospAverted * qalyPerHospitalisation +
    icuAverted * qalyPerICU +
    deathsAverted * qalyPerDeath;

  const dalysAverted = qalyGained; // if QALY ~ DALY in sign convention

  // Monetised benefits (CBA)
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
    newCoverage
  };
}

/* -----------------------------------------------------
   COST MODULE (PUBLIC, EMPLOYER, PROGRAMME)
   – Highly stylised template. Plug in your own values.
----------------------------------------------------- */

function computeCosts(uptake, benefits) {
  const pop = appState.population;

  // PUBLIC-SECTOR COSTS (per capita placeholders)
  const policyDrafting = 200_000;
  const legalPrep = 300_000;
  const commsCampaign = 1_000_000;
  const itSystems = 1_200_000;
  const exemptionProcessing = 500_000;
  const enforcement = 1_500_000;

  const publicSectorFixed =
    policyDrafting +
    legalPrep +
    commsCampaign +
    itSystems +
    exemptionProcessing +
    enforcement;

  // Vaccination programme costs – marginal cost for additional doses
  const doseCost = 25; // vaccine + delivery per dose
  const programmeVariableCosts = benefits.additionalVaccinated * doseCost;

  // EMPLOYER-SIDE COSTS (placeholders)
  const employerCostPerWorker = 80; // PTO, admin, testing
  const shareWorkforceTargeted =
    appState.scope === "high_risk" ? 0.15 : 0.65;
  const employerCosts =
    pop * shareWorkforceTargeted * 0.5 * employerCostPerWorker; // assume working-age share

  // Attrition (approximate; could be switched off)
  const attritionRate = appState.scope === "high_risk" ? 0.005 : 0.015;
  const replacementCostPerWorker = 20_000;
  const attritionCosts =
    appState.includeControversialCosts
      ? pop * shareWorkforceTargeted * attritionRate * replacementCostPerWorker
      : 0;

  const totalProgrammeCosts =
    publicSectorFixed + programmeVariableCosts + employerCosts + attritionCosts;

  return {
    publicSectorFixed,
    programmeVariableCosts,
    employerCosts,
    attritionCosts,
    totalProgrammeCosts
  };
}

/* -----------------------------------------------------
   ECONOMIC EVALUATION: CBA / CEA / NMB
----------------------------------------------------- */

function computeEconomicEvaluation(benefits, costs) {
  const totalCosts = costs.totalProgrammeCosts;
  const totalBenefitsMonetised = benefits.monetisedBenefits;

  const npv = totalBenefitsMonetised - totalCosts;
  const bcr = totalBenefitsMonetised / (totalCosts || 1);

  const costPerVaccinated =
    totalCosts / (benefits.additionalVaccinated || 1);
  const costPerCaseAverted = totalCosts / (benefits.casesAverted || 1);
  const costPerDeathAverted = totalCosts / (benefits.deathsAverted || 1);
  const costPerQALY = totalCosts / (benefits.qalyGained || 1);

  const nmb = benefits.qalyGained * appState.valuePerQALY - totalCosts;

  return {
    npv,
    bcr,
    costPerVaccinated,
    costPerCaseAverted,
    costPerDeathAverted,
    costPerQALY,
    nmb,
    totalCosts,
    totalBenefitsMonetised
  };
}

/* -----------------------------------------------------
   EQUITY MODULE – SIMPLE PLACEHOLDER
   Here we just split QALYs across three SES groups using
   an arbitrary pattern and compute a very simple
   “equity-weighted NMB”.
----------------------------------------------------- */

function computeEquity(benefits, economics) {
  const qaly = benefits.qalyGained;

  // Split QALYs by SES (low, middle, high)
  const shareLow = 0.45;
  const shareMid = 0.35;
  const shareHigh = 0.20;

  const qalyLow = qaly * shareLow;
  const qalyMid = qaly * shareMid;
  const qalyHigh = qaly * shareHigh;

  // Very simple equity weights (Cookson-style idea)
  const wLow = 1.3;
  const wMid = 1.0;
  const wHigh = 0.7;

  const eqWeightedQALY =
    qalyLow * wLow + qalyMid * wMid + qalyHigh * wHigh;

  const equityAdjustedNMB =
    eqWeightedQALY * appState.valuePerQALY - economics.totalCosts;

  return {
    qalyLow,
    qalyMid,
    qalyHigh,
    eqWeightedQALY,
    equityAdjustedNMB
  };
}

/* -----------------------------------------------------
   UI HELPERS
----------------------------------------------------- */

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function formatPercent(x) {
  return `${(x * 100).toFixed(1)}%`;
}

function formatRate(x) {
  return x.toLocaleString(undefined, {
    maximumFractionDigits: 0
  });
}

function formatCurrency(x) {
  return "AUD " + x.toLocaleString(undefined, {
    maximumFractionDigits: 0
  });
}

/* -----------------------------------------------------
   CHARTS (lazy initialisation)
----------------------------------------------------- */

let uptakeByClassChart;
let benefitComparisonChart;
let ceacChart;
let equityChart;
let tornadoChart;

function initCharts() {
  const uptakeCanvas = document.getElementById("uptakeByClassChart");
  if (uptakeCanvas && window.Chart && !uptakeByClassChart) {
    uptakeByClassChart = new Chart(uptakeCanvas.getContext("2d"), {
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

  const benefitCanvas = document.getElementById("benefitComparisonChart");
  if (benefitCanvas && window.Chart && !benefitComparisonChart) {
    benefitComparisonChart = new Chart(benefitCanvas.getContext("2d"), {
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

  const equityCanvas = document.getElementById("equityDistributionChart");
  if (equityCanvas && window.Chart && !equityChart) {
    equityChart = new Chart(equityCanvas.getContext("2d"), {
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

  const ceacCanvas = document.getElementById("ceacChart");
  if (ceacCanvas && window.Chart && !ceacChart) {
    ceacChart = new Chart(ceacCanvas.getContext("2d"), {
      type: "line",
      data: {
        labels: [0, 25_000, 50_000, 75_000, 100_000],
        datasets: [
          {
            label: "Probability cost-effective",
            data: [0.1, 0.35, 0.6, 0.8, 0.9],
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
              callback: (v) => `AUD ${v / 1000}k`
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

  const tornadoCanvas = document.getElementById("tornadoChart");
  if (tornadoCanvas && window.Chart && !tornadoChart) {
    tornadoChart = new Chart(tornadoCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: ["Vaccine effectiveness", "Attrition", "Employer costs", "VSL"],
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
              callback: (v) => `AUD ${v / 1_000_000}m`
            }
          }
        }
      }
    });
  }
}

function updateCharts(uptake, benefits, economics, equity) {
  if (uptakeByClassChart) {
    uptakeByClassChart.data.datasets[0].data = [
      uptake.mxl,
      uptake.lcSupporters,
      uptake.lcResisters,
      uptake.lcWeighted
    ];
    uptakeByClassChart.update();
  }

  if (benefitComparisonChart) {
    benefitComparisonChart.data.datasets[0].data = [
      benefits.casesAverted,
      benefits.hospAverted,
      benefits.icuAverted,
      benefits.deathsAverted
    ];
    benefitComparisonChart.update();
  }

  if (equityChart) {
    equityChart.data.datasets[0].data = [
      equity.qalyLow,
      equity.qalyMid,
      equity.qalyHigh
    ];
    equityChart.update();
  }

  if (tornadoChart) {
    const baseNMB = economics.nmb;
    tornadoChart.data.datasets[0].data = [
      Math.abs(baseNMB * 0.25),
      Math.abs(baseNMB * 0.15),
      Math.abs(baseNMB * 0.2),
      Math.abs(baseNMB * 0.4)
    ];
    tornadoChart.update();
  }
}

/* -----------------------------------------------------
   EXPORT – Simple HTML policy brief
----------------------------------------------------- */

function exportPolicyBrief() {
  if (!latestResults.uptake) return;

  const w = window.open("", "_blank");
  if (!w) return;

  const { uptake, benefits, costs, economics, equity } = latestResults;

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
      <div class="tagline">${appState.country} • ${appState.outbreak.toUpperCase()} outbreak context</div>
      <p>This brief summarises predicted uptake, health benefits, costs, and cost-effectiveness for the selected vaccine-mandate configuration.</p>

      <h2>Mandate Configuration</h2>
      <table>
        <tr><th>Country</th><td>${appState.country}</td></tr>
        <tr><th>Outbreak context</th><td>${appState.outbreak}</td></tr>
        <tr><th>Scope</th><td>${appState.scope === "high_risk" ? "High-risk occupations only" : "All occupations & public spaces"}</td></tr>
        <tr><th>Exemptions</th><td>${appState.exemptions}</td></tr>
        <tr><th>Coverage threshold</th><td>${appState.coverage}% of population vaccinated</td></tr>
        <tr><th>Expected lives saved</th><td>${appState.livesSaved} per 100,000 population</td></tr>
      </table>

      <h2>DCE Predicted Uptake</h2>
      <table>
        <tr><th>Model</th><th>Predicted uptake</th></tr>
        <tr><td>Mixed logit (mean)</td><td>${formatPercent(uptake.mxl)}</td></tr>
        <tr><td>Latent class – supporters</td><td>${formatPercent(uptake.lcSupporters)}</td></tr>
        <tr><td>Latent class – resisters</td><td>${formatPercent(uptake.lcResisters)}</td></tr>
        <tr><td>Latent class – weighted</td><td>${formatPercent(uptake.lcWeighted)}</td></tr>
        <tr><td><strong>Composite uptake</strong></td><td><strong>${formatPercent(uptake.composite)}</strong></td></tr>
      </table>

      <h2>Health Outcomes</h2>
      <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Additional vaccinated</td><td>${formatRate(benefits.additionalVaccinated)}</td></tr>
        <tr><td>Cases averted</td><td>${formatRate(benefits.casesAverted)}</td></tr>
        <tr><td>Hospitalisations averted</td><td>${formatRate(benefits.hospAverted)}</td></tr>
        <tr><td>ICU admissions averted</td><td>${formatRate(benefits.icuAverted)}</td></tr>
        <tr><td>Deaths averted</td><td>${formatRate(benefits.deathsAverted)}</td></tr>
        <tr><td>QALYs gained</td><td>${benefits.qalyGained.toFixed(1)}</td></tr>
        <tr><td>DALYs averted</td><td>${benefits.dalysAverted.toFixed(1)}</td></tr>
      </table>

      <h2>Costs & Economic Evaluation</h2>
      <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Total programme costs</td><td>${formatCurrency(economics.totalCosts)}</td></tr>
        <tr><td>Monetised benefits</td><td>${formatCurrency(economics.totalBenefitsMonetised)}</td></tr>
        <tr><td>Net present value (NPV)</td><td>${formatCurrency(economics.npv)}</td></tr>
        <tr><td>Benefit-cost ratio</td><td>${economics.bcr.toFixed(2)}</td></tr>
        <tr><td>Cost per additional vaccinated</td><td>${formatCurrency(economics.costPerVaccinated)}</td></tr>
        <tr><td>Cost per case averted</td><td>${formatCurrency(economics.costPerCaseAverted)}</td></tr>
        <tr><td>Cost per death averted</td><td>${formatCurrency(economics.costPerDeathAverted)}</td></tr>
        <tr><td>Cost per QALY gained</td><td>${formatCurrency(economics.costPerQALY)}</td></tr>
        <tr><td>Net monetary benefit (NMB)</td><td>${formatCurrency(economics.nmb)}</td></tr>
      </table>

      <h2>Equity Summary</h2>
      <table>
        <tr><th>Group</th><th>QALYs gained</th></tr>
        <tr><td>Low SES</td><td>${equity.qalyLow.toFixed(1)}</td></tr>
        <tr><td>Middle SES</td><td>${equity.qalyMid.toFixed(1)}</td></tr>
        <tr><td>High SES</td><td>${equity.qalyHigh.toFixed(1)}</td></tr>
        <tr><td><strong>Equity-weighted NMB</strong></td><td><strong>${formatCurrency(
          equity.equityAdjustedNMB
        )}</strong></td></tr>
      </table>

      <p style="margin-top:24px; font-size:12px; color:#6b7280;">
        Methods: Prediction of mandate uptake is based on mixed logit and latent class models estimated from discrete choice experiment data for Australia, France, and Italy, under mild and severe outbreak vignettes. Epidemiological and costing parameters in this brief are stylised placeholders for decision-support and should be replaced with context-specific values before policy use.
      </p>
    </body>
  </html>
  `;

  w.document.open();
  w.document.write(html);
  w.document.close();
}

/* -----------------------------------------------------
   RENDER RESULTS INTO DASHBOARD
----------------------------------------------------- */

function renderAll() {
  const uptake = computeUptake();
  const benefits = computeBenefits(uptake);
  const costs = computeCosts(uptake, benefits);
  const economics = computeEconomicEvaluation(benefits, costs);
  const equity = computeEquity(benefits, economics);

  latestResults = { uptake, benefits, costs, economics, equity };

  // Summary metrics
  setText("metric-uptake-mxl", formatPercent(uptake.mxl));
  setText("metric-uptake-lc", formatPercent(uptake.lcWeighted));
  setText("metric-uptake-composite", formatPercent(uptake.composite));

  setText("metric-additional-vaccinated", formatRate(benefits.additionalVaccinated));
  setText("metric-cases-averted", formatRate(benefits.casesAverted));
  setText("metric-deaths-averted", formatRate(benefits.deathsAverted));
  setText("metric-qalys", benefits.qalyGained.toFixed(1));
  setText("metric-dalys", benefits.dalysAverted.toFixed(1));

  setText("metric-total-costs", formatCurrency(economics.totalCosts));
  setText("metric-total-benefits", formatCurrency(economics.totalBenefitsMonetised));
  setText("metric-npv", formatCurrency(economics.npv));
  setText("metric-bcr", economics.bcr.toFixed(2));
  setText("metric-cost-per-qaly", formatCurrency(economics.costPerQALY));
  setText("metric-nmb", formatCurrency(economics.nmb));
  setText(
    "metric-equity-nmb",
    formatCurrency(equity.equityAdjustedNMB)
  );

  // Scenario summary chips
  setText("summary-country", appState.country === "AU" ? "Australia" : appState.country === "IT" ? "Italy" : "France");
  setText("summary-outbreak", appState.outbreak === "mild" ? "Mild outbreak" : "Severe outbreak");
  setText(
    "summary-scope",
    appState.scope === "high_risk"
      ? "High-risk occupations only"
      : "All occupations & public spaces"
  );
  setText(
    "summary-exemptions",
    appState.exemptions === "medical_only"
      ? "Medical only"
      : appState.exemptions === "med_relig"
      ? "Medical + religious"
      : "Medical + religious + personal belief"
  );
  setText("summary-coverage", `${appState.coverage}% vaccinated`);
  setText(
    "summary-lives",
    `${appState.livesSaved} lives saved per 100,000`
  );

  // Charts
  updateCharts(uptake, benefits, economics, equity);
}

/* -----------------------------------------------------
   NAVIGATION
----------------------------------------------------- */

function initNavigation() {
  const navItems = document.querySelectorAll(".nav-item[data-view]");
  const sections = document.querySelectorAll(".view-section");

  navItems.forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      navItems.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      sections.forEach((sec) => {
        if (sec.id === `view-${view}`) {
          sec.classList.add("active");
        } else {
          sec.classList.remove("active");
        }
      });
    });
  });
}

/* -----------------------------------------------------
   BIND CONTROLS
----------------------------------------------------- */

function bindSegmentedControl(containerSelector, stateKey, dataKey) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const buttons = container.querySelectorAll(".segmented-item");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.dataset[dataKey];
      if (val === undefined) return;
      appState[stateKey] = val;

      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      renderAll();
    });
  });
}

function initControls() {
  // Country, outbreak, design attributes
  bindSegmentedControl("#countryControl", "country", "country");
  bindSegmentedControl("#outbreakControl", "outbreak", "outbreak");
  bindSegmentedControl("#scopeControl", "scope", "scope");
  bindSegmentedControl("#exemptionControl", "exemptions", "exemption");
  bindSegmentedControl("#coverageControl", "coverage", "coverage");

  // Lives-saved slider
  const livesSlider = document.getElementById("livesSlider");
  if (livesSlider) {
    livesSlider.addEventListener("input", () => {
      const raw = Number(livesSlider.value || 0);
      appState.livesSaved = raw;
      const label = document.getElementById("livesValue");
      if (label) label.textContent = `${raw}`;
      renderAll();
    });
  }

  // Population / baseline coverage, if present
  const popInput = document.getElementById("populationInput");
  if (popInput) {
    popInput.addEventListener("change", () => {
      const val = Number(popInput.value || 0);
      if (val > 0) appState.population = val;
      renderAll();
    });
  }

  const baseCovInput = document.getElementById("baselineCoverageInput");
  if (baseCovInput) {
    baseCovInput.addEventListener("change", () => {
      const val = Number(baseCovInput.value || 0) / 100;
      if (val >= 0 && val <= 1) appState.baselineCoverage = val;
      renderAll();
    });
  }

  // Toggle for controversial costs (social / attrition)
  const controversialToggle = document.getElementById("toggleControversialCosts");
  if (controversialToggle) {
    controversialToggle.addEventListener("change", () => {
      appState.includeControversialCosts = controversialToggle.checked;
      renderAll();
    });
  }

  // Export button
  const exportBtn = document.getElementById("exportBriefBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportPolicyBrief);
  }
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

/* -----------------------------------------------------
   NAVIGATION
----------------------------------------------------- */

function initNavigation() {
  const navItems = document.querySelectorAll(".nav-item[data-view]");
  const sections = document.querySelectorAll(".view-section");

  if (!navItems.length || !sections.length) return;

  const activateView = (view) => {
    // Highlight active tab
    navItems.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === view);
    });

    // Show / hide sections
    sections.forEach((sec) => {
      const shouldShow = sec.id === `view-${view}`;
      sec.classList.toggle("active", shouldShow);
    });
  };

  // Initial view: existing active tab or first tab
  const activeNav = document.querySelector(".nav-item.active[data-view]");
  const initialView =
    (activeNav && activeNav.dataset.view) ||
    (navItems[0] && navItems[0].dataset.view);

  if (initialView) {
    activateView(initialView);
  }

  // Click handlers
  navItems.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const view = btn.dataset.view;
      if (view) activateView(view);
    });
  });
}
