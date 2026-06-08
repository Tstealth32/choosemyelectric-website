const chooseSiteConfig = {
  appLandingUrl: "/app",
  iosAppUrl: "https://apps.apple.com/us/app/choose-my-electric/id6762017797",
  iosAppDeepLink: "itms-apps://apps.apple.com/us/app/choose-my-electric/id6762017797",
  androidAppUrl: "https://play.google.com/store/apps/details?id=com.choosemyelectric.app&pcampaignid=web_share",
  androidAppDeepLink: "market://details?id=com.choosemyelectric.app",
  iosBadgeAsset: "assets/app-store-badge.svg",
  androidBadgeAsset: "assets/google-play-badge.svg",
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
  return pathname === route || pathname.endsWith(route) || pathname.endsWith(`${route}/`);
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
  if (routeMatches(path, "/how-to-switch-electric-suppliers")) return "how-switch";
  if (routeMatches(path, "/electricity-supplier-faq")) return "faq";
  if (routeMatches(path, "/community-solar")) return "community-solar";
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

function createStoreBadgeRowMarkup({ className = "store-badge-row" } = {}) {
  return `
    <div class="${className}" data-store-badge-row>
      <a class="store-badge-link" data-store-link="ios" href="${chooseSiteConfig.iosAppUrl}" aria-label="Download on the App Store">
        <img class="store-badge" src="${chooseSiteConfig.iosBadgeAsset}" alt="Download on the App Store">
      </a>
      <a class="store-badge-link" data-store-link="android" href="${chooseSiteConfig.androidAppUrl}" aria-label="Get it on Google Play">
        <img class="store-badge" src="${chooseSiteConfig.androidBadgeAsset}" alt="Get it on Google Play">
      </a>
    </div>
  `;
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
    if (link.querySelector("img, svg")) return;
    link.textContent = "Apple App Store";
  });

  document.querySelectorAll('[data-store-link="android"]').forEach((link) => {
    if (link.querySelector("img, svg")) return;
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

function standardizePrimaryNav() {
  const navs = document.querySelectorAll(".site-nav");
  navs.forEach((nav) => {
    nav.innerHTML = `
      <a href="/estimate">Compare Rates</a>
      <a href="/electric-rates-by-state">State Pages</a>
      <a href="/community-solar">Community Solar</a>
      <a href="/rate-expiration-alerts">Rate Alerts</a>
      <a href="/electricity-supplier-faq">FAQ</a>
      <a class="site-nav-app" href="${chooseSiteConfig.appLandingUrl}" data-app-download-link>Download App</a>
    `;
  });
}

function enhanceMobileNav() {
  const header = document.querySelector(".site-header");
  const nav = document.querySelector(".site-nav");
  if (!header || !nav || header.querySelector(".site-nav-toggle")) return;

  if (!nav.id) {
    nav.id = "site-primary-nav";
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "site-nav-toggle";
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", nav.id);
  button.setAttribute("aria-label", "Open navigation menu");
  button.innerHTML = `
    <span></span>
    <span></span>
    <span></span>
  `;

  header.insertBefore(button, nav);
  header.classList.add("has-mobile-nav");

  const closeNav = () => {
    nav.classList.remove("is-open");
    button.classList.remove("is-active");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", "Open navigation menu");
  };

  button.addEventListener("click", () => {
    const nextOpen = !nav.classList.contains("is-open");
    nav.classList.toggle("is-open", nextOpen);
    button.classList.toggle("is-active", nextOpen);
    button.setAttribute("aria-expanded", String(nextOpen));
    button.setAttribute("aria-label", nextOpen ? "Close navigation menu" : "Open navigation menu");
  });

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      closeNav();
    }
  });

  document.addEventListener("click", (event) => {
    if (!header.contains(event.target)) {
      closeNav();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 720) {
      closeNav();
    }
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
          <div class="comparison-card-head">
            <p class="comparison-card-kicker">Website</p>
            <span class="comparison-card-badge">Fast start</span>
          </div>
          <h3>Fast web comparison</h3>
          <p class="comparison-card-copy">Use the website when you want a clear ZIP-first check without building a full profile first.</p>
          <ul class="comparison-list">
            <li>Compare rates by ZIP</li>
            <li>Review basic supplier options</li>
            <li>Read state guides</li>
            <li>Learn what to watch before switching</li>
          </ul>
          <div class="cta-row cta-row-compact">
            <a class="button button-secondary secondary-glass-button" href="/estimate" data-compare-cta>${compareButtonLabel}</a>
          </div>
        </article>
        <article class="comparison-card comparison-card-app">
          <div class="comparison-card-head">
            <p class="comparison-card-kicker">App</p>
            <span class="comparison-card-badge">Best follow-up</span>
          </div>
          <h3>Stay ahead of renewals</h3>
          <p class="comparison-card-copy">Keep the app after you compare so you remember the good rate before it becomes the expensive renewal.</p>
          <ul class="comparison-list">
            <li>Upload your electric bill</li>
            <li>Track your current supplier and rate</li>
            <li>Get alerts before your rate expires</li>
            <li>Recheck before renewal pricing kicks in</li>
          </ul>
          <div class="cta-row cta-row-compact">
            <a class="button button-primary premium-button" href="${chooseSiteConfig.appLandingUrl}" data-app-download-link>${appButtonLabel}</a>
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
            <div class="app-feature-topline">
              <span class="app-feature-pill">Bill upload</span>
              <span class="app-feature-meta">Supplier • Rate • Usage</span>
            </div>
            <strong>Upload your bill</strong>
            <p>Get a better match using your actual supplier, rate, and usage.</p>
            <div class="app-feature-signal" aria-hidden="true"><span></span><span></span><span></span></div>
          </div>
        </article>
        <article class="app-feature-card">
          <div class="app-feature-phone">
            <div class="app-feature-topline">
              <span class="app-feature-pill">Current plan</span>
              <span class="app-feature-meta">Saved in one place</span>
            </div>
            <strong>Track your plan</strong>
            <p>Keep your current supplier, rate, and contract details in one place.</p>
            <div class="app-feature-signal" aria-hidden="true"><span></span><span></span><span></span></div>
          </div>
        </article>
        <article class="app-feature-card">
          <div class="app-feature-phone">
            <div class="app-feature-topline">
              <span class="app-feature-pill">Reminders</span>
              <span class="app-feature-meta">Before renewal</span>
            </div>
            <strong>Get expiration alerts</strong>
            <p>Receive reminders before a low rate turns into a higher renewal.</p>
            <div class="app-feature-signal" aria-hidden="true"><span></span><span></span><span></span></div>
          </div>
        </article>
        <article class="app-feature-card">
          <div class="app-feature-phone">
            <div class="app-feature-topline">
              <span class="app-feature-pill">Next check-in</span>
              <span class="app-feature-meta">Faster repeat compare</span>
            </div>
            <strong>Compare again faster</strong>
            <p>Come back when it matters instead of starting from scratch.</p>
            <div class="app-feature-signal" aria-hidden="true"><span></span><span></span><span></span></div>
          </div>
        </article>
      </div>
      <div class="store-cta-row">
        <a class="button button-primary premium-button" href="${chooseSiteConfig.appLandingUrl}" data-app-download-link>Download the App</a>
      </div>
      ${createStoreBadgeRowMarkup({ className: "store-badge-row store-badge-row-inline" })}
    </section>
  `;
}

function createHowItWorksMarkup() {
  return `
    <section class="how-it-works">
      <div class="comparison-section-head">
        <p class="eyebrow">How it works</p>
        <h2>Compare once. Stay ahead every month.</h2>
        <p class="section-text">Compare rates on the web. Track your plan in the app before your rate jumps.</p>
      </div>
      <div class="steps-grid">
        <article class="feature-card">
          <div class="icon-pill" aria-hidden="true">01</div>
          <p class="comparison-card-kicker">Web start</p>
          <p class="card-number">Step 1</p>
          <h3>Enter your ZIP</h3>
          <p>Start with a fast web comparison where live rate data is available.</p>
        </article>
        <article class="feature-card">
          <div class="icon-pill" aria-hidden="true">02</div>
          <p class="comparison-card-kicker">Compare clearly</p>
          <p class="card-number">Step 2</p>
          <h3>Compare your options</h3>
          <p>Review rates, plan terms, utility context, and supplier details before choosing.</p>
        </article>
        <article class="feature-card">
          <div class="icon-pill" aria-hidden="true">03</div>
          <p class="comparison-card-kicker">App follow-up</p>
          <p class="card-number">Step 3</p>
          <h3>Let the app remind you</h3>
          <p>Track your plan and get alerts before a low rate turns into a higher renewal.</p>
        </article>
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

function createHeroPreviewMarkup(pageType) {
  if (pageType === "rate-alerts") {
    return `
      <div class="phone-shell feature-hero-phone app-phone-mockup">
        <div class="phone-notch"></div>
        <div class="phone-screen">
          <div class="mini-card mini-card-accent">
            <p class="mini-label">Rate Expiration Alert</p>
            <h2>Your plan may renew soon</h2>
            <p class="hero-panel-copy">Compare before your next bill cycle.</p>
          </div>
          <div class="mini-card">
            <div class="mini-step">
              <span>!</span>
              <div>
                <strong>Track current rate</strong>
                <p>Keep your current plan details in one place.</p>
              </div>
            </div>
            <div class="mini-step">
              <span>↻</span>
              <div>
                <strong>Know when to compare</strong>
                <p>Get reminders before renewal pricing catches you late.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (pageType === "upload-bill") {
    return `
      <div class="phone-shell feature-hero-phone app-phone-mockup">
        <div class="phone-notch"></div>
        <div class="phone-screen">
          <div class="mini-card mini-card-accent">
            <p class="mini-label">Upload bill</p>
            <h2>Prepare a better match</h2>
            <p class="hero-panel-copy">Reading supplier, rate, usage, and utility details.</p>
          </div>
          <div class="mini-card">
            <div class="mini-step">
              <span>1</span>
              <div>
                <strong>Reading supplier</strong>
                <p>Pull in the plan you are actually on.</p>
              </div>
            </div>
            <div class="mini-step">
              <span>2</span>
              <div>
                <strong>Checking rate details</strong>
                <p>Use your real bill as the starting point.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (pageType === "how-switch") {
    return `
      <div class="phone-shell feature-hero-phone app-phone-mockup">
        <div class="phone-notch"></div>
        <div class="phone-screen">
          <div class="mini-card mini-card-accent">
            <p class="mini-label">Switching flow</p>
            <h2>Compare, choose, track</h2>
            <p class="hero-panel-copy">The app helps after the first rate check, not just during it.</p>
          </div>
          <div class="mini-card">
            <div class="mini-step">
              <span>1</span>
              <div>
                <strong>Compare by ZIP</strong>
                <p>Start with the web when you need a fast check.</p>
              </div>
            </div>
            <div class="mini-step">
              <span>2</span>
              <div>
                <strong>Track what you picked</strong>
                <p>Keep your next comparison from being a memory test.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (pageType === "faq") {
    return `
      <div class="phone-shell feature-hero-phone app-phone-mockup">
        <div class="phone-notch"></div>
        <div class="phone-screen">
          <div class="mini-card mini-card-accent">
            <p class="mini-label">Quick answers</p>
            <h2>Before you switch</h2>
            <p class="hero-panel-copy">Clear answers about rates, switching, and plan timing.</p>
          </div>
          <div class="mini-card">
            <div class="mini-step">
              <span>?</span>
              <div>
                <strong>Utility still delivers power</strong>
                <p>Supplier shopping usually changes the supply side of the bill.</p>
              </div>
            </div>
            <div class="mini-step">
              <span>↗</span>
              <div>
                <strong>Use the app later</strong>
                <p>Track your plan before renewal pricing shows up.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  return "";
}

function createEstimateUpsellMarkup() {
  return `
    <section class="estimate-app-upsell control-card reveal">
      <div class="app-cta-panel">
        <div>
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
            <a class="button button-primary premium-button" href="${chooseSiteConfig.appLandingUrl}" data-app-download-link>Download the App</a>
          </div>
        </div>
        <div class="app-cta-panel-visual">
          <div class="floating-dashboard-card glossy-card app-cta-panel-preview">
            <span class="floating-dashboard-chip floating-dashboard-chip-emerald">Bill upload</span>
            <strong>Better match in the app</strong>
            <p>Supplier, rate, utility, and usage are easier to identify from your actual bill.</p>
          </div>
        </div>
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
        <a class="button button-primary premium-button" href="/estimate" data-compare-cta>Compare Rates</a>
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
        <a class="button button-primary premium-button" href="${chooseSiteConfig.appLandingUrl}" data-app-download-link>Download App</a>
      </div>
    </section>
  `;
}

function createBottomFunnelCtaMarkup() {
  return `
    <section class="closing-panel closing-panel-app app-cta-panel">
      <div>
        <p class="eyebrow">Keep going</p>
        <h2>Keep the app after you compare.</h2>
        <p>Compare rates on the web, then keep your plan details and reminders in the app before renewal pricing catches you late.</p>
        <div class="cta-row">
          <a class="button button-secondary secondary-glass-button" href="/estimate" data-compare-cta>Compare Rates</a>
          <a class="button button-primary premium-button" href="${chooseSiteConfig.appLandingUrl}" data-app-download-link>Download App</a>
        </div>
        ${createStoreBadgeRowMarkup({ className: "store-badge-row store-badge-row-inline" })}
      </div>
      <div class="app-cta-panel-visual">
        <div class="floating-dashboard-card glossy-card app-cta-panel-preview">
          <span class="floating-dashboard-chip">Renewal alert</span>
          <strong>Compare before renewal</strong>
          <p>Keep your current plan in one place, then compare again when timing matters.</p>
        </div>
      </div>
    </section>
  `;
}

function createStateChecklistMarkup(stateName) {
  return `
    <article class="content-card state-check-card">
      <p class="eyebrow">Before you switch</p>
      <h2>What to check before switching</h2>
      <div class="state-watch-grid">
        <div class="state-watch-item"><strong>Fixed vs variable</strong><span>Know how the rate can change.</span></div>
        <div class="state-watch-item"><strong>Contract length</strong><span>Check how long the price lasts.</span></div>
        <div class="state-watch-item"><strong>Monthly fees</strong><span>Do not compare the headline rate alone.</span></div>
        <div class="state-watch-item"><strong>Cancellation fee</strong><span>Make sure timing does not erase savings.</span></div>
        <div class="state-watch-item"><strong>Renewal pricing</strong><span>Look at what happens after the intro term.</span></div>
        <div class="state-watch-item"><strong>Utility delivery</strong><span>Your utility still delivers the power.</span></div>
      </div>
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
    <div class="floating-dashboard-card glossy-card app-cta-panel-preview">
      <span class="floating-dashboard-chip">In the app</span>
      <strong>${stateName} renewal reminder</strong>
      <p>Track your current supplier and know when to compare again before the rate changes.</p>
    </div>
    <div class="cta-row">
      <a class="button button-primary premium-button" href="${chooseSiteConfig.appLandingUrl}" data-app-download-link>Download App</a>
    </div>
    ${createStoreBadgeRowMarkup({ className: "store-badge-row store-badge-row-inline" })}
    ${createTrustDisclosureMarkup({ compact: true })}
  `;
}

function createStateHeroPreviewMarkup(stateName) {
  return `
    <div class="phone-shell feature-hero-phone app-phone-mockup">
      <div class="phone-notch"></div>
      <div class="phone-screen">
        <div class="mini-card mini-card-accent">
          <p class="mini-label">${stateName} snapshot</p>
          <h2>Compare before renewal</h2>
          <p class="hero-panel-copy">Use ZIP search on the web, then keep the plan details in the app.</p>
        </div>
        <div class="mini-card">
          <div class="mini-step">
            <span>ZIP</span>
            <div>
              <strong>Start with your ZIP</strong>
              <p>See what the website can compare in ${stateName} today.</p>
            </div>
          </div>
          <div class="mini-step">
            <span>↺</span>
            <div>
              <strong>Track timing later</strong>
              <p>Use the app when you want alerts before your plan renews.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
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
  const hero = document.querySelector(".content-hero");
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
            <a class="button button-secondary secondary-glass-button" href="${chooseSiteConfig.appLandingUrl}" data-app-download-link>Download App</a>
          `
        : `
            <a class="button button-primary premium-button" href="/estimate" data-compare-cta>Compare by ZIP</a>
            <a class="button button-secondary secondary-glass-button" href="${chooseSiteConfig.appLandingUrl}" data-app-download-link>Download App</a>
          `;

      if (heroForm) {
        heroForm.insertAdjacentElement("afterend", ctaRow);
      } else {
        heroHeading.appendChild(ctaRow);
      }
    }
  }

  if (hero && heroHeading && !hero.querySelector(".feature-hero-preview")) {
    hero.classList.add("content-hero-split");
    const preview = document.createElement("div");
    preview.className = "feature-hero-preview reveal reveal-delay-1";
    preview.innerHTML = createStateHeroPreviewMarkup(stateName);
    hero.appendChild(preview);
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

  if (contentMain && !contentMain.querySelector(".seo-accordion-section")) {
    const cards = Array.from(contentMain.querySelectorAll(".content-card"))
      .filter((card) => !card.classList.contains("state-check-card"))
      .filter((card) => !card.classList.contains("content-card-plain"));

    const cardsToCollapse = cards.slice(3);
    if (cardsToCollapse.length) {
      const section = document.createElement("section");
      section.className = "content-card seo-accordion-section";
      const heading = document.createElement("div");
      heading.className = "comparison-section-head";
      heading.innerHTML = `
        <p class="eyebrow">Learn more about electric choice</p>
        <h2>More details for ${stateName} shoppers</h2>
        <p class="section-text">Keep the main comparison flow up top, then open the deeper market details when you want more context.</p>
      `;
      const list = document.createElement("div");
      list.className = "faq-list seo-accordion-list";

      cardsToCollapse.forEach((card, index) => {
        const title = card.querySelector("h2, h3")?.textContent?.trim() || `More about ${stateName} electric choice`;
        const body = card.cloneNode(true);
        body.querySelector("h2, h3")?.remove();

        const details = document.createElement("details");
        details.className = "faq-item seo-accordion-item";
        if (index === 0) {
          details.open = true;
        }
        details.innerHTML = `<summary>${title}</summary>`;
        const content = document.createElement("div");
        content.className = "seo-accordion-body";
        content.append(...Array.from(body.childNodes));
        details.appendChild(content);
        list.appendChild(details);
        card.remove();
      });

      section.appendChild(heading);
      section.appendChild(list);
      contentMain.appendChild(section);
    }
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

function enhanceFaqPage() {
  if (currentPageType() !== "faq") return;

  const contentMain = document.querySelector(".content-main");
  if (!contentMain || contentMain.querySelector(".faq-accordion-upgraded")) return;

  const cards = Array.from(contentMain.querySelectorAll(".content-card"));
  if (!cards.length) return;

  const labels = [
    "Basics",
    "Comparing rates",
    "Switching suppliers",
    "App alerts",
    "Supported states",
  ];

  const wrapper = document.createElement("section");
  wrapper.className = "content-card faq-accordion-upgraded";
  wrapper.innerHTML = `
    <div class="comparison-section-head">
      <p class="eyebrow">FAQ</p>
      <h2>Clear answers before you compare rates, switch suppliers, or download the app.</h2>
      <p class="section-text">Keep the answers short when you need the basics, then open each item for the deeper context.</p>
    </div>
  `;

  const list = document.createElement("div");
  list.className = "faq-list";

  cards.forEach((card, index) => {
    const title = card.querySelector("h2")?.textContent?.trim() || `Question ${index + 1}`;
    const body = card.cloneNode(true);
    body.querySelector("h2")?.remove();

    const details = document.createElement("details");
    details.className = "faq-item";
    if (index === 0) {
      details.open = true;
    }
    details.innerHTML = `
      <summary>
        <span class="faq-category-pill">${labels[index] || "More"}</span>
        <span>${title}</span>
      </summary>
    `;
    const content = document.createElement("div");
    content.className = "seo-accordion-body";
    content.append(...Array.from(body.childNodes));
    details.appendChild(content);
    list.appendChild(details);
    card.remove();
  });

  wrapper.appendChild(list);
  contentMain.prepend(wrapper);
}

function enhanceLandingFunnelPages() {
  const pageType = currentPageType();
  if (!["upload-bill", "rate-alerts", "how-switch", "faq"].includes(pageType)) return;

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

function enhanceCommunitySolarPage() {
  if (currentPageType() !== "community-solar") return;

  const main = document.querySelector("main");
  if (!main || main.querySelector(".community-solar-app-panel")) return;

  const section = document.createElement("section");
  section.className = "section section-tight community-solar-app-panel";
  section.innerHTML = createBottomFunnelCtaMarkup();
  main.appendChild(section);
}

function enhanceFeaturePageHeroes() {
  const pageType = currentPageType();
  if (!["upload-bill", "rate-alerts", "how-switch", "faq"].includes(pageType)) return;

  const hero = document.querySelector(".content-hero");
  const heading = hero?.querySelector(".section-heading");
  if (!hero || !heading) return;

  if (!heading.querySelector(".feature-hero-actions")) {
    const actions = document.createElement("div");
    actions.className = "cta-row feature-hero-actions";
    actions.innerHTML = `
      <a class="button button-primary premium-button" href="${chooseSiteConfig.appLandingUrl}" data-app-download-link>Download the App</a>
      <a class="button button-secondary secondary-glass-button" href="/estimate" data-compare-cta>Compare Rates</a>
    `;
    heading.appendChild(actions);
  }

  if (hero.querySelector(".feature-hero-preview")) return;

  const previewMarkup = createHeroPreviewMarkup(pageType);
  if (!previewMarkup) return;

  hero.classList.add("content-hero-split");
  const preview = document.createElement("div");
  preview.className = "feature-hero-preview reveal reveal-delay-1";
  preview.innerHTML = previewMarkup;
  hero.appendChild(preview);
}

function injectStickyAppBar() {
  if (document.body.hasAttribute("data-no-sticky-bar")) return;
  if (document.querySelector(".sticky-app-bar")) return;

  const wrapper = document.createElement("div");
  wrapper.className = "sticky-app-bar";
  wrapper.innerHTML = `
    <div class="sticky-app-shell">
      <span class="sticky-app-icon" aria-hidden="true">
        <svg viewBox="0 0 108 108" role="img" aria-hidden="true">
          <rect x="12" y="12" width="84" height="84" rx="6" fill="#0F172A"></rect>
          <path d="M60.8 25L36 59.5h15.4L47.2 83 72 48.4H56.6z" fill="#62C49A"></path>
        </svg>
      </span>
      <div class="sticky-app-copy">
        <strong>Track your rate in the app</strong>
        <span>Get alerts before it expires</span>
      </div>
      <a class="button button-primary premium-button sticky-app-button" href="${chooseSiteConfig.appLandingUrl}" data-app-download-link data-cta-event="sticky_app_cta_click">Download App</a>
      <button class="sticky-app-dismiss" type="button" aria-label="Dismiss app download bar">×</button>
    </div>
  `;

  if (window.sessionStorage?.getItem("choose-sticky-app-dismissed") === "1") {
    return;
  }

  document.body.appendChild(wrapper);
  document.body.classList.add("has-sticky-app-cta");
  wrapper.classList.add("is-hidden");

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
    window.addEventListener("scroll", () => {
      wrapper.classList.toggle("is-hidden", window.scrollY < 360 || hasVisibleModal());
    }, { passive: true });
    return;
  }

  const activeBlockers = new Set();
  const syncStickyVisibility = () => {
    const shouldHide =
      activeBlockers.size > 0 ||
      hasFocusedFormField() ||
      hasVisibleModal() ||
      window.scrollY < 360;
    wrapper.classList.toggle("is-hidden", shouldHide);
  };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        activeBlockers.add(entry.target);
      } else {
        activeBlockers.delete(entry.target);
      }
    });
    syncStickyVisibility();
  }, {
    threshold: 0.2,
    rootMargin: "0px 0px -140px 0px",
  });

  blockers.forEach((blocker) => observer.observe(blocker));

  document.addEventListener("focusin", () => {
    syncStickyVisibility();
  });
  document.addEventListener("focusout", () => {
    window.setTimeout(() => {
      syncStickyVisibility();
    }, 0);
  });
  window.addEventListener("scroll", syncStickyVisibility, { passive: true });
  syncStickyVisibility();
}

function ensurePageStoreBadges() {
  if (document.querySelector(".home-store-row")) return;

  const appHandoffGrid = document.querySelector(".app-handoff-store-grid");
  if (appHandoffGrid && !appHandoffGrid.querySelector("img.store-badge")) {
    appHandoffGrid.innerHTML = createStoreBadgeRowMarkup({ className: "store-badge-row store-badge-row-app-handoff" });
  }

  if (document.querySelector("[data-store-badge-row]")) return;

  const heroActions =
    document.querySelector(".feature-hero-actions") ||
    document.querySelector(".state-hero-cta-row") ||
    document.querySelector(".community-solar-hero .cta-row") ||
    document.querySelector(".app-handoff-actions");

  if (heroActions) {
    heroActions.insertAdjacentHTML("afterend", createStoreBadgeRowMarkup({ className: "store-badge-row store-badge-row-inline" }));
    return;
  }

  const heroHeading =
    document.querySelector(".content-hero .section-heading") ||
    document.querySelector(".app-handoff-card") ||
    document.querySelector("main");

  if (!heroHeading) return;

  const wrapper = document.createElement("div");
  wrapper.className = "page-store-badges";
  wrapper.innerHTML = createStoreBadgeRowMarkup({ className: "store-badge-row store-badge-row-page" });
  heroHeading.appendChild(wrapper);
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
  standardizePrimaryNav();
  enhanceMobileNav();
  mountReusableSections();
  const homeHowItWorks = document.querySelector("[data-home-how-it-works]");
  if (homeHowItWorks) {
    homeHowItWorks.innerHTML = createHowItWorksMarkup();
  }
  enhanceFeaturePageHeroes();
  enhanceStateGuidePage();
  enhanceFaqPage();
  enhanceLandingFunnelPages();
  enhanceCommunitySolarPage();
  enhanceBlogPages();
  ensurePageStoreBadges();
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
