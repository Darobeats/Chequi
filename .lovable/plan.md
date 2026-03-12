

## Analysis: Why Bots and AI Crawlers Can't Access chequi.online

### Root Cause

The site is a **client-side rendered SPA** (Single Page Application built with React + Vite). This means:

1. **The server returns a nearly empty HTML file** — just `<div id="root"></div>` with no visible content
2. **All content is rendered by JavaScript** — bots that don't execute JS see nothing
3. **No meta description, no OG tags** — crawlers have zero context about the page
4. **403 errors** — some bot user-agents may be blocked at the hosting/CDN level (this is a Lovable platform behavior we cannot change from code)
5. **Timeouts** — bots that try to wait for JS rendering may timeout on the heavy bundle (multiple fonts, large dependencies)

### Current `index.html` Problems (line by line)

- **Line 11**: `<title>Chequi</title>` — no `<meta name="description">`, no `<meta name="keywords">`
- **Lines 34-39**: Only has basic `og:title` and `twitter:title` — missing `og:description`, `og:image`, `og:url`
- **No structured data** (JSON-LD) for search engines
- **No `<noscript>` fallback** — bots without JS see absolutely nothing
- **14+ Google Fonts loaded upfront** (line 14) — can cause timeout for lightweight crawlers

### Proposed Solution

#### 1. Enrich `index.html` with complete SEO meta tags
Add `description`, `og:description`, `og:image`, `og:url`, `twitter:description`, `twitter:image`, and canonical URL so crawlers get meaningful content from the raw HTML.

#### 2. Add `<noscript>` fallback content
Insert a `<noscript>` block inside `<body>` with the key landing page text (title, description, features). This gives non-JS crawlers actual content to index and audit.

#### 3. Add JSON-LD structured data
Add a `<script type="application/ld+json">` block with Organization/SoftwareApplication schema so search engines and AI tools understand what the site is.

#### 4. Add a static `sitemap.xml`
Create `public/sitemap.xml` listing the public routes (`/`, `/auth`) to help crawlers discover pages.

#### 5. Optimize font loading
Change the Google Fonts link to use `font-display=swap` (already present) and reduce to only the fonts actually used, preventing timeout for lightweight clients.

### Important Limitation

The **403 errors** from certain bot user-agents may be caused by Lovable's hosting infrastructure (CDN/firewall rules). This cannot be fixed from the application code. If 403 persists after these changes, it would need to be addressed at the hosting/domain configuration level.

### Files to modify
- `index.html` — add meta tags, noscript, JSON-LD
- `public/sitemap.xml` — new file
- `public/robots.txt` — add sitemap reference

