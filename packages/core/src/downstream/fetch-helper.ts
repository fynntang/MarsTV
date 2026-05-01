// ============================================================================
// 带超时的 fetch 封装,平台中立(Web / Node / RN 都可跑)
// ============================================================================

export interface FetchJsonOptions {
  /** 超时毫秒,默认 8000 */
  timeoutMs?: number;
  /** 自定义 headers */
  headers?: Record<string, string>;
  /** 用于取消的外部 signal(会与内部超时 signal 合并) */
  signal?: AbortSignal;
}

export class FetchTimeoutError extends Error {
  readonly url: string;
  readonly timeoutMs: number;

  constructor(url: string, timeoutMs: number) {
    super(`Fetch timeout after ${timeoutMs}ms: ${url}`);
    this.name = 'FetchTimeoutError';
    this.url = url;
    this.timeoutMs = timeoutMs;
  }
}

export class FetchHttpError extends Error {
  readonly url: string;
  readonly status: number;

  constructor(url: string, status: number, body: string) {
    super(`HTTP ${status} from ${url}: ${body.slice(0, 200)}`);
    this.name = 'FetchHttpError';
    this.url = url;
    this.status = status;
  }
}

/** 带超时 + 错误分类的 JSON fetch */
export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const { timeoutMs = 8000, headers, signal: externalSignal } = options;

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

  // 合并外部 signal
  const onExternalAbort = () => timeoutController.abort();
  if (externalSignal) {
    if (externalSignal.aborted) timeoutController.abort();
    else externalSignal.addEventListener('abort', onExternalAbort);
  }

  try {
    const res = await fetch(url, {
      headers: {
        accept: 'application/json, text/plain, */*',
        'user-agent': 'Mozilla/5.0 (compatible; MarsTV/0.1; +https://github.com/marstv)',
        ...headers,
      },
      // biome-ignore lint/suspicious/noExplicitAny: DOM/RN AbortSignal type mismatch
      signal: timeoutController.signal as any,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new FetchHttpError(url, res.status, body);
    }

    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new FetchTimeoutError(url, timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
  }
}
