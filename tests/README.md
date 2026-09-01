# Tests

Playwright against the real `index.html` in the pre-installed Chromium.

```sh
npm i playwright          # or use an existing install
node tests/test.js        # the inbox flow
node tests/test2.js       # structure, all 96 combos, 288 thread variants
```

Both exit non-zero on a failed assertion or any console error. They load the
file over `file://`, so they need no server. `executablePath` points at
`/opt/pw-browsers/chromium`; change it if your Chromium lives elsewhere.
