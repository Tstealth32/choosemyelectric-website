const chooseSiteConfig = {
  iosAppUrl: "https://apps.apple.com/us/app/choose-my-electric/id6762017797",
  androidAppUrl: "",
  androidComingSoonLabel: "Android Coming April 2026",
  contactEmail: "contact@choosemyelectric.com",
};

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

document.addEventListener("DOMContentLoaded", () => {
  const iosReady = configureStoreLink("ios", "Choose My Electric for iPhone");
  const androidReady = configureStoreLink("android", "Choose My Electric for Android");
  updateStoreStatus(iosReady, androidReady);
  updateCurrentYear();
  startRevealObserver();
});
