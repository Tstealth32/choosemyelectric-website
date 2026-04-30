const estimateState = {
  commodity: "electric",
  currentCost: null,
  detectedRegion: null,
  market: null,
  manualInputs: {
    benchmarkRateCents: "",
    currentRateCents: "",
    monthlyUsage: "",
    utilityName: "",
  },
  recommendations: [],
  zipCode: "",
};

const estimateElements = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheEstimateElements();
  bindEstimateEvents();
  restoreQueryState();
  syncCommodityVisibility();
});

function cacheEstimateElements() {
  estimateElements.form = document.getElementById("estimate-form");
  estimateElements.zipCode = document.getElementById("zip-code");
  estimateElements.commodityField = document.getElementById("commodity-field");
  estimateElements.utilityChoicePanel = document.getElementById("utility-choice-panel");
  estimateElements.utilityChoice = document.getElementById("utility-choice");
  estimateElements.utilityChoiceLabel = document.getElementById("utility-choice-label");
  estimateElements.status = document.getElementById("estimate-status");
  estimateElements.utilityName = document.getElementById("utility-name");
  estimateElements.currentRate = document.getElementById("current-rate");
  estimateElements.benchmarkRate = document.getElementById("benchmark-rate");
  estimateElements.monthlyUsage = document.getElementById("monthly-usage");
  estimateElements.currentCostValue = document.getElementById("current-cost-value");
  estimateElements.currentCostNote = document.getElementById("current-cost-note");
  estimateElements.bestOfferValue = document.getElementById("best-offer-value");
  estimateElements.bestOfferNote = document.getElementById("best-offer-note");
  estimateElements.savingsValue = document.getElementById("savings-value");
  estimateElements.savingsNote = document.getElementById("savings-note");
  estimateElements.resultsSubtitle = document.getElementById("results-subtitle");
  estimateElements.offerResults = document.getElementById("offer-results");
  estimateElements.sourceNote = document.getElementById("source-note");
  estimateElements.commodityInputs = Array.from(
    document.querySelectorAll('input[name="commodity"]'),
  );
  estimateElements.quickWinPanel = document.getElementById("quick-win-panel");
  estimateElements.quickWinHeadline = document.getElementById("quick-win-headline");
  estimateElements.quickWinMeta = document.getElementById("quick-win-meta");
  estimateElements.quickWinDetail = document.getElementById("quick-win-detail");
  estimateElements.quickWinRate = document.getElementById("quick-win-rate");
  estimateElements.quickWinSavings = document.getElementById("quick-win-savings");
}

function bindEstimateEvents() {
  estimateElements.form?.addEventListener("submit", handleEstimateSubmit);
  estimateElements.zipCode?.addEventListener("input", () => {
    estimateState.zipCode = normalizeZip(estimateElements.zipCode.value);
    estimateElements.zipCode.value = estimateState.zipCode;
    clearUtilityChoices();
    syncCommodityVisibility();
  });
  estimateElements.commodityInputs.forEach((input) => {
    input.addEventListener("change", () => {
      estimateState.commodity = input.value === "gas" ? "gas" : "electric";
      clearUtilityChoices();
      syncCommodityVisibility();
    });
  });
  estimateElements.utilityChoice?.addEventListener("change", async () => {
    if (!estimateElements.utilityChoice.value || !estimateState.zipCode) return;
    await refreshMarket({
      preferredUtilityName: estimateState.manualInputs.utilityName,
      utilityChoiceKey: estimateElements.utilityChoice.value,
    });
  });
  bindManualField("utilityName", estimateElements.utilityName);
  bindManualField("currentRateCents", estimateElements.currentRate);
  bindManualField("benchmarkRateCents", estimateElements.benchmarkRate);
  bindManualField("monthlyUsage", estimateElements.monthlyUsage);
}

function bindManualField(key, element) {
  if (!element) return;
  element.addEventListener("input", () => {
    estimateState.manualInputs[key] = element.value.trim();
    recomputeRecommendations();
  });
}

async function restoreQueryState() {
  const query = new URLSearchParams(window.location.search);
  const zipCode = normalizeZip(query.get("zip") || "");
  if (!zipCode) return;

  estimateState.zipCode = zipCode;
  if (estimateElements.zipCode) {
    estimateElements.zipCode.value = zipCode;
  }

  const commodity = query.get("commodity");
  if (commodity === "gas") {
    estimateState.commodity = "gas";
    const gasInput = estimateElements.commodityInputs.find((input) => input.value === "gas");
    if (gasInput) gasInput.checked = true;
  }

  syncCommodityVisibility();

  if (zipCode.length === 5) {
    await refreshMarket({
      preferredUtilityName: estimateState.manualInputs.utilityName,
    });
  }
}

async function handleEstimateSubmit(event) {
  event.preventDefault();
  setStatus("Checking your ZIP code and loading official market data...", "info");

  const normalizedZip = normalizeZip(estimateElements.zipCode.value);
  estimateState.zipCode = normalizedZip;
  resetManualInputs();

  if (!normalizedZip) {
    setStatus("Enter your ZIP code to continue.", "error");
    return;
  }

  syncCommodityVisibility();
  await refreshMarket({
    preferredUtilityName: estimateState.manualInputs.utilityName,
  });
}

async function refreshMarket({ preferredUtilityName = "", utilityChoiceKey = "" } = {}) {
  const requestBody = {
    commodity: estimateState.commodity,
    preferredUtilityName,
    region: detectRegion(estimateState.zipCode, estimateState.commodity) || estimateState.detectedRegion,
    utilityChoiceKey,
    zipCode: estimateState.zipCode,
  };

  setStatus("Loading market data for your ZIP code...", "info");

  const response = await fetch("/api/market", {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(requestBody),
  });
  const payload = await response.json();

  if (!response.ok) {
    estimateState.market = null;
    estimateState.recommendations = [];
    renderResults();
    setStatus(payload.error || "The market estimate could not load right now.", "error");
    return;
  }

  estimateState.market = normalizeMarketPayload(payload);
  estimateState.detectedRegion = estimateState.market.region;
  populateUtilityChoices(estimateState.market.utilityChoices, estimateState.market.selectedUtilityChoiceKey);

  if (requiresUtilitySelection(estimateState.market)) {
    estimateState.currentCost = null;
    estimateState.recommendations = [];
    renderResults();
    setStatus(
      estimateState.market.errorMessage ||
        `Choose ${activeUtilityChoiceLabel().toLowerCase()} to load accurate supplier rates for this ZIP code.`,
      "warning",
    );
    estimateElements.utilityChoice?.focus();
    return;
  }

  autofillManualInputs();
  recomputeRecommendations();

  if (estimateState.market.errorMessage) {
    setStatus(estimateState.market.errorMessage, "warning");
    return;
  }

  if (!estimateState.market.offers.length && estimateState.market.additionalSupplierContacts?.length) {
    setStatus(
      "We loaded the official benchmark and supplier directory for this ZIP code. Use the links below to review current supplier details.",
      "warning",
    );
    return;
  }

  if (!estimateState.market.offers.length) {
    setStatus(
      "We found the market for this ZIP code, but there are no live comparable offers showing right now.",
      "warning",
    );
    return;
  }

  setStatus("Estimate ready. Review the numbers and compare the live plan list below.", "success");
}

function normalizeMarketPayload(payload) {
  const region = payload.region;
  const benchmarkRateCentsPerKwh = toNumber(
    payload.benchmarkRateCentsPerKwh ?? payload.benchmarkRateCentsPerUnit,
  );

  let offers = [];
  let additionalSupplierContacts = normalizeSupplierContacts(
    payload.additionalSupplierContacts,
    payload.sourceUrl,
  );
  if (region === "PA") {
    offers = parsePennsylvaniaOffers(payload.resultsHtml, payload.sourceUrl);
  } else if (region === "TX") {
    offers = parseTexasOffers(payload.offers);
  } else if (region === "OH_E" || region === "OH_G") {
    offers = parseOhioOffers(payload.comparisonHtml, region);
  } else if (region === "MD") {
    offers = parseMarylandOffers(payload.resultsHtml, payload.sourceUrl);
  } else if (region === "CT" || region === "DC" || region === "ME" || region === "NJ" || region === "NY") {
    offers = normalizeOfferRecords(payload.offers, payload.sourceUrl);
  } else if (region === "MA") {
    offers = parseMassachusettsOffers(payload.compareRows);
  } else if (region === "RI") {
    offers = parseRhodeIslandOffers(payload.rateCardHtml, payload.sourceUrl);
  } else if (region === "IL") {
    offers = parseIllinoisOffers(payload.resultsHtml, payload.sourceUrl);
  }

  const ohioBenchmark = region === "OH_E" || region === "OH_G"
    ? parseOhioBenchmark(payload.comparisonHtml, region)
    : null;
  const marylandBenchmark = region === "MD"
    ? parseMarylandBenchmark(payload.resultsHtml)
    : null;
  const massachusettsBenchmark = region === "MA"
    ? parseMassachusettsBenchmark(payload.compareRows)
    : null;
  const rhodeIslandBenchmark = region === "RI"
    ? parseRhodeIslandBenchmark(payload.rateCardHtml)
    : null;
  const illinoisBenchmark = region === "IL"
    ? parseIllinoisBenchmark(payload.resultsHtml, payload.utilityName)
    : null;
  const resolvedBenchmark =
    ohioBenchmark ||
    marylandBenchmark ||
    massachusettsBenchmark ||
    rhodeIslandBenchmark ||
    illinoisBenchmark;

  return {
    benchmarkMonthlyAdjustment: toNumber(payload.benchmarkMonthlyAdjustment) || 0,
    benchmarkRateCentsPerKwh:
      benchmarkRateCentsPerKwh ?? resolvedBenchmark?.rateCents ?? null,
    additionalSupplierContacts,
    errorMessage: payload.errorMessage || "",
    offers,
    priceToCompareLastUpdated:
      payload.priceToCompareLastUpdated || resolvedBenchmark?.updatedText || null,
    raw: payload,
    region,
    selectedUtilityChoiceKey: payload.selectedUtilityChoiceKey || "",
    selectionRequired:
      Boolean(payload.selectionRequired) ||
      (
        (region === "OH_E" || region === "OH_G") &&
        Array.isArray(payload.utilityChoices) &&
        payload.utilityChoices.length > 1 &&
        !payload.selectedUtilityChoiceKey
      ),
    sourceLabel: payload.sourceLabel || "",
    sourceUrl: payload.sourceUrl || "",
    utilityChoiceLabel: payload.utilityChoiceLabel || "",
    utilityChoices: Array.isArray(payload.utilityChoices) ? payload.utilityChoices : [],
    utilityName: payload.utilityName || "",
    zipCode: payload.zipCode || estimateState.zipCode,
  };
}

function autofillManualInputs() {
  const market = estimateState.market;
  const utilityName = market?.utilityName || "";
  const usage = defaultMonthlyUsage(market?.region, utilityName, market?.zipCode);

  estimateState.manualInputs.utilityName =
    estimateState.manualInputs.utilityName || utilityName;
  estimateState.manualInputs.currentRateCents =
    estimateState.manualInputs.currentRateCents ||
    "";
  estimateState.manualInputs.benchmarkRateCents =
    estimateState.manualInputs.benchmarkRateCents ||
    formatEditableNumber(market?.benchmarkRateCentsPerKwh);
  estimateState.manualInputs.monthlyUsage =
    estimateState.manualInputs.monthlyUsage ||
    (usage ? String(Math.round(usage)) : String(defaultMonthlyUsage(market?.region, utilityName, market?.zipCode)));

  estimateElements.utilityName.value = estimateState.manualInputs.utilityName;
  estimateElements.currentRate.value = estimateState.manualInputs.currentRateCents;
  estimateElements.benchmarkRate.value = estimateState.manualInputs.benchmarkRateCents;
  estimateElements.monthlyUsage.value = estimateState.manualInputs.monthlyUsage;
}

function recomputeRecommendations() {
  const market = estimateState.market;
  if (!market) {
    renderResults();
    return;
  }

  const monthlyUsage = toNumber(estimateState.manualInputs.monthlyUsage);
  const enteredCurrentRate = toNumber(estimateState.manualInputs.currentRateCents);
  const enteredBenchmarkRate = toNumber(estimateState.manualInputs.benchmarkRateCents);
  const currentRate = enteredCurrentRate || enteredBenchmarkRate || market.benchmarkRateCentsPerKwh;
  const benchmarkRate = enteredBenchmarkRate || market.benchmarkRateCentsPerKwh;
  const useCurrentRate = enteredCurrentRate && enteredCurrentRate > 0;
  const referenceRate = useCurrentRate ? currentRate : benchmarkRate;
  const referenceAdjustment = useCurrentRate ? 0 : market.benchmarkMonthlyAdjustment || 0;

  if (!monthlyUsage || !referenceRate) {
    estimateState.currentCost = null;
    estimateState.recommendations = [];
    renderResults();
    return;
  }

  estimateState.currentCost = roundCurrency((monthlyUsage * referenceRate) / 100 + referenceAdjustment);
  estimateState.recommendations = market.offers
    .map((offer) => buildRecommendation(offer, monthlyUsage, referenceRate, referenceAdjustment))
    .filter((offer) => offer.rateCentsPerKwh > 0)
    .sort((left, right) => right.annualSavings - left.annualSavings);

  renderResults({
    currentRateBasis: useCurrentRate
      ? "Savings compared with the current rate you entered."
      : "Savings compared with the utility or market benchmark for this ZIP.",
  });
}

function buildRecommendation(offer, monthlyUsage, referenceRate, referenceAdjustment) {
  const termMonths = Math.max(1, Math.round(toNumber(offer.termMonths) || 1));
  const monthlyFee = toNumber(offer.monthlyFee) || 0;
  const enrollmentFeeAmount = toNumber(offer.enrollmentFeeAmount) || 0;
  const monthlyCost =
    (monthlyUsage * offer.rateCentsPerKwh) / 100 +
    monthlyFee +
    enrollmentFeeAmount / termMonths;
  const annualCost =
    (monthlyUsage * 12 * offer.rateCentsPerKwh) / 100 +
    monthlyFee * 12 +
    enrollmentFeeAmount;
  const referenceMonthlyCost = (monthlyUsage * referenceRate) / 100 + referenceAdjustment;
  const referenceAnnualCost =
    (monthlyUsage * 12 * referenceRate) / 100 + referenceAdjustment * 12;

  return {
    ...offer,
    annualCost: roundCurrency(annualCost),
    annualSavings: roundCurrency(referenceAnnualCost - annualCost),
    estimatedMonthlyCost: roundCurrency(monthlyCost),
    estimatedMonthlySavings: roundCurrency(referenceMonthlyCost - monthlyCost),
  };
}

function renderResults({ currentRateBasis = "" } = {}) {
  const market = estimateState.market;
  const recommendations = estimateState.recommendations;
  const bestOffer = recommendations[0];
  const additionalSupplierContacts = Array.isArray(market?.additionalSupplierContacts)
    ? market.additionalSupplierContacts
    : [];

  estimateElements.currentCostValue.textContent =
    estimateState.currentCost !== null ? formatMoney(estimateState.currentCost) : "--";
  estimateElements.currentCostNote.textContent =
    currentRateBasis || "Add a current rate and monthly usage to estimate your baseline.";

  estimateElements.bestOfferValue.textContent =
    bestOffer ? formatMoney(bestOffer.estimatedMonthlyCost) : "--";
  estimateElements.bestOfferNote.textContent =
    bestOffer
      ? `${bestOffer.supplierName} ${bestOffer.planName ? `• ${bestOffer.planName}` : ""}`
      : additionalSupplierContacts.length
        ? "Official supplier directory loaded for this ZIP."
        : "Live offers will show here.";

  estimateElements.savingsValue.textContent =
    bestOffer ? formatMoney(bestOffer.estimatedMonthlySavings) : "--";
  estimateElements.savingsNote.textContent =
    bestOffer
      ? `${formatMoney(bestOffer.annualSavings)} per year before taxes and utility delivery charges.`
      : additionalSupplierContacts.length
        ? "We loaded the official utility benchmark and supplier directory, even though no live comparable rate cards are published here."
        : "Enter your current rate to personalize this number, or use the app to scan a bill.";

  renderQuickWin(bestOffer, market, currentRateBasis);

  if (!market) {
    estimateElements.resultsSubtitle.textContent =
      "We will compare offers after we know your ZIP code.";
    estimateElements.sourceNote.textContent =
      "Choose My Electric compares live market data when it is available.";
    estimateElements.offerResults.innerHTML =
      '<p class="empty-state">Enter your ZIP code to start your first estimate.</p>';
    return;
  }

  estimateElements.resultsSubtitle.textContent =
    market.sourceLabel || `Live offers for ${market.zipCode}`;
  estimateElements.sourceNote.textContent = [
    market.sourceLabel,
    market.utilityName ? `Utility: ${market.utilityName}` : "",
    market.priceToCompareLastUpdated ? `Benchmark updated: ${market.priceToCompareLastUpdated}` : "",
  ].filter(Boolean).join(" • ");

  if (requiresUtilitySelection(market)) {
    const selectionLabel = activeUtilityChoiceLabel().toLowerCase();
    estimateElements.resultsSubtitle.textContent =
      `Choose ${selectionLabel} to see accurate supplier rates.`;
    estimateElements.sourceNote.textContent =
      market.errorMessage ||
      "This ZIP can map to more than one utility area, so we wait for your selection before showing plans.";
    estimateElements.offerResults.innerHTML =
      `<p class="empty-state">${escapeHtml(
        market.errorMessage ||
          `Select ${selectionLabel} above, then we will load the correct supplier plans and savings.`,
      )}</p>`;
    return;
  }

  const sections = [];

  if (market.errorMessage) {
    sections.push(`<p class="empty-state">${escapeHtml(market.errorMessage)}</p>`);
  }

  if (recommendations.length) {
    sections.push(
      recommendations
        .slice(0, 8)
        .map((offer, index) => renderOfferCard(offer, index === 0))
        .join(""),
    );
  }

  if (additionalSupplierContacts.length) {
    sections.push(
      `<p class="empty-state">We loaded the official supplier directory for this market. Use these links to review current enrollment details and public rate information.</p>`,
    );
    sections.push(
      additionalSupplierContacts
        .map((contact) => renderSupplierContactCard(contact))
        .join(""),
    );
  }

  if (!recommendations.length && !additionalSupplierContacts.length && !market.errorMessage) {
    sections.push(
      '<p class="empty-state">We found your market, but we do not have live offers to show yet for this exact setup.</p>',
    );
  }

  estimateElements.offerResults.innerHTML = sections.join("");
}

function renderQuickWin(bestOffer, market, currentRateBasis) {
  if (!estimateElements.quickWinPanel) return;

  if (!market || !bestOffer || bestOffer.estimatedMonthlySavings <= 0) {
    estimateElements.quickWinPanel.hidden = true;
    estimateElements.quickWinPanel.classList.remove("is-active");
    estimateElements.quickWinHeadline.textContent = "We found a lower live rate for your ZIP.";
    estimateElements.quickWinMeta.textContent =
      "Compare your area's best live plan before you scroll into the full list.";
    estimateElements.quickWinDetail.textContent =
      "Enter your ZIP code to see if there is a cheaper electric supplier plan available.";
    estimateElements.quickWinRate.textContent = "--";
    estimateElements.quickWinSavings.textContent = "--";
    return;
  }

  const planLabel = [bestOffer.supplierName, bestOffer.planName]
    .filter(Boolean)
    .join(" • ");
  const metaParts = [
    bestOffer.termMonths ? `${bestOffer.termMonths} month term` : "",
    bestOffer.rateType || "",
    market.utilityName ? `${market.utilityName} area` : "",
  ].filter(Boolean);
  const comparisonDetail = currentRateBasis
    ? `Estimated savings compared with the rate you entered. Scroll lower for more options, or use the app for bill scans and alerts.`
    : `Estimated savings compared with the current utility or market benchmark for this ZIP. Scroll lower for more options, or use the app for bill scans and alerts.`;

  estimateElements.quickWinPanel.hidden = false;
  estimateElements.quickWinPanel.classList.remove("is-active");
  void estimateElements.quickWinPanel.offsetWidth;
  estimateElements.quickWinPanel.classList.add("is-active");
  estimateElements.quickWinHeadline.textContent = planLabel || "We found a lower live rate for your ZIP.";
  estimateElements.quickWinMeta.textContent =
    metaParts.join(" • ") || "Recommended electric supplier plan for your ZIP.";
  estimateElements.quickWinDetail.textContent = comparisonDetail;
  estimateElements.quickWinRate.textContent = formatRate(bestOffer.rateCentsPerKwh, market.region);
  estimateElements.quickWinSavings.textContent =
    `${formatMoney(bestOffer.estimatedMonthlySavings)}/mo less • ${formatMoney(bestOffer.annualSavings)}/year`;
}

function renderOfferCard(offer, isBestOffer) {
  const badges = [
    offer.rateType ? `<span class="badge">${escapeHtml(offer.rateType)}</span>` : "",
    offer.introductoryPrice ? '<span class="badge badge-accent">Intro price</span>' : "",
    offer.newCustomerOffer ? '<span class="badge">New customer</span>' : "",
    offer.renewablePercent ? `<span class="badge">${offer.renewablePercent}% renewable</span>` : "",
  ].filter(Boolean).join("");

  const details = [
    offer.termMonths ? `${offer.termMonths} month term` : "",
    offer.monthlyFeeText || (offer.monthlyFee ? `${formatMoney(offer.monthlyFee)} monthly fee` : ""),
    offer.enrollmentFeeText || (offer.enrollmentFeeAmount ? `${formatMoney(offer.enrollmentFeeAmount)} enrollment fee` : ""),
    offer.cancellationFeeText || (offer.earlyTerminationFee ? `${formatMoney(offer.earlyTerminationFee)} early termination fee` : ""),
  ].filter(Boolean);

  return `
    <article class="offer-card ${isBestOffer ? "offer-card-featured" : ""}">
      <div class="offer-head">
        <div>
          <p class="offer-kicker">${isBestOffer ? "Best savings match" : "Live option"}</p>
          <h3>${escapeHtml(offer.supplierName)}</h3>
          <p class="offer-plan">${escapeHtml(offer.planName || "")}</p>
        </div>
        <div class="offer-money">
          <strong>${formatMoney(offer.estimatedMonthlySavings)}</strong>
          <span>estimated monthly savings</span>
        </div>
      </div>

      <div class="offer-meta">
        <div>
          <span class="offer-label">Rate</span>
          <strong>${formatRate(offer.rateCentsPerKwh, estimateState.market?.region)}</strong>
        </div>
        <div>
          <span class="offer-label">Monthly cost</span>
          <strong>${formatMoney(offer.estimatedMonthlyCost)}</strong>
        </div>
        <div>
          <span class="offer-label">Annual savings</span>
          <strong>${formatMoney(offer.annualSavings)}</strong>
        </div>
      </div>

      ${badges ? `<div class="offer-badges">${badges}</div>` : ""}
      ${details.length ? `<p class="offer-details">${details.map(escapeHtml).join(" • ")}</p>` : ""}
      ${
        offer.offerDetailsText
          ? `<p class="offer-copy">${escapeHtml(offer.offerDetailsText).slice(0, 260)}</p>`
          : ""
      }

      <div class="button-row">
        ${
          offer.signupUrl
            ? `<a class="button button-primary" href="${escapeAttribute(offer.signupUrl)}" target="_blank" rel="noreferrer">View Plan</a>`
            : ""
        }
        ${
          offer.detailsUrl && offer.detailsUrl !== offer.signupUrl
            ? `<a class="button button-secondary" href="${escapeAttribute(offer.detailsUrl)}" target="_blank" rel="noreferrer">Plan Details</a>`
            : ""
        }
      </div>
    </article>
  `;
}

function renderSupplierContactCard(contact) {
  return `
    <article class="offer-card">
      <div class="offer-head">
        <div>
          <p class="offer-kicker">Official supplier directory</p>
          <h3>${escapeHtml(contact.supplierName)}</h3>
          <p class="offer-plan">${escapeHtml(contact.note || "Supplier website and enrollment details")}</p>
        </div>
      </div>

      <p class="offer-copy">
        Use the supplier site to review current availability, pricing details, and enrollment terms for this market.
      </p>

      <div class="button-row">
        <a class="button button-primary" href="${escapeAttribute(contact.websiteUrl)}" target="_blank" rel="noreferrer">Visit Supplier</a>
      </div>
    </article>
  `;
}

function populateUtilityChoices(choices, selectedKey) {
  updateUtilityChoiceLabel();

  if (!choices || choices.length <= 1) {
    clearUtilityChoices();
    return;
  }

  estimateElements.utilityChoicePanel.hidden = false;
  const requiresSelection = !selectedKey;
  const promptLabel = activeUtilityChoiceLabel().toLowerCase();
  const options = choices.map((choice) => {
      const labelBits = [choice.utilityName];
      if (choice.rateSchedule) labelBits.push(choice.rateSchedule);
      return `
        <option value="${escapeAttribute(choice.key)}" ${choice.key === selectedKey ? "selected" : ""}>
          ${escapeHtml(labelBits.join(" • "))}
        </option>
      `;
    });

  estimateElements.utilityChoice.innerHTML = [
    requiresSelection
      ? `<option value="" selected disabled>${escapeHtml(`Choose ${promptLabel}`)}</option>`
      : "",
    ...options,
  ].join("");
}

function clearUtilityChoices() {
  if (estimateElements.utilityChoicePanel) estimateElements.utilityChoicePanel.hidden = true;
  if (estimateElements.utilityChoice) estimateElements.utilityChoice.innerHTML = "";
  updateUtilityChoiceLabel();
}

function requiresUtilitySelection(market) {
  return (
    Boolean(market) &&
    Array.isArray(market.utilityChoices) &&
    market.utilityChoices.length > 1 &&
    !market.selectedUtilityChoiceKey &&
    Boolean(market.selectionRequired)
  );
}

function activeUtilityChoiceLabel() {
  if (estimateState.market?.utilityChoiceLabel) {
    return estimateState.market.utilityChoiceLabel;
  }

  switch (detectRegion(estimateState.zipCode || estimateElements.zipCode?.value, estimateState.commodity)) {
    case "OH_G":
      return "Ohio gas utility company";
    case "OH_E":
      return "Ohio electric utility company";
    case "PA":
      return "Pennsylvania utility company";
    case "TX":
      return "Texas delivery utility";
    case "MD":
      return "Maryland utility company";
    case "MA":
      return "Massachusetts utility company";
    case "ME":
      return "Maine utility district";
    case "NJ":
      return "New Jersey utility company";
    case "RI":
      return "Rhode Island utility company";
    case "IL":
      return "Illinois utility service area";
    case "NY":
      return "New York utility or load zone";
    default:
      return "Utility company";
  }
}

function normalizeOfferRecords(rawOffers, sourceUrl) {
  if (!Array.isArray(rawOffers)) return [];
  return rawOffers
    .map((offer) => normalizeOfferRecord(offer, sourceUrl))
    .filter((offer) => offer.supplierName && offer.rateCentsPerKwh > 0);
}

function normalizeOfferRecord(offer, sourceUrl) {
  const signupUrl = normalizeOfferUrl(
    offer?.signupUrl || offer?.supplierEnrollmentUrl || offer?.supplierWebsiteUrl || "",
    sourceUrl,
  );
  const detailsUrl = normalizeOfferUrl(
    offer?.offerDetailsUrl || offer?.detailsSourceUrl || offer?.supplierWebsiteUrl || signupUrl,
    sourceUrl,
  );
  const websiteUrl = normalizeOfferUrl(offer?.supplierWebsiteUrl || signupUrl || detailsUrl, sourceUrl);
  const rateType = typeof offer?.rateType === "string"
    ? offer.rateType
    : offer?.rateType?.displayName || offer?.rateType?.name || "";

  return {
    cancellationFeeText: String(offer?.cancellationFeeText || "").trim(),
    detailsUrl,
    earlyTerminationFee: toNumber(offer?.earlyTerminationFee) || 0,
    enrollmentFeeAmount: toNumber(offer?.enrollmentFeeAmount) || 0,
    enrollmentFeeText: String(offer?.enrollmentFeeText || "").trim(),
    introductoryPrice: Boolean(offer?.introductoryPrice),
    monthlyFee: toNumber(offer?.monthlyFee) || 0,
    monthlyFeeText: String(offer?.monthlyFeeText || "").trim(),
    newCustomerOffer: Boolean(offer?.newCustomerOffer),
    offerDetailsText: String(offer?.offerDetailsText || "").trim(),
    planName: String(offer?.planName || "").trim(),
    rateCentsPerKwh: toNumber(offer?.rateCentsPerKwh) || 0,
    rateType: normalizeRateType(rateType),
    renewablePercent: parseWholeNumber(offer?.renewablePercent) || 0,
    signupUrl,
    supplierName: String(offer?.supplierName || "").trim(),
    supplierPhone: String(offer?.supplierPhone || "").trim(),
    supplierWebsiteUrl: websiteUrl,
    termMonths: Math.max(1, parseWholeNumber(offer?.termMonths) || 1),
  };
}

function normalizeSupplierContacts(rawContacts, sourceUrl) {
  if (!Array.isArray(rawContacts)) return [];
  return rawContacts
    .map((contact) => ({
      note: String(contact?.note || "").trim(),
      supplierName: String(contact?.supplierName || "").trim(),
      websiteUrl: normalizeOfferUrl(contact?.websiteUrl || "", sourceUrl),
    }))
    .filter((contact) => contact.supplierName && contact.websiteUrl);
}

function normalizeOfferUrl(rawUrl, sourceUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) return "";
  try {
    return new URL(value, sourceUrl || window.location.origin).toString();
  } catch {
    return value;
  }
}

function parsePennsylvaniaOffers(html, sourceUrl) {
  if (!html) return [];
  const document = new DOMParser().parseFromString(html, "text/html");
  const cards = Array.from(
    document.querySelectorAll(
      "#shop-for-rates .supplier-card, #shop-for-rates [data-supplier][data-perkwh], #shop-for-rates [data-supplier][data-introprice], #shop-for-rates [data-supplier][data-newcustoffer]",
    ),
  );
  const seen = new Set();
  const offers = [];

  cards.forEach((card) => {
    const uniqueKey = [
      card.getAttribute("data-supplier") || "",
      card.getAttribute("data-perkwh") || "",
      card.getAttribute("data-termlength") || "",
      card.getAttribute("data-url") || "",
    ].join("|");
    if (seen.has(uniqueKey)) return;
    seen.add(uniqueKey);

    const supplierName =
      card.getAttribute("data-supplier")?.trim() ||
      card.querySelector(".company-info.supplier .name")?.textContent?.trim() ||
      "";
    const ratePerKwh = toNumber(card.getAttribute("data-perkwh"));
    if (!supplierName || !ratePerKwh) return;

    const links = extractLinks(card, sourceUrl);
    const signupUrl = links.find((url) => looksLikeEnrollmentUrl(url)) || links[0] || "";
    const detailsUrl = links.find((url) => !looksLikeEnrollmentUrl(url)) || signupUrl;

    offers.push({
      cancellationFeeText: card.getAttribute("data-cancelfee")?.trim() || "",
      detailsUrl,
      earlyTerminationFee: parseDollarAmount(card.getAttribute("data-cancelfee")),
      enrollmentFeeAmount: parseDollarAmount(card.getAttribute("data-enrollment")),
      enrollmentFeeText: card.getAttribute("data-enrollment")?.trim() || "",
      introductoryPrice: normalizeBoolean(card.getAttribute("data-introprice")),
      monthlyFee: parseDollarAmount(card.getAttribute("data-monthlyfee")),
      monthlyFeeText: card.getAttribute("data-monthlyfee")?.trim() || "",
      newCustomerOffer: normalizeBoolean(card.getAttribute("data-newcustoffer")),
      offerDetailsText: card.querySelector(".description p")?.textContent?.trim() || "",
      planName: "",
      rateCentsPerKwh: roundToTwo(ratePerKwh * 100),
      rateType: normalizeRateType(card.getAttribute("data-ratestructure")),
      renewablePercent: parseWholeNumber(card.getAttribute("data-renewable")),
      signupUrl,
      supplierName,
      termMonths: parseWholeNumber(card.getAttribute("data-termlength")) || 1,
    });
  });

  return offers;
}

function parseTexasOffers(rawOffers) {
  if (!Array.isArray(rawOffers)) return [];
  return rawOffers
    .map((offer) => {
      const pricing = approximateTexasPlanPricing(offer);
      return {
        cancellationFeeText:
          extractFeePhrase(offer.pricing_details, "cancellation") ||
          extractFeePhrase(offer.special_terms, "cancellation") ||
          "",
        detailsUrl: offer.fact_sheet || offer.go_to_plan || offer.website || "",
        earlyTerminationFee: parseDollarAmount(offer.pricing_details),
        enrollmentFeeAmount: parseDollarAmount(offer.special_terms, "enrollment"),
        enrollmentFeeText: extractFeePhrase(offer.special_terms, "enrollment") || "",
        introductoryPrice:
          String(offer.plan_name || "").toLowerCase().includes("intro") ||
          String(offer.special_terms || "").toLowerCase().includes("intro"),
        monthlyFee: pricing.monthlyAdjustment,
        monthlyFeeText:
          extractFeePhrase(offer.pricing_details, "base") ||
          extractFeePhrase(offer.special_terms, "base") ||
          extractFeePhrase(offer.special_terms, "minimum use") ||
          "",
        newCustomerOffer: Boolean(offer.new_customer),
        offerDetailsText: [offer.plan_name, offer.special_terms, offer.pricing_details]
          .filter(Boolean)
          .join("\n\n"),
        planName: offer.plan_name || "",
        rateCentsPerKwh: pricing.rateCentsPerKwh,
        rateType: normalizeTexasRateType(offer),
        renewablePercent: parseWholeNumber(offer.renewable_energy_description),
        signupUrl: offer.go_to_plan || offer.website || "",
        supplierName: offer.company_name || "",
        termMonths: Math.max(1, parseWholeNumber(offer.term_value) || 1),
      };
    })
    .filter((offer) => offer.supplierName && offer.rateCentsPerKwh > 0);
}

function parseMarylandOffers(html, sourceUrl) {
  if (!html) return [];
  const document = new DOMParser().parseFromString(html, "text/html");
  return Array.from(document.querySelectorAll("div.offer"))
    .map((card) => {
      if (card.textContent?.includes("Sorry, no current offers matched your search.")) return null;
      const supplierName = card.querySelector("h3, h4")?.textContent?.trim() || "";
      const offerText = String(card.textContent || "").replace(/\s+/g, " ").trim();
      const rateMatch = offerText.match(/\$(\d+(?:\.\d+)?)\s*(?:\/|\s+per\s+)?kwh/i);
      if (!supplierName || !rateMatch) return null;

      const links = extractLinks(card, sourceUrl);
      const signupUrl = links.find((url) => looksLikeEnrollmentUrl(url)) || links[0] || "";
      const detailsUrl = links.find((url) => looksLikeDetailsUrl(url)) || signupUrl;
      const monthlyFee = extractLabeledNumber(offerText, "monthly fee");
      const earlyTerminationFee =
        extractLabeledNumber(offerText, "cancellation fee") ||
        extractLabeledNumber(offerText, "termination fee") ||
        0;

      return {
        cancellationFeeText: earlyTerminationFee ? formatMoney(earlyTerminationFee) : "",
        detailsUrl,
        earlyTerminationFee,
        enrollmentFeeAmount: 0,
        enrollmentFeeText: "",
        introductoryPrice: /intro/i.test(offerText),
        monthlyFee,
        monthlyFeeText: monthlyFee ? formatMoney(monthlyFee) : "",
        newCustomerOffer: /new customer/i.test(offerText),
        offerDetailsText: offerText,
        planName: "",
        rateCentsPerKwh: roundToTwo(Number(rateMatch[1]) * 100),
        rateType: /variable/i.test(offerText) ? "Variable" : /fixed/i.test(offerText) ? "Fixed" : "Unknown",
        renewablePercent: extractLabeledPercent(offerText, "renewable") || 0,
        signupUrl,
        supplierName,
        termMonths: Math.max(1, extractTermMonths(offerText) || 1),
      };
    })
    .filter(Boolean);
}

function parseMarylandBenchmark(html) {
  if (!html) return null;
  const document = new DOMParser().parseFromString(html, "text/html");
  const rateText = document.querySelector("div.current-rate span")?.textContent || "";
  const updatedText = document.querySelector("p.future-rate")?.textContent?.trim() || "";
  const rate = extractFirstDecimal(rateText);
  if (!rate) return null;
  return {
    rateCents: roundToTwo(rate * 100),
    updatedText: updatedText || null,
  };
}

function parseMassachusettsOffers(compareRows) {
  if (!Array.isArray(compareRows)) return [];
  return compareRows
    .filter((row) => String(row?.rowType || "").toUpperCase() === "SUPPLIER")
    .map((row) => {
      const rawRateType = String(row?.pricingStructureDescription || "").trim();
      const supplierWebsiteUrl = String(row?.supplierWebsiteUrl || "").trim();
      const productWebsiteUrl = String(row?.productWebsiteUrl || "").trim();
      const signupUrl = productWebsiteUrl || supplierWebsiteUrl;
      return {
        cancellationFeeText: String(row?.earlyTerminationDetail || "").trim(),
        detailsUrl: productWebsiteUrl || supplierWebsiteUrl,
        earlyTerminationFee:
          toNumber(row?.earlyTerminationDetailExport) ||
          toNumber(row?.earlyTerminationDetail) ||
          toNumber(row?.earlyTermination) ||
          0,
        enrollmentFeeAmount: toNumber(row?.enrollmentFeeExport) || 0,
        enrollmentFeeText: String(row?.enrollmentFeeExport || "").trim(),
        introductoryPrice: String(row?.introductoryPrice || "").trim().length > 0,
        monthlyFee: toNumber(row?.pricePerMonth) || 0,
        monthlyFeeText: String(row?.pricePerMonthExport || "").trim(),
        newCustomerOffer: Boolean(row?.isNewCustomerOnly),
        offerDetailsText: [
          row?.supplierDescription,
          row?.automaticRenewalDetailExpanded,
          row?.renewableEnergyProductDetailExpanded,
          row?.otherProductServicesDetail,
        ].filter(Boolean).join("\n\n"),
        planName: String(row?.productName || row?.planName || "").trim(),
        rateCentsPerKwh: toNumber(row?.fixedPrice) || toNumber(row?.pricePerUnit) || 0,
        rateType: rawRateType.toLowerCase().includes("fixed")
          ? "Fixed"
          : rawRateType.toLowerCase().includes("variable")
            ? "Variable"
            : rawRateType || "Unknown",
        renewablePercent: Math.round(toNumber(row?.renewableEnergyProductPercentage) || 0),
        signupUrl,
        supplierName: String(row?.supplierName || "Unknown supplier").trim(),
        termMonths: Math.max(1, parseWholeNumber(row?.contractTermFilter) || 1),
      };
    })
    .filter((offer) => offer.supplierName && offer.rateCentsPerKwh > 0);
}

function parseMassachusettsBenchmark(compareRows) {
  if (!Array.isArray(compareRows)) return null;
  const row = compareRows.find((item) => String(item?.rowType || "").toUpperCase() === "DISTRIBUTIONCOMPANY");
  const rate = toNumber(row?.fixedPrice) || toNumber(row?.pricePerUnit);
  return rate
    ? {
        rateCents: rate,
        updatedText: null,
      }
    : null;
}

function parseOhioOffers(html, region) {
  if (!html) return [];
  const document = new DOMParser().parseFromString(html, "text/html");
  const seen = new Set();
  const rows = Array.from(document.querySelectorAll("span.retail-title"))
    .map((node) => node.closest("tr"))
    .filter(Boolean);

  return rows
    .map((row) => {
      const supplierBlock = row.querySelector("span.retail-title");
      const cells = Array.from(row.children).filter((cell) => cell.tagName.toLowerCase() === "td");
      if (!supplierBlock || cells.length < 10) return null;

      const supplierName = ownText(supplierBlock);
      const rateCentsPerKwh = parseOhioDisplayedRate(cleanCellText(cells[2]), region, html);
      if (!supplierName || !rateCentsPerKwh) return null;

      const offerDetailsDialog = parseInlineDialog(
        Array.from(cells[1].querySelectorAll("a"))
          .find((link) => link.textContent?.includes("Offer Details"))
          ?.getAttribute("onclick") || "",
      );
      const introDialog = parseInlineDialog(extractDialogHandler(cells[5]));
      const cancellationDialog = parseInlineDialog(extractDialogHandler(cells[7]));
      const promoDialog = parseInlineDialog(extractDialogHandler(cells[9]));
      const key = [supplierName, rateCentsPerKwh, cleanCellText(cells[6])].join("|");
      if (seen.has(key)) return null;
      seen.add(key);

      const combinedDetails = [
        offerDetailsDialog?.body,
        introDialog?.body,
        cancellationDialog?.body,
        promoDialog?.body,
      ].filter(Boolean).join("\n\n");

      return {
        cancellationFeeText: cancellationDialog?.body || cleanCellText(cells[7]) || "",
        detailsUrl:
          findLinkByText(cells[1], "Terms of Service") ||
          findLinkByText(cells[1], "Company Url") ||
          findLinkByText(cells[1], "Sign Up") ||
          "",
        earlyTerminationFee: parseDollarAmount(cleanCellText(cells[7])),
        enrollmentFeeAmount: parseDollarAmount(combinedDetails, "enrollment"),
        enrollmentFeeText:
          findEnrollmentFeeText(combinedDetails, promoDialog?.body, cleanCellText(cells[1])) || "",
        introductoryPrice:
          cleanCellText(cells[5])?.toLowerCase().includes("yes") ||
          introDialog?.title?.toLowerCase().includes("introductory") ||
          false,
        monthlyFee: parseDollarAmount(cleanCellText(cells[8])) || 0,
        monthlyFeeText: cleanCellText(cells[8]) || "",
        newCustomerOffer: [combinedDetails, promoDialog?.body]
          .filter(Boolean)
          .some((text) => text.toLowerCase().includes("new customer")),
        offerDetailsText: combinedDetails,
        planName: "",
        rateCentsPerKwh,
        rateType: lastLine(cells[3].textContent || ""),
        renewablePercent: region === "OH_G" ? null : parseWholeNumber(cells[4].textContent),
        signupUrl:
          findLinkByText(cells[1], "Sign Up") ||
          findLinkByText(cells[1], "Company Url") ||
          "",
        supplierName,
        termMonths: Math.max(1, parseWholeNumber(cells[6].textContent) || 1),
      };
    })
    .filter(Boolean);
}

function parseOhioBenchmark(html, region) {
  if (!html) return null;
  const source = html;
  if (region === "OH_G") {
    const match = source.match(/SCO rate[^$]*\$(\d+\.\d+)\s*per\s*([CM])CF/is);
    if (!match) return null;
    const dollars = toNumber(match[1]);
    const measurement = String(match[2] || "C").toUpperCase();
    return {
      rateCents: measurement === "M" ? roundToTwo(dollars * 10) : roundToTwo(dollars * 100),
      updatedText:
        source.match(/Effective\s+([A-Za-z]+\s+\d{1,2},\s+\d{4}\s+(?:through|to)\s+[A-Za-z]+\s+\d{1,2},\s+\d{4})/is)?.[1] ||
        "",
    };
  }

  const electricMatch = source.match(/Price to Compare[^$]*\$(\d+\.\d+)\s*(?:\/|per)\s*kWh/is);
  if (!electricMatch) return null;
  return {
    rateCents: roundToTwo(toNumber(electricMatch[1]) * 100),
    updatedText:
      source.match(/period of\s+([A-Za-z]+\s+\d{1,2},\s+\d{4}\s+to\s+[A-Za-z]+\s+\d{1,2},\s+\d{4})/is)?.[1] ||
      "",
  };
}

function parseRhodeIslandOffers(html, sourceUrl) {
  if (!html) return [];
  const document = new DOMParser().parseFromString(html, "text/html");
  const supplierTable = document.querySelectorAll("table")[1];
  if (!supplierTable) return [];

  return Array.from(supplierTable.querySelectorAll("tr.offer-data"))
    .map((row) => {
      const cells = Array.from(row.querySelectorAll("td"));
      const supplierName = cells[0]?.querySelector("img[alt]")?.getAttribute("alt")?.trim() || "";
      const rateMatch = String(cells[2]?.textContent || "").match(/(\d+(?:\.\d+)?)¢/);
      if (!supplierName || !rateMatch) return null;

      const termText = String(cells[1]?.textContent || "").replace(/\s+/g, " ").trim();
      const renewableText = String(cells[5]?.textContent || "").replace(/\s+/g, " ").trim();
      const savingsText = String(cells[4]?.textContent || "").replace(/\s+/g, " ").trim();

      let sibling = row.nextElementSibling;
      let offerLinksRow = null;
      while (sibling && !sibling.classList.contains("offer-data")) {
        if (sibling.matches("tr.offer-links")) {
          offerLinksRow = sibling;
          break;
        }
        sibling = sibling.nextElementSibling;
      }

      const revealIds = offerLinksRow
        ? Array.from(offerLinksRow.querySelectorAll("a[data-reveal-id]")).map((link) =>
            link.getAttribute("data-reveal-id") || "",
          )
        : [];
      const companyInfoRevealId = revealIds.find((id) => id.startsWith("company-info"));
      const planDetailsRevealId = revealIds.find((id) => id.startsWith("plan-details"));
      const companyInfoModal = companyInfoRevealId ? document.getElementById(companyInfoRevealId) : null;
      const planDetailsModal = planDetailsRevealId ? document.getElementById(planDetailsRevealId) : null;

      const supplierPhone = Array.from(companyInfoModal?.querySelectorAll("p") || [])
        .map((item) => item.textContent?.trim() || "")
        .find((value) => /\d{3}[-)\s]\d{3}[-\s]\d{4}/.test(value) || value.startsWith("1-")) || "";
      const supplierWebsiteUrl = companyInfoModal?.querySelector("a[href]")?.href || "";
      const signupUrl =
        planDetailsModal?.querySelector("a.positive[href]")?.href ||
        supplierWebsiteUrl ||
        sourceUrl ||
        "";
      const detailLead = planDetailsModal?.querySelector("p.lead")?.textContent?.replace(/\s+/g, " ").trim() || "";
      const offerDetailsText = [
        detailLead,
        savingsText ? `Estimated monthly result: ${savingsText.replace(/\.$/, "")}.` : "",
      ].filter(Boolean).join(" ");

      return {
        cancellationFeeText: "Check official supplier terms",
        detailsUrl: signupUrl,
        earlyTerminationFee: 0,
        enrollmentFeeAmount: 0,
        enrollmentFeeText: "",
        introductoryPrice: /intro/i.test(offerDetailsText),
        monthlyFee: 0,
        monthlyFeeText: "Not listed on Empower RI",
        newCustomerOffer: /new customer/i.test(offerDetailsText),
        offerDetailsText,
        planName: "",
        rateCentsPerKwh: Number(rateMatch[1]),
        rateType: "Fixed",
        renewablePercent: parseWholeNumber(renewableText) || 0,
        signupUrl,
        supplierName,
        supplierPhone,
        supplierWebsiteUrl,
        termMonths: Math.max(1, extractTermMonths(termText) || 1),
      };
    })
    .filter(Boolean);
}

function parseRhodeIslandBenchmark(html) {
  if (!html) return null;
  const document = new DOMParser().parseFromString(html, "text/html");
  const standardTable = document.querySelector("table");
  const row = standardTable?.querySelector("tr.offer-data");
  const cells = Array.from(row?.querySelectorAll("td") || []);
  const rateMatch = String(cells[2]?.textContent || "").match(/(\d+(?:\.\d+)?)¢/);
  const termText = String(cells[1]?.textContent || "").replace(/\s+/g, " ").trim();
  const asOfText = document.querySelector("h4.printonly")?.textContent
    ?.replace(/^As of:\s*/i, "")
    ?.replace(/\s+/g, " ")
    ?.trim() || "";
  if (!rateMatch) return null;
  return {
    rateCents: Number(rateMatch[1]),
    updatedText: [termText, asOfText ? `As of ${asOfText}` : ""].filter(Boolean).join(" • ") || null,
  };
}

function parseIllinoisOffers(html, sourceUrl) {
  if (!html) return [];
  const document = new DOMParser().parseFromString(html, "text/html");
  return Array.from(document.querySelectorAll("div.selectProduct"))
    .map((card) => {
      const supplierName = card.getAttribute("data-supplier")?.trim() || "";
      const productName = card.getAttribute("data-id")?.trim() || "";
      if (!supplierName || !productName) return null;

      const fixedPrice = toNumber(card.getAttribute("data-fixed-price"));
      const variablePrice = toNumber(card.getAttribute("data-variable-price"));
      const resolvedRate = fixedPrice || variablePrice || 0;
      if (!resolvedRate) return null;

      const description = card.getAttribute("data-description")?.trim() || "";
      const monthlyFeeText = card.getAttribute("data-monthly-fees")?.trim() || "";
      const cancellationFeeText = card.getAttribute("data-termination-fee")?.trim() || "";
      const declaredOfferUrl = card.getAttribute("data-website-url")?.trim() || "";
      const websiteUrl = card.querySelector("a.productLink")?.href || declaredOfferUrl;
      const signupUrl = card.querySelector("a.link-primary")?.href || declaredOfferUrl || websiteUrl || sourceUrl;
      const customPrice = card.getAttribute("data-custom-price")?.trim() || "";

      return {
        cancellationFeeText,
        detailsUrl: signupUrl,
        earlyTerminationFee: toNumber(cancellationFeeText) || 0,
        enrollmentFeeAmount: 0,
        enrollmentFeeText: "",
        introductoryPrice: /intro/i.test(productName) || /intro/i.test(description),
        monthlyFee: toNumber(monthlyFeeText) || 0,
        monthlyFeeText,
        newCustomerOffer: /new customer/i.test(description),
        offerDetailsText: [
          productName,
          description,
          customPrice ? `Custom price details: ${customPrice}` : "",
        ].filter(Boolean).join(" — "),
        planName: productName,
        rateCentsPerKwh: resolvedRate,
        rateType: fixedPrice ? "Fixed" : variablePrice ? "Variable" : "Unknown",
        renewablePercent:
          /100%\s*(?:clean|renewable)/i.test(description) || /100%\s*green/i.test(productName)
            ? 100
            : 0,
        signupUrl,
        supplierName,
        supplierPhone: card.getAttribute("data-phone-number")?.trim() || "",
        supplierWebsiteUrl: websiteUrl,
        termMonths: Math.max(1, parseWholeNumber(card.getAttribute("data-term")) || 1),
      };
    })
    .filter(Boolean);
}

function parseIllinoisBenchmark(html, utilityName = "") {
  if (!html) return null;
  const document = new DOMParser().parseFromString(html, "text/html");
  const cells = Array.from(document.getElementById("utility-row")?.querySelectorAll("td") || []);
  const rateText = String(cells[1]?.textContent || "").replace(/\s+/g, " ").trim();
  const updatedText = String(cells[7]?.textContent || "").trim() || null;
  if (!rateText) return null;

  const tierMatch = rateText.match(/Fixed Price\s+(\d+(?:\.\d+)?)\s+0-800kWH\s+(\d+(?:\.\d+)?)\s+>\s*800kWH/i);
  if (tierMatch) {
    const firstTierRate = Number(tierMatch[1]);
    const secondTierRate = Number(tierMatch[2]);
    const usage = defaultMonthlyUsage("IL", utilityName);
    const effectiveMonthlyCost = usage <= 800
      ? (usage * firstTierRate) / 100
      : ((800 * firstTierRate) / 100) + (((usage - 800) * secondTierRate) / 100);
    return {
      rateCents: roundToTwo((effectiveMonthlyCost / usage) * 100),
      updatedText,
    };
  }

  const rate = extractFirstDecimal(rateText);
  return rate
    ? {
        rateCents: rate,
        updatedText,
      }
    : null;
}

function approximateTexasPlanPricing(offer) {
  const samples = [
    offer?.price_kwh500 ? [500, (toNumber(offer.price_kwh500) * 500) / 100] : null,
    offer?.price_kwh1000 ? [1000, (toNumber(offer.price_kwh1000) * 1000) / 100] : null,
    offer?.price_kwh2000 ? [2000, (toNumber(offer.price_kwh2000) * 2000) / 100] : null,
  ].filter(Boolean);

  if (!samples.length) {
    return { monthlyAdjustment: 0, rateCentsPerKwh: 0 };
  }

  if (samples.length === 1) {
    return {
      monthlyAdjustment: 0,
      rateCentsPerKwh: roundToTwo(samples[0][1] / samples[0][0] * 100),
    };
  }

  const xMean = samples.reduce((sum, [usage]) => sum + usage, 0) / samples.length;
  const yMean = samples.reduce((sum, [, total]) => sum + total, 0) / samples.length;
  const denominator = samples.reduce((sum, [usage]) => sum + (usage - xMean) * (usage - xMean), 0);
  const slope = denominator === 0
    ? toNumber(offer?.price_kwh1000) / 100
    : samples.reduce((sum, [usage, total]) => sum + (usage - xMean) * (total - yMean), 0) / denominator;
  const intercept = yMean - slope * xMean;

  return {
    monthlyAdjustment: roundToTwo(Math.max(0, intercept)),
    rateCentsPerKwh: roundToTwo(Math.max(0, slope * 100)),
  };
}

function normalizeZip(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 5);
}

function detectRegion(zipCode, commodity) {
  const zip = normalizeZip(zipCode);
  if (/^1[5-9]\d{3}$/.test(zip)) return "PA";
  if (/^(?:733\d{2}|7[5-9]\d{3}|885\d{2})$/.test(zip)) return "TX";
  if (/^(?:206|207|208|209|210|211|212|214|215|216|217|218|219)\d{2}$/.test(zip)) return "MD";
  if (/^(?:005(?:01|44)|06390|1\d{4})$/.test(zip)) return "NY";
  if (/^06\d{3}$/.test(zip)) return "CT";
  if (/^(?:200|202|203|204|205)\d{2}$/.test(zip)) return "DC";
  if (/^(?:0(?:1\d{3}|2[0-7]\d{2}|55\d{2}))$/.test(zip)) return "MA";
  if (/^(?:039\d{2}|04\d{3})$/.test(zip)) return "ME";
  if (/^0[78]\d{3}$/.test(zip)) return "NJ";
  if (/^(?:028|029)\d{2}$/.test(zip)) return "RI";
  if (/^6\d{4}$/.test(zip)) return "IL";
  if (isOhioZip(zip)) {
    return commodity === "gas" ? "OH_G" : "OH_E";
  }
  return null;
}

function syncCommodityVisibility() {
  const showOhioCommodityChoice = isOhioZip(estimateElements.zipCode?.value);
  if (estimateElements.commodityField) {
    estimateElements.commodityField.hidden = !showOhioCommodityChoice;
    estimateElements.commodityField.setAttribute("aria-hidden", String(!showOhioCommodityChoice));
  }

  estimateElements.commodityInputs.forEach((input) => {
    input.disabled = !showOhioCommodityChoice;
  });

  if (!showOhioCommodityChoice) {
    estimateState.commodity = "electric";
    const electricInput = estimateElements.commodityInputs.find((input) => input.value === "electric");
    if (electricInput) electricInput.checked = true;
  } else {
    const checked = estimateElements.commodityInputs.find((input) => input.checked);
    estimateState.commodity = checked?.value === "gas" ? "gas" : "electric";
  }

  updateUtilityChoiceLabel();
}

function setStatus(message, tone = "info") {
  estimateElements.status.textContent = message;
  estimateElements.status.dataset.tone = tone;
}

function resetManualInputs() {
  estimateState.manualInputs = {
    benchmarkRateCents: "",
    currentRateCents: "",
    monthlyUsage: "",
    utilityName: "",
  };

  if (estimateElements.utilityName) estimateElements.utilityName.value = "";
  if (estimateElements.currentRate) estimateElements.currentRate.value = "";
  if (estimateElements.benchmarkRate) estimateElements.benchmarkRate.value = "";
  if (estimateElements.monthlyUsage) estimateElements.monthlyUsage.value = "";
}

function defaultMonthlyUsage(region, utilityName = "", zipCode = "") {
  const normalizedUtilityName = String(utilityName || "").toLowerCase();
  const prefix3 = parseWholeNumber(String(zipCode || "").slice(0, 3));
  switch (region) {
    case "MD":
      if (
        normalizedUtilityName.includes("bge") ||
        normalizedUtilityName.includes("pepco") ||
        normalizedUtilityName.includes("smeco") ||
        [206, 207, 208, 209, 210, 211, 212, 214].includes(prefix3)
      ) {
        return 920;
      }
      return 980;
    case "CT":
      if (
        normalizedUtilityName.includes("illuminating") ||
        normalizedUtilityName.includes("united illuminating") ||
        [64, 65, 66].includes(prefix3)
      ) {
        return 760;
      }
      return 790;
    case "DC":
      return 920;
    case "MA":
      return 700;
    case "ME":
      return 720;
    case "NJ":
      return 840;
    case "RI":
      return 750;
    case "IL":
      if (
        normalizedUtilityName.includes("comed") ||
        [600, 601, 602, 603, 604, 605, 606, 607, 608, 609].includes(prefix3)
      ) {
        return 760;
      }
      return 860;
    case "NY":
      if (
        normalizedUtilityName.includes("con edison") ||
        normalizedUtilityName.includes("coned") ||
        normalizedUtilityName.includes("orange & rockland") ||
        normalizedUtilityName.includes("oru") ||
        normalizedUtilityName.includes("lower hudson") ||
        [100, 101, 102, 103, 104, 105, 106, 107, 108, 109].includes(prefix3)
      ) {
        return 760;
      }
      if (
        normalizedUtilityName.includes("pseg long island") ||
        normalizedUtilityName.includes("long island") ||
        normalizedUtilityName.includes("lipa") ||
        [5, 117, 118, 119].includes(prefix3)
      ) {
        return 900;
      }
      if (
        normalizedUtilityName.includes("national grid") ||
        normalizedUtilityName.includes("central hudson") ||
        normalizedUtilityName.includes("nyseg") ||
        normalizedUtilityName.includes("rg&e") ||
        normalizedUtilityName.includes("rge") ||
        (prefix3 >= 110 && prefix3 <= 149)
      ) {
        return 820;
      }
      return 800;
    case "TX":
      return 1200;
    case "OH_G":
      return 80;
    case "OH_E":
      return 900;
    case "PA":
    default:
      return 850;
  }
}

function toCents(rawRate) {
  const numeric = toNumber(rawRate);
  return numeric === null ? null : roundToTwo(numeric * 100);
}

function toNumber(value) {
  const cleaned = String(value ?? "").replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseWholeNumber(value) {
  const match = String(value ?? "").match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function isOhioZip(zipCode) {
  return /^(?:43|44|45)\d{3}$/.test(normalizeZip(zipCode));
}

function updateUtilityChoiceLabel() {
  if (!estimateElements.utilityChoiceLabel) return;
  estimateElements.utilityChoiceLabel.textContent = activeUtilityChoiceLabel();
}

function parseDollarAmount(value, cue = "") {
  const source = String(value ?? "");
  if (!source) return 0;
  if (cue && !source.toLowerCase().includes(cue.toLowerCase())) return 0;
  const match = source.match(/\$(\d+(?:\.\d{1,2})?)/);
  return match ? Number(match[1]) : 0;
}

function extractFeePhrase(value, cue) {
  const source = String(value ?? "").trim();
  return source.toLowerCase().includes(cue.toLowerCase()) ? source : "";
}

function findEnrollmentFeeText(...sources) {
  return sources
    .filter(Boolean)
    .map((source) => String(source).trim())
    .find((source) =>
      ["enrollment fee", "signup fee", "sign up fee", "activation fee", "initial fee"].some((cue) =>
        source.toLowerCase().includes(cue),
      ),
    ) || "";
}

function formatEditableNumber(value) {
  return value || value === 0 ? String(roundToTwo(value)) : "";
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatRate(rateCentsPerKwh, region) {
  const unit = region === "OH_G" ? "Ccf" : "kWh";
  return `${roundToTwo(rateCentsPerKwh).toFixed(2)}c/${unit}`;
}

function roundCurrency(value) {
  return Math.round(value * 100) / 100;
}

function roundToTwo(value) {
  return Math.round(Number(value) * 100) / 100;
}

function normalizeRateType(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "fixed") return "Fixed";
  if (normalized === "variable") return "Variable";
  if (normalized === "unlimited") return "Unlimited";
  return String(value ?? "").trim() || "Unknown";
}

function normalizeTexasRateType(offer) {
  if (offer?.prepaid) return "Prepaid";
  if (String(offer?.rate_type ?? "").toLowerCase() === "fixed") return "Fixed";
  if (String(offer?.rate_type ?? "").toLowerCase() === "variable") return "Variable";
  if (offer?.timeofuse) return "Time of use";
  return String(offer?.rate_type ?? "").trim() || "Unknown";
}

function normalizeBoolean(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "yes" || normalized === "true") return true;
  if (normalized === "no" || normalized === "false") return false;
  return false;
}

function extractLinks(element, sourceUrl) {
  const set = new Set();
  const rawDataUrl = element.getAttribute("data-url");
  if (rawDataUrl) set.add(rawDataUrl);
  element.querySelectorAll("a[href]").forEach((link) => set.add(link.getAttribute("href")));
  return Array.from(set)
    .map((url) => {
      try {
        return new URL(url, sourceUrl).toString().replace("http://", "https://");
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}

function looksLikeEnrollmentUrl(url) {
  const lowered = String(url ?? "").toLowerCase();
  return ["enroll", "enrollment", "signup", "sign-up", "switch", "cart/", "checkout", "plan="]
    .some((cue) => lowered.includes(cue));
}

function looksLikeDetailsUrl(url) {
  const lowered = String(url ?? "").toLowerCase();
  return ["details", "terms", "disclosure", "fact", "info"].some((cue) => lowered.includes(cue));
}

function extractLabeledNumber(source, label) {
  const match = String(source ?? "").match(new RegExp(`${label}[^$\\d]*\\$?(\\d+(?:\\.\\d+)?)`, "i"));
  return match ? Number(match[1]) : 0;
}

function extractLabeledPercent(source, label) {
  const match = String(source ?? "").match(new RegExp(`${label}[^\\d]*(\\d{1,3})%`, "i"));
  return match ? Number(match[1]) : 0;
}

function extractTermMonths(source) {
  const match = String(source ?? "").match(/(\d{1,3})\s*months?/i);
  return match ? Number(match[1]) : 1;
}

function ownText(element) {
  return Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent || "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanCellText(element) {
  return String(element?.textContent ?? "")
    .replace(/details/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractDialogHandler(element) {
  return Array.from(element.querySelectorAll("a"))
    .find((link) => String(link.getAttribute("onclick") ?? "").includes("showTextInDialog"))
    ?.getAttribute("onclick") || "";
}

function parseInlineDialog(onClick) {
  const match = String(onClick ?? "").match(/showTextInDialog\('((?:\\'|[^'])*)','((?:\\'|[^'])*)'\)/i);
  if (!match) return null;
  return {
    title: decodeInlineValue(match[1]),
    body: decodeInlineValue(match[2]).replace(/\s+/g, " ").trim(),
  };
}

function decodeInlineValue(value) {
  return String(value ?? "")
    .replaceAll("\\'", "'")
    .replaceAll("\\u003c", "<")
    .replaceAll("\\u003e", ">")
    .replaceAll("&quot;", "\"")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findLinkByText(scope, label) {
  return Array.from(scope.querySelectorAll("a"))
    .find((link) => String(link.textContent ?? "").toLowerCase().includes(label.toLowerCase()))
    ?.href || "";
}

function parseOhioDisplayedRate(rawText, region, html) {
  const source = String(rawText ?? "");
  if (!source) return null;
  if (region === "OH_G") {
    const explicit = source.match(/\$?\s*(\d+\.\d+)\s*(?:\/|per)?\s*([CM])CF/i);
    if (explicit) {
      const dollars = Number(explicit[1]);
      const measurement = explicit[2].toUpperCase();
      return measurement === "M" ? roundToTwo(dollars * 10) : roundToTwo(dollars * 100);
    }
    const generic = source.match(/(\d+\.\d+)/);
    if (!generic) return null;
    const usesMcf = /var\s+metric\s*=\s*'Mcf'|\$\/Mcf|\bper\s*MCF\b/i.test(html);
    return usesMcf
      ? roundToTwo(Number(generic[1]) * 10)
      : roundToTwo(Number(generic[1]) * 100);
  }

  if (/\b(?:ccf|mcf)\b/i.test(source)) return null;
  const match = source.match(/(\d+\.\d+)/);
  return match ? roundToTwo(Number(match[1]) * 100) : null;
}

function lastLine(value) {
  return String(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .pop() || "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
