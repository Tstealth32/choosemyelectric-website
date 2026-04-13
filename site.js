const chooseSiteConfig = {
  iosAppUrl: "",
  androidAppUrl: "",
  contactEmail: "contact@choosemyelectric.com",
};

function configureStoreLink(platform, fallbackSubject) {
  const elements = document.querySelectorAll(`[data-store-link="${platform}"]`);
  const configuredUrl = platform === "ios" ? chooseSiteConfig.iosAppUrl : chooseSiteConfig.androidAppUrl;
  const hasLiveUrl = typeof configuredUrl === "string" && configuredUrl.trim().length > 0;
  const fallbackUrl = `mailto:${chooseSiteConfig.contactEmail}?subject=${encodeURIComponent(fallbackSubject)}`;

  elements.forEach((element) => {
    element.href = hasLiveUrl ? configuredUrl : fallbackUrl;
    if (!hasLiveUrl) {
      element.setAttribute("data-link-mode", "fallback");
    }
  });

  return hasLiveUrl;
}

function updateStoreStatus(iosReady, androidReady) {
  const statusElement = document.querySelector("[data-store-status]");
  if (!statusElement) return;

  if (iosReady && androidReady) {
    statusElement.textContent = "Available on iPhone and Android, with a web estimate for desktop shoppers.";
    return;
  }

  if (iosReady || androidReady) {
    statusElement.textContent = "Download the app on your device, or start with the web estimate on desktop.";
    return;
  }

  statusElement.textContent = "App links are coming soon. You can still start with the web estimate or tap a button and we will help you get access.";
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
