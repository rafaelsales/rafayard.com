# rafayard.com

Personal blog of Rafael Sales — Software Creator. Built with [Eleventy](https://github.com/11ty/buildawesome), deployed to GitHub Pages on push to `main`.

## Writing a post

Create `src/posts/YYYY-MM-DD-slug.md`:

```markdown
---
title: The post title
description: 140–160 char meta description stating the post's claim.
---
First paragraph doubles as the excerpt on the index page.
```

Push to `main`. Done — the Actions workflow builds and publishes to https://rafayard.com.

See `CLAUDE.md` for the full content/SEO/GEO playbook.

## Local development

```sh
npm install
npm run serve   # http://localhost:8080
```
