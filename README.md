# Choose My Electric website

This is the existing Vercel website for https://www.choosemyelectric.com.
It contains static marketing pages and server-side rate lookup functions. There is no frontend build step.

## Publish an update

Deploy the contents of this directory to the existing Vercel project, with `index.html`, `vercel.json`, and `api/` at its root. Keep the existing domain and environment variables. A plain static-file host will not run the rate lookup functions or apply the Vercel redirects.

Required server-side environment variables:

- `CHOOSE_BACKEND_URL` (the existing backend URL)
- `CHOOSE_BACKEND_TOKEN`

Keep the token on the server. App Store and Google Play destinations are already configured in `site.js` and `vercel.json`.

The dated deployment ZIP beside this folder contains the same source layout. Upload or deploy its extracted contents through the existing Vercel workflow. Do not point the live domain at a separate test copy.

## Validate changes

From the parent `electric` directory, run:

```sh
python3 website-checks/audit_site.py
```

This checks titles, descriptions, canonicals, sitemap coverage, internal links, assets, structured breadcrumbs, page reachability, and Vercel rewrite destinations. Also syntax-check changed JavaScript with `node --check` and review browser layouts and interactions.

`website-checks/AUDIT-2026-09-21.md` records the latest audit and its limits.

## Page and asset conventions

- Use clean canonical URLs on `https://www.choosemyelectric.com`.
- Add new public guides to `sitemap.xml` and link them from the home, state, and guide hub pages.
- `/app` is an intentional noindex app-store handoff. `/privacy` permanently redirects to `/privacy-policy`.
- Keep primary reading content and navigation in HTML. Shared JavaScript enhances the pages.
- Main artwork uses WebP files. Original PNGs remain as source assets.
- Shared CSS and JavaScript URLs include a content hash so returning visitors receive updates.
- Bill upload is available in the mobile apps. The public website supports ZIP-based rate lookup.

## After deployment

Check the four new city URLs, robots.txt, and sitemap.xml on the live domain. In the domain’s Google Search Console property, submit the sitemap and inspect the new URLs. Google decides whether and when to index a page; a passing technical audit does not confirm inclusion or rankings.
