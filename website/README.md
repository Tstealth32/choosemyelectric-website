# Choose My Electric Website

This folder is now both:

- a marketing website for Choose My Electric
- a lightweight ZIP-based web estimate that lets people enter a ZIP code, compare live offers, and then move into the apps for bill scanning

## Files

- `index.html`: landing page
- `estimate.html`: customer-facing web estimate page
- `privacy.html`: privacy page
- `site.css`: styling
- `site.js`: app-store links and light interactions
- `estimate.js`: ZIP code estimate flow, utility selection, and savings results
- `api/market.mjs`: Vercel Function that safely loads live market data from the backend
- `api/scan-bill.mjs`: intentionally disabled on the public website so bill upload stays app-only
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

Recommended values:

- `CHOOSE_BACKEND_URL=https://api.choosemyelectric.com`

Do not put the backend token in browser code.

## Bill upload policy

The public website is ZIP-only by design.

That means:

- no backend token is exposed in the browser
- the public web flow is lighter and safer to scale
- bill upload, PDF parsing, and saved bill history stay in the iPhone and Android apps

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
- give desktop visitors a real ZIP code estimate path
- keep the message focused on fast market discovery on the web and deeper bill-based value in the app

Phase 2:

- add real app store links
- add analytics
- add screenshots or device mockups from the live apps
- add a web signup or waitlist if you want lead capture

Phase 3:

- decide whether you want a deeper web app, or if the current estimate + stronger app install conversion is enough
- if the estimate gets traction, decide whether bill upload should ever come back to the web behind stronger rate limits and bot protection

## Notes

- The privacy page here is based on the current app privacy policy dated April 8, 2026.
- The current web estimate supports ZIP-based market estimates only.
- Bill upload and PDF parsing are intentionally app-only right now.
- If you want, the next step can be a second pass that adds screenshots, better SEO copy, state-specific landing pages, analytics, and a stronger install funnel after results.
