# Choose My Electric Website

This folder is now both:

- a marketing website for Choose My Electric
- a lightweight web estimate that lets people enter a ZIP code, upload a bill photo or PDF, and compare live offers before moving into the apps

## Files

- `index.html`: landing page
- `estimate.html`: customer-facing web estimate page
- `privacy.html`: privacy page
- `site.css`: styling
- `site.js`: app-store links and light interactions
- `estimate.js`: ZIP code, PDF/image bill upload, utility selection, and savings results
- `api/market.mjs`: Vercel Function that safely loads live market data from the backend
- `api/scan-bill.mjs`: Vercel Function that safely scans uploaded bill photos and converted PDF pages through the backend
- `api/_backend.mjs`: shared backend helper functions

## First thing to edit

Open `site.js` and add your real store URLs:

```js
const chooseSiteConfig = {
  iosAppUrl: "https://apps.apple.com/app/idYOUR_APP_ID",
  androidAppUrl: "https://play.google.com/store/apps/details?id=YOUR_PACKAGE_NAME",
  contactEmail: "contact@choosemyelectric.com",
};
```

If you leave those blank, the buttons fall back to email so the site can still go live before the store links are ready.

## Vercel environment variables

The web estimate needs the backend to stay server-side. In Vercel, add:

- `CHOOSE_BACKEND_URL`
- `CHOOSE_BACKEND_TOKEN`

Optional:

- `CHOOSE_WEB_APP_ID`
- `CHOOSE_OPENAI_BILL_MODEL`

Recommended values:

- `CHOOSE_BACKEND_URL=https://api.choosemyelectric.com`
- `CHOOSE_WEB_APP_ID=com.choosemyelectric.web`
- `CHOOSE_OPENAI_BILL_MODEL=gpt-4o-mini`

Do not put the backend token in browser code.

## PDF support

The web estimate now supports PDF bills by converting the first two PDF pages into bill images in the browser, then sending those images through the same scan flow.

That means:

- no backend token is exposed in the browser
- no server-side PDF rendering package is required
- image uploads and PDF uploads share the same bill scan pipeline

The current browser-side PDF conversion uses Mozilla PDF.js from a versioned CDN build.

## Fastest launch

If you just want the site live quickly, this static folder is enough.

Upload the contents of this folder to your website root so `index.html` is at the top level of the domain.

Typical GoDaddy cPanel layout:

1. Open your hosting account File Manager.
2. Go to `public_html` or the root folder for `www.choosemyelectric.com`.
3. Upload the files in this folder.
4. If you upload a zip, extract it in the root folder.
5. Make sure `index.html` sits in the website root, not inside another nested folder.

## Best way to do this

My recommendation is:

1. Use this static site immediately if speed matters most.
2. For long-term hosting, keep GoDaddy as the domain registrar and host the site somewhere better like Cloudflare Pages or Vercel.
3. Point `www.choosemyelectric.com` to that host through DNS.

Why that is better:

- easier updates
- faster global delivery
- built-in HTTPS
- cleaner rollback path if a deploy goes wrong
- better setup for future analytics, forms, and a richer web app

## Suggested rollout

Phase 1:

- launch this static site
- point traffic to the mobile apps
- give desktop visitors a real ZIP code + bill upload estimate path
- keep the message focused on bill upload, supplier review, and plan comparison

Phase 2:

- add real app store links
- add analytics
- add screenshots or device mockups from the live apps
- add a web signup or waitlist if you want lead capture

Phase 3:

- decide whether you want a deeper web app, or if the current estimate + stronger app install conversion is enough
- if the estimate gets traction, add user accounts and saved-history features on the web side

## Notes

- The privacy page here is based on the current app privacy policy dated April 8, 2026.
- The current web estimate supports bill photo, screenshot, and PDF upload.
- If you want, the next step can be a second pass that adds screenshots, better SEO copy, state-specific landing pages, analytics, and a stronger install funnel after results.
