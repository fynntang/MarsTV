import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Minimal CF setup — we don't use ISR / revalidateTag yet,
// so all three overrides point to dummy (in‑memory, no persistence).
export default defineCloudflareConfig({
  incrementalCache: 'dummy',
  tagCache: 'dummy',
  queue: 'dummy',
});
