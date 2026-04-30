import { readFile } from "node:fs/promises";

const DATA_BASE_URL = new URL("./data/", import.meta.url);

const catalogCache = new Map();

export async function loadMaineMarketCatalog() {
  return loadCatalog("maine_market_snapshot.json");
}

export async function loadNewJerseyMarketCatalog() {
  return loadCatalog("new_jersey_market_snapshot.json");
}

export async function loadNewYorkMarketCatalog() {
  return loadCatalog("new_york_market_snapshot.json");
}

export function getConnecticutUtilityMarket(zipCode) {
  const normalizedZip = normalizeFiveDigitZip(zipCode);
  if (!CONNECTICUT_VALID_ZIPS.has(normalizedZip)) return null;
  if (CONNECTICUT_MUNICIPAL_ZIPS.has(normalizedZip)) {
    return {
      type: "municipal",
    };
  }
  return CONNECTICUT_UI_ZIPS.has(normalizedZip)
    ? CONNECTICUT_UNITED_ILLUMINATING
    : CONNECTICUT_EVERSOURCE;
}

export function isValidConnecticutZip(zipCode) {
  return CONNECTICUT_VALID_ZIPS.has(normalizeFiveDigitZip(zipCode));
}

function normalizeFiveDigitZip(zipCode) {
  return String(zipCode ?? "").replace(/\D/g, "").slice(0, 5);
}

async function loadCatalog(fileName) {
  if (catalogCache.has(fileName)) {
    return catalogCache.get(fileName);
  }

  const raw = await readFile(new URL(fileName, DATA_BASE_URL), "utf8");
  const parsed = JSON.parse(raw);
  catalogCache.set(fileName, parsed);
  return parsed;
}

function createConnecticutUtility({
  key,
  standardServiceRateCentsPerKwh,
  standardServiceUpdatedText,
  billedRateUpdatedText,
  billedRateWorkbookUrl,
  planSummaries,
  utilityName,
}) {
  return {
    billedRateUpdatedText,
    billedRateWorkbookUrl,
    key,
    planSummaries,
    standardServiceRateCentsPerKwh,
    standardServiceUpdatedText,
    utilityName,
  };
}

const CONNECTICUT_EVERSOURCE = createConnecticutUtility({
  key: "ct-eversource",
  utilityName: "Eversource Energy",
  standardServiceRateCentsPerKwh: 12.641,
  standardServiceUpdatedText: "Jan-Jun 2026 standard service",
  billedRateUpdatedText: "March 2026 billed rate board",
  billedRateWorkbookUrl:
    "https://www.energizect.com/sites/default/files/documents/Supplier%20Billed%20Rates%20-%20March%20ER.xlsx",
  planSummaries: [
    { supplierName: "Constellation New Energy", averageBilledRateCentsPerKwh: 11.7493, billedCustomerCount: 68764, billedUsageKwh: 56751658.6, supplierWebsiteUrl: "https://connecticut.constellationnewenergy.com", supplierPhone: "866-237-7693" },
    { supplierName: "Direct Energy", averageBilledRateCentsPerKwh: 12.8755, billedCustomerCount: 33255, billedUsageKwh: 27996848.3, supplierWebsiteUrl: "https://www.directenergy.com/ct", supplierPhone: "(888) 548-7540" },
    { supplierName: "Energy Plus", averageBilledRateCentsPerKwh: 8.0818, billedCustomerCount: 22, billedUsageKwh: 23433.0, supplierWebsiteUrl: "https://www.energypluscompany.com", supplierPhone: "888-766-3509" },
    { supplierName: "Major Energy", averageBilledRateCentsPerKwh: 13.2613, billedCustomerCount: 4732, billedUsageKwh: 4117118.0, supplierWebsiteUrl: "https://majorenergy.com", supplierPhone: "(888) 625-6760" },
    { supplierName: "North American Power & Gas", averageBilledRateCentsPerKwh: 17.4863, billedCustomerCount: 2013, billedUsageKwh: 1327754.1, supplierWebsiteUrl: "https://www.napower.com", supplierPhone: "888-313-9086" },
    { supplierName: "Think Energy", averageBilledRateCentsPerKwh: 12.8417, billedCustomerCount: 15603, billedUsageKwh: 13651809.5, supplierWebsiteUrl: "https://www.mythinkenergy.com", supplierPhone: "(713) 636-0000" },
    { supplierName: "Town Square Energy", averageBilledRateCentsPerKwh: 13.4304, billedCustomerCount: 28651, billedUsageKwh: 25962309.0, supplierWebsiteUrl: "https://www.townsquareenergy.com", supplierPhone: "(877) 430-0093" },
    { supplierName: "XOOM Energy", averageBilledRateCentsPerKwh: 13.3916, billedCustomerCount: 4264, billedUsageKwh: 3243510.6, supplierWebsiteUrl: "https://www.xoomenergy.com", supplierPhone: "(877) 815-1531" },
  ],
});

const CONNECTICUT_UNITED_ILLUMINATING = createConnecticutUtility({
  key: "ct-ui",
  utilityName: "United Illuminating",
  standardServiceRateCentsPerKwh: 13.096,
  standardServiceUpdatedText: "Jan-Jun 2026 standard service",
  billedRateUpdatedText: "March 2026 billed rate board",
  billedRateWorkbookUrl:
    "https://www.energizect.com/sites/default/files/documents/March%202026%20UR.xlsx",
  planSummaries: [
    { supplierName: "Constellation New Energy", averageBilledRateCentsPerKwh: 12.6138, billedCustomerCount: 15515, billedUsageKwh: 9609581.0, supplierWebsiteUrl: "https://connecticut.constellationnewenergy.com", supplierPhone: "866-237-7693" },
    { supplierName: "Direct Energy", averageBilledRateCentsPerKwh: 13.2215, billedCustomerCount: 7150, billedUsageKwh: 4438064.0, supplierWebsiteUrl: "https://www.directenergy.com/ct", supplierPhone: "(888) 548-7540" },
    { supplierName: "Energy Plus", averageBilledRateCentsPerKwh: 8.3191, billedCustomerCount: 2, billedUsageKwh: 575.0, supplierWebsiteUrl: "https://www.energypluscompany.com", supplierPhone: "888-766-3509" },
    { supplierName: "Major Energy", averageBilledRateCentsPerKwh: 13.2095, billedCustomerCount: 2727, billedUsageKwh: 1812066.0, supplierWebsiteUrl: "https://majorenergy.com", supplierPhone: "(888) 625-6760" },
    { supplierName: "North American Power & Gas", averageBilledRateCentsPerKwh: 16.7272, billedCustomerCount: 859, billedUsageKwh: 434295.0, supplierWebsiteUrl: "https://www.napower.com", supplierPhone: "888-313-9086" },
    { supplierName: "Think Energy", averageBilledRateCentsPerKwh: 12.8865, billedCustomerCount: 5320, billedUsageKwh: 3594602.0, supplierWebsiteUrl: "https://www.mythinkenergy.com", supplierPhone: "(713) 636-0000" },
    { supplierName: "Town Square Energy", averageBilledRateCentsPerKwh: 13.1948, billedCustomerCount: 9996, billedUsageKwh: 6793578.0, supplierWebsiteUrl: "https://www.townsquareenergy.com", supplierPhone: "(877) 430-0093" },
    { supplierName: "XOOM Energy", averageBilledRateCentsPerKwh: 13.3839, billedCustomerCount: 2916, billedUsageKwh: 1579153.0, supplierWebsiteUrl: "https://www.xoomenergy.com", supplierPhone: "(877) 815-1531" },
  ],
});

const CONNECTICUT_VALID_ZIPS = new Set(
  `
06001 06002 06010 06013 06016 06018 06019 06020 06021 06022 06023 06024 06026 06027 06029 06031
06032 06033 06035 06037 06039 06040 06042 06043 06051 06052 06053 06057 06058 06059 06060 06061
06062 06063 06065 06066 06067 06068 06069 06070 06071 06072 06073 06074 06076 06078 06079 06080
06081 06082 06084 06085 06088 06089 06090 06091 06092 06093 06095 06096 06098 06103 06105 06106
06107 06108 06109 06110 06111 06112 06114 06117 06118 06119 06120 06226 06231 06232 06234 06235
06237 06238 06239 06241 06242 06243 06247 06248 06249 06250 06254 06255 06256 06258 06259 06260
06262 06263 06264 06266 06268 06269 06277 06278 06279 06280 06281 06282 06320 06330 06331 06332
06333 06334 06335 06336 06338 06339 06340 06350 06351 06353 06354 06355 06357 06359 06360 06365
06370 06371 06373 06374 06375 06376 06377 06378 06379 06380 06382 06384 06385 06387 06389 06401
06403 06405 06409 06410 06412 06413 06414 06415 06416 06417 06418 06419 06420 06422 06423 06424
06426 06437 06438 06439 06441 06442 06443 06444 06447 06450 06451 06455 06456 06457 06459 06460
06461 06467 06468 06469 06470 06471 06472 06473 06475 06477 06478 06479 06480 06481 06482 06483
06484 06488 06489 06492 06498 06510 06511 06512 06513 06514 06515 06516 06517 06518 06519 06524
06525 06604 06605 06606 06607 06608 06610 06611 06612 06614 06615 06702 06704 06705 06706 06708
06710 06712 06716 06750 06751 06752 06753 06754 06755 06756 06757 06758 06759 06762 06763 06770
06776 06777 06778 06779 06782 06783 06784 06785 06786 06787 06790 06791 06793 06794 06795 06796
06798 06801 06804 06807 06810 06811 06812 06820 06824 06825 06830 06831 06840 06850 06851 06853
06854 06855 06870 06877 06878 06880 06883 06890 06896 06897 06901 06902 06903 06905 06906 06907
`
    .trim()
    .split(/\s+/),
);

const CONNECTICUT_UI_ZIPS = new Set(
  `
06401 06418 06460 06461 06471 06472 06473 06477 06484 06510 06511 06512 06513 06514 06515 06516
06517 06518 06519 06525 06604 06605 06606 06607 06608 06610 06611 06612 06614 06615 06824 06825
06890
`
    .trim()
    .split(/\s+/),
);

const CONNECTICUT_MUNICIPAL_ZIPS = new Set([
  "06334",
  "06336",
  "06340",
  "06351",
  "06355",
  "06360",
  "06380",
  "06389",
  "06492",
  "06854",
  "06855",
]);
