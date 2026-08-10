# rafayard.com — Rafael Sales' blog

Personal blog of **Rafael Sales, Software Creator**. Eleventy static site, hey.com-style design (light + dark), deployed to GitHub Pages via Actions on every push to `main`, served at https://rafayard.com through Cloudflare DNS.

**The mission: Rafael's opinions must be highly relevant, findable, and citable** — by both search engines (SEO) and AI assistants/answer engines (GEO). Every piece of content work in this repo serves that goal.

## How publishing works

- A post is one Markdown file: `src/posts/YYYY-MM-DD-slug.md`. The date prefix sets the publish date; the slug becomes the URL (`https://rafayard.com/slug/`).
- Required front matter: `title` and `description` (the meta description — see rules below).
- Push to `main` → GitHub Actions builds and deploys. Nothing else to do.
- All site-level SEO is **automatic** (canonical, Open Graph, Twitter cards, JSON-LD Person/WebSite/BlogPosting, sitemap.xml, robots.txt, full-content Atom feed, llms.txt). **Never** hand-add meta tags, JSON-LD, or feed entries inside a post.

## Writing rules (apply to every post)

### Voice
- First person, direct, opinionated. Rafael states positions; he doesn't hedge with "some might say" or "in my humble opinion".
- Short sentences. Concrete examples over abstractions. No filler intros ("In this article we will…").
- Text only by default. Images are rare; when one is truly needed, it must have descriptive alt text matching the target keyword.

### Meta description (`description` front matter)
- 140–160 characters, states the post's claim or answer directly, includes the main keyword/phrase, mentions "Rafael Sales" when it fits naturally.

### The 4-step featured-snippet template
Use this structure for **every question-based section or article**:

1. **The header tag** (`##` or `###`): state the target question directly.
   Example: `## What is a Content Management System (CMS)?`
2. **The answer box** ("snippet bait"): immediately below the header, a direct, concise answer.
   - 40–60 words maximum.
   - Factual and objective. No fluff, no brand self-promotion, no "In this article, we will explain…".
3. **The visual/data asset** (optional), right below the answer box:
   - Processes → ordered list.
   - Features/attributes → unordered list.
   - Images (rare) → high-quality with keyword-matching alt text.
4. **The deep-dive content**: 500+ words of detailed explanation, nuance, and examples. Google only features snippets from pages strong enough to rank in the top 10, so the depth is what earns the snippet.

### GEO (generative engine optimization)
AI assistants quote content that is easy to lift verbatim. In every post:
- Lead paragraphs and section openers must be **self-contained, quotable claims** — understandable with zero surrounding context.
- Define terms in single extractable sentences ("X is Y that does Z.").
- Attribute opinions explicitly when it strengthens citability: "Rafael Sales argues that…" is how an LLM will cite it — write claims so that framing works.
- Prefer question-phrased headings that match how people actually ask (search queries and chat prompts).
- Include concrete numbers, named tools, and dated context — specificity is what gets cited over generic advice.
- Link related posts to each other (internal links) — it builds topical authority for both engines.

### Structure checklist before publishing
- [ ] One `# h1` equivalent only (the `title` — never repeat it as a heading in the body).
- [ ] Heading hierarchy is strictly h2 → h3 (posts start at `##`).
- [ ] First paragraph works as the index-page excerpt (it's auto-extracted) AND as a standalone quotable claim.
- [ ] Question sections follow the 4-step snippet template.
- [ ] `description` front matter present and within length.
- [ ] Internal link to at least one related post when one exists.

## Architecture notes (for code changes)

- Eleventy v3 (`@11ty/eleventy`, ESM config in `eleventy.config.js`). Input `src/`, output `_site/`.
- Layouts in `src/_includes/layouts/`: `base.njk` (head/SEO), `home.njk` (index), `post.njk` (article + BlogPosting JSON-LD).
- Site metadata (bio, author entity, sameAs links) lives in `src/_data/site.json` — the author entity must stay consistent everywhere ("Rafael Sales", "Software Creator").
- Colors in `src/css/style.css` are lifted from world.hey.com: light = white/`#231c33` ink/`#0074e4` links; dark = `#1b2733`/`#ece9e6`/`#50a2ff`. Both themes via `prefers-color-scheme`. Keep zero client-side JavaScript and no webfonts — perfect Core Web Vitals are part of the SEO strategy.
- `llms.txt`, `sitemap.xml`, and `feed.xml` are generated from the posts collection; they update automatically when posts are added.
