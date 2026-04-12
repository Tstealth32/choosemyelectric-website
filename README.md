# Choose My Electric Website

This folder is a static marketing website for Choose My Electric. It is designed to do one job well right now:

- explain the product clearly
- build trust
- funnel visitors into the iPhone and Android apps

## Files

- `index.html`: landing page
- `privacy.html`: privacy page
- `site.css`: styling
- `site.js`: app-store links and light interactions

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
- keep the message focused on bill upload, supplier review, and plan comparison

Phase 2:

- add real app store links
- add analytics
- add screenshots or device mockups from the live apps
- add a web signup or waitlist if you want lead capture

Phase 3:

- decide whether you actually need a full web app, or just a better marketing site plus stronger app install conversion

## Notes

- The privacy page here is based on the current app privacy policy dated April 8, 2026.
- If you want, the next step can be a second pass that adds screenshots, better SEO copy, state-specific landing pages, and a live form.
