import {
  backendJson,
  backendText,
  detectRegion,
  jsonResponse,
  normalizeZip,
} from "./_backend.mjs";

const OHIO_BASE_URL = "https://energychoice.ohio.gov";

export async function POST(request) {
  try {
    const body = await request.json();
    const zipCode = normalizeZip(body?.zipCode);
    const commodity = body?.commodity === "gas" ? "gas" : "electric";
    const preferredUtilityName = String(body?.preferredUtilityName ?? "").trim();
    const requestedRegion = typeof body?.region === "string" ? body.region.trim() : "";
    const region = requestedRegion || detectRegion(zipCode, commodity);

    if (!zipCode || !region) {
      return jsonResponse(
        {
          error:
            "Choose My Electric is currently available for Pennsylvania, Texas, and Ohio deregulated utility markets.",
        },
        400,
      );
    }

    if (region === "PA") {
      const market = await fetchPennsylvaniaMarket({
        forceRefresh: Boolean(body?.forceRefresh),
        preferredUtilityName,
        requestedUtilityChoiceKey: String(body?.utilityChoiceKey ?? "").trim(),
        zipCode,
      });
      return jsonResponse(market);
    }

    if (region === "TX") {
      const market = await fetchTexasMarket({
        forceRefresh: Boolean(body?.forceRefresh),
        preferredUtilityName,
        requestedUtilityChoiceKey: String(body?.utilityChoiceKey ?? "").trim(),
        zipCode,
      });
      return jsonResponse(market);
    }

    const market = await fetchOhioMarket({
      commodity,
      forceRefresh: Boolean(body?.forceRefresh),
      preferredUtilityName,
      requestedUtilityChoiceKey: String(body?.utilityChoiceKey ?? "").trim(),
      zipCode,
    });
    return jsonResponse(market);
  } catch (error) {
    return jsonResponse(
      {
        error: error.message || "The web estimate could not load market data right now.",
      },
      error.status || 500,
    );
  }
}

async function fetchPennsylvaniaMarket({
  forceRefresh,
  preferredUtilityName,
  requestedUtilityChoiceKey,
  zipCode,
}) {
  const zipEntries = await backendJson("/market/pa/zipsearch", {
    body: {
      zipCode,
      serviceType: "residential",
      forceRefresh,
      allowStaleProxyResponse: true,
    },
  });

  const utilityChoices = buildPennsylvaniaUtilityChoices(zipEntries);
  const selectedChoice = pickChoice(utilityChoices, requestedUtilityChoiceKey, preferredUtilityName);

  if (!selectedChoice) {
    throw new Error(`No Pennsylvania residential utility choice was found for ZIP ${zipCode}.`);
  }

  const resultsHtml = await backendText("/market/pa/results", {
    body: {
      zipCode,
      utilityId: selectedChoice.utilityId,
      rateSchedule: selectedChoice.rateSchedule,
      serviceType: "residential",
      forceRefresh,
      allowStaleProxyResponse: true,
    },
  });

  const sourceUrl = new URL("https://www.papowerswitch.com/shop-for-rates-results");
  sourceUrl.searchParams.set("zip", zipCode);
  sourceUrl.searchParams.set("distributor", String(selectedChoice.utilityId));
  sourceUrl.searchParams.set("distributorrate", selectedChoice.rateSchedule);
  sourceUrl.searchParams.set("servicetype", "residential");

  return {
    region: "PA",
    zipCode,
    utilityChoices,
    selectedUtilityChoiceKey: selectedChoice.key,
    utilityName: selectedChoice.utilityName,
    utilityPhone: selectedChoice.utilityPhone,
    rateSchedule: selectedChoice.rateSchedule,
    benchmarkRateCentsPerKwh: toCents(selectedChoice.priceToComparePerKwh),
    priceToCompareLastUpdated: selectedChoice.lastUpdatedDate,
    resultsHtml,
    sourceLabel: `Live PA Power Switch results for ZIP ${zipCode}`,
    sourceUrl: sourceUrl.toString(),
  };
}

async function fetchTexasMarket({
  forceRefresh,
  preferredUtilityName,
  requestedUtilityChoiceKey,
  zipCode,
}) {
  const utilities = await backendJson("/market/tx/service", {
    body: {
      zipCode,
      forceRefresh,
      allowStaleProxyResponse: true,
      payload: {
        parameters: {
          method: "TduCompaniesByZip",
          zip_code: zipCode,
          include_details: false,
          language: 0,
        },
      },
    },
  });

  const utilityChoices = utilities.map((item) => ({
    key: String(item.company_id ?? "").trim(),
    utilityName: String(item.company_name ?? "").trim(),
  })).filter((choice) => choice.key && choice.utilityName);

  const selectedChoice = pickChoice(utilityChoices, requestedUtilityChoiceKey, preferredUtilityName);
  if (!selectedChoice) {
    throw new Error(`No Texas delivery area was found for ZIP ${zipCode}.`);
  }

  const offers = await backendJson("/market/tx/service", {
    body: {
      zipCode,
      forceRefresh,
      allowStaleProxyResponse: true,
      payload: {
        parameters: {
          method: "plans",
          zip_code: zipCode,
          company_tdu_id: selectedChoice.key,
          company_unique_id: "",
          company_id: "",
          plan_mo_from: "",
          plan_mo_to: "",
          estimated_use: 1000,
          plan_type: "1,0,2",
          rating_total: "",
          include_details: true,
          language: 0,
          min_usage_plan: "off",
        },
      },
    },
  });

  const benchmarkPricing = approximateTexasBenchmarkPricing(offers);
  const enrichedChoices = utilityChoices.map((choice) => ({
    ...choice,
    benchmarkMonthlyAdjustment:
      choice.key === selectedChoice.key ? benchmarkPricing.monthlyAdjustment : null,
    benchmarkRateCentsPerKwh:
      choice.key === selectedChoice.key ? benchmarkPricing.rateCentsPerKwh : null,
  }));

  return {
    benchmarkMonthlyAdjustment: benchmarkPricing.monthlyAdjustment,
    benchmarkRateCentsPerKwh: benchmarkPricing.rateCentsPerKwh,
    offers,
    region: "TX",
    selectedUtilityChoiceKey: selectedChoice.key,
    sourceLabel: `Live Power to Choose results for ZIP ${zipCode}`,
    sourceUrl: `https://www.powertochoose.org/en-us/Plan/Results?zip_code=${zipCode}`,
    utilityChoices: enrichedChoices,
    utilityName: selectedChoice.utilityName,
    zipCode,
  };
}

async function fetchOhioMarket({
  commodity,
  forceRefresh,
  preferredUtilityName,
  requestedUtilityChoiceKey,
  zipCode,
}) {
  const categoryValue = commodity === "gas" ? "NaturalGas" : "Electric";
  const categoryUrl = `${OHIO_BASE_URL}/ApplesToApplesCategory.aspx?Category=${categoryValue}`;
  const categoryHtml = await backendText("/market/ohio/page", {
    body: {
      url: categoryUrl,
      forceRefresh,
    },
  });

  const utilityChoices = parseOhioUtilityChoices(categoryHtml, categoryValue);
  const hasExplicitUtilitySelection =
    Boolean(String(requestedUtilityChoiceKey ?? "").trim()) ||
    Boolean(String(preferredUtilityName ?? "").trim());
  const selectedChoice =
    hasExplicitUtilitySelection || utilityChoices.length === 1
      ? pickChoice(utilityChoices, requestedUtilityChoiceKey, preferredUtilityName)
      : null;

  if (!selectedChoice) {
    return {
      commodity,
      region: commodity === "gas" ? "OH_G" : "OH_E",
      selectionRequired: utilityChoices.length > 1,
      utilityChoices,
      zipCode,
      sourceLabel: "Live Energy Choice Ohio utility list",
      sourceUrl: categoryUrl,
    };
  }

  const comparisonUrl = buildOhioAbsoluteUrl(selectedChoice.comparisonPath);
  const comparisonHtml = await backendText("/market/ohio/page", {
    body: {
      url: comparisonUrl,
      forceRefresh,
    },
  });

  return {
    categoryHtml,
    commodity,
    comparisonHtml,
    region: commodity === "gas" ? "OH_G" : "OH_E",
    selectedUtilityChoiceKey: selectedChoice.key,
    sourceLabel: `Live Energy Choice Ohio ${commodity} results for ZIP ${zipCode}`,
    sourceUrl: comparisonUrl,
    utilityChoices,
    utilityName: selectedChoice.utilityName,
    zipCode,
  };
}

function buildPennsylvaniaUtilityChoices(zipEntries) {
  return zipEntries.flatMap((utility) => {
    const rates = Array.isArray(utility?.rates) ? utility.rates : [];
    const preferredRates = rates.filter((rate) =>
      String(rate?.rateSchedule ?? "").toLowerCase().includes("residential"),
    );
    const ratesToUse = preferredRates.length > 0 ? preferredRates : rates.slice(0, 1);
    return ratesToUse.map((rate) => ({
      key: `${utility.id}:${rate.id}`,
      lastUpdatedDate: rate.lastUpdatedDate ?? null,
      priceToComparePerKwh: numberOrNull(rate.rate),
      rateSchedule: String(rate.rateSchedule ?? "").trim(),
      rateScheduleId: Number(rate.id),
      utilityId: Number(utility.id),
      utilityName: String(utility.name ?? "").trim(),
      utilityPhone: String(utility.phone ?? "").trim() || null,
    }));
  });
}

function pickChoice(choices, requestedKey, preferredUtilityName) {
  if (!Array.isArray(choices) || choices.length === 0) return null;

  if (requestedKey) {
    const directMatch = choices.find((choice) => choice.key === requestedKey);
    if (directMatch) return directMatch;
  }

  const preferredName = preferredUtilityName.toLowerCase().trim();
  if (preferredName) {
    const exactMatch = choices.find(
      (choice) => choice.utilityName.toLowerCase().trim() === preferredName,
    );
    if (exactMatch) return exactMatch;

    const containsMatch = choices.find((choice) => {
      const candidate = choice.utilityName.toLowerCase().trim();
      return candidate.includes(preferredName) || preferredName.includes(candidate);
    });
    if (containsMatch) return containsMatch;
  }

  return choices[0];
}

function parseOhioUtilityChoices(categoryHtml, categoryValue) {
  const matches = categoryHtml.matchAll(
    /<a[^>]+href=['"]([^'"]*ApplesToApplesComparision\.aspx[^'"]*RateCode=1[^'"]*)['"][^>]*>([\s\S]*?)<\/a>/gi,
  );
  const seen = new Map();

  for (const match of matches) {
    const rawHref = decodeHtml(match[1]).trim();
    const utilityName = stripTags(decodeHtml(match[2])).trim();
    if (!rawHref || !utilityName) continue;
    if (!rawHref.toLowerCase().includes(`category=${categoryValue.toLowerCase()}`)) continue;

    const comparisonPath = rawHref.replace(/^\.?\//, "");
    if (!seen.has(comparisonPath)) {
      seen.set(comparisonPath, {
        comparisonPath,
        key: comparisonPath,
        utilityName,
      });
    }
  }

  return Array.from(seen.values());
}

function buildOhioAbsoluteUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${OHIO_BASE_URL}/${String(path ?? "").replace(/^\/+/, "")}`;
}

function approximateTexasBenchmarkPricing(offers) {
  const sampleTotals = [
    medianTotalBill(
      offers
        .map((offer) => offer?.price_kwh500)
        .map((value) => numberOrNull(value))
        .filter((value) => value !== null)
        .map((rate) => (rate * 500) / 100),
    ),
    medianTotalBill(
      offers
        .map((offer) => offer?.price_kwh1000)
        .map((value) => numberOrNull(value))
        .filter((value) => value !== null)
        .map((rate) => (rate * 1000) / 100),
    ),
    medianTotalBill(
      offers
        .map((offer) => offer?.price_kwh2000)
        .map((value) => numberOrNull(value))
        .filter((value) => value !== null)
        .map((rate) => (rate * 2000) / 100),
    ),
  ]
    .map((total, index) => {
      const usage = index === 0 ? 500 : index === 1 ? 1000 : 2000;
      return total === null ? null : [usage, total];
    })
    .filter(Boolean);

  const fallbackRate = median(
    offers
      .map((offer) => numberOrNull(offer?.price_kwh1000))
      .filter((value) => value !== null),
  ) ?? 0;

  if (sampleTotals.length === 0) {
    return {
      monthlyAdjustment: 0,
      rateCentsPerKwh: fallbackRate,
    };
  }

  if (sampleTotals.length === 1) {
    const [usage, total] = sampleTotals[0];
    return {
      monthlyAdjustment: 0,
      rateCentsPerKwh: usage > 0 ? (total / usage) * 100 : fallbackRate,
    };
  }

  const xMean = average(sampleTotals.map(([usage]) => usage));
  const yMean = average(sampleTotals.map(([, total]) => total));
  const denominator = sampleTotals.reduce(
    (sum, [usage]) => sum + (usage - xMean) * (usage - xMean),
    0,
  );
  const slopeDollarsPerKwh =
    denominator === 0
      ? fallbackRate / 100
      : sampleTotals.reduce(
          (sum, [usage, total]) => sum + (usage - xMean) * (total - yMean),
          0,
        ) / denominator;
  const intercept = yMean - slopeDollarsPerKwh * xMean;

  return {
    monthlyAdjustment: Math.max(0, roundToTwo(intercept)),
    rateCentsPerKwh: Math.max(0, roundToTwo(slopeDollarsPerKwh * 100)),
  };
}

function medianTotalBill(values) {
  if (!values.length) return null;
  return median(values);
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function numberOrNull(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toCents(rateInDollars) {
  const numeric = numberOrNull(rateInDollars);
  return numeric === null ? null : roundToTwo(numeric * 100);
}

function roundToTwo(value) {
  return Math.round(value * 100) / 100;
}

function decodeHtml(value) {
  return String(value ?? "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function stripTags(value) {
  return String(value ?? "").replace(/<[^>]+>/g, " ");
}
