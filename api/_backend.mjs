const DEFAULT_APP_ID = "com.choosemyelectric.web";
const DEFAULT_BILL_MODEL = "gpt-4o-mini";

const ZIP3_RANGES = {
  CT: [[60, 69]],
  DC: [[200, 205], [569, 569]],
  IL: [[600, 629]],
  MA: [[10, 27], [55, 55]],
  MD: [[206, 219]],
  ME: [[39, 49]],
  NJ: [[70, 89]],
  OH: [[430, 459]],
  PA: [[150, 196]],
  RI: [[28, 29]],
  TX: [[750, 799], [885, 885]],
  NY: [[100, 149]],
};

export function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

export function normalizeZip(zipCode) {
  const digits = String(zipCode ?? "").replace(/\D/g, "").slice(0, 5);
  return digits.length === 5 ? digits : "";
}

export function detectRegion(zipCode, commodity = "electric") {
  const normalizedZip = normalizeZip(zipCode);
  if (!normalizedZip) return null;
  if (normalizedZip === "00501" || normalizedZip === "00544" || normalizedZip === "06390") return "NY";
  if (normalizedZip.startsWith("733") || zipInRanges(normalizedZip, ZIP3_RANGES.TX)) return "TX";
  if (zipInRanges(normalizedZip, ZIP3_RANGES.OH)) {
    return commodity === "gas" ? "OH_G" : "OH_E";
  }
  if (zipInRanges(normalizedZip, ZIP3_RANGES.MD)) return "MD";
  if (zipInRanges(normalizedZip, ZIP3_RANGES.NY)) return "NY";
  if (zipInRanges(normalizedZip, ZIP3_RANGES.CT)) return "CT";
  if (zipInRanges(normalizedZip, ZIP3_RANGES.DC)) return "DC";
  if (zipInRanges(normalizedZip, ZIP3_RANGES.MA)) return "MA";
  if (zipInRanges(normalizedZip, ZIP3_RANGES.ME)) return "ME";
  if (zipInRanges(normalizedZip, ZIP3_RANGES.NJ)) return "NJ";
  if (zipInRanges(normalizedZip, ZIP3_RANGES.RI)) return "RI";
  if (zipInRanges(normalizedZip, ZIP3_RANGES.IL)) return "IL";
  if (zipInRanges(normalizedZip, ZIP3_RANGES.PA)) return "PA";
  return null;
}

function zipInRanges(zipCode, ranges) {
  const prefix = Number.parseInt(String(zipCode ?? "").slice(0, 3), 10);
  if (!Number.isInteger(prefix)) return false;
  return ranges.some(([start, end]) => prefix >= start && prefix <= end);
}

export function regionUsageUnit(region) {
  return region === "OH_G" ? "Ccf" : "kWh";
}

export function regionPromptDescriptor(region) {
  switch (region) {
    case "TX":
      return "Texas electricity bill";
    case "OH_E":
      return "Ohio electricity bill";
    case "OH_G":
      return "Ohio natural gas bill";
    case "MD":
      return "Maryland electric bill";
    case "CT":
      return "Connecticut electric bill";
    case "DC":
      return "District of Columbia electric bill";
    case "MA":
      return "Massachusetts electric bill";
    case "ME":
      return "Maine electric bill";
    case "NJ":
      return "New Jersey electric bill";
    case "RI":
      return "Rhode Island electric bill";
    case "IL":
      return "Illinois electric bill";
    case "NY":
      return "New York electric bill";
    case "PA":
    default:
      return "Pennsylvania utility bill";
  }
}

export function getBackendConfig() {
  const baseUrl = String(
    process.env.CHOOSE_BACKEND_URL ||
      process.env.BILL_SCAN_BACKEND_URL ||
      "",
  ).trim().replace(/\/+$/, "");
  const token = String(
    process.env.CHOOSE_BACKEND_TOKEN ||
      process.env.BILL_SCAN_BACKEND_TOKEN ||
      "",
  ).trim();
  const appId = String(process.env.CHOOSE_WEB_APP_ID || DEFAULT_APP_ID).trim() || DEFAULT_APP_ID;
  const billModel = String(process.env.CHOOSE_OPENAI_BILL_MODEL || DEFAULT_BILL_MODEL).trim() || DEFAULT_BILL_MODEL;

  if (!baseUrl || !token) {
    throw new Error(
      "Missing backend configuration. Set CHOOSE_BACKEND_URL and CHOOSE_BACKEND_TOKEN in Vercel.",
    );
  }

  return {
    appId,
    baseUrl,
    billModel,
    token,
  };
}

export async function backendJson(path, { body, headers = {}, method = "POST" } = {}) {
  const response = await backendRequest(path, { body, headers, method });
  const raw = await response.text();
  const parsed = raw ? safeJsonParse(raw) : null;

  if (!response.ok) {
    const message =
      parsed?.error ||
      parsed?.message ||
      `Backend request failed with HTTP ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = parsed;
    throw error;
  }

  return parsed ?? {};
}

export async function backendText(path, { body, headers = {}, method = "POST" } = {}) {
  const response = await backendRequest(path, { body, headers, method });
  const raw = await response.text();

  if (!response.ok) {
    const parsed = safeJsonParse(raw);
    const message =
      parsed?.error ||
      parsed?.message ||
      `Backend request failed with HTTP ${response.status}.`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = parsed;
    throw error;
  }

  return raw;
}

export async function bootstrapCustomerSession({
  appVersion = "website",
  deviceId,
  installId,
  platform = "web",
}) {
  return backendJson("/credits/bootstrap", {
    body: {
      appVersion,
      deviceId,
      installId,
      platform,
    },
  });
}

export async function scanBillViaBackend({
  customerId,
  customerToken,
  documentName,
  images,
  mimeType,
  region,
}) {
  const { appId, billModel } = getBackendConfig();
  const usageUnit = regionUsageUnit(region);
  const promptDescriptor = regionPromptDescriptor(region);

  const requestBody = {
    model: billModel,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: buildBillPrompt({
              documentName,
              mimeType,
              promptDescriptor,
              usageUnit,
            }),
          },
          ...images.map((imageUrl) => ({
            type: "input_image",
            image_url: imageUrl,
            detail: "high",
          })),
        ],
      },
    ],
    text: {
      format: {
        type: "json_object",
      },
    },
  };

  return backendJson("/openai/responses", {
    body: requestBody,
    headers: {
      "x-choosemyelectric-app-id": appId,
      "x-choosemyelectric-customer-id": customerId,
      "x-choosemyelectric-customer-token": customerToken,
    },
  });
}

async function backendRequest(path, { body, headers = {}, method = "POST" } = {}) {
  const { baseUrl, token } = getBackendConfig();
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const hasBody = body !== undefined && body !== null;
  const requestHeaders = {
    "x-choosemyelectric-token": token,
    ...headers,
  };
  const requestInit = {
    method,
    headers: requestHeaders,
  };

  if (hasBody) {
    requestHeaders["content-type"] = "application/json; charset=utf-8";
    requestInit.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  return fetch(url, requestInit);
}

function buildBillPrompt({ documentName, mimeType, promptDescriptor, usageUnit }) {
  return `
Extract structured utility bill data from this ${promptDescriptor}.
Never guess silently. If a field is uncertain, return null.
Return JSON only that matches the schema.
Normalize per-${usageUnit} rates into dollars per ${usageUnit}, not cents.
Preserve account numbers as strings.
Include value, confidence, source_text, source_page, and normalization_notes for each field.
Respond with a single JSON object only.
Use this top-level shape exactly:
{
  "parse_status": "success" | "partial" | "failed",
  "utility_detected": string | null,
  "review_required": boolean,
  "missing_fields": string[],
  "validation_notes": [{"severity": string, "message": string, "fieldKey": string | null}],
  "fields": {
    "customer_name": field,
    "service_address_line_1": field,
    "service_address_line_2": field,
    "service_city": field,
    "service_state": field,
    "service_zip": field,
    "mailing_address_full": field,
    "utility_name": field,
    "account_number": field,
    "meter_number": field,
    "rate_class": field,
    "bill_date": field,
    "billing_period_start": field,
    "billing_period_end": field,
    "days_billed": field,
    "current_supplier_name": field,
    "current_supplier_rate_per_kwh": field,
    "utility_price_to_compare_per_kwh": field,
    "supply_charges": field,
    "delivery_charges": field,
    "total_amount_due": field,
    "autopay_date": field,
    "usage_kwh_current_period": field,
    "annual_usage_kwh": field,
    "avg_monthly_kwh": field
  }
}
Each "field" object must be:
{"value": string|null, "confidence": number|null, "source_text": string|null, "source_page": integer|null, "normalization_notes": string|null}
Focus especially on customer_name, account_number, full service address, mailing address, utility_name, current supplier name, supplier rate, price to compare, annual usage, average monthly usage, current-period usage in ${usageUnit}, and rate class.
If the service address includes a second line, unit, lot, building, or apartment detail, place that in service_address_line_2 instead of dropping it.
Do not use the utility company's remittance or payment mailing address as the customer's mailing address.
If a separate customer mailing address is not shown, set mailing_address_full to the same address as the service address.
Look carefully at the usage section, billing summary, and any usage history chart or table before leaving usage fields null.
Look carefully at the supply section, supplier section, generation or energy charges section, delivery charges section, and any benchmark or price comparison section before leaving current_supplier_rate_per_kwh or utility_price_to_compare_per_kwh null.
For current_supplier_rate_per_kwh, return the per-${usageUnit} supply rate, not the dollar supply charge amount.
If annual usage is shown as a 12-month total, capture it in annual_usage_kwh.
If average monthly usage is directly shown, capture that exact value. Only calculate avg_monthly_kwh from annual usage if the bill does not show it directly, and explain that in normalization_notes.
File hint: ${documentName ?? ""} ${mimeType ?? ""}
`.trim();
}

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
