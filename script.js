// Simple global state
const state = {
    config: null,
    countryKey: null,
    scenarioKey: null,
    selections: {
        scope: null,
        exemptions: null,
        coverage: null,
        livesSaved: 10
    },
    charts: {
        uptake: null
    }
};

document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    loadConfig();
});

/* -------------------------
   Tabs
-------------------------- */

function initTabs() {
    const buttons = document.querySelectorAll(".tab-button");
    const panels = document.querySelectorAll(".tab-panel");

    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetSelector = btn.getAttribute("data-tab-target");
            if (!targetSelector) return;
            const targetPanel = document.querySelector(targetSelector);
            if (!targetPanel) return;

            buttons.forEach(b => b.classList.remove("active"));
            panels.forEach(p => p.classList.remove("active"));

            btn.classList.add("active");
            targetPanel.classList.add("active");
        });
    });
}

/* -------------------------
   Config loading
-------------------------- */

async function loadConfig() {
    try {
        const res = await fetch("mandeval_config.json");
        if (!res.ok) {
            throw new Error("Could not load configuration JSON");
        }
        const config = await res.json();
        state.config = config;

        initSelectors();
        initPolicyControls();
        updateAll();
    } catch (err) {
        console.error(err);
        alert("Configuration could not be loaded. Please check mandeval_config.json and try again.");
    }
}

/* -------------------------
   Initialisation helpers
-------------------------- */

function initSelectors() {
    const { countries } = state.config;

    const countrySelect = document.getElementById("country-select");
    const scenarioSelect = document.getElementById("scenario-select");

    // Populate countries
    Object.entries(countries).forEach(([key, country]) => {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = country.label;
        countrySelect.appendChild(opt);
    });

    // Set default country
    state.countryKey = Object.keys(countries)[0];
    countrySelect.value = state.countryKey;

    // Populate scenarios
    populateScenarioSelect();

    countrySelect.addEventListener("change", () => {
        state.countryKey = countrySelect.value;
        populateScenarioSelect();
        updateAll();
    });

    scenarioSelect.addEventListener("change", () => {
        state.scenarioKey = scenarioSelect.value;
        updateAll();
    });
}

function populateScenarioSelect() {
    const scenarioSelect = document.getElementById("scenario-select");
    scenarioSelect.innerHTML = "";

    const scenarios = state.config.countries[state.countryKey].scenarios;
    Object.entries(scenarios).forEach(([key, scenario]) => {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = scenario.label;
        scenarioSelect.appendChild(opt);
    });

    state.scenarioKey = Object.keys(scenarios)[0];
    scenarioSelect.value = state.scenarioKey;
}

function initPolicyControls() {
    const { attributes } = state.config;

    const scopeSelect = document.getElementById("scope-select");
    const exemptionsSelect = document.getElementById("exemptions-select");
    const coverageSelect = document.getElementById("coverage-select");
    const livesRange = document.getElementById("lives-saved-range");
    const livesLabel = document.getElementById("lives-saved-label");

    // Helper to populate a select
    function populateSelect(selectEl, attributeKey) {
        const attr = attributes[attributeKey];
        selectEl.innerHTML = "";

        Object.entries(attr.levels).forEach(([levelKey, level]) => {
            const opt = document.createElement("option");
            opt.value = levelKey;
            opt.textContent = level.label;
            selectEl.appendChild(opt);
        });

        state.selections[attributeKey] = attr.referenceLevel;
        selectEl.value = attr.referenceLevel;
    }

    populateSelect(scopeSelect, "scope");
    populateSelect(exemptionsSelect, "exemptions");
    populateSelect(coverageSelect, "coverage");

    // Lives saved slider
    livesLabel.textContent = livesRange.value;
    state.selections.livesSaved = Number(livesRange.value);

    scopeSelect.addEventListener("change", () => {
        state.selections.scope = scopeSelect.value;
        updateAll();
    });

    exemptionsSelect.addEventListener("change", () => {
        state.selections.exemptions = exemptionsSelect.value;
        updateAll();
    });

    coverageSelect.addEventListener("change", () => {
        state.selections.coverage = coverageSelect.value;
        updateAll();
    });

    livesRange.addEventListener("input", () => {
        const value = Number(livesRange.value);
        state.selections.livesSaved = value;
        livesLabel.textContent = value;
        updateAll();
    });
}

/* -------------------------
   Updates
-------------------------- */

function updateAll() {
    if (!state.config || !state.countryKey || !state.scenarioKey) return;

    updateSampleProfile();
    updateModelDiagnostics();
    updatePolicySummary();
    updateUptake();
    updateEquivalenceTable();
}

function getCurrentModel() {
    const country = state.config.countries[state.countryKey];
    const scenario = country.scenarios[state.scenarioKey];
    return {
        country,
        scenario
    };
}

/* -------------------------
   Overview tab
-------------------------- */

function updateSampleProfile() {
    const dl = document.getElementById("sample-profile");
    dl.innerHTML = "";

    const { sample } = state.config.countries[state.countryKey];

    const items = [
        ["Respondents", sample.n_respondents.toLocaleString()],
        ["Female", `${(sample.female_pct * 100).toFixed(1)}%`],
        ["Median age", sample.median_age],
        ["Bachelor's degree or higher", `${(sample.bachelors_or_higher_pct * 100).toFixed(1)}%`]
    ];

    items.forEach(([label, value]) => {
        const dt = document.createElement("dt");
        dt.textContent = label;
        const dd = document.createElement("dd");
        dd.textContent = value;
        dl.appendChild(dt);
        dl.appendChild(dd);
    });
}

function updateModelDiagnostics() {
    const dl = document.getElementById("model-diagnostics");
    dl.innerHTML = "";

    const { scenario } = getCurrentModel();
    const d = scenario.mxl.diagnostics;

    const items = [
        ["Log likelihood", d.log_likelihood.toFixed(1)],
        ["Pseudo R²", d.r2_pseudo.toFixed(3)],
        ["AIC / n", d.aic_over_n.toFixed(3)],
        ["BIC / n", d.bic_over_n.toFixed(3)]
    ];

    items.forEach(([label, value]) => {
        const dt = document.createElement("dt");
        dt.textContent = label;
        const dd = document.createElement("dd");
        dd.textContent = value;
        dl.appendChild(dt);
        dl.appendChild(dd);
    });
}

/* -------------------------
   Policy summary
-------------------------- */

function updatePolicySummary() {
    const ul = document.getElementById("policy-summary");
    ul.innerHTML = "";

    const { attributes } = state.config;

    const scopeAttr = attributes.scope;
    const exemptionsAttr = attributes.exemptions;
    const coverageAttr = attributes.coverage;

    const items = [
        ["Scope", scopeAttr.levels[state.selections.scope].label],
        ["Exemptions", exemptionsAttr.levels[state.selections.exemptions].label],
        ["Coverage threshold", coverageAttr.levels[state.selections.coverage].label],
        ["Expected lives saved",
            `${state.selections.livesSaved} per 100,000 people`]
    ];

    items.forEach(([label, value]) => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${label}:</strong> ${value}`;
        ul.appendChild(li);
    });
}

/* -------------------------
   Predicted support (uptake)
-------------------------- */

function updateUptake() {
    const indicators = document.getElementById("uptake-indicators");
    indicators.innerHTML = "";

    const { scenario } = getCurrentModel();
    const beta = scenario.mxl.coefficients;

    // Utilities:
    // Alt B baseline: V_B = 0
    // Policy A: ASC_A + attribute terms
    // Opt-out: ASC_OptOut
    let V_A = (beta.asc_policyA?.mean ?? 0);
    let V_optOut = (beta.asc_optout?.mean ?? 0);
    const livesSaved = state.selections.livesSaved;

    // Scope (dummy coded vs "high_risk_only")
    if (state.selections.scope === "all_occupations_public") {
        V_A += (beta.scope_all_occupations_public?.mean ?? 0);
    }

    // Exemptions (dummy coded vs "medical_only")
    if (state.selections.exemptions === "medical_religious") {
        V_A += (beta.exemptions_medical_religious?.mean ?? 0);
    } else if (state.selections.exemptions === "medical_religious_personal") {
        V_A += (beta.exemptions_medical_religious_personal?.mean ?? 0);
    }

    // Coverage (dummy coded vs 70%)
    if (state.selections.coverage === "80") {
        V_A += (beta.coverage_80?.mean ?? 0);
    } else if (state.selections.coverage === "90") {
        V_A += (beta.coverage_90?.mean ?? 0);
    }

    // Lives saved: coefficient per 10 lives
    const betaLives = beta.lives_saved_10?.mean ?? 0;
    const livesTerm = betaLives * (livesSaved / 10);
    V_A += livesTerm;

    const V_B = 0;

    const expA = Math.exp(V_A);
    const expB = Math.exp(V_B);
    const expOpt = Math.exp(V_optOut);
    const denom = expA + expB + expOpt;

    const pA = expA / denom;
    const pB = expB / denom;
    const pOpt = expOpt / denom;

    // Chart
    renderUptakeChart(pA, pB, pOpt);

    const items = [
        ["Support for your mandate (Policy A)", `${(pA * 100).toFixed(1)}%`],
        ["Support for alternative mandate (Policy B)", `${(pB * 100).toFixed(1)}%`],
        ["Preference for no mandate (opt-out)", `${(pOpt * 100).toFixed(1)}%`],
        ["Relative odds (Policy A vs opt-out)", (pA / pOpt).toFixed(2)]
    ];

    items.forEach(([label, value]) => {
        const dt = document.createElement("dt");
        dt.textContent = label;
        const dd = document.createElement("dd");
        dd.textContent = value;
        indicators.appendChild(dt);
        indicators.appendChild(dd);
    });
}

function renderUptakeChart(pA, pB, pOpt) {
    const ctx = document.getElementById("uptake-chart");

    const data = [
        (pA * 100).toFixed(1),
        (pB * 100).toFixed(1),
        (pOpt * 100).toFixed(1)
    ].map(Number);

    if (!state.charts.uptake) {
        state.charts.uptake = new Chart(ctx, {
            type: "bar",
            data: {
                labels: ["Policy A", "Policy B", "No mandate"],
                datasets: [
                    {
                        label: "Predicted support (%)",
                        data,
                        borderRadius: 12,
                        backgroundColor: [
                            "rgba(0, 82, 204, 0.9)",
                            "rgba(148, 163, 184, 0.9)",
                            "rgba(248, 113, 113, 0.9)"
                        ]
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        suggestedMax: 100,
                        ticks: {
                            callback: value => value + "%"
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: ctx => `${ctx.raw.toFixed(1)}%`
                        }
                    }
                }
            }
        });
    } else {
        state.charts.uptake.data.datasets[0].data = data;
        state.charts.uptake.update();
    }
}

/* -------------------------
   Trade-off (equivalence) table
-------------------------- */

function updateEquivalenceTable() {
    const tbody = document.querySelector("#equivalence-table tbody");
    tbody.innerHTML = "";

    const { scenario } = getCurrentModel();
    const wts = scenario.wts;

    if (!wts) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="3">Trade-off estimates are not available for this configuration.</td>`;
        tbody.appendChild(tr);
        return;
    }

    const rows = [
        {
            key: "scope_all_occupations_public",
            label: "Restrict mandate to high-risk only → extend to all occupations and public spaces"
        },
        {
            key: "exemptions_medical_religious",
            label: "Strict medical-only exemptions → add religious exemptions"
        },
        {
            key: "exemptions_medical_religious_personal",
            label: "Strict medical-only exemptions → add religious and personal exemptions"
        },
        {
            key: "coverage_80",
            label: "Lift mandate at 70% coverage → lift at 80%"
        },
        {
            key: "coverage_90",
            label: "Lift mandate at 70% coverage → lift at 90%"
        }
    ];

    rows.forEach(row => {
        const est = wts[row.key];
        if (!est) return;

        const mean = est.mean;
        const se = est.se;
        const ciWidth = 1.96 * se * 2; // approximate total width of 95% CI

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${row.label}</td>
            <td>${mean.toFixed(1)}</td>
            <td>${ciWidth.toFixed(1)}</td>
        `;
        tbody.appendChild(tr);
    });
}
