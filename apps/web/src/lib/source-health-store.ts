// ============================================================================
// Module-scoped in-memory health store singleton for the web app.
// Lives as long as the Node.js process; resets on restart (known M1 limitation).
// ============================================================================

import { type ISourceHealthStore, createInMemoryHealthStore } from '@marstv/core';

export const sourceHealthStore: ISourceHealthStore = createInMemoryHealthStore();
