const communitySolarState = {
  zipCode: "",
  region: null,
};

const communitySolarElements = {};

const COMMUNITY_SOLAR_ZIP3_RANGES = {
  CA: [[900, 961]],
  CO: [[800, 816]],
  CT: [[60, 69]],
  DC: [[200, 205], [569, 569]],
  DE: [[197, 199]],
  FL: [[320, 349]],
  GA: [[300, 319], [398, 399]],
  HI: [[967, 968]],
  IL: [[600, 629]],
  MA: [[10, 27], [55, 55]],
  MD: [[206, 219]],
  ME: [[39, 49]],
  MN: [[550, 567]],
  NC: [[270, 289]],
  NJ: [[70, 89]],
  NM: [[870, 884]],
  NY: [[100, 149]],
  OH: [[430, 459]],
  OR: [[970, 979]],
  PA: [[150, 196]],
  RI: [[28, 29]],
  SC: [[290, 299]],
  TX: [[750, 799], [885, 885]],
  VA: [[201, 201], [220, 249]],
  WA: [[980, 994]],
  WI: [[530, 549]],
};

const COMMUNITY_SOLAR_STATE_LABELS = {
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DC: "District of Columbia",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  IL: "Illinois",
  MA: "Massachusetts",
  MD: "Maryland",
  ME: "Maine",
  MN: "Minnesota",
  NC: "North Carolina",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  OH: "Ohio",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  TX: "Texas",
  VA: "Virginia",
  WA: "Washington",
  WI: "Wisconsin",
};

const COMMUNITY_SOLAR_STATE_GUIDES = {
  CT: "/connecticut-electric-rates",
  DC: "/district-of-columbia-electric-rates",
  IL: "/illinois-electric-rates",
  MA: "/massachusetts-electric-rates",
  MD: "/maryland-electric-rates",
  ME: "/maine-electric-rates",
  NJ: "/new-jersey-electric-rates",
  NY: "/new-york-electric-rates",
  OH: "/ohio-electric-rates",
  PA: "/pennsylvania-electric-rates",
  RI: "/rhode-island-electric-rates",
  TX: "/texas-electricity-plans",
};

const COMMUNITY_SOLAR_STATE_COPY = {
  CA: "California community solar is highly utility- and address-specific, so treat every program as a utility-administered path that still needs an eligibility check.",
  CO: "Colorado community solar is mostly utility-specific. Check the utility name first, then review share availability and bill-credit terms carefully.",
  CT: "Connecticut shared clean energy facilities can work well, but eligibility still depends on utility rules, program structure, and project availability.",
  DC: "District community solar is Pepco-area specific, so availability still depends on your utility account and the project’s enrollment capacity.",
  DE: "Delaware community solar is tied to Delmarva Power and project capacity, so the next step is always confirming the live program terms.",
  FL: "Florida coverage is utility-run right now. Review the live bill-credit math carefully because one utility program is savings-oriented and another may depend more on longer-term credits.",
  GA: "Georgia coverage is currently the income-qualified Georgia Power path, not a broad statewide savings program. Check income rules and current capacity before applying.",
  HI: "Hawaii community-based renewable energy is utility- and island-specific, so live availability can change by island, project, and subscriber category.",
  IL: "Illinois community solar can be strong, but live availability still depends on utility territory, project capacity, and the vendor’s current enrollment page.",
  MA: "Massachusetts shared solar availability still depends on utility, project capacity, and contract terms, even when the state finder is strong.",
  MD: "Maryland has one of the better official public project lists, but customers should still confirm utility area, open status, and contract details before enrolling.",
  ME: "Maine community solar often uses utility bill credits with a separate provider bill. Review both sides of that math before signing up.",
  MN: "Minnesota community solar is strongest in Xcel territory and still depends on which subscriber organization is actively taking new customers.",
  NC: "North Carolina coverage here is currently a utility-run path, not a broad statewide market, so project economics and eligibility need a close look.",
  NJ: "New Jersey community solar can be very strong, but availability still depends on utility area, project capacity, and the contract shown in the state finder.",
  NM: "New Mexico community solar is utility-specific today, so the right next step is picking the utility program that actually matches your account.",
  NY: "New York has one of the strongest community-solar maps, but real savings still depend on utility territory, project capacity, billing method, and cancellation terms.",
  OH: "We do not have a clean official community-solar program path loaded for Ohio yet, so compare electric supply rates and review local utility options carefully.",
  OR: "Oregon’s project finder is useful, but the real question is whether a project is still accepting participants in your utility area right now.",
  PA: "Pennsylvania does not currently have the same clean statewide no-switch community-solar path we show in the stronger program states here.",
  RI: "Rhode Island’s marketplace is a good starting point, but the customer still needs to confirm live utility matching and project contract terms.",
  SC: "South Carolina coverage here is utility-specific, so treat it as a utility program with changing share availability, not a universal statewide marketplace.",
  TX: "Texas community solar can look different from deregulated supplier shopping, and we do not show a clean statewide no-switch utility-bill-credit path here yet.",
  VA: "Virginia shared solar is utility-specific and can involve waitlists or capacity limits, so check live enrollment status before assuming it is open.",
  WA: "Washington community solar is strongest through utility-run offerings, so live share availability matters more than a generic statewide message.",
  WI: "Wisconsin shared solar can be useful, but customers should review the subscription calculator carefully because the value is not marketed like a guaranteed discount.",
};

const COMMUNITY_SOLAR_PROGRAMS_BY_STATE = {
  CA: [
    {
      title: "California Community Solar Green Tariff",
      description: "Official California utility-administered community solar green tariff program for eligible households in participating utility and community-choice territories.",
      label: "Open California program",
      url: "https://www.cpuc.ca.gov/industries-and-topics/electrical-energy/demand-side-management/community-solar-in-california",
      utilities: "PG&E, SCE, SDG&E, and participating CCAs",
      savings: "20% bill discount for eligible households",
      note: "Address and disadvantaged-community eligibility rules still matter.",
    },
  ],
  CO: [
    {
      title: "Xcel Colorado Solar Program Portal",
      description: "Official Xcel Energy Colorado solar program portal for current utility program details, registration guidance, and community-solar-related participation information.",
      label: "Open Xcel solar portal",
      url: "https://www.xcelenergy.com/staticfiles/xe/solarregistration.htm",
      utilities: "Xcel Energy",
      note: "Xcel program details can move around, so this utility portal is the safest live starting point.",
    },
    {
      title: "Black Hills Community Solar Garden",
      description: "Official Black Hills utility-run community solar garden option for customers who want utility-account bill treatment.",
      label: "Open Black Hills program",
      url: "https://www.blackhillsenergy.com/services/community-solar-garden",
      utilities: "Black Hills Energy",
      note: "Utility-specific program with changing share availability.",
    },
  ],
  CT: [
    {
      title: "Connecticut Shared Clean Energy Facilities",
      description: "Official Connecticut shared clean energy facilities program information for Eversource and United Illuminating customers.",
      label: "Open Connecticut program",
      url: "https://portal.ct.gov/deep/energy/shared-clean-energy-facilities/shared-clean-energy-facilities",
      utilities: "Eversource and United Illuminating",
      note: "Eligibility and project rules can vary.",
    },
  ],
  DC: [
    {
      title: "District Community Solar",
      description: "Official District community solar guidance and Pepco-area enrollment support through Front Door.",
      label: "Open DC community solar",
      url: "https://frontdoor.dc.gov/community-solar",
      utilities: "Pepco",
      note: "District and utility-area rules apply.",
    },
  ],
  DE: [
    {
      title: "Delaware Community Solar",
      description: "Official Delaware PSC community solar guidance for Delmarva Power customers using utility-bill credits.",
      label: "Open Delaware program",
      url: "https://depsc.delaware.gov/consumer-information",
      utilities: "Delmarva Power",
      note: "Project and contract terms can vary by offering.",
    },
  ],
  FL: [
    {
      title: "FPL SolarTogether",
      description: "Official FPL community solar subscription program with subscription charges and bill credits on the FPL bill.",
      label: "Open FPL SolarTogether",
      url: "https://www.fpl.com/energy-my-way/solar/solartogether.html",
      utilities: "Florida Power & Light",
      note: "Credits are designed to grow over time, so review the live sample-bill math carefully.",
    },
    {
      title: "Duke Energy Florida Clean Energy Connection",
      description: "Official Duke Energy Florida solar subscription program described as community-solar style bill savings on the utility account.",
      label: "Open Duke Florida program",
      url: "https://www.duke-energy.com/home/products/clean-energy-connection",
      utilities: "Duke Energy Florida",
      note: "Utility-specific Florida program.",
    },
  ],
  GA: [
    {
      title: "Georgia Income-Qualified Community Solar",
      description: "Official Georgia Power income-qualified path with a reduced monthly subscription and bill credits on the utility bill.",
      label: "Open Georgia income-qualified solar",
      url: "https://www.georgiapower.com/residential/solutions/solar/community-solar/income-qualified.html",
      utilities: "Georgia Power",
      note: "Income-qualified only and subject to current capacity.",
    },
  ],
  HI: [
    {
      title: "Hawaii Community-Based Renewable Energy Guide",
      description: "Official Hawaii community-based renewable energy guidance for off-site renewable subscriptions with utility-bill-credit treatment.",
      label: "Open Hawaii guide",
      url: "https://energy.hawaii.gov/community-based-renewable-energy/",
      utilities: "Hawaiian Electric, Maui Electric, Hawaii Electric Light",
      note: "Island-specific rules and availability apply.",
    },
  ],
  IL: [
    {
      title: "Illinois Shines Community Solar Sources",
      description: "Official Illinois Shines vendor and disclosure resources for community solar subscriptions with bill credits.",
      label: "Open Illinois sources",
      url: "https://illinoisshines.com/find-an-av-designee-or-subcontractor-demo/",
      utilities: "ComEd, Ameren Illinois, MidAmerican",
      note: "Vendor availability still needs live confirmation.",
    },
  ],
  MA: [
    {
      title: "Massachusetts Community Solar Finder",
      description: "Official MassCEC and Go Clean Massachusetts finder path for community solar projects in Massachusetts utility areas.",
      label: "Open Massachusetts finder",
      url: "https://goclean.masscec.com/dev_articles/how-to-find-a-community-solar-project-in-massachusetts/",
      utilities: "Eversource, National Grid, Unitil",
      savings: "About 5%-20% typical savings",
      note: "Not every legacy project appears in one place.",
    },
  ],
  MD: [
    {
      title: "Maryland Community Solar Project List",
      description: "Official Maryland project list with utility territory, subscriber-management organization, and subscription management status.",
      label: "Open Maryland project list",
      url: "https://energy.maryland.gov/Pages/MarylandCommunitySolar.aspx",
      utilities: "BGE, Pepco, Potomac Edison, Delmarva Power",
      note: "One of the strongest public open-status sources.",
    },
  ],
  ME: [
    {
      title: "Maine Community Solar Guide",
      description: "Official Maine Office of Public Advocate guidance for CMP and Versant customers considering community solar subscriptions.",
      label: "Open Maine guide",
      url: "https://www.maine.gov/meopa/electricity/renewable-energy/community_solar",
      utilities: "CMP and Versant Power",
      savings: "About 10%-15% typical savings",
      note: "Often uses utility bill credits plus a separate provider bill.",
    },
  ],
  MN: [
    {
      title: "Minnesota Community Solar Guide",
      description: "Official Minnesota consumer guidance for Xcel community solar gardens, bill credits, and how to find current subscriber organizations.",
      label: "Open Minnesota solar guide",
      url: "https://mn.gov/commerce/energy/consumer/energy-programs/community-solar-gardens.jsp",
      utilities: "Xcel Energy",
      note: "Xcel-area program with subscriber-organization variability and utility-specific enrollment details.",
    },
  ],
  NC: [
    {
      title: "GUC Community Solar",
      description: "Official Greenville Utilities Commission community solar program for active electric customers who want bill credits without rooftop panels.",
      label: "Open GUC community solar",
      url: "https://www.guc.com/electric/community-solar-program",
      utilities: "Greenville Utilities Commission",
      note: "Municipal utility-only path. Review fees versus credits carefully.",
    },
  ],
  NJ: [
    {
      title: "NJ Community Solar Project Finder",
      description: "Official New Jersey Clean Energy and NJBPU finder for registered community solar projects and contract-level savings details.",
      label: "Open NJ project finder",
      url: "https://cleanenergy.nj.gov/support/solar/project-finder",
      utilities: "Atlantic City Electric, JCP&L, PSE&G, Rockland Electric",
      savings: "About 15%-25% typical savings",
      note: "Project details can still change after the finder updates.",
    },
  ],
  NM: [
    {
      title: "PNM Community Solar",
      description: "Official PNM community solar program information for customers who want bill credits without rooftop panels or supplier switching.",
      label: "Open PNM program",
      url: "https://www.pnm.com/community-solar-rates",
      utilities: "PNM",
      note: "Utility-specific New Mexico path.",
    },
    {
      title: "El Paso Electric Community Solar",
      description: "Official El Paso Electric community solar enrollment flow for customers who want utility-bill-credit participation without changing electric supplier.",
      label: "Open El Paso Electric program",
      url: "https://www.epelectric.com/communitysolar",
      utilities: "El Paso Electric",
      note: "Utility-specific New Mexico path.",
    },
  ],
  NY: [
    {
      title: "NYSERDA Community Solar Map",
      description: "Official NYSERDA community solar map for utility-territory, ZIP-code, and project-availability research.",
      label: "Open NYSERDA map",
      url: "https://www.nyserda.ny.gov/All-Programs/NY%20Sun/Community-Solar/Community-Solar-Map",
      utilities: "Con Edison, National Grid, NYSEG, RG&E, Central Hudson, O&R, PSEG Long Island",
      savings: "About 5%-20% typical savings",
      note: "Billing method and cancellation terms still vary by provider.",
    },
  ],
  OR: [
    {
      title: "Oregon Community Solar Project Finder",
      description: "Official Oregon community solar finder with utility, county, and accepting-participants filters.",
      label: "Open Oregon project finder",
      url: "https://www.oregoncsp.org/projectfinder",
      utilities: "Portland General Electric, Pacific Power, Idaho Power",
      note: "Best next step is checking whether a project is still accepting participants.",
    },
  ],
  RI: [
    {
      title: "Rhode Island Community Solar Guide",
      description: "Official Rhode Island energy-office guidance for joining a community solar project and receiving utility bill credits or discounts.",
      label: "Open Rhode Island guide",
      url: "https://energy.ri.gov/renewable-energy/solar/community-solar",
      utilities: "Rhode Island Energy",
      savings: "About 10%-15% typical savings",
      note: "Utility matching and contract terms still matter.",
    },
  ],
  SC: [
    {
      title: "South Carolina Community Solar",
      description: "Official Dominion Energy South Carolina community solar program for customers who want a no-rooftop utility-bill-credit path.",
      label: "Open South Carolina program",
      url: "https://www.dominionenergy.com/south-carolina/save-energy/solar-for-your-home?tab=1",
      utilities: "Dominion Energy South Carolina",
      note: "Utility-specific with changing share availability.",
    },
  ],
  VA: [
    {
      title: "Virginia Shared Solar",
      description: "Official Dominion Energy Virginia shared solar program for utility-bill credits without supplier switching or rooftop panels.",
      label: "Open Virginia shared solar",
      url: "https://www.dominionenergy.com/virginia/renewable-energy-programs/shared-solar-program",
      utilities: "Dominion Energy Virginia",
      note: "Waitlists or capacity limits can apply.",
    },
  ],
  WA: [
    {
      title: "Washington PSE Community Solar",
      description: "Official Puget Sound Energy community solar program for money back on the electric bill without supplier switching.",
      label: "Open PSE community solar",
      url: "https://www.pse.com/en/green-options/Renewable-Energy-Programs/Community-Solar",
      utilities: "Puget Sound Energy",
      note: "Share availability can change quickly.",
    },
  ],
  WI: [
    {
      title: "Wisconsin MGE Shared Solar",
      description: "Official Madison Gas and Electric shared solar program for customers who want utility-bill treatment instead of rooftop panels.",
      label: "Open MGE shared solar",
      url: "https://www.mge.com/smart-energy/clean-energy/renewable-energy-programs/shared-solar",
      utilities: "Madison Gas and Electric",
      note: "Review the calculator carefully because the program is not marketed as a guaranteed discount.",
    },
  ],
};

document.addEventListener("DOMContentLoaded", () => {
  cacheCommunitySolarElements();
  if (!communitySolarElements.form) return;

  renderSupportedStates();
  bindCommunitySolarEvents();
  restoreCommunitySolarQuery();
});

function cacheCommunitySolarElements() {
  communitySolarElements.form = document.getElementById("community-solar-form");
  communitySolarElements.zipCode = document.getElementById("community-solar-zip");
  communitySolarElements.status = document.getElementById("community-solar-status");
  communitySolarElements.result = document.getElementById("community-solar-result");
  communitySolarElements.resultKicker = document.getElementById("community-solar-result-kicker");
  communitySolarElements.resultTitle = document.getElementById("community-solar-result-title");
  communitySolarElements.resultBody = document.getElementById("community-solar-result-body");
  communitySolarElements.stateCopy = document.getElementById("community-solar-state-copy");
  communitySolarElements.stateCopyText = document.getElementById("community-solar-state-copy-text");
  communitySolarElements.primaryLink = document.getElementById("community-solar-result-primary");
  communitySolarElements.secondaryLink = document.getElementById("community-solar-result-secondary");
  communitySolarElements.programList = document.getElementById("community-solar-program-list");
  communitySolarElements.supportedStates = document.getElementById("community-solar-supported-states");
  communitySolarElements.faqItems = Array.from(document.querySelectorAll(".faq-item"));
}

function bindCommunitySolarEvents() {
  communitySolarElements.zipCode?.addEventListener("input", () => {
    communitySolarElements.zipCode.value = normalizeCommunitySolarZip(communitySolarElements.zipCode.value);
    communitySolarElements.zipCode.setCustomValidity("");
  });

  communitySolarElements.form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const normalizedZip = normalizeCommunitySolarZip(communitySolarElements.zipCode?.value || "");
    communitySolarState.zipCode = normalizedZip;
    communitySolarState.region = detectCommunitySolarRegion(normalizedZip);

    if (communitySolarElements.zipCode) {
      communitySolarElements.zipCode.value = normalizedZip;
    }

    if (normalizedZip.length !== 5) {
      communitySolarElements.zipCode?.setCustomValidity("Enter a 5-digit ZIP code.");
      communitySolarElements.zipCode?.reportValidity();
      renderCommunitySolarStatus("Enter a 5-digit ZIP code to continue.", "error");
      hideCommunitySolarResult();
      return;
    }

    trackCommunitySolarEvent("community_solar_zip_search", {
      zip_code_prefix: normalizedZip.slice(0, 3),
      region: communitySolarState.region || "unsupported",
    });

    renderCommunitySolarOutcome();
  });

  document.querySelectorAll("[data-community-solar-cta]").forEach((node) => {
    node.addEventListener("click", () => {
      trackCommunitySolarEvent("community_solar_cta_click", {
        location: node.getAttribute("data-community-solar-cta") || "unknown",
      });
    });
  });

  document.querySelectorAll("[data-community-solar-compare-link]").forEach((node) => {
    node.addEventListener("click", () => {
      trackCommunitySolarEvent("community_solar_compare_rates_click", {
        location: node.getAttribute("data-community-solar-compare-link") || "unknown",
      });
    });
  });

  communitySolarElements.faqItems.forEach((item, index) => {
    item.addEventListener("toggle", () => {
      if (!item.open) return;
      const summary = item.querySelector("summary");
      trackCommunitySolarEvent("community_solar_faq_open", {
        faq_index: index + 1,
        question: summary ? summary.textContent.trim() : `faq_${index + 1}`,
      });
    });
  });
}

function restoreCommunitySolarQuery() {
  const query = new URLSearchParams(window.location.search);
  const zipCode = normalizeCommunitySolarZip(query.get("zip") || "");
  if (!zipCode) return;

  communitySolarState.zipCode = zipCode;
  communitySolarState.region = detectCommunitySolarRegion(zipCode);
  if (communitySolarElements.zipCode) {
    communitySolarElements.zipCode.value = zipCode;
  }
  renderCommunitySolarOutcome();
}

function renderSupportedStates() {
  if (!communitySolarElements.supportedStates) return;
  const states = Object.keys(COMMUNITY_SOLAR_PROGRAMS_BY_STATE)
    .sort((left, right) => COMMUNITY_SOLAR_STATE_LABELS[left].localeCompare(COMMUNITY_SOLAR_STATE_LABELS[right]));
  communitySolarElements.supportedStates.innerHTML = states
    .map((stateCode) => `<span class="solar-supported-chip">${escapeHtml(COMMUNITY_SOLAR_STATE_LABELS[stateCode])}</span>`)
    .join("");
}

function normalizeCommunitySolarZip(value) {
  if (typeof normalizeZip === "function") {
    return normalizeZip(value);
  }
  return String(value ?? "").replace(/\D/g, "").slice(0, 5);
}

function detectCommunitySolarRegion(zipCode) {
  const zip = normalizeCommunitySolarZip(zipCode);
  if (!zip) return null;
  if (zip === "00501" || zip === "00544" || zip === "06390") return "NY";
  if (zip.startsWith("733") || zipInCommunitySolarRanges(zip, COMMUNITY_SOLAR_ZIP3_RANGES.TX)) return "TX";
  for (const [stateCode, ranges] of Object.entries(COMMUNITY_SOLAR_ZIP3_RANGES)) {
    if (stateCode === "TX") continue;
    if (zipInCommunitySolarRanges(zip, ranges)) return stateCode;
  }
  return null;
}

function zipInCommunitySolarRanges(zipCode, ranges) {
  const prefix = Number.parseInt(String(zipCode || "").slice(0, 3), 10);
  if (!Number.isInteger(prefix) || !Array.isArray(ranges)) return false;
  return ranges.some(([start, end]) => prefix >= start && prefix <= end);
}

function renderCommunitySolarOutcome() {
  const region = communitySolarState.region;
  const zipCode = communitySolarState.zipCode;

  if (!region) {
    renderCommunitySolarStatus(
      "We’re still expanding official community solar coverage. If your state is not listed yet, compare electric rates where available and check back as we add more utility and state-backed programs.",
      "warning",
    );
    renderCommunitySolarResult({
      kicker: "Coverage update",
      title: "We do not have official program coverage for this ZIP yet",
      body: "Community solar availability changes by utility area and project capacity. We would rather say that clearly than show a fake project list.",
      stateCopy: "",
      primaryHref: "/compare-electric-rates-by-zip",
      primaryLabel: "Compare Electric Rates",
      secondaryHref: "#how-community-solar-works",
      secondaryLabel: "Learn How Community Solar Works",
      tone: "empty",
      programs: [],
    });
    trackCommunitySolarEvent("community_solar_empty_state_shown", {
      region: "unsupported",
      zip_code_prefix: zipCode.slice(0, 3),
    });
    return;
  }

  const stateLabel = COMMUNITY_SOLAR_STATE_LABELS[region] || region;
  const stateCopy = COMMUNITY_SOLAR_STATE_COPY[region] || "";
  const programs = COMMUNITY_SOLAR_PROGRAMS_BY_STATE[region] || [];
  const stateGuide = COMMUNITY_SOLAR_STATE_GUIDES[region] || "/compare-electric-rates-by-zip";
  const hasGuide = Boolean(COMMUNITY_SOLAR_STATE_GUIDES[region]);

  if (programs.length) {
    const primaryProgram = programs[0];
    renderCommunitySolarStatus(
      `We found ${programs.length} official community solar or bill-credit program ${programs.length === 1 ? "path" : "paths"} for ${stateLabel}. Availability still depends on utility territory, open capacity, and contract terms.`,
      "success",
    );
    renderCommunitySolarResult({
      kicker: `${stateLabel} solar lookup`,
      title: programs.length === 1 ? "Official community solar path found" : `${programs.length} official solar paths found`,
      body: "These are official utility or state-backed places to start. Review billing method, cancellation terms, and current enrollment status before you sign up.",
      stateCopy,
      primaryHref: primaryProgram.url,
      primaryLabel: primaryProgram.label,
      secondaryHref: hasGuide ? stateGuide : "/compare-electric-rates-by-zip",
      secondaryLabel: hasGuide ? `View ${stateLabel} electric guide` : "Compare Electric Rates",
      tone: "available",
      programs,
    });
    trackCommunitySolarEvent("community_solar_program_state_shown", {
      region,
      zip_code_prefix: zipCode.slice(0, 3),
      program_count: programs.length,
    });
    return;
  }

  renderCommunitySolarStatus(
    `We do not have a clean official community-solar program path loaded for ${stateLabel} yet. Compare electric rates where available and review local utility options carefully.`,
    "warning",
  );
  renderCommunitySolarResult({
    kicker: `${stateLabel} lookup`,
    title: "No official community solar program loaded yet",
    body: "That does not always mean nothing exists. It means we do not have a clean enough state or utility-backed path here to show it as a recommendation yet.",
    stateCopy,
    primaryHref: hasGuide ? stateGuide : "/compare-electric-rates-by-zip",
    primaryLabel: hasGuide ? `View ${stateLabel} electric guide` : "Compare Electric Rates",
    secondaryHref: "#how-community-solar-works",
    secondaryLabel: "Learn How Community Solar Works",
    tone: "empty",
    programs: [],
  });
  trackCommunitySolarEvent("community_solar_empty_state_shown", {
    region,
    zip_code_prefix: zipCode.slice(0, 3),
  });
}

function renderCommunitySolarStatus(message, tone = "info") {
  if (!communitySolarElements.status) return;
  communitySolarElements.status.textContent = message;
  communitySolarElements.status.dataset.tone = tone;
}

function renderCommunitySolarResult({
  kicker,
  title,
  body,
  stateCopy,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  tone,
  programs = [],
}) {
  if (!communitySolarElements.result) return;

  communitySolarElements.result.hidden = false;
  communitySolarElements.result.dataset.resultTone = tone;
  communitySolarElements.resultKicker.textContent = kicker;
  communitySolarElements.resultTitle.textContent = title;
  communitySolarElements.resultBody.textContent = body;

  if (stateCopy) {
    communitySolarElements.stateCopy.hidden = false;
    communitySolarElements.stateCopyText.textContent = stateCopy;
  } else {
    communitySolarElements.stateCopy.hidden = true;
    communitySolarElements.stateCopyText.textContent = "";
  }

  renderCommunitySolarPrograms(programs);

  communitySolarElements.primaryLink.href = primaryHref;
  communitySolarElements.primaryLink.textContent = primaryLabel;
  communitySolarElements.secondaryLink.href = secondaryHref;
  communitySolarElements.secondaryLink.textContent = secondaryLabel;
}

function renderCommunitySolarPrograms(programs) {
  if (!communitySolarElements.programList) return;
  if (!Array.isArray(programs) || !programs.length) {
    communitySolarElements.programList.hidden = true;
    communitySolarElements.programList.innerHTML = "";
    return;
  }

  communitySolarElements.programList.hidden = false;
  communitySolarElements.programList.innerHTML = programs.map(renderCommunitySolarProgramCard).join("");
}

function renderCommunitySolarProgramCard(program) {
  const chips = [
    program.utilities ? `<span class="solar-program-chip">${escapeHtml(program.utilities)}</span>` : "",
    program.savings ? `<span class="solar-program-chip solar-program-chip-accent">${escapeHtml(program.savings)}</span>` : "",
  ].filter(Boolean).join("");

  return `
    <article class="solar-program-card">
      <p class="solar-card-kicker">Official program</p>
      <h4>${escapeHtml(program.title)}</h4>
      <p>${escapeHtml(program.description)}</p>
      ${chips ? `<div class="solar-program-meta">${chips}</div>` : ""}
      ${program.note ? `<p class="solar-program-note">${escapeHtml(program.note)}</p>` : ""}
      <div class="solar-program-actions">
        <a class="button button-primary" href="${escapeAttribute(program.url)}" target="_blank" rel="noreferrer">${escapeHtml(program.label)}</a>
      </div>
    </article>
  `;
}

function hideCommunitySolarResult() {
  if (!communitySolarElements.result) return;
  communitySolarElements.result.hidden = true;
  renderCommunitySolarPrograms([]);
}

function trackCommunitySolarEvent(name, params = {}) {
  if (typeof window.gtag === "function") {
    window.gtag("event", name, params);
  }

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({
      event: name,
      ...params,
    });
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
