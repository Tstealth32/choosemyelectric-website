import {
  backendJson,
  backendText,
  detectRegion,
  jsonResponse,
  normalizeZip,
} from "./_backend.mjs";
import {
  getConnecticutUtilityMarket,
  isValidConnecticutZip,
  loadConnecticutMarketCatalog,
  loadMaineMarketCatalog,
  loadNewJerseyMarketCatalog,
  loadNewYorkMarketCatalog,
} from "./_marketCatalogs.mjs";

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
            "This web comparison currently supports Pennsylvania, Texas, Ohio, Maryland, Connecticut, District of Columbia, Massachusetts, Maine, New Jersey, Rhode Island, Illinois, and New York. If your ZIP is outside those deregulated markets, more states will be added over time.",
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

    if (region === "MD") {
      return jsonResponse(
        await fetchMarylandMarket({
          preferredUtilityName,
          requestedUtilityChoiceKey: String(body?.utilityChoiceKey ?? "").trim(),
          zipCode,
        }),
      );
    }

    if (region === "CT") {
      return jsonResponse(await fetchConnecticutMarket({ zipCode }));
    }

    if (region === "DC") {
      return jsonResponse(await fetchDistrictOfColumbiaMarket({ zipCode }));
    }

    if (region === "MA") {
      return jsonResponse(
        await fetchMassachusettsMarket({
          requestedUtilityChoiceKey: String(body?.utilityChoiceKey ?? "").trim(),
          zipCode,
        }),
      );
    }

    if (region === "ME") {
      return jsonResponse(
        await fetchMaineMarket({
          requestedUtilityChoiceKey: String(body?.utilityChoiceKey ?? "").trim(),
          zipCode,
        }),
      );
    }

    if (region === "NJ") {
      return jsonResponse(
        await fetchNewJerseyMarket({
          requestedUtilityChoiceKey: String(body?.utilityChoiceKey ?? "").trim(),
          zipCode,
        }),
      );
    }

    if (region === "RI") {
      return jsonResponse(
        await fetchRhodeIslandMarket({
          requestedUtilityChoiceKey: String(body?.utilityChoiceKey ?? "").trim(),
          zipCode,
        }),
      );
    }

    if (region === "IL") {
      return jsonResponse(
        await fetchIllinoisMarket({
          requestedUtilityChoiceKey: String(body?.utilityChoiceKey ?? "").trim(),
          zipCode,
        }),
      );
    }

    if (region === "NY") {
      return jsonResponse(
        await fetchNewYorkMarket({
          requestedUtilityChoiceKey: String(body?.utilityChoiceKey ?? "").trim(),
          zipCode,
        }),
      );
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
    errorMessage: null,
    region: commodity === "gas" ? "OH_G" : "OH_E",
    selectedUtilityChoiceKey: selectedChoice.key,
    selectionRequired: false,
    sourceLabel: `Live Energy Choice Ohio ${commodity} results for ZIP ${zipCode}`,
    sourceUrl: comparisonUrl,
    utilityChoiceLabel:
      commodity === "gas" ? "Ohio gas utility company" : "Ohio electric utility company",
    utilityChoices,
    utilityName: selectedChoice.utilityName,
    zipCode,
  };
}

async function fetchMarylandMarket({
  requestedUtilityChoiceKey,
  zipCode,
}) {
  if (!MARYLAND_ZIP_REGEX.test(zipCode)) {
    throw invalidZipError("Enter a valid Maryland ZIP code.");
  }

  const utilityChoices = MARYLAND_UTILITIES.map((choice) => ({
    key: choice.key,
    rateSchedule: "Maryland residential electric",
    utilityName: choice.utilityName,
  }));
  const selectedChoice = pickChoice(utilityChoices, requestedUtilityChoiceKey, "");

  if (!requestedUtilityChoiceKey) {
    return {
      errorMessage:
        "Pick the electric utility on the customer's bill before viewing Maryland supplier rates.",
      region: "MD",
      selectionRequired: true,
      sourceLabel: "Choose your Maryland utility to load official rates",
      sourceUrl: MARYLAND_BASE_URL,
      utilityChoiceLabel: "Maryland utility company",
      utilityChoices,
      zipCode,
    };
  }

  const selectedUtility = MARYLAND_UTILITIES.find((choice) => choice.key === selectedChoice?.key);
  if (!selectedUtility) {
    throw invalidZipError("Pick a valid Maryland utility company.");
  }

  const sourceUrl = `${MARYLAND_BASE_URL}?kwh=1100&utility=${selectedUtility.utilityId}`;
  const resultsHtml = await fetchRemoteText(sourceUrl);
  return {
    region: "MD",
    resultsHtml,
    selectedUtilityChoiceKey: selectedUtility.key,
    selectionRequired: false,
    sourceLabel: `Official MD Electric Choice results for ${selectedUtility.utilityName}`,
    sourceUrl,
    utilityChoiceLabel: "Maryland utility company",
    utilityChoices,
    utilityName: selectedUtility.utilityName,
    zipCode,
  };
}

async function fetchConnecticutMarket({ zipCode }) {
  if (!isValidConnecticutZip(zipCode)) {
    throw invalidZipError("Enter a valid Connecticut ZIP code.");
  }

  const catalog = await loadConnecticutMarketCatalog();
  const sourceUrl = String(catalog?.sourceUrl ?? CONNECTICUT_STANDARD_SERVICE_URL).trim() || CONNECTICUT_STANDARD_SERVICE_URL;
  const sourceLabel = String(catalog?.sourceLabel ?? "Official Connecticut billed supplier rates").trim() || "Official Connecticut billed supplier rates";
  const refreshedAt = String(catalog?.finishedAtUtc ?? CONNECTICUT_DATA_REFRESHED_AT).trim() || CONNECTICUT_DATA_REFRESHED_AT;
  const utility = await getConnecticutUtilityMarket(zipCode);
  if (!utility) {
    throw invalidZipError("Enter a valid Connecticut ZIP code.");
  }

  if (utility.type === "municipal") {
    return {
      errorMessage:
        "This ZIP maps to a Connecticut municipal electric system or a non-choice carve-out area. EnergizeCT does not list statewide competitive supplier rates here, so check the utility on the customer's bill before comparing offers.",
      region: "CT",
      sourceLabel: "Official Connecticut utility guidance",
      sourceUrl,
      utilityName: "Connecticut municipal electric system",
      zipCode,
    };
  }

  const offers = utility.planSummaries.map((summary) => ({
    cancellationFeeText: null,
    detailsSourceUrl: utility.billedRateWorkbookUrl,
    earlyTerminationFee: 0,
    monthlyFee: 0,
    offerDetailsText: `Average billed supplier rate reported to EnergizeCT for ${utility.utilityName} residential customers in March 2026. Based on ${summary.billedCustomerCount} billed accounts and ${Math.round(summary.billedUsageKwh)} kWh. This Connecticut source does not publish a live enrollment term, monthly fee, enrollment fee, or cancellation fee for the billed-rate snapshot.`,
    offerDetailsUrl: utility.billedRateWorkbookUrl,
    planName: "",
    rateCentsPerKwh: summary.averageBilledRateCentsPerKwh,
    rateLastUpdated: utility.billedRateUpdatedText,
    rateType: "Unknown",
    renewablePercent: 0,
    scrapedAt: refreshedAt,
    signupUrl: summary.supplierWebsiteUrl,
    sourceZipCode: zipCode,
    supplierEnrollmentUrl: summary.supplierWebsiteUrl,
    supplierName: summary.supplierName,
    supplierPhone: summary.supplierPhone,
    supplierWebsiteUrl: summary.supplierWebsiteUrl,
    termMonths: 1,
  }));

  return {
    benchmarkRateCentsPerKwh: utility.standardServiceRateCentsPerKwh,
    errorMessage: null,
    offers,
    priceToCompareLastUpdated: utility.standardServiceUpdatedText,
    region: "CT",
    selectedUtilityChoiceKey: utility.key,
    selectionRequired: false,
    sourceLabel: `${sourceLabel} for ${utility.utilityName}`,
    sourceUrl: utility.billedRateWorkbookUrl,
    utilityChoices: [
      {
        key: utility.key,
        priceToCompareLastUpdated: utility.standardServiceUpdatedText,
        rateSchedule: "Connecticut residential electric",
        utilityName: utility.utilityName,
        defaultUtilityRateCentsPerKwh: utility.standardServiceRateCentsPerKwh,
      },
    ],
    utilityName: utility.utilityName,
    zipCode,
  };
}

async function fetchDistrictOfColumbiaMarket({ zipCode }) {
  if (!DISTRICT_OF_COLUMBIA_ZIP_REGEX.test(zipCode)) {
    throw invalidZipError("Enter a valid District of Columbia ZIP code.");
  }

  const [offersRoot, benchmarkContent] = await Promise.all([
    fetchRemoteJson(DISTRICT_OF_COLUMBIA_OFFERS_API_URL),
    fetchRemoteJson(DISTRICT_OF_COLUMBIA_BENCHMARK_URL),
  ]);
  const benchmark = parseDistrictOfColumbiaBenchmark(benchmarkContent);
  const offers = Array.isArray(offersRoot?.data)
    ? offersRoot.data
        .filter((item) => !item?.isCommercial && numberOrNull(item?.rateAmt) > 0)
        .map((item) => {
          const signupUrl =
            normalizeAbsoluteUrl(item?.signupUrl) ||
            normalizeAbsoluteUrl(item?.companyWebsite) ||
            "";
          const websiteUrl = normalizeAbsoluteUrl(item?.companyWebsite) || signupUrl;
          const detailsUrl = normalizeAbsoluteUrl(item?.termsOfServiceUrl) || signupUrl;
          return {
            cancellationFeeText: null,
            detailsSourceUrl: detailsUrl,
            earlyTerminationFee: 0,
            monthlyFee: 0,
            offerDetailsText: [item?.planName, item?.offerDetails].filter(Boolean).join("\n\n"),
            offerDetailsUrl: detailsUrl,
            planName: String(item?.planName ?? "").trim(),
            rateCentsPerKwh: roundToTwo(numberOrNull(item?.rateAmt) * 100),
            renewablePercent: parseWholeNumber(item?.renewablePercentage) || 0,
            signupUrl,
            supplierEnrollmentUrl: signupUrl,
            supplierName: String(item?.companyName ?? "").trim(),
            supplierPhone: String(item?.contactPhone ?? "").trim() || null,
            supplierWebsiteUrl: websiteUrl,
            termMonths: Math.max(1, parseWholeNumber(item?.termMonths) || 1),
            rateType: normalizeRateTypeLabel(item?.rateTypeName),
          };
        })
        .filter((item) => item.supplierName && item.signupUrl)
    : [];

  return {
    benchmarkMonthlyAdjustment: benchmark.monthlyAdjustment,
    benchmarkRateCentsPerKwh: benchmark.rateCentsPerKwh,
    offers,
    priceToCompareLastUpdated: benchmark.updatedText,
    region: "DC",
    selectedUtilityChoiceKey: DISTRICT_OF_COLUMBIA_UTILITY.key,
    selectionRequired: false,
    sourceLabel: `Official DC Power Connect offers for ${DISTRICT_OF_COLUMBIA_UTILITY.utilityName}`,
    sourceUrl: DISTRICT_OF_COLUMBIA_SOURCE_URL,
    utilityChoices: [DISTRICT_OF_COLUMBIA_UTILITY],
    utilityName: DISTRICT_OF_COLUMBIA_UTILITY.utilityName,
    zipCode,
  };
}

async function fetchMassachusettsMarket({
  requestedUtilityChoiceKey,
  zipCode,
}) {
  if (!MASSACHUSETTS_ZIP_REGEX.test(zipCode)) {
    throw invalidZipError("Enter a valid Massachusetts ZIP code.");
  }

  const lookup = await fetchRemoteJson(MASSACHUSETTS_UTILITY_LOOKUP_URL, {
    method: "POST",
    body: JSON.stringify({
      zipCode,
      customerClassId: 1,
    }),
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });

  if (lookup?.isInvalid) {
    throw invalidZipError("Enter a valid Massachusetts ZIP code.");
  }

  const requiresExplicitSelection =
    Boolean(lookup?.isShowTown) || Boolean(lookup?.isShowDistributionCompany);
  const rawChoices = Array.isArray(lookup?.distributionCompanies)
    ? lookup.distributionCompanies
        .map((item) => {
          const distributionCompanyId = parseWholeNumber(item?.distributionCompanyId);
          const rawCompanyName = String(item?.distributionCompanyName ?? "").trim();
          if (
            !distributionCompanyId ||
            !rawCompanyName ||
            rawCompanyName.toLowerCase() === "<select>" ||
            item?.isMunicipalElectricCompany
          ) {
            return null;
          }
          return {
            key: String(distributionCompanyId),
            distributionCompanyId,
            rawCompanyName,
            town: String(item?.town ?? "").trim() || null,
          };
        })
        .filter(Boolean)
    : [];

  if (!rawChoices.length) {
    return {
      errorMessage:
        "This Massachusetts ZIP appears to be served by a municipal light plant, so Energy Switch MA does not list competitive electric offers here.",
      region: "MA",
      sourceLabel: "Energy Switch MA",
      sourceUrl: MASSACHUSETTS_SOURCE_URL,
      zipCode,
    };
  }

  const duplicateCounts = rawChoices.reduce((counts, choice) => {
    counts[choice.rawCompanyName] = (counts[choice.rawCompanyName] || 0) + 1;
    return counts;
  }, {});
  const utilityChoices = rawChoices.map((choice) => ({
    key: choice.key,
    rateSchedule: choice.town ? `${choice.town} residential electric` : "Massachusetts residential electric",
    utilityName:
      (duplicateCounts[choice.rawCompanyName] || 0) > 1 && choice.town
        ? `${choice.rawCompanyName} (${choice.town})`
        : choice.rawCompanyName,
  }));

  const selectedChoice = rawChoices.find((choice) => choice.key === requestedUtilityChoiceKey) || null;
  if ((requiresExplicitSelection || rawChoices.length > 1) && !selectedChoice) {
    return {
      errorMessage: "Pick the utility on the customer's bill before viewing live supplier rates.",
      region: "MA",
      selectionRequired: true,
      sourceLabel: "Choose your Massachusetts utility to load live offers",
      sourceUrl: MASSACHUSETTS_SOURCE_URL,
      utilityChoiceLabel: "Massachusetts utility company",
      utilityChoices,
      zipCode,
    };
  }

  const resolvedChoice = selectedChoice || rawChoices[0];
  const compareRows = await fetchRemoteJson(MASSACHUSETTS_COMPARE_URL, {
    method: "POST",
    body: JSON.stringify({
      zipCode,
      customerClassId: 1,
      distributionCompanyId: resolvedChoice.distributionCompanyId,
      distributionCompanyTownName: requiresExplicitSelection ? resolvedChoice.rawCompanyName : null,
      town: requiresExplicitSelection ? resolvedChoice.town : null,
      monthlyUsage: 600,
    }),
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });

  return {
    compareRows: Array.isArray(compareRows) ? compareRows : [],
    region: "MA",
    selectedUtilityChoiceKey: resolvedChoice.key,
    selectionRequired: false,
    sourceLabel: `Live Energy Switch MA results for ZIP ${zipCode}`,
    sourceUrl: MASSACHUSETTS_SOURCE_URL,
    utilityChoiceLabel: "Massachusetts utility company",
    utilityChoices,
    utilityName:
      utilityChoices.find((choice) => choice.key === resolvedChoice.key)?.utilityName ||
      resolvedChoice.rawCompanyName,
    zipCode,
  };
}

async function fetchMaineMarket({
  requestedUtilityChoiceKey,
  zipCode,
}) {
  if (!MAINE_ZIP_REGEX.test(zipCode)) {
    throw invalidZipError("Enter a valid Maine ZIP code.");
  }

  const resource = await loadMaineMarketCatalog();
  const zipRecords = Object.fromEntries(
    (Array.isArray(resource?.zipRecords) ? resource.zipRecords : []).map((row) => [row.zip_code, row]),
  );
  const zipRecord = zipRecords[zipCode];
  if (!zipRecord) {
    return {
      errorMessage: "This ZIP is outside the official Maine residential electric market map.",
      region: "ME",
      sourceLabel: "Official Maine published rates",
      sourceUrl: MAINE_SOURCE_URL,
      zipCode,
    };
  }

  if (zipRecord.status === "non_service_zip") {
    return {
      errorMessage:
        Array.isArray(zipRecord.notes) && zipRecord.notes.length
          ? zipRecord.notes[0]
          : "This ZIP does not map to a Maine electric service territory. Use the service ZIP from the customer's bill.",
      region: "ME",
      sourceLabel: "Official Maine published rates",
      sourceUrl: MAINE_SOURCE_URL,
      zipCode,
    };
  }

  const orderedFamilies = Array.from(new Set(zipRecord.family_choices || []))
    .filter((key) => MAINE_UTILITY_CHOICES[key])
    .sort((left, right) => (MAINE_UTILITY_SORT_ORDER[left] ?? 99) - (MAINE_UTILITY_SORT_ORDER[right] ?? 99));
  const utilityChoices = orderedFamilies.map((key) => {
    const coverage = resource?.rateCoverage?.[key];
    const base = MAINE_UTILITY_CHOICES[key];
    return {
      key: base.key,
      priceToCompareLastUpdated: coverage?.standardOfferTerm ?? null,
      rateSchedule: base.rateSchedule,
      utilityName: base.utilityName,
      defaultUtilityRateCentsPerKwh: coverage?.standardOfferRateCentsPerKwh ?? null,
    };
  });

  if (!utilityChoices.length) {
    return {
      errorMessage: "No Maine utility districts were mapped for this ZIP yet.",
      region: "ME",
      sourceLabel: "Official Maine published rates",
      sourceUrl: MAINE_SOURCE_URL,
      zipCode,
    };
  }

  const selectedUtilityKey =
    utilityChoices.find((choice) => choice.key === requestedUtilityChoiceKey)?.key ||
    (utilityChoices.length === 1 ? utilityChoices[0].key : null) ||
    zipRecord.primary_family ||
    utilityChoices[0].key;

  if (utilityChoices.length > 1 && !requestedUtilityChoiceKey) {
    return {
      errorMessage: "Pick the utility on the customer's bill before viewing Maine published supplier rates.",
      region: "ME",
      selectionRequired: true,
      sourceLabel: "Choose the Maine utility on the bill to load published rates",
      sourceUrl: MAINE_SOURCE_URL,
      utilityChoiceLabel: "Maine utility district",
      utilityChoices,
      zipCode,
    };
  }

  const selectedChoice = utilityChoices.find((choice) => choice.key === selectedUtilityKey) || utilityChoices[0];
  const selectedCoverage = resource?.rateCoverage?.[selectedChoice.key];
  const providerLinks = selectedCoverage?.currentRateProviderLinks || {};
  const offers = Object.entries(selectedCoverage?.currentOfferPlansByProvider || {})
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([providerName, plans]) =>
      (Array.isArray(plans) ? plans : [])
        .map((offer) => {
          const rate = extractFirstDecimal(offer?.rateText);
          if (!rate) return null;
          const websiteUrl = normalizeAbsoluteUrl(providerLinks[providerName]) || MAINE_SOURCE_URL;
          let offerDetailsText = `Published term: ${offer?.termText || "Current term"}`;
          if (offer?.earlyTerminationFeeText) {
            offerDetailsText += `\nEarly termination fee: ${offer.earlyTerminationFeeText}`;
          }
          if (selectedCoverage?.coverageComplete === false) {
            offerDetailsText += "\nMaine's public rate board is a representative sample, so not every supplier on the roster publishes a current rate here.";
          }
          return {
            cancellationFeeText: offer?.earlyTerminationFeeText || null,
            detailsSourceUrl: MAINE_SOURCE_URL,
            earlyTerminationFee: parseWholeNumber(offer?.earlyTerminationFeeText) || 0,
            monthlyFee: 0,
            offerDetailsText,
            offerDetailsUrl: websiteUrl,
            planName: offer?.termText || "",
            rateCentsPerKwh: rate,
            rateLastUpdated: resource?.finishedAtUtc || null,
            rateType: "Fixed",
            renewablePercent: parseWholeNumber(offer?.rateText) || 0,
            scrapedAt: resource?.finishedAtUtc || null,
            signupUrl: websiteUrl,
            sourceZipCode: zipCode,
            supplierEnrollmentUrl: websiteUrl,
            supplierName: providerName,
            supplierWebsiteUrl: websiteUrl,
            termMonths: Math.max(1, parseWholeNumber(offer?.termText) || 1),
          };
        })
        .filter(Boolean),
    )
    .sort((left, right) => left.rateCentsPerKwh - right.rateCentsPerKwh);

  return {
    benchmarkRateCentsPerKwh: selectedCoverage?.standardOfferRateCentsPerKwh ?? null,
    errorMessage:
      !offers.length
        ? selectedCoverage?.note ||
          "No competitive residential supplier rates are currently published for this Maine utility district."
        : null,
    offers,
    priceToCompareLastUpdated: selectedCoverage?.standardOfferTerm ?? null,
    region: "ME",
    selectedUtilityChoiceKey: selectedChoice.key,
    selectionRequired: false,
    sourceLabel:
      resource?.coverageWarnings?.officialRateBoardIsRepresentativeSample === true
        ? "Official Maine published residential supplier rates (representative sample)"
        : "Official Maine published residential supplier rates",
    sourceUrl: MAINE_SOURCE_URL,
    utilityChoiceLabel: "Maine utility district",
    utilityChoices,
    utilityName: selectedChoice.utilityName,
    zipCode,
  };
}

async function fetchNewJerseyMarket({
  requestedUtilityChoiceKey,
  zipCode,
}) {
  if (!NEW_JERSEY_ZIP_REGEX.test(zipCode)) {
    throw invalidZipError("Enter a valid New Jersey ZIP code.");
  }

  const resource = await loadNewJerseyMarketCatalog();
  const utilityDirectories = NEW_JERSEY_UTILITY_ORDER.map((key) => resource?.utilities?.[key]).filter(Boolean);
  if (!utilityDirectories.length) {
    return {
      errorMessage: "New Jersey supplier directory data is not available in this build yet.",
      region: "NJ",
      sourceLabel: "Official NJ Power Switch supplier pricing links",
      sourceUrl: resource?.sourceUrl || NEW_JERSEY_SOURCE_URL,
      zipCode,
    };
  }

  const utilityChoices = utilityDirectories.map((directory) => ({
    key: directory.key,
    priceToCompareLastUpdated: directory.priceToCompareLastUpdated ?? null,
    rateSchedule: directory.rateSchedule || "Official NJ Power Switch supplier directory",
    utilityName: directory.utilityName,
    defaultUtilityRateCentsPerKwh: directory.defaultUtilityRateCentsPerKwh ?? null,
  }));
  const selectedDirectory =
    utilityDirectories.find((directory) => directory.key === requestedUtilityChoiceKey) || null;

  if (!selectedDirectory) {
    return {
      errorMessage:
        "Pick the electric utility on the customer's bill to open the correct NJ Power Switch supplier pricing links.",
      region: "NJ",
      selectionRequired: true,
      sourceLabel:
        resource?.summary?.utilityChoiceRequired === true
          ? "Official NJ Power Switch supplier links with verified public rates where available"
          : "Official NJ Power Switch supplier pricing links",
      sourceUrl: resource?.sourceUrl || NEW_JERSEY_SOURCE_URL,
      utilityChoiceLabel: "New Jersey utility company",
      utilityChoices,
      zipCode,
    };
  }

  const additionalSupplierContacts = Array.isArray(selectedDirectory.contacts) && selectedDirectory.contacts.length
    ? selectedDirectory.contacts
        .map((contact) => ({
          note: contact?.note || null,
          supplierName: contact?.supplierName || "",
          websiteUrl: normalizeAbsoluteUrl(contact?.websiteUrl) || "",
        }))
        .filter((contact) => contact.supplierName && contact.websiteUrl)
    : (Array.isArray(selectedDirectory.residentialSuppliers) ? selectedDirectory.residentialSuppliers : [])
        .map((supplier) => {
          const websiteUrl =
            normalizeAbsoluteUrl(supplier?.preferredPricingLink) ||
            normalizeAbsoluteUrl(supplier?.websiteUrl) ||
            "";
          return {
            note: supplier?.customerClasses ? `Customer classes: ${supplier.customerClasses}` : null,
            supplierName: supplier?.supplierName || "",
            websiteUrl,
          };
        })
        .filter((contact) => contact.supplierName && contact.websiteUrl);

  return {
    additionalSupplierContacts,
    benchmarkRateCentsPerKwh: selectedDirectory.defaultUtilityRateCentsPerKwh ?? null,
    errorMessage:
      !Array.isArray(selectedDirectory.plans) || !selectedDirectory.plans.length
        ? selectedDirectory.coverageNote ||
          `No comparable public rates were safely normalized for ${selectedDirectory.utilityName} yet.`
        : null,
    offers: Array.isArray(selectedDirectory.plans) ? selectedDirectory.plans : [],
    priceToCompareLastUpdated: selectedDirectory.priceToCompareLastUpdated ?? null,
    region: "NJ",
    selectedUtilityChoiceKey: selectedDirectory.key,
    selectionRequired: false,
    sourceLabel:
      resource?.summary?.utilityChoiceRequired === true
        ? "Official NJ Power Switch supplier links with verified public rates where available"
        : "Official NJ Power Switch supplier pricing links",
    sourceUrl:
      selectedDirectory.defaultUtilityRateSourceUrl ||
      selectedDirectory.utilityPriceLink ||
      selectedDirectory.utilityWebsite ||
      resource?.sourceUrl ||
      NEW_JERSEY_SOURCE_URL,
    utilityChoiceLabel: "New Jersey utility company",
    utilityChoices,
    utilityName: selectedDirectory.utilityName,
    zipCode,
  };
}

async function fetchRhodeIslandMarket({
  requestedUtilityChoiceKey,
  zipCode,
}) {
  if (!RHODE_ISLAND_ZIP_REGEX.test(zipCode)) {
    throw invalidZipError("Enter a valid Rhode Island ZIP code.");
  }

  const utilityChoices = RHODE_ISLAND_UTILITIES.map((utility) => ({
    key: utility.key,
    rateSchedule: utility.rateScheduleLabel,
    utilityName: utility.utilityName,
    utilityPhone: utility.utilityPhone,
  }));
  const selectedUtility = RHODE_ISLAND_UTILITIES.find((utility) => utility.key === requestedUtilityChoiceKey) || null;

  if (!selectedUtility) {
    return {
      errorMessage:
        "Pick the electric utility on the customer's bill before loading Rhode Island supplier rates. Only Rhode Island Energy participates in competitive supply.",
      region: "RI",
      selectionRequired: true,
      sourceLabel: "Choose the Rhode Island utility on the bill",
      sourceUrl: RHODE_ISLAND_RATE_CARD_URL,
      utilityChoiceLabel: "Rhode Island utility company",
      utilityChoices,
      zipCode,
    };
  }

  if (!selectedUtility.participatesInCompetitiveSupply) {
    return {
      errorMessage: `${selectedUtility.utilityName} does not participate in Rhode Island competitive electric supply. Official RIPUC guidance says only Rhode Island Energy customers can choose a competitive supplier.`,
      region: "RI",
      selectedUtilityChoiceKey: selectedUtility.key,
      selectionRequired: false,
      sourceLabel: "Official RIPUC competitive supply guidance",
      sourceUrl: RHODE_ISLAND_COMPETITIVE_INFO_URL,
      utilityChoiceLabel: "Rhode Island utility company",
      utilityChoices,
      utilityName: selectedUtility.utilityName,
      zipCode,
    };
  }

  return {
    rateCardHtml: await fetchRemoteText(RHODE_ISLAND_RATE_CARD_URL),
    region: "RI",
    selectedUtilityChoiceKey: selectedUtility.key,
    selectionRequired: false,
    sourceLabel: `Official Empower RI offers for ${selectedUtility.utilityName}`,
    sourceUrl: RHODE_ISLAND_RATE_CARD_URL,
    utilityChoiceLabel: "Rhode Island utility company",
    utilityChoices,
    utilityName: selectedUtility.utilityName,
    zipCode,
  };
}

async function fetchIllinoisMarket({
  requestedUtilityChoiceKey,
  zipCode,
}) {
  if (!ILLINOIS_ZIP_REGEX.test(zipCode)) {
    throw invalidZipError("Enter a valid Illinois ZIP code.");
  }

  const utilityChoices = ILLINOIS_SERVICE_AREAS.map((area) => ({
    key: area.key,
    rateSchedule: area.rateScheduleLabel,
    utilityName: area.utilityName,
    utilityPhone: area.utilityPhone || null,
  }));
  const selectedArea = ILLINOIS_SERVICE_AREAS.find((area) => area.key === requestedUtilityChoiceKey) || null;
  if (!selectedArea) {
    return {
      errorMessage:
        "Pick the Illinois utility service area on the customer's bill before viewing supplier rates.",
      region: "IL",
      selectionRequired: true,
      sourceLabel: "Choose your Illinois utility service area to load official offers",
      sourceUrl: ILLINOIS_SOURCE_URL,
      utilityChoiceLabel: "Illinois utility service area",
      utilityChoices,
      zipCode,
    };
  }

  const sourceUrl = `${ILLINOIS_BASE_URL}/Offers?said=${selectedArea.said}`;
  return {
    region: "IL",
    resultsHtml: await fetchRemoteText(sourceUrl),
    selectedUtilityChoiceKey: selectedArea.key,
    selectionRequired: false,
    sourceLabel: `Official Plug In Illinois offers for ${selectedArea.utilityName}`,
    sourceUrl,
    utilityChoiceLabel: "Illinois utility service area",
    utilityChoices,
    utilityName: selectedArea.utilityName,
    zipCode,
  };
}

async function fetchNewYorkMarket({
  requestedUtilityChoiceKey,
  zipCode,
}) {
  if (!NEW_YORK_ZIP_REGEX.test(zipCode)) {
    throw invalidZipError("Enter a valid New York ZIP code.");
  }

  const resource = await loadNewYorkMarketCatalog();
  const zipRecord = Array.isArray(resource?.zipRecords)
    ? resource.zipRecords.find((row) => row.zip_code === zipCode)
    : null;
  if (!zipRecord) {
    return {
      errorMessage: "This ZIP is outside the bundled New York electric market map.",
      region: "NY",
      sourceLabel: "Official New York utility benchmarks",
      sourceUrl: resource?.sourceUrl || NEW_YORK_SOURCE_URL,
      zipCode,
    };
  }

  const utilityChoices = Array.from(new Set(zipRecord.choice_keys || []))
    .map((key) => resource?.utilities?.[key])
    .filter(Boolean)
    .map((utility) => ({
      key: utility.key,
      priceToCompareLastUpdated: utility.priceToCompareLastUpdated ?? null,
      rateSchedule: utility.rateSchedule || "New York residential electric",
      utilityName: utility.utilityName,
      utilityPhone: utility.utilityPhone || null,
      defaultUtilityRateCentsPerKwh: utility.defaultUtilityRateCentsPerKwh ?? null,
    }));

  if (!utilityChoices.length) {
    return {
      errorMessage: "No New York utility benchmark choices were mapped for this ZIP yet.",
      region: "NY",
      sourceLabel: "Official New York utility benchmarks",
      sourceUrl: resource?.sourceUrl || NEW_YORK_SOURCE_URL,
      zipCode,
    };
  }

  const selectedChoiceKey =
    utilityChoices.find((choice) => choice.key === requestedUtilityChoiceKey)?.key ||
    (utilityChoices.length === 1 ? utilityChoices[0].key : null) ||
    zipRecord.primary_choice ||
    utilityChoices[0].key;

  if (utilityChoices.length > 1 && !requestedUtilityChoiceKey) {
    return {
      errorMessage:
        "Pick the electric utility or load zone shown on the customer's New York bill before comparing against the official utility benchmark.",
      region: "NY",
      selectionRequired: true,
      sourceLabel: "Choose the New York utility or load zone on the bill",
      sourceUrl: resource?.sourceUrl || NEW_YORK_SOURCE_URL,
      utilityChoiceLabel: "New York utility or load zone",
      utilityChoices,
      zipCode,
    };
  }

  const selectedRawUtility = resource?.utilities?.[selectedChoiceKey];
  const additionalSupplierContacts = Array.isArray(selectedRawUtility?.supplierContacts)
    ? selectedRawUtility.supplierContacts
        .map((contact) => ({
          note: contact?.note || null,
          supplierName: contact?.supplierName || "",
          websiteUrl: normalizeAbsoluteUrl(contact?.websiteUrl) || "",
        }))
        .filter((contact) => contact.supplierName && contact.websiteUrl)
    : [];

  let errorMessage;
  if (selectedChoiceKey === "municipal-or-other") {
    errorMessage =
      (Array.isArray(zipRecord.notes) && zipRecord.notes[0]) ||
      selectedRawUtility?.coverageNote ||
      "This ZIP may be served by a municipal or other non-statewide utility territory. Use the utility listed on the bill and compare against the customer's actual current rate.";
  } else if (zipRecord.status === "manual_review") {
    errorMessage =
      (Array.isArray(zipRecord.notes) && zipRecord.notes[0]) ||
      selectedRawUtility?.coverageNote ||
      "Use the utility or load zone on the customer's bill before comparing against the utility benchmark.";
  } else if (additionalSupplierContacts.length) {
    errorMessage = `New York's public offer board is offline right now, so this view is showing the official utility benchmark plus the live NY DPS supplier directory for ${selectedRawUtility.utilityName}.`;
  } else {
    errorMessage =
      selectedRawUtility?.coverageNote ||
      "New York's public Power to Choose offer board is offline right now, so this screen is using the official utility benchmark for comparison.";
  }

  return {
    additionalSupplierContacts,
    benchmarkRateCentsPerKwh: selectedRawUtility?.defaultUtilityRateCentsPerKwh ?? null,
    errorMessage,
    offers: [],
    priceToCompareLastUpdated: selectedRawUtility?.priceToCompareLastUpdated ?? null,
    region: "NY",
    selectedUtilityChoiceKey: selectedChoiceKey,
    selectionRequired: false,
    sourceLabel:
      resource?.summary?.offerBoardOffline === true
        ? "Official New York utility benchmark plus DPS supplier directory while Power to Choose is offline"
        : "Official New York utility benchmarks",
    sourceUrl:
      selectedRawUtility?.defaultUtilityRateSourceUrl ||
      selectedRawUtility?.utilityWebsite ||
      resource?.sourceUrl ||
      NEW_YORK_SOURCE_URL,
    utilityChoiceLabel: "New York utility or load zone",
    utilityChoices,
    utilityName: selectedRawUtility?.utilityName || "New York electric utility",
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

function invalidZipError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

async function fetchRemoteText(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "user-agent": WEBSITE_USER_AGENT,
      accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = new Error(`Market request failed with HTTP ${response.status}.`);
    error.status = 502;
    throw error;
  }

  return response.text();
}

async function fetchRemoteJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "user-agent": WEBSITE_USER_AGENT,
      accept: "application/json,text/plain;q=0.9,*/*;q=0.8",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = new Error(`Market request failed with HTTP ${response.status}.`);
    error.status = 502;
    throw error;
  }

  return response.json();
}

function parseDistrictOfColumbiaBenchmark(contentRoot) {
  const sections = Array.isArray(contentRoot?.contents) ? contentRoot.contents : [];
  for (const section of sections) {
    if (!String(section?.title ?? "").toLowerCase().includes("price to compare")) continue;
    const html = (Array.isArray(section?.contents) ? section.contents : [])
      .map((item) => String(item?.richTextContent?.html ?? "").trim())
      .filter(Boolean)
      .join("\n");
    const effectiveText =
      html.match(/Effective[^A-Za-z0-9]*([^<\n]+)/i)?.[1]?.trim() ||
      DISTRICT_OF_COLUMBIA_FALLBACK_BENCHMARK.updatedText;
    const rateText = html.match(/Rate Schedule R[^$]*\$(\d+\.\d+)/i)?.[1];
    if (rateText) {
      return {
        monthlyAdjustment: 0,
        rateCentsPerKwh: roundToTwo(Number(rateText) * 100),
        updatedText: effectiveText,
      };
    }
  }
  return DISTRICT_OF_COLUMBIA_FALLBACK_BENCHMARK;
}

function normalizeAbsoluteUrl(rawValue) {
  const trimmed = String(rawValue ?? "")
    .trim()
    .replace(/^["'(<[\s]+|["')>\],.\s]+$/g, "");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

function normalizeRateTypeLabel(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized.includes("fixed")) return "Fixed";
  if (normalized.includes("variable")) return "Variable";
  return String(value ?? "").trim() || "Unknown";
}

function extractFirstDecimal(value) {
  const match = String(value ?? "").match(/(\d+(?:\.\d{1,4})?)/);
  return match ? Number(match[1]) : null;
}

const WEBSITE_USER_AGENT = "ChooseMyElectricWebsite/1.0";
const MARYLAND_BASE_URL = "https://www.mdelectricchoice.com/shop/";
const MASSACHUSETTS_SOURCE_URL = "https://energyswitchma.gov/";
const MASSACHUSETTS_UTILITY_LOOKUP_URL = "https://energyswitchma.gov/consumers/distributioncompaniesbyzipcode";
const MASSACHUSETTS_COMPARE_URL = "https://energyswitchma.gov/consumers/compare";
const MAINE_SOURCE_URL = "https://www.maine.gov/meopa/electricity/electricity-supply";
const NEW_JERSEY_SOURCE_URL = "https://www.nj.gov/njpowerswitch/suppliers/electric/";
const NEW_YORK_SOURCE_URL = "https://dps.ny.gov/how-shop-utility-services";
const RHODE_ISLAND_RATE_CARD_URL = "https://www.ri.gov/app/dpuc/empowerri/rate_card";
const RHODE_ISLAND_COMPETITIVE_INFO_URL = "https://ripuc.ri.gov/utility-information/electric/competitive-energy-suppliers-qa-and-updates";
const ILLINOIS_BASE_URL = "https://icc.illinois.gov/plugin";
const ILLINOIS_SOURCE_URL = "https://plugin.illinois.gov/your-available-choices/offers-begin.html";
const CONNECTICUT_STANDARD_SERVICE_URL =
  "https://www.energizect.com/rate-board-residential-standard-service-generation-rates";
const CONNECTICUT_DATA_REFRESHED_AT = "2026-04-28T00:00:00Z";
const DISTRICT_OF_COLUMBIA_SOURCE_URL = "https://search.dcpowerconnect.com/search-offers";
const DISTRICT_OF_COLUMBIA_OFFERS_API_URL =
  "https://edocket.dcpsc.org/apis/api/retail-choice/offers?isCommercial=false&isRetail=true&renewablePercentMin=0&renewablePercentMax=100&contractLengthMin=0&contractLengthMax=60&rateMin=0&rateMax=100&pageNumber=1&itemsPerPage=250&sortBy=1&sortAscending=true&returnTotalCount=true";
const DISTRICT_OF_COLUMBIA_BENCHMARK_URL =
  "https://eudapi.pepco.com/content-api/api/content/products/other/pages?url=/my-account/my-service/customer-choice-dc/price-to-compare&environment=live";
const DISTRICT_OF_COLUMBIA_UTILITY = {
  key: "pepco-dc",
  rateSchedule: "District of Columbia residential electric",
  utilityName: "Pepco",
  utilityPhone: "202-833-7500",
};
const DISTRICT_OF_COLUMBIA_FALLBACK_BENCHMARK = {
  monthlyAdjustment: 0,
  rateCentsPerKwh: 14.53,
  updatedText: "Pepco Standard Offer Service benchmark",
};

const MARYLAND_ZIP_REGEX = /^(?:206|207|208|209|210|211|212|214|215|216|217|218|219)\d{2}$/;
const MASSACHUSETTS_ZIP_REGEX = /^(?:0(?:1\d{3}|2[0-7]\d{2}|55\d{2}))$/;
const MAINE_ZIP_REGEX = /^(?:039\d{2}|04\d{3})$/;
const NEW_JERSEY_ZIP_REGEX = /^0[78]\d{3}$/;
const RHODE_ISLAND_ZIP_REGEX = /^(?:028|029)\d{2}$/;
const ILLINOIS_ZIP_REGEX = /^6\d{4}$/;
const NEW_YORK_ZIP_REGEX = /^(?:005(?:01|44)|06390|1\d{4})$/;
const DISTRICT_OF_COLUMBIA_ZIP_REGEX = /^(?:200|202|203|204|205)\d{2}$/;

const MARYLAND_UTILITIES = [
  { key: "bge", utilityId: 292, utilityName: "BGE" },
  { key: "choptank", utilityId: 692, utilityName: "Choptank Electric Cooperative" },
  { key: "delmarva", utilityId: 693, utilityName: "Delmarva Power" },
  { key: "pepco", utilityId: 694, utilityName: "Pepco" },
  { key: "potomac-edison", utilityId: 695, utilityName: "Potomac Edison" },
  { key: "smeco", utilityId: 696, utilityName: "SMECO" },
];

const MAINE_UTILITY_SORT_ORDER = { cmp: 0, bhe: 1, mps: 2 };
const MAINE_UTILITY_CHOICES = {
  cmp: { key: "cmp", utilityName: "Central Maine Power (CMP)", rateSchedule: "CMP residential standard offer" },
  bhe: { key: "bhe", utilityName: "Versant Power - Bangor Hydro District", rateSchedule: "Versant Bangor Hydro residential standard offer" },
  mps: { key: "mps", utilityName: "Versant Power - Maine Public District", rateSchedule: "Versant Maine Public residential supply" },
};

const NEW_JERSEY_UTILITY_ORDER = ["ace", "jcpl", "pseg", "reco"];

const RHODE_ISLAND_UTILITIES = [
  { key: "ri-energy", utilityName: "Rhode Island Energy", rateScheduleLabel: "Rhode Island Energy residential standard offer", utilityPhone: "1-800-322-3223", participatesInCompetitiveSupply: true },
  { key: "clear-river", utilityName: "Clear River Electric and Water District (Pascoag)", rateScheduleLabel: "Clear River / Pascoag residential electric service", utilityPhone: "401-568-6222", participatesInCompetitiveSupply: false },
  { key: "block-island", utilityName: "Block Island Utility District", rateScheduleLabel: "Block Island residential electric service", utilityPhone: "401-466-5851", participatesInCompetitiveSupply: false },
];

const ILLINOIS_SERVICE_AREAS = [
  { key: "comed", said: 1, utilityName: "ComEd", rateScheduleLabel: "ComEd residential price to compare", utilityPhone: "1-800-EDISON1" },
  { key: "ameren-zone-1", said: 2, utilityName: "Ameren Illinois Rate Zone I", rateScheduleLabel: "Ameren Illinois Rate Zone I residential price to compare", utilityPhone: "1-800-755-5000" },
  { key: "ameren-zone-2", said: 3, utilityName: "Ameren Illinois Rate Zone II", rateScheduleLabel: "Ameren Illinois Rate Zone II residential price to compare", utilityPhone: "1-800-755-5000" },
  { key: "ameren-zone-3", said: 4, utilityName: "Ameren Illinois Rate Zone III", rateScheduleLabel: "Ameren Illinois Rate Zone III residential price to compare", utilityPhone: "1-800-755-5000" },
  { key: "midamerican", said: 5, utilityName: "MidAmerican", rateScheduleLabel: "MidAmerican residential service area", utilityPhone: null },
];
