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
    statusElement.textContent = "Your live App Store and Google Play links are connected.";
    return;
  }

  if (iosReady || androidReady) {
    statusElement.textContent = "One live store link is connected. The other button still falls back to contact until you update site.js.";
    return;
  }

  statusElement.innerHTML = 'Add your final App Store and Google Play links in <code>site.js</code> and these buttons will update automatically.';
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
