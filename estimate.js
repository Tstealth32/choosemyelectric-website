const estimateState = {
  commodity: "electric",
  conversionNotes: [],
  currentCost: null,
  deviceId: "",
  detectedRegion: null,
  installId: "",
  market: null,
  manualInputs: {
    benchmarkRateCents: "",
    currentRateCents: "",
    monthlyUsage: "",
    supplierName: "",
    utilityName: "",
  },
  recommendations: [],
  scan: null,
  session: null,
  zipCode: "",
};

const estimateElements = {};
const PDFJS_VERSION = "5.4.624";
const PDFJS_BASE_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build`;
const MAX_PDF_PAGES = 2;
const MAX_SCAN_IMAGES = 4;
let pdfJsPromise = null;

document.addEventListener("DOMContentLoaded", () => {
  cacheEstimateElements();
  initializeEstimateIdentity();
  hydrateStoredSession();
  bindEstimateEvents();
  syncCommodityVisibility();
});

function cacheEstimateElements() {
  estimateElements.form = document.getElementById("estimate-form");
  estimateElements.zipCode = document.getElementById("zip-code");
  estimateElements.billUpload = document.getElementById("bill-upload");
  estimateElements.commodityField = document.getElementById("commodity-field");
  estimateElements.utilityChoicePanel = document.getElementById("utility-choice-panel");
  estimateElements.utilityChoice = document.getElementById("utility-choice");
  estimateElements.status = document.getElementById("estimate-status");
  estimateElements.scanSummary = document.getElementById("scan-summary");
  estimateElements.utilityName = document.getElementById("utility-name");
  estimateElements.supplierName = document.getElementById("supplier-name");
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
}

function initializeEstimateIdentity() {
  estimateState.deviceId = ensureStableId("choose-electric-web-device-id");
  estimateState.installId = ensureStableId("choose-electric-web-install-id");
}

function bindEstimateEvents() {
  estimateElements.form?.addEventListener("submit", handleEstimateSubmit);
  estimateElements.zipCode?.addEventListener("input", () => {
    estimateState.zipCode = normalizeZip(estimateElements.zipCode.value);
    estimateElements.zipCode.value = estimateState.zipCode;
    syncCommodityVisibility();
  });
  estimateElements.commodityInputs.forEach((input) => {
    input.addEventListener("change", () => {
      estimateState.commodity = input.value === "gas" ? "gas" : "electric";
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
  bindManualField("supplierName", estimateElements.supplierName);
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

async function handleEstimateSubmit(event) {
  event.preventDefault();
  setStatus("Checking your ZIP code and live market offers...", "info");

  const normalizedZip = normalizeZip(estimateElements.zipCode.value);
  estimateState.zipCode = normalizedZip;
  resetManualInputs();

  const billFiles = Array.from(estimateElements.billUpload.files || []);
  if (!normalizedZip && billFiles.length === 0) {
    setStatus("Enter your ZIP code or upload a bill photo or PDF to continue.", "error");
    return;
  }

  let scanResult = null;
  if (billFiles.length > 0) {
    scanResult = await scanBillFiles(billFiles, normalizedZip);
    if (scanResult?.scan) {
      estimateState.scan = scanResult.scan;
      estimateState.detectedRegion = scanResult.detectedRegion || estimateState.detectedRegion;
      if (scanResult.session) {
        estimateState.session = scanResult.session;
        persistSession(scanResult.session);
      }
      const scannedZip = normalizeZip(fieldValue(scanResult.scan, "service_zip"));
      if (!normalizedZip && scannedZip) {
        estimateState.zipCode = scannedZip;
        estimateElements.zipCode.value = scannedZip;
      }
    }
  } else {
    estimateState.scan = null;
  }

  if (!estimateState.zipCode) {
    setStatus("We could not find a service ZIP code yet. Add it manually and try again.", "error");
    return;
  }

  syncCommodityVisibility();
  await refreshMarket({
    preferredUtilityName:
      fieldValue(estimateState.scan, "utility_name") || estimateState.manualInputs.utilityName,
  });
}

async function scanBillFiles(files, zipCode) {
  setStatus("Scanning your bill and pulling out your current rate...", "info");
  estimateElements.scanSummary.hidden = true;
  estimateState.conversionNotes = [];

  const preparedFiles = await prepareUploadFiles(files);
  if (!preparedFiles.length) {
    setStatus("We could not turn that PDF into bill images. Try a different PDF or upload screenshots instead.", "error");
    return null;
  }

  const formData = new FormData();
  formData.set("zipCode", zipCode || "");
  formData.set("commodity", estimateState.commodity);
  formData.set("deviceId", estimateState.deviceId);
  formData.set("installId", estimateState.installId);

  if (estimateState.session?.customerId) {
    formData.set("customerId", estimateState.session.customerId);
    formData.set("customerToken", estimateState.session.customerToken);
  }

  preparedFiles.forEach((file) => formData.append("bill", file));

  const response = await fetch("/api/scan-bill", {
    method: "POST",
    body: formData,
  });
  const payload = await response.json();

  if (!response.ok) {
    setStatus(
      payload.error || "The bill scan could not finish right now. You can still use ZIP code only.",
      "warning",
    );
    return null;
  }

  renderScanSummary(payload.scan);
  return payload;
}

async function refreshMarket({ preferredUtilityName = "", utilityChoiceKey = "" } = {}) {
  const requestBody = {
    commodity: estimateState.commodity,
    preferredUtilityName,
    region: detectRegion(estimateState.zipCode, estimateState.commodity) || estimateState.detectedRegion,
    utilityChoiceKey,
    zipCode: estimateState.zipCode,
  };

  setStatus("Loading live offers for your ZIP code...", "info");

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
  autofillManualInputs();
  recomputeRecommendations();
  setStatus("Estimate ready. Review the numbers and compare the live plan list below.", "success");
}

function normalizeMarketPayload(payload) {
  const region = payload.region;
  const benchmarkRateCentsPerKwh = toNumber(
    payload.benchmarkRateCentsPerKwh ?? payload.benchmarkRateCentsPerUnit,
  );

  let offers = [];
  if (region === "PA") {
    offers = parsePennsylvaniaOffers(payload.resultsHtml, payload.sourceUrl);
  } else if (region === "TX") {
    offers = parseTexasOffers(payload.offers);
  } else if (region === "OH_E" || region === "OH_G") {
    offers = parseOhioOffers(payload.comparisonHtml, region);
  }

  const ohioBenchmark = region === "OH_E" || region === "OH_G"
    ? parseOhioBenchmark(payload.comparisonHtml, region)
    : null;

  return {
    benchmarkMonthlyAdjustment: toNumber(payload.benchmarkMonthlyAdjustment) || 0,
    benchmarkRateCentsPerKwh:
      benchmarkRateCentsPerKwh ?? ohioBenchmark?.rateCents ?? null,
    offers,
    priceToCompareLastUpdated:
      payload.priceToCompareLastUpdated || ohioBenchmark?.updatedText || null,
    raw: payload,
    region,
    selectedUtilityChoiceKey: payload.selectedUtilityChoiceKey || "",
    sourceLabel: payload.sourceLabel || "",
    sourceUrl: payload.sourceUrl || "",
    utilityChoices: Array.isArray(payload.utilityChoices) ? payload.utilityChoices : [],
    utilityName: payload.utilityName || "",
    zipCode: payload.zipCode || estimateState.zipCode,
  };
}

function autofillManualInputs() {
  const scan = estimateState.scan;
  const market = estimateState.market;

  const supplierName = fieldValue(scan, "current_supplier_name");
  const utilityName = fieldValue(scan, "utility_name") || market?.utilityName || "";
  const currentRateCents = toCents(fieldValue(scan, "current_supplier_rate_per_kwh"));
  const scanBenchmarkCents = toCents(fieldValue(scan, "utility_price_to_compare_per_kwh"));
  const usage = deriveMonthlyUsage(scan) || defaultMonthlyUsage(market?.region);

  estimateState.manualInputs.utilityName =
    estimateState.manualInputs.utilityName || utilityName;
  estimateState.manualInputs.supplierName =
    estimateState.manualInputs.supplierName || supplierName;
  estimateState.manualInputs.currentRateCents =
    estimateState.manualInputs.currentRateCents ||
    (
      currentRateCents !== null
        ? formatEditableNumber(currentRateCents)
        : formatEditableNumber(market?.benchmarkRateCentsPerKwh)
    );
  estimateState.manualInputs.benchmarkRateCents =
    estimateState.manualInputs.benchmarkRateCents ||
    (
      scanBenchmarkCents !== null
        ? formatEditableNumber(scanBenchmarkCents)
        : formatEditableNumber(market?.benchmarkRateCentsPerKwh)
    );
  estimateState.manualInputs.monthlyUsage =
    estimateState.manualInputs.monthlyUsage ||
    (usage ? String(Math.round(usage)) : String(defaultMonthlyUsage(market?.region)));

  estimateElements.utilityName.value = estimateState.manualInputs.utilityName;
  estimateElements.supplierName.value = estimateState.manualInputs.supplierName;
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
      ? "Savings compared with the current rate from your bill or manual entry."
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

  estimateElements.currentCostValue.textContent =
    estimateState.currentCost !== null ? formatMoney(estimateState.currentCost) : "--";
  estimateElements.currentCostNote.textContent =
    currentRateBasis || "Add a current rate and monthly usage to estimate your baseline.";

  estimateElements.bestOfferValue.textContent =
    bestOffer ? formatMoney(bestOffer.estimatedMonthlyCost) : "--";
  estimateElements.bestOfferNote.textContent =
    bestOffer
      ? `${bestOffer.supplierName} ${bestOffer.planName ? `• ${bestOffer.planName}` : ""}`
      : "Live offers will show here.";

  estimateElements.savingsValue.textContent =
    bestOffer ? formatMoney(bestOffer.estimatedMonthlySavings) : "--";
  estimateElements.savingsNote.textContent =
    bestOffer
      ? `${formatMoney(bestOffer.annualSavings)} per year before taxes and utility delivery charges.`
      : "Upload a bill or PDF, or enter your current rate to personalize this number.";

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

  if (!recommendations.length) {
    estimateElements.offerResults.innerHTML =
      '<p class="empty-state">We found your market, but we do not have live offers to show yet for this exact setup.</p>';
    return;
  }

  estimateElements.offerResults.innerHTML = recommendations
    .slice(0, 8)
    .map((offer, index) => renderOfferCard(offer, index === 0))
    .join("");
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

function renderScanSummary(scan) {
  if (!scan) {
    estimateElements.scanSummary.hidden = true;
    return;
  }

  const foundBits = [
    fieldValue(scan, "utility_name") ? `Utility: ${fieldValue(scan, "utility_name")}` : "",
    fieldValue(scan, "current_supplier_name") ? `Supplier: ${fieldValue(scan, "current_supplier_name")}` : "",
    toCents(fieldValue(scan, "current_supplier_rate_per_kwh")) !== null
      ? `Current rate: ${formatRate(toCents(fieldValue(scan, "current_supplier_rate_per_kwh")), detectRegion(estimateState.zipCode, estimateState.commodity))}`
      : "",
    deriveMonthlyUsage(scan) ? `Monthly usage: ${Math.round(deriveMonthlyUsage(scan))}` : "",
  ].filter(Boolean);

  estimateElements.scanSummary.hidden = false;
  estimateElements.scanSummary.innerHTML = `
    <strong>Bill scan ready.</strong>
    <p>${foundBits.length ? escapeHtml(foundBits.join(" • ")) : "We found part of your bill and prefilled what we could."}</p>
    ${
      estimateState.conversionNotes.length
        ? `<p>${escapeHtml(estimateState.conversionNotes.join(" "))}</p>`
        : ""
    }
  `;
}

function populateUtilityChoices(choices, selectedKey) {
  if (!choices || choices.length <= 1) {
    estimateElements.utilityChoicePanel.hidden = true;
    estimateElements.utilityChoice.innerHTML = "";
    return;
  }

  estimateElements.utilityChoicePanel.hidden = false;
  estimateElements.utilityChoice.innerHTML = choices
    .map((choice) => {
      const labelBits = [choice.utilityName];
      if (choice.rateSchedule) labelBits.push(choice.rateSchedule);
      return `
        <option value="${escapeAttribute(choice.key)}" ${choice.key === selectedKey ? "selected" : ""}>
          ${escapeHtml(labelBits.join(" • "))}
        </option>
      `;
    })
    .join("");
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
  if (/^(?:43|44|45)\d{3}$/.test(zip)) {
    return commodity === "gas" ? "OH_G" : "OH_E";
  }
  return null;
}

function syncCommodityVisibility() {
  const region = detectRegion(estimateElements.zipCode.value, estimateState.commodity);
  const isOhioZip = region === "OH_E" || region === "OH_G" || /^(?:43|44|45)/.test(estimateElements.zipCode.value);
  estimateElements.commodityField.hidden = !isOhioZip;
  if (!isOhioZip) {
    estimateState.commodity = "electric";
    const electricInput = estimateElements.commodityInputs.find((input) => input.value === "electric");
    if (electricInput) electricInput.checked = true;
  } else {
    const checked = estimateElements.commodityInputs.find((input) => input.checked);
    estimateState.commodity = checked?.value === "gas" ? "gas" : "electric";
  }
}

function deriveMonthlyUsage(scan) {
  if (!scan?.fields) return null;
  const avgMonthly = toNumber(fieldValue(scan, "avg_monthly_kwh"));
  const annualUsage = toNumber(fieldValue(scan, "annual_usage_kwh"));
  const currentUsage = toNumber(fieldValue(scan, "usage_kwh_current_period"));
  if (avgMonthly) return avgMonthly;
  if (annualUsage) return annualUsage / 12;
  if (currentUsage) return currentUsage;
  return null;
}

function fieldValue(scan, fieldKey) {
  return String(scan?.fields?.[fieldKey]?.value ?? "").trim();
}

function setStatus(message, tone = "info") {
  estimateElements.status.textContent = message;
  estimateElements.status.dataset.tone = tone;
}

function hydrateStoredSession() {
  try {
    const raw = localStorage.getItem("choose-electric-web-session");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed?.customerId && parsed?.customerToken) {
      estimateState.session = parsed;
    }
  } catch {
    estimateState.session = null;
  }
}

function resetManualInputs() {
  estimateState.manualInputs = {
    benchmarkRateCents: "",
    currentRateCents: "",
    monthlyUsage: "",
    supplierName: "",
    utilityName: "",
  };

  if (estimateElements.utilityName) estimateElements.utilityName.value = "";
  if (estimateElements.supplierName) estimateElements.supplierName.value = "";
  if (estimateElements.currentRate) estimateElements.currentRate.value = "";
  if (estimateElements.benchmarkRate) estimateElements.benchmarkRate.value = "";
  if (estimateElements.monthlyUsage) estimateElements.monthlyUsage.value = "";
}

function persistSession(session) {
  try {
    localStorage.setItem("choose-electric-web-session", JSON.stringify(session));
  } catch {
    // Ignore storage failures.
  }
}

function ensureStableId(storageKey) {
  try {
    const existing = localStorage.getItem(storageKey);
    if (existing) return existing;
    const nextValue = crypto.randomUUID();
    localStorage.setItem(storageKey, nextValue);
    return nextValue;
  } catch {
    return crypto.randomUUID();
  }
}

function defaultMonthlyUsage(region) {
  switch (region) {
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

async function prepareUploadFiles(files) {
  const prepared = [];

  for (const file of files) {
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      prepared.push(file);
      continue;
    }

    setStatus(`Preparing PDF pages from ${file.name}...`, "info");
    const pdfImages = await renderPdfFileToImages(file);
    if (!pdfImages.length) continue;

    estimateState.conversionNotes.push(
      `${file.name} converted into ${pdfImages.length} bill image${pdfImages.length === 1 ? "" : "s"}.`,
    );
    prepared.push(...pdfImages);
  }

  return prepared.slice(0, MAX_SCAN_IMAGES);
}

async function renderPdfFileToImages(file) {
  const pdfjs = await loadPdfJs();
  const pdfBytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data: pdfBytes });
  const pdf = await loadingTask.promise;
  const totalPages = Math.min(pdf.numPages, MAX_PDF_PAGES);
  const pageImages = [];

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const longestSide = Math.max(baseViewport.width, baseViewport.height);
    const scale = Math.max(1, Math.min(2.4, 1800 / longestSide));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false });

    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);

    if (!context) {
      throw new Error("The browser could not create a canvas for PDF rendering.");
    }

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    const blob = await canvasToBlob(canvas, "image/jpeg", 0.88);
    pageImages.push(
      new File(
        [blob],
        `${file.name.replace(/\.pdf$/i, "")}-page-${pageNumber}.jpg`,
        { type: "image/jpeg" },
      ),
    );
    page.cleanup();
  }

  return pageImages;
}

async function loadPdfJs() {
  if (!pdfJsPromise) {
    pdfJsPromise = import(`${PDFJS_BASE_URL}/pdf.mjs`)
      .then((module) => {
        module.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE_URL}/pdf.worker.mjs`;
        return module;
      });
  }
  return pdfJsPromise;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("PDF page rendering did not produce an image blob."));
      }
    }, type, quality);
  });
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
