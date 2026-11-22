import { z } from 'zod';

// CSP forbids eval: stop zod probing it with `new Function`. Imported first in main.tsx.
z.config({ jitless: true });
