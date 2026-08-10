export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({
    "src/css": "css",
    "src/robots.txt": "robots.txt",
    "src/CNAME": "CNAME",
    "src/favicon.svg": "favicon.svg",
  });

  const dateFmt = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  eleventyConfig.addFilter("readableDate", (date) => dateFmt.format(date));
  eleventyConfig.addFilter("isoDate", (date) => date.toISOString());
  eleventyConfig.addFilter("isoDateOnly", (date) => date.toISOString().split("T")[0]);
  eleventyConfig.addFilter("absoluteUrl", (url, base) => new URL(url, base).href);

  // First paragraph of the rendered post, stripped of tags, for index excerpts.
  eleventyConfig.addFilter("excerpt", (content) => {
    const match = content.match(/<p>([\s\S]*?)<\/p>/);
    return match ? match[1].replace(/<[^>]+>/g, "").trim() : "";
  });

  eleventyConfig.addCollection("posts", (collection) =>
    collection.getFilteredByGlob("src/posts/*.md").sort((a, b) => b.date - a.date)
  );

  return {
    dir: { input: "src", includes: "_includes", output: "_site" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
