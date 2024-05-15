# Hacker News: Subway Mode

Are you ever on the subway with intermittent internet and you want to read hacker news?
Bored in between stations and want to get up to date on the latest discussions?
This is the project for you!

This website will prefetch links to comments on the Hacker News homepage.
It is a proxy to the official Hacker News site, but with the added benefit of prefetching and caching to provide access to content offline.

This project uses Cloudflare Workers to intercept requests to the Hacker News homepage and injects a scrip to prefetch comments on the page, so that when you click on a link, the page loads even if you are in between stations with no internet connection.

The project uses the Cloudflare Workers KV store to cache the pages to reduce the load on Hacker News.

Note: To use this with an iOS device, you must enable Link Prefetch. Go to Settings > Safari > Advanced > Feature Flags > LinkPrefetch (turn on)

---

**FAQ:**

* Can you prefetch links on the page? No, these have several other assets required to display these pages, and the 'prerender' option that accomplishes this is [deprecated](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/prerender).
