# Turbopack worker bootstrap breaks when a query is appended to the worker URL

Minimal reproduction for a Turbopack production-build bug in Next.js 16.3.5.

Turbopack starts a Web Worker created with `new Worker(new URL('./worker.ts', import.meta.url))`
through a bootstrap script (`/_next/static/chunks/turbopack-worker-*.js`) and passes its config in
the URL fragment: `…/turbopack-worker-<hash>.js#params=%5B…%5D`.

Some environments append a query string to the worker script URL when the worker is created. The
Facebook and Instagram in-app browsers do this in production (`?fbclid=…`), and so do some link
decorators and crawlers. A query appended after the fragment becomes part of `location.hash`, so it
is decoded into the JSON string and the worker dies before its module loads.

## Steps

```sh
npm install
npm run build   # Next.js 16.3.5 builds with Turbopack by default
npm start
```

Open http://localhost:3000/. The page starts the same worker twice:

- **Control:** a plain `new Worker(new URL('./worker.ts', import.meta.url))`.
- **Decorated:** the same call with `window.Worker` wrapped to append `?fbclid=abc` to the URL,
  simulating the in-app browser.

## Expected

Both lines say `booted`.

## Actual

```
Control worker: booted
Worker URL with ?fbclid=abc appended: error: Uncaught SyntaxError: Unexpected non-whitespace character after JSON at position 116 (line 1 column 117)
```

`N` (116 here) is the exact length of the valid config payload. Everything after it is the
appended query.

## Cause

The bootstrap reads the config like this (from the built chunk):

```js
var o = new URL(location.href), e = o.searchParams.get("params");
!e && o.hash.startsWith("#params=") && (e = decodeURIComponent(o.hash.slice(8)));
var i = JSON.parse(e);
```

## Suggested fix

The payload is `encodeURIComponent`-encoded, so a literal `?` or `&` in the raw hash can only be
appended text. Cut the raw hash at the first `?` or `&` before decoding, or parse only up to the
payload's closing `]`.
