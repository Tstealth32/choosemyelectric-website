const chooseSiteConfig = {
  iosAppUrl: "https://apps.apple.com/us/app/choose-my-electric/id6762017797",
  iosAppDeepLink: "itms-apps://apps.apple.com/us/app/choose-my-electric/id6762017797",
  androidAppUrl: "https://play.google.com/store/apps/details?id=com.choosemyelectric.app&pcampaignid=web_share",
  androidAppDeepLink: "market://details?id=com.choosemyelectric.app",
  androidComingSoonLabel: "Android Coming April 2026",
  contactEmail: "contact@choosemyelectric.com",
};

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
      }
    });
  });
}

function injectStickyZipBar() {
  if (document.body.hasAttribute("data-no-sticky-bar")) return;
  if (document.querySelector(".sticky-zip-bar")) return;

  const wrapper = document.createElement("div");
  wrapper.className = "sticky-zip-bar";
  wrapper.innerHTML = `
    <form class="sticky-zip-form" action="/estimate" method="get" data-zip-form>
      <input
        class="text-input"
        type="text"
        name="zip"
        inputmode="numeric"
        maxlength="5"
        autocomplete="postal-code"
        placeholder="Enter ZIP"
        aria-label="Enter ZIP code"
        data-zip-input
        required
      >
      <button class="button button-primary sticky-zip-button" type="submit">Compare Rates</button>
    </form>
  `;

  document.body.appendChild(wrapper);
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
  addAndroidButtonsToStoreOnlyRows();
  addMissingAndroidLinksNearIosLinks();
  standardizeStoreLinkLabels();
  retargetGenericDownloadLinksForAndroid();
  const iosReady = configureStoreLink("ios", "Choose My Electric for iPhone");
  const androidReady = configureStoreLink("android", "Choose My Electric for Android");
  updateStoreStatus(iosReady, androidReady);
  updateCurrentYear();
  injectStickyZipBar();
  wireZipForms();
  startRevealObserver();
  configureSmartAppPage();
});
