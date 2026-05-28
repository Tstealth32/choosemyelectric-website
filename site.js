const chooseSiteConfig = {
  appLandingUrl: "/app",
  iosAppUrl: "https://apps.apple.com/us/app/choose-my-electric/id6762017797",
  iosAppDeepLink: "itms-apps://apps.apple.com/us/app/choose-my-electric/id6762017797",
  androidAppUrl: "https://play.google.com/store/apps/details?id=com.choosemyelectric.app&pcampaignid=web_share",
  androidAppDeepLink: "market://details?id=com.choosemyelectric.app",
  androidComingSoonLabel: "Android Coming April 2026",
  contactEmail: "contact@choosemyelectric.com",
};

const stateGuidePathMap = {
  "/connecticut-electric-rates": "Connecticut",
  "/district-of-columbia-electric-rates": "District of Columbia",
  "/illinois-electric-rates": "Illinois",
  "/maine-electric-rates": "Maine",
  "/maryland-electric-rates": "Maryland",
  "/massachusetts-electric-rates": "Massachusetts",
  "/new-jersey-electric-rates": "New Jersey",
  "/new-york-electric-rates": "New York",
  "/ohio-electric-rates": "Ohio",
  "/pennsylvania-electric-rates": "Pennsylvania",
  "/rhode-island-electric-rates": "Rhode Island",
  "/texas-electricity-plans": "Texas",
};

function normalizedPathname() {
  const rawPath = window.location.pathname || "/";
  if (!rawPath) return "/";

  const htmlNormalized = rawPath
    .replace(/\/index\.html$/i, "/")
    .replace(/\.html$/i, "");

  return htmlNormalized || "/";
}

function routeMatches(pathname, route) {
  return pathname === route || pathname.endsWith(route);
}

function inferredStateNameFromPath(pathname) {
  return Object.entries(stateGuidePathMap).find(([route]) => routeMatches(pathname, route))?.[1] || "";
}

function isAndroidDevice() {
  return /Android/i.test(window.navigator.userAgent || "");
}

function isAppleMobileDevice() {
  const userAgent = window.navigator.userAgent || "";
  const platform = window.navigator.platform || "";
  const maxTouchPoints = window.navigator.maxTouchPoints || 0;

  return /iPhone|iPad|iPod/i.test(userAgent) || (/Mac/i.test(platform) && maxTouchPoints > 1);
}

function isTikTokInAppBrowser() {
  return /TikTok|musical_ly/i.test(window.navigator.userAgent || "");
}

function detectAppStorePlatform() {
  if (isAppleMobileDevice()) return "ios";
  if (isAndroidDevice()) return "android";
  return "desktop";
}

function getAppStoreDestination(platform) {
  if (platform === "ios") {
    return {
      platform,
      label: "iPhone or iPad",
      primaryUrl: chooseSiteConfig.iosAppDeepLink,
      fallbackUrl: chooseSiteConfig.iosAppUrl,
      autoRedirectUrl: chooseSiteConfig.iosAppUrl,
      storeLabel: "Apple App Store",
      helperText: "Opening the Apple App Store for Choose My Electric.",
    };
  }

  if (platform === "android") {
    return {
      platform,
      label: "Android",
      primaryUrl: chooseSiteConfig.androidAppDeepLink,
      fallbackUrl: chooseSiteConfig.androidAppUrl,
      autoRedirectUrl: chooseSiteConfig.androidAppUrl,
      storeLabel: "Google Play Store",
      helperText: "Opening Google Play for Choose My Electric.",
    };
  }

  return {
    platform,
    label: "desktop or unsupported device",
    primaryUrl: "",
    fallbackUrl: "",
    autoRedirectUrl: "",
    storeLabel: "app store",
    helperText: "Choose your store below to open the app listing.",
  };
}

function normalizeZip(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 5);
}

function inferPageTypeFromPath() {
  const path = normalizedPathname();
  if (path === "/" || path.endsWith("/index")) return "home";
  if (routeMatches(path, "/estimate") || routeMatches(path, "/compare-electric-rates-by-zip")) return "estimate";
  if (routeMatches(path, "/upload-your-bill-to-compare-rates")) return "upload-bill";
  if (routeMatches(path, "/rate-expiration-alerts")) return "rate-alerts";
  if (routeMatches(path, "/blog")) return "blog-index";
  if (path.includes("/blog/")) return "blog-article";
  if (inferredStateNameFromPath(path)) return "state-guide";
  return "";
}

function currentPageType() {
  return document.body?.dataset?.pageType || inferPageTypeFromPath();
}

function currentStateName() {
  if (document.body?.dataset?.stateName) {
    return document.body.dataset.stateName;
  }

  const inferred = inferredStateNameFromPath(normalizedPathname());
  if (inferred) return inferred;

  const heading = document.querySelector(".content-hero h1");
  if (!heading) return "";
  const match = heading.textContent.match(/(?:in|for)\s+([A-Za-z\s]+?)(?:\s+\(|$)/);
  return match?.[1]?.trim() || "";
}

function trackSiteEvent(name, params = {}) {
  if (!name) return;

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

function configureStoreLink(platform, fallbackSubject) {
  const elements = document.querySelectorAll(`[data-store-link="${platform}"]`);
  const configuredUrl = platform === "ios" ? chooseSiteConfig.iosAppUrl : chooseSiteConfig.androidAppUrl;
  const hasLiveUrl = typeof configuredUrl === "string" && configuredUrl.trim().length > 0;
  const fallbackUrl = `mailto:${chooseSiteConfig.contactEmail}?subject=${encodeURIComponent(fallbackSubject)}`;
  const isAndroidComingSoon = platform === "android" && !hasLiveUrl && chooseSiteConfig.androidComingSoonLabel.trim().length > 0;

  elements.forEach((element) => {
    if (hasLiveUrl) {
      element.href = configuredUrl;
      element.removeAttribute("aria-disabled");
      element.removeAttribute("tabindex");
      element.removeAttribute("data-link-mode");
      return;
    }

    if (isAndroidComingSoon) {
      element.removeAttribute("href");
      element.setAttribute("aria-disabled", "true");
      element.setAttribute("tabindex", "-1");
      element.setAttribute("data-link-mode", "coming-soon");
      element.textContent = chooseSiteConfig.androidComingSoonLabel;
    } else {
      element.href = fallbackUrl;
      element.setAttribute("data-link-mode", "fallback");
    }
  });

  return hasLiveUrl;
}

function configureAppDownloadLinks() {
  document.querySelectorAll("[data-app-download-link]").forEach((element) => {
    element.setAttribute("href", chooseSiteConfig.appLandingUrl);
  });
}

function createStoreLinkElement(platform, templateLink) {
  const link = document.createElement("a");
  if (templateLink.className) {
    link.className = templateLink.className;
  }
  link.setAttribute("data-store-link", platform);
  link.href = platform === "ios" ? chooseSiteConfig.iosAppUrl : chooseSiteConfig.androidAppUrl;
  link.textContent = platform === "ios" ? "Apple App Store" : "Google Play Store";
  return link;
}

function addAndroidButtonsToStoreOnlyRows() {
  if (!chooseSiteConfig.androidAppUrl.trim()) return;

  const rows = document.querySelectorAll(".cta-row");
  rows.forEach((row) => {
    const buttonLinks = Array.from(row.querySelectorAll("a.button"));
    if (!buttonLinks.length) return;

    const hasAndroidButton = buttonLinks.some((link) => link.getAttribute("data-store-link") === "android");
    if (hasAndroidButton) return;

    const nonStoreButtons = buttonLinks.filter((link) => !link.hasAttribute("data-store-link"));
    if (nonStoreButtons.length > 0) return;

    const iosButton = buttonLinks.find((link) => link.getAttribute("data-store-link") === "ios");
    if (!iosButton) return;

    const androidButton = document.createElement("a");
    androidButton.className = iosButton.classList.contains("button-primary")
      ? "button button-secondary"
      : "button button-primary";
    androidButton.setAttribute("data-store-link", "android");
    androidButton.href = chooseSiteConfig.androidAppUrl;
    androidButton.textContent = "Google Play Store";

    row.appendChild(androidButton);
  });
}

function addMissingAndroidLinksNearIosLinks() {
  if (!chooseSiteConfig.androidAppUrl.trim()) return;

  const processedParents = new Set();
  const iosLinks = document.querySelectorAll('[data-store-link="ios"]');
  iosLinks.forEach((iosLink) => {
    const parent = iosLink.parentElement;
    if (!parent || processedParents.has(parent) || parent.querySelector('[data-store-link="android"]')) return;
    processedParents.add(parent);

    if (iosLink.closest(".cta-row")) return;

    const androidLink = createStoreLinkElement("android", iosLink);
    if (iosLink.classList.contains("button")) {
      parent.appendChild(androidLink);
      return;
    }

    parent.insertBefore(document.createTextNode(" · "), iosLink.nextSibling);
    parent.insertBefore(androidLink, iosLink.nextSibling.nextSibling);
  });
}

function standardizeStoreLinkLabels() {
  document.querySelectorAll('[data-store-link="ios"]').forEach((link) => {
    link.textContent = "Apple App Store";
  });

  document.querySelectorAll('[data-store-link="android"]').forEach((link) => {
    link.textContent = "Google Play Store";
  });
}

function retargetGenericDownloadLinksForAndroid() {
  if (!isAndroidDevice() || !chooseSiteConfig.androidAppUrl.trim()) return;

  const links = document.querySelectorAll('[data-store-link="ios"]');
  links.forEach((link) => {
    const label = (link.textContent || "").trim();
    const isExplicitIosLabel = /app store/i.test(label);
    const isGenericDownloadLabel = /download/i.test(label);

    if (isExplicitIosLabel || !isGenericDownloadLabel) return;

    link.setAttribute("href", chooseSiteConfig.androidAppUrl);
    link.setAttribute("data-link-mode", "platform-smart");
  });
}

function updateStoreStatus(iosReady, androidReady) {
  const statusElements = document.querySelectorAll("[data-store-status]");
  if (!statusElements.length) return;

  let message = "App links are coming soon. You can still start with the ZIP code web estimate for electric supplier rates or tap a button and we will help you get access.";

  if (iosReady && androidReady) {
    message = "Available on iPhone and Android, with a ZIP code web estimate for electric supplier rates on desktop.";
  } else if (iosReady) {
    message = "Available now on iPhone. Android is coming April 2026, and the ZIP code web estimate is live today.";
  } else if (androidReady) {
    message = "Available now on Android. The ZIP code web estimate is also live on desktop.";
  }

  statusElements.forEach((statusElement) => {
    statusElement.textContent = message;
  });
}

function ensureDownloadAppNavLink() {
  const navs = document.querySelectorAll(".site-nav");
  navs.forEach((nav) => {
    let appLink = Array.from(nav.querySelectorAll("a")).find((link) => {
      const href = link.getAttribute("href") || "";
      const text = (link.textContent || "").trim().toLowerCase();
      return href === chooseSiteConfig.appLandingUrl || /download app|get the app|app store|google play/.test(text);
    });

    if (!appLink) {
      appLink = document.createElement("a");
      nav.appendChild(appLink);
    }

    appLink.classList.add("site-nav-app");
    appLink.setAttribute("href", chooseSiteConfig.appLandingUrl);
    appLink.setAttribute("data-app-download-link", "");
    appLink.textContent = "Download App";
  });
}

function createWebsiteVsAppMarkup({
  title = "Use the website for a quick comparison. Use the app to stay ahead.",
  appButtonLabel = "Download the App",
  compareButtonLabel = "Compare Rates",
} = {}) {
  return `
    <section class="web-app-comparison">
      <div class="comparison-section-head">
        <p class="eyebrow">Compare first. Track after.</p>
        <h2>${title}</h2>
        <p class="section-text">Compare rates on the web. Track your plan in the app before your rate jumps.</p>
      </div>
      <div class="comparison-grid">
        <article class="comparison-card">
          <p class="comparison-card-kicker">Website</p>
          <h3>Fast web comparison</h3>
          <ul class="comparison-list">
            <li>Compare rates by ZIP</li>
            <li>Review basic supplier options</li>
            <li>Read state guides</li>
            <li>Learn what to watch before switching</li>
          </ul>
          <div class="cta-row cta-row-compact">
            <a class="button button-secondary" href="/estimate" data-compare-cta>${compareButtonLabel}</a>
          </div>
        </article>
        <article class="comparison-card comparison-card-app">
          <p class="comparison-card-kicker">App</p>
          <h3>Stay ahead of renewals</h3>
          <ul class="comparison-list">
            <li>Upload your electric bill</li>
            <li>Track your current supplier and rate</li>
            <li>Get alerts before your rate expires</li>
            <li>Recheck before renewal pricing kicks in</li>
          </ul>
          <div class="cta-row cta-row-compact">
            <a class="button button-primary" href="${chooseSiteConfig.appLandingUrl}" data-app-download-link>${appButtonLabel}</a>
          </div>
        </article>
      </div>
    </section>
  `;
}

function createAppFeaturePreviewMarkup() {
  return `
    <section class="app-feature-preview">
      <div class="comparison-section-head">
        <p class="eyebrow">What the app adds</p>
        <h2>Use the website to compare. Use the app to manage the timing.</h2>
        <p class="section-text">Compare rates on the web. Track your plan in the app before your rate jumps.</p>
      </div>
      <div class="app-feature-grid">
        <article class="app-feature-card">
          <div class="app-feature-phone">
            <span class="app-feature-pill">Bill upload</span>
            <strong>Upload your bill</strong>
            <p>Get a better match using your actual supplier, rate, and usage.</p>
          </div>
        </article>
        <article class="app-feature-card">
          <div class="app-feature-phone">
            <span class="app-feature-pill">Current plan</span>
            <strong>Track your plan</strong>
            <p>Keep your current supplier, rate, and contract details in one place.</p>
          </div>
        </article>
        <article class="app-feature-card">
          <div class="app-feature-phone">
            <span class="app-feature-pill">Reminders</span>
            <strong>Get expiration alerts</strong>
            <p>Receive reminders before a low rate turns into a higher renewal.</p>
          </div>
        </article>
        <article class="app-feature-card">
          <div class="app-feature-phone">
            <span class="app-feature-pill">Next check-in</span>
            <strong>Compare again faster</strong>
            <p>Come back when it matters instead of starting from scratch.</p>
          </div>
        </article>
      </div>
      <div class="store-cta-row">
        <a class="button button-primary" href="${chooseSiteConfig.appLandingUrl}" data-app-download-link>Download the App</a>
        <a class="button button-secondary" data-store-link="ios" href="${chooseSiteConfig.iosAppUrl}">Apple App Store</a>
        <a class="button button-secondary" data-store-link="android" href="${chooseSiteConfig.androidAppUrl}">Google Play Store</a>
      </div>
    </section>
  `;
}

function createTrustDisclosureMarkup({ compact = false } = {}) {
  const baseClass = compact ? "trust-disclosure trust-disclosure-compact" : "trust-disclosure";
  return `
    <section class="${baseClass}">
      <p class="eyebrow">What to keep in mind</p>
      <div class="trust-disclosure-grid">
        <p>Your utility still delivers your electricity.</p>
        <p>Supplier switching usually affects the supply portion of your bill.</p>
        <p>Compare more than the headline rate.</p>
        <p>Watch for monthly fees, cancellation fees, and renewal pricing.</p>
      </div>
      <p class="trust-disclosure-note">
        Choose My Electric may earn compensation from some partners, but users should review all plan terms before enrolling.
      </p>
    </section>
  `;
}

function createEstimateUpsellMarkup() {
  return `
    <section class="estimate-app-upsell control-card reveal">
      <div class="card-head">
        <div>
          <p class="eyebrow">Need a better match?</p>
          <h2>Want a better match?</h2>
        </div>
        <p class="card-subtext">Upload your electric bill in the app so Choose My Electric can identify your current supplier, rate, usage, and possible expiration date.</p>
      </div>
      <ul class="comparison-list">
        <li>Bill upload</li>
        <li>Plan tracking</li>
        <li>Rate expiration alerts</li>
        <li>Easier repeat comparison</li>
      </ul>
      <div class="cta-row">
        <a class="button button-primary" href="${chooseSiteConfig.appLandingUrl}" data-app-download-link>Download the App</a>
      </div>
    </section>
  `;
}

function createBlogCompareCtaMarkup() {
  return `
    <section class="inline-cta-card inline-cta-card-compare">
      <p class="eyebrow">Compare by ZIP</p>
      <h3>Compare electric rates by ZIP code</h3>
      <p>Start with a quick web comparison, then move into the app when you want bill uploads, plan tracking, and alerts.</p>
      <div class="cta-row cta-row-compact">
        <a class="button button-primary" href="/estimate" data-compare-cta>Compare Rates</a>
      </div>
    </section>
  `;
}

function createBlogAppCtaMarkup() {
  return `
    <section class="inline-cta-card inline-cta-card-app">
      <p class="eyebrow">Stay ahead</p>
      <h3>Want alerts before your rate expires?</h3>
      <p>The app helps you track your plan and compare again before renewal pricing catches you off guard.</p>
      <div class="cta-row cta-row-compact">
        <a class="button button-primary" href="${chooseSiteConfig.appLandingUrl}" data-app-download-link>Download App</a>
      </div>
    </section>
  `;
}

function createBottomFunnelCtaMarkup() {
  return `
    <section class="closing-panel closing-panel-app">
      <p class="eyebrow">Keep going</p>
      <h2>Use the website to compare. Use the app to track your plan.</h2>
      <p>Compare rates on the web. Track your plan in the app before your rate jumps.</p>
      <div class="cta-row">
        <a class="button button-secondary" href="/estimate" data-compare-cta>Compare Rates</a>
        <a class="button button-primary" href="${chooseSiteConfig.appLandingUrl}" data-app-download-link>Download App</a>
      </div>
    </section>
  `;
}

function createStateChecklistMarkup(stateName) {
  return `
    <article class="content-card state-check-card">
      <p class="eyebrow">Before you switch</p>
      <h2>What to check before switching</h2>
      <ul class="comparison-list">
        <li>Is the rate fixed or variable?</li>
        <li>How long does the rate last?</li>
        <li>Are there monthly fees?</li>
        <li>Is there an early cancellation fee?</li>
        <li>What happens after the intro term?</li>
        <li>Does your utility still deliver the power?</li>
      </ul>
      <p class="trust-disclosure-note">
        ${stateName} shoppers should compare more than the headline rate and review renewal pricing before enrolling.
      </p>
    </article>
  `;
}

function createStateAppCardMarkup(stateName) {
  return `
    <p class="eyebrow">Keep the app after you compare</p>
    <h3>Keep the app after you compare.</h3>
    <p>A low rate today can become a bad deal later. Use the app to track your current plan and get alerts before your rate expires in ${stateName}.</p>
    <div class="cta-row">
      <a class="button button-primary" href="${chooseSiteConfig.appLandingUrl}" data-app-download-link>Download App</a>
    </div>
    ${createTrustDisclosureMarkup({ compact: true })}
  `;
}

function mountReusableSections() {
  document.querySelectorAll("[data-web-app-comparison]").forEach((node) => {
    node.innerHTML = createWebsiteVsAppComparisonMarkup(node.dataset);
  });

  document.querySelectorAll("[data-app-feature-preview]").forEach((node) => {
    node.innerHTML = createAppFeaturePreviewMarkup();
  });

  document.querySelectorAll("[data-trust-disclosure]").forEach((node) => {
    node.innerHTML = createTrustDisclosureMarkup({ compact: node.dataset.trustDisclosure === "compact" });
  });

  document.querySelectorAll("[data-estimate-upsell]").forEach((node) => {
    node.innerHTML = createEstimateUpsellMarkup();
  });
}

function createWebsiteVsAppComparisonMarkup(dataset) {
  return createWebsiteVsAppMarkup({
    title: dataset.title || "Use the website for a quick comparison. Use the app to stay ahead.",
    appButtonLabel: dataset.appButtonLabel || "Download the App",
    compareButtonLabel: dataset.compareButtonLabel || "Compare Rates",
  });
}

function enhanceStateGuidePage() {
  if (currentPageType() !== "state-guide") return;

  const stateName = currentStateName() || "this state";
  const heroHeading = document.querySelector(".content-hero .section-heading");
  const contentMain = document.querySelector(".content-main");
  const contentSidebar = document.querySelector(".content-sidebar");

  if (heroHeading) {
    const eyebrow = heroHeading.querySelector(".eyebrow");
    if (eyebrow) {
      eyebrow.textContent = "State guide";
    }

    const heading = heroHeading.querySelector("h1");
    if (heading && stateName && !heading.hasAttribute("data-funnel-updated")) {
      heading.textContent = `Compare ${stateName} electric rates`;
      heading.setAttribute("data-funnel-updated", "true");
    }

    if (!heroHeading.querySelector(".state-guide-subheadline")) {
      const subheadline = document.createElement("p");
      subheadline.className = "content-intro state-guide-subheadline";
      subheadline.textContent =
        "Start with your ZIP code, understand your utility territory, and use the app to track your plan before renewal pricing surprises you.";
      const headingNode = heroHeading.querySelector("h1");
      headingNode?.insertAdjacentElement("afterend", subheadline);
    }

    const heroForm = heroHeading.querySelector(".hero-form");
    const existingCompareButton = heroForm?.querySelector('.button[type="submit"]');
    if (existingCompareButton) {
      existingCompareButton.textContent = "Compare by ZIP";
    }

    if (!heroHeading.querySelector(".state-hero-cta-row")) {
      const ctaRow = document.createElement("div");
      ctaRow.className = "cta-row state-hero-cta-row";
      ctaRow.innerHTML = heroForm
        ? `
            <a class="button button-secondary" href="${chooseSiteConfig.appLandingUrl}" data-app-download-link>Download App</a>
          `
        : `
            <a class="button button-primary" href="/estimate" data-compare-cta>Compare by ZIP</a>
            <a class="button button-secondary" href="${chooseSiteConfig.appLandingUrl}" data-app-download-link>Download App</a>
          `;

      if (heroForm) {
        heroForm.insertAdjacentElement("afterend", ctaRow);
      } else {
        heroHeading.appendChild(ctaRow);
      }
    }
  }

  if (contentMain && !contentMain.querySelector(".state-check-card")) {
    const firstCard = contentMain.querySelector(".content-card");
    const wrapper = document.createElement("div");
    wrapper.innerHTML = createStateChecklistMarkup(stateName);
    const checklistNode = wrapper.firstElementChild;
    if (firstCard?.nextSibling) {
      contentMain.insertBefore(checklistNode, firstCard.nextSibling);
    } else {
      contentMain.appendChild(checklistNode);
    }
  }

  if (contentMain && !contentMain.querySelector(".web-app-comparison")) {
    const comparisonWrapper = document.createElement("div");
    comparisonWrapper.className = "content-card content-card-plain";
    comparisonWrapper.innerHTML = createWebsiteVsAppMarkup({
      title: "Use the website for a quick comparison. Use the app to stay ahead.",
      appButtonLabel: "Download the App",
      compareButtonLabel: "Compare by ZIP",
    });
    contentMain.appendChild(comparisonWrapper);
  }

  let appCard = contentSidebar?.querySelector(".app-funnel-card");
  if (!appCard && contentSidebar) {
    appCard = document.createElement("section");
    appCard.className = "sidebar-card app-funnel-card reveal";
    contentSidebar.prepend(appCard);
  }

  if (appCard) {
    appCard.innerHTML = createStateAppCardMarkup(stateName);
  }
}

function enhanceBlogPages() {
  const blogGrid = document.querySelector(".blog-grid");
  const articleBody = document.querySelector(".article-body");

  if (blogGrid && !document.querySelector(".blog-intro-cta")) {
    const heroSection = document.querySelector(".content-hero");
    const introSection = document.createElement("section");
    introSection.className = "section section-tight blog-intro-cta";
    introSection.innerHTML = createBlogCompareCtaMarkup();
    heroSection?.insertAdjacentElement("afterend", introSection);

    const closingSection = document.createElement("section");
    closingSection.className = "section section-tight";
    closingSection.innerHTML = createBottomFunnelCtaMarkup();
    document.querySelector("main")?.appendChild(closingSection);
  }

  if (articleBody) {
    const heroHeading = document.querySelector(".content-hero .section-heading");
    if (heroHeading && !document.querySelector(".blog-intro-cta")) {
      const introCard = document.createElement("div");
      introCard.className = "blog-intro-cta";
      introCard.innerHTML = createBlogCompareCtaMarkup();
      heroHeading.appendChild(introCard);
    }

    if (!articleBody.querySelector(".inline-cta-card-app")) {
      const appCard = document.createElement("div");
      appCard.innerHTML = createBlogAppCtaMarkup();
      articleBody.appendChild(appCard.firstElementChild);
    }

    if (!document.querySelector(".blog-bottom-funnel")) {
      const bottomSection = document.createElement("section");
      bottomSection.className = "section section-tight blog-bottom-funnel";
      bottomSection.innerHTML = createBottomFunnelCtaMarkup();
      document.querySelector("main")?.appendChild(bottomSection);
    }
  }
}

function enhanceLandingFunnelPages() {
  const pageType = currentPageType();
  if (pageType !== "upload-bill" && pageType !== "rate-alerts") return;

  const main = document.querySelector("main");
  if (!main) return;

  if (!main.querySelector(".web-app-comparison")) {
    const comparisonSection = document.createElement("section");
    comparisonSection.className = "section section-tight";
    comparisonSection.innerHTML = createWebsiteVsAppMarkup({
      title: "Use the website for a quick comparison. Use the app to stay ahead.",
      appButtonLabel: "Download the App",
      compareButtonLabel: "Compare Rates",
    });
    main.appendChild(comparisonSection);
  }

  if (!main.querySelector(".app-feature-preview")) {
    const featureSection = document.createElement("section");
    featureSection.className = "section section-tight";
    featureSection.innerHTML = createAppFeaturePreviewMarkup();
    main.appendChild(featureSection);
  }

  if (!main.querySelector(".trust-disclosure")) {
    const trustSection = document.createElement("section");
    trustSection.className = "section section-tight";
    trustSection.innerHTML = createTrustDisclosureMarkup();
    main.appendChild(trustSection);
  }
}

function injectStickyAppBar() {
  if (document.body.hasAttribute("data-no-sticky-bar")) return;
  if (document.querySelector(".sticky-app-bar")) return;

  const wrapper = document.createElement("div");
  wrapper.className = "sticky-app-bar";
  wrapper.innerHTML = `
    <div class="sticky-app-shell">
      <button class="sticky-app-dismiss" type="button" aria-label="Dismiss app download bar">×</button>
      <div class="sticky-app-copy">
        <strong>Choose My Electric app</strong>
        <span>Track your rate and get alerts before it expires.</span>
      </div>
      <a class="button button-primary sticky-app-button" href="${chooseSiteConfig.appLandingUrl}" data-app-download-link data-cta-event="sticky_app_cta_click">Download App</a>
    </div>
  `;

  if (window.sessionStorage?.getItem("choose-sticky-app-dismissed") === "1") {
    return;
  }

  document.body.appendChild(wrapper);
  document.body.classList.add("has-sticky-app-cta");
  wrapper.classList.toggle("is-hidden", hasVisibleModal());

  const dismissButton = wrapper.querySelector(".sticky-app-dismiss");
  dismissButton?.addEventListener("click", () => {
    wrapper.remove();
    document.body.classList.remove("has-sticky-app-cta");
    try {
      window.sessionStorage?.setItem("choose-sticky-app-dismissed", "1");
    } catch {}
  });

  const blockers = Array.from(
    document.querySelectorAll("form[data-zip-form], .hero-form, .zip-start-form, #estimate-form, .zip-search-row"),
  );
  if (!("IntersectionObserver" in window) || !blockers.length) {
    return;
  }

  const activeBlockers = new Set();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        activeBlockers.add(entry.target);
      } else {
        activeBlockers.delete(entry.target);
      }
    });

    wrapper.classList.toggle(
      "is-hidden",
      activeBlockers.size > 0 || hasFocusedFormField() || hasVisibleModal(),
    );
  }, {
    threshold: 0.2,
    rootMargin: "0px 0px -140px 0px",
  });

  blockers.forEach((blocker) => observer.observe(blocker));

  document.addEventListener("focusin", () => {
    wrapper.classList.toggle(
      "is-hidden",
      activeBlockers.size > 0 || hasFocusedFormField() || hasVisibleModal(),
    );
  });
  document.addEventListener("focusout", () => {
    window.setTimeout(() => {
      wrapper.classList.toggle(
        "is-hidden",
        activeBlockers.size > 0 || hasFocusedFormField() || hasVisibleModal(),
      );
    }, 0);
  });
}

function hasFocusedFormField() {
  const activeElement = document.activeElement;
  return Boolean(activeElement && activeElement.matches("input, select, textarea"));
}

function hasVisibleModal() {
  return Boolean(
    document.querySelector(
      'dialog[open], [aria-modal="true"]:not([hidden]), .modal[open], .modal.is-open, .modal[aria-hidden="false"]',
    ),
  );
}

function wireSiteCtaTracking() {
  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-cta-event], [data-app-download-link], [data-compare-cta]");
    if (!target) return;

    let eventName = target.dataset.ctaEvent || "";
    if (!eventName && target.hasAttribute("data-app-download-link")) {
      switch (currentPageType()) {
        case "home":
          eventName = "homepage_app_cta_click";
          break;
        case "estimate":
          eventName = "estimate_app_cta_click";
          break;
        case "state-guide":
          eventName = "state_page_app_click";
          break;
        case "blog":
        case "blog-article":
        case "blog-index":
          eventName = "blog_app_cta_click";
          break;
        default:
          eventName = "";
      }
    } else if (!eventName && target.hasAttribute("data-compare-cta") && currentPageType() === "state-guide") {
      eventName = "state_page_compare_click";
    }

    if (eventName) {
      trackSiteEvent(eventName, {
        page_path: window.location.pathname,
      });
    }
  });
}

function startRevealObserver() {
  const revealNodes = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    revealNodes.forEach((node) => node.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: "0px 0px -40px 0px",
    },
  );

  revealNodes.forEach((node) => observer.observe(node));
}

function updateCurrentYear() {
  const yearNode = document.querySelector("[data-current-year]");
  if (yearNode) yearNode.textContent = String(new Date().getFullYear());
}

function wireZipForms() {
  const forms = document.querySelectorAll("form[data-zip-form], .zip-start-form, .hero-form, .sticky-zip-form");
  forms.forEach((form) => {
    const input = form.querySelector('input[name="zip"], input[data-zip-input]');
    if (!input) return;

    input.addEventListener("input", () => {
      input.value = normalizeZip(input.value);
      input.setCustomValidity("");
    });

    form.addEventListener("submit", (event) => {
      input.value = normalizeZip(input.value);
      if (input.value.length !== 5) {
        event.preventDefault();
        input.setCustomValidity("Enter a 5-digit ZIP code.");
        input.reportValidity();
        return;
      }

      if (currentPageType() === "home") {
        trackSiteEvent("homepage_zip_submit", {
          page_path: window.location.pathname,
          zip_prefix: input.value.slice(0, 3),
        });
      }

      if (currentPageType() === "state-guide") {
        trackSiteEvent("state_page_compare_click", {
          page_path: window.location.pathname,
          zip_prefix: input.value.slice(0, 3),
        });
      }
    });
  });
}

function configureSmartAppPage() {
  const appPage = document.querySelector("[data-app-redirect-page]");
  if (!appPage) return;

  const destination = getAppStoreDestination(detectAppStorePlatform());
  const statusNode = appPage.querySelector("[data-app-redirect-status]");
  const helperNode = appPage.querySelector("[data-app-redirect-helper]");
  const deviceNode = appPage.querySelector("[data-app-device-label]");
  const primaryLink = appPage.querySelector("[data-app-primary-link]");
  const secondaryLink = appPage.querySelector("[data-app-secondary-link]");
  const autoNode = appPage.querySelector("[data-app-auto-note]");
  const isTikTok = isTikTokInAppBrowser();

  if (deviceNode) {
    deviceNode.textContent = destination.label;
  }

  if (statusNode) {
    statusNode.textContent = destination.platform === "desktop"
      ? "Pick your app store below."
      : `Detected ${destination.label}.`;
  }

  if (helperNode) {
    helperNode.textContent = isTikTok && destination.platform !== "desktop"
      ? `${destination.helperText} TikTok sometimes keeps people inside its browser, so we will send you to the store listing first.`
      : destination.helperText;
  }

  if (primaryLink) {
    if (destination.platform === "ios" || destination.platform === "android") {
      primaryLink.href = destination.primaryUrl;
      primaryLink.textContent = `Open ${destination.storeLabel} app`;
    } else {
      primaryLink.href = chooseSiteConfig.iosAppUrl;
      primaryLink.textContent = "Open Apple App Store";
    }
  }

  if (secondaryLink) {
    if (destination.platform === "ios" || destination.platform === "android") {
      secondaryLink.href = destination.fallbackUrl;
      secondaryLink.textContent = `Use ${destination.storeLabel} website`;
    } else {
      secondaryLink.href = chooseSiteConfig.androidAppUrl;
      secondaryLink.textContent = "Open Google Play Store";
    }
  }

  if (destination.platform === "desktop") {
    appPage.setAttribute("data-app-platform", "desktop");
    if (autoNode) {
      autoNode.textContent = "This page only auto-opens the app store on iPhone, iPad, and Android devices.";
    }
    return;
  }

  appPage.setAttribute("data-app-platform", destination.platform);
  if (autoNode) {
    autoNode.textContent = isTikTok
      ? "If TikTok keeps you on this page, tap one of the buttons below."
      : "If nothing happens in a second or two, use one of the buttons below.";
  }

  window.setTimeout(() => {
    window.location.replace(destination.autoRedirectUrl || destination.fallbackUrl);
  }, 180);
}

document.addEventListener("DOMContentLoaded", () => {
  ensureDownloadAppNavLink();
  mountReusableSections();
  enhanceStateGuidePage();
  enhanceLandingFunnelPages();
  enhanceBlogPages();
  configureAppDownloadLinks();
  addAndroidButtonsToStoreOnlyRows();
  addMissingAndroidLinksNearIosLinks();
  standardizeStoreLinkLabels();
  retargetGenericDownloadLinksForAndroid();
  const iosReady = configureStoreLink("ios", "Choose My Electric for iPhone");
  const androidReady = configureStoreLink("android", "Choose My Electric for Android");
  updateStoreStatus(iosReady, androidReady);
  updateCurrentYear();
  wireZipForms();
  wireSiteCtaTracking();
  injectStickyAppBar();
  startRevealObserver();
  configureSmartAppPage();
});
