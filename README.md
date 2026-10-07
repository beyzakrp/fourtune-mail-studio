# Fourtune Mail Studio

**A visual email template editor for Figma, built with vanilla JavaScript, HTML and CSS.**

Fourtune Mail Studio turns reusable outreach designs into editable email drafts. Customize copy and images, preview desktop and mobile layouts, export HTML, and create an approximate editable layout in Figma without rebuilding each pitch from scratch.

This repository contains the template authoring workflow. It does **not** send emails, manage recipient lists, schedule campaigns, or provide SMTP/API integrations.

## Features

- Two templates: **Creative Content** and **Website Review**.
- Editable brand name, subject, preheader, copy, calls to action and links.
- Desktop (600 px) and mobile (375 px) previews with zoom controls.
- Image input through HTTPS URLs, local files, or a Figma selection.
- Local draft storage with JSON import and export.
- HTML export with escaped text and synchronized HTML/Outlook VML buttons.
- Figma frame creation from the measured preview, with editable text, image and background layers.
- A dependency-free runtime; Python builds the bundled panel and Node.js runs checks.

## Quick start

Download or clone this repository, then open `figma-mail-studio/ui.html` in a browser to try the editor. The prebuilt panel is included; no build step or API key is needed. Browser drafts stay in that browser's local storage. Figma-specific actions require running the plugin inside Figma.

### Figma installation

1. Open `figma-mail-studio/setup.html` in your browser.
2. Create a development plugin with a UI in Figma Desktop to obtain your own plugin ID.
3. Select Figma's generated manifest in the setup page, then save the downloaded configuration as `figma-mail-studio/manifest.json` in your local checkout.
4. Import that manifest as a development plugin and run **4tune Mail Studio**.

The checked-in manifest intentionally has no personal plugin ID. Installation and publishing to the Figma Community are separate from publishing this source repository.

## Prepare an email

Select a template, edit the content, and add your own publicly hosted HTTPS images. Inspect the desktop and mobile previews, then download the HTML. Enter the subject separately in your sending tool.

**The public examples use fictional “Example Brand” content, `example.com` links and placeholder image URLs. Those URLs do not serve the original artwork.** Replace all image URLs, links, contact details and address text before using an export. Footer content is edited in the source HTML; rebuild the panel afterward. Local images can be previewed, but must be hosted at permanent HTTPS URLs before email export.

## Project structure

```text
fourtune-pitch-email.html           Creative Content source template
fourtune-website-review-email.html  Website Review source template
figma-mail-studio/
  code.js                         Figma Plugin API integration
  core.js                         HTML compilation and URL validation
  ui-source.html                  Panel markup and styles
  ui.js                           Editor, draft storage and preview logic
  build.py                        Template extraction and panel bundling
  templates.json                  Generated template definitions
  ui.html                         Generated standalone plugin panel
  manifest.json                   Shareable plugin configuration
  setup.html                      Local manifest setup helper
  *.cjs                           Compiler, browser and API contract checks
.env.example                      Documents that no secrets are needed
```

The main source layout is preserved. Old ZIP distributions, duplicate plugin copies, backup files, original artwork and previously generated previews are excluded from the public package.

## Development and checks

Run these from the repository root with Python 3 and Node.js available:

```sh
python figma-mail-studio/build.py
node figma-mail-studio/test.cjs
```

Optional browser checks require Playwright and a locally installed Google Chrome:

```sh
npm install --no-save --package-lock=false playwright
node figma-mail-studio/browser-test.cjs
node figma-mail-studio/compat-test.cjs
node figma-mail-studio/figma-contract-test.cjs
```

Run the browser test before the API contract test: it generates the temporary scene fixture used by the latter. `browser-test.cjs` substitutes local synthetic artwork and blocks external font requests; it does not depend on private image hosts. Test outputs are ignored by Git.

After editing templates or panel sources, rerun the build and commit both sources and generated `templates.json`/`ui.html`.

## Privacy and configuration

No environment variables are consumed. `.env.example` records this explicitly rather than suggesting an unsupported SMTP integration. Drafts remain in Figma client storage or browser local storage until the user exports them. Custom image and font URLs make requests to their hosts; the manifest permits those external resources.

Keep customer data, exported drafts, credentials and sending logs outside the repository. The `.gitignore` excludes common local configuration and campaign-data files. Never embed secrets in this client-side plugin.

## Current limitations

- Browser previews are not Gmail or Outlook rendering tests. Absolute positioning, external fonts and clipping may differ across email clients.
- Mobile preview exposes template overflow; it does not automatically repair layouts.
- Figma layers are an approximate conversion. Font fallback, gradients, spacing and clipping may differ.
- Changes made directly to the generated Figma frame do not flow back into HTML.
- The actual Figma Desktop end-to-end workflow has not been verified in this publication pass. API contract checks use a mock.
- No sending backend or recipient database is included.
