import { z } from 'zod';

// The server's Content-Security-Policy forbids eval. zod would otherwise probe for it with
// `new Function` the first time it validates anything, which the browser reports as a CSP
// violation on every page (zod catches the error and falls back to this same mode, so behaviour
// doesn't change). This is its own module, imported first in main.tsx, because ES modules run
// every import before the importing file's code: set later, a schema used at import time would
// already have triggered the probe.
z.config({ jitless: true });
