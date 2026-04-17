const chooseSiteConfig = {
  iosAppUrl: "https://apps.apple.com/us/app/choose-my-electric/id6762017797",
  androidAppUrl: "https://play.google.com/store/apps/details?id=com.choosemyelectric.app&pcampaignid=web_share",
  androidComingSoonLabel: "Android Coming April 2026",
  contactEmail: "contact@choosemyelectric.com",
};

function isAndroidDevice() {
  return /Android/i.test(window.navigator.userAgent || "");
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
    androidButton.textContent = "Get it on Google Play";

    row.appendChild(androidButton);
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

document.addEventListener("DOMContentLoaded", () => {
  addAndroidButtonsToStoreOnlyRows();
  retargetGenericDownloadLinksForAndroid();
  const iosReady = configureStoreLink("ios", "Choose My Electric for iPhone");
  const androidReady = configureStoreLink("android", "Choose My Electric for Android");
  updateStoreStatus(iosReady, androidReady);
  updateCurrentYear();
  injectStickyZipBar();
  wireZipForms();
  startRevealObserver();
});
