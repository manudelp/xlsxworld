export interface ApiError {
  detail: string;
  errorCode?: string;
}

const ANON_LIMIT_ERROR_CODES = new Set([
  "ANON_DAILY_QUOTA",
  "ANON_FILE_TOO_LARGE",
]);

function maybeDispatchUpgrade(errorCode: string | undefined, message: string): void {
  if (typeof window === "undefined") return;
  if (!errorCode || !ANON_LIMIT_ERROR_CODES.has(errorCode)) return;
  window.dispatchEvent(
    new CustomEvent("xlsxworld:upgrade-requested", {
      detail: { reason: errorCode, message },
    }),
  );
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly errorCode?: string;

  constructor(detail: string, status: number, errorCode?: string) {
    super(detail);
    this.name = "ApiRequestError";
    this.status = status;
    this.errorCode = errorCode;
  }
}

async function extractError(
  res: Response,
): Promise<{ detail: string; errorCode?: string }> {
  let detail = res.statusText || "Request failed";
  let errorCode: string | undefined;
  try {
    const data = await res.json();
    if (data?.detail) detail = String(data.detail);
    if (data?.error_code) errorCode = String(data.error_code);
  } catch {
    // body wasn't JSON; fall back to status text
  }
  return { detail, errorCode };
}

const APP_ORIGIN =
  typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");

const AUTH_ROUTE_PREFIX = "/api/auth/";
const PROXY_PREFIX = "/api/proxy";

function normalizePath(path: string): string {
  if (path.startsWith("/api/proxy/")) {
    return path;
  }

  if (path === "/api/auth" || path.startsWith(AUTH_ROUTE_PREFIX)) {
    return path;
  }

  if (path.startsWith("/api/")) {
    return `${PROXY_PREFIX}${path}`;
  }

  return path;
}

export function buildUrl(
  path: string,
  qs?: Record<string, string | number | boolean | undefined>,
): string {
  const url = new URL(normalizePath(path), APP_ORIGIN);
  if (qs) {
    Object.entries(qs).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return `${url.pathname}${url.search}`;
}

export function buildUrlWithArrayParams(
  path: string,
  params: Record<string, string | string[]>,
): string {
  const url = new URL(normalizePath(path), APP_ORIGIN);
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, item));
    } else {
      url.searchParams.set(key, value);
    }
  });
  return `${url.pathname}${url.search}`;
}

function isAuthManagementRoute(path: string): boolean {
  return (
    path === "/api/auth" ||
    path.startsWith("/api/auth/login") ||
    path.startsWith("/api/auth/signup") ||
    path.startsWith("/api/auth/refresh") ||
    path.startsWith("/api/auth/logout")
  );
}

let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }

  if (!refreshInFlight) {
    refreshInFlight = fetch(buildUrl("/api/auth/refresh"), {
      method: "POST",
      credentials: "include",
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
}

async function clearSessionAndRedirect(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  await fetch(buildUrl("/api/auth/logout"), {
    method: "POST",
    credentials: "include",
  }).catch(() => undefined);

  const next = encodeURIComponent(
    window.location.pathname + window.location.search,
  );
  window.location.assign(`/login?next=${next}`);
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const { detail, errorCode } = await extractError(res);
    maybeDispatchUpgrade(errorCode, detail);
    throw new ApiRequestError(detail, res.status, errorCode);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json() as Promise<T>;
  }

  // @ts-expect-error - caller must know non-json
  return res.arrayBuffer();
}

async function sendRequest(
  path: string,
  init: RequestInit,
  retryOnUnauthorized: boolean,
): Promise<Response> {
  const response = await fetch(buildUrl(path), {
    ...init,
    credentials: "include",
  });

  if (
    response.status !== 401 ||
    !retryOnUnauthorized ||
    isAuthManagementRoute(path)
  ) {
    return response;
  }

  const refreshed = await refreshSession();
  if (!refreshed) {
    await clearSessionAndRedirect();
    return response;
  }

  const retryResponse = await fetch(buildUrl(path), {
    ...init,
    credentials: "include",
  });

  if (retryResponse.status === 401) {
    await clearSessionAndRedirect();
  }

  return retryResponse;
}

export interface ToolFileResult {
  buffer: ArrayBuffer;
  visualElementsRemoved: boolean;
}

export async function postFormForFile(
  path: string,
  form: FormData,
): Promise<ToolFileResult> {
  const res = await fetch(buildUrl(path), {
    method: "POST",
    body: form,
    credentials: "include",
  });
  if (!res.ok) {
    const { detail, errorCode } = await extractError(res);
    maybeDispatchUpgrade(errorCode, detail);
    throw new ApiRequestError(detail, res.status, errorCode);
  }
  const buffer = await res.arrayBuffer();
  return {
    buffer,
    visualElementsRemoved:
      res.headers.get("X-Visual-Elements-Removed") === "true",
  };
}

export const api = {
  async postForm<T>(
    path: string,
    form: FormData,
    qs?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    const response = await sendRequest(
      buildUrl(path, qs),
      { method: "POST", body: form },
      false,
    );
    return handle<T>(response);
  },
  async get<T>(
    path: string,
    qs?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    const response = await sendRequest(
      buildUrl(path, qs),
      { method: "GET" },
      false,
    );
    return handle<T>(response);
  },
  async postJson<T>(
    path: string,
    body: unknown,
    qs?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    const response = await sendRequest(
      buildUrl(path, qs),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
      false,
    );
    return handle<T>(response);
  },
  async patchJson<T>(
    path: string,
    body: unknown,
    qs?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    const response = await sendRequest(
      buildUrl(path, qs),
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
      false,
    );
    return handle<T>(response);
  },
  auth: {
    async get<T>(
      path: string,
      qs?: Record<string, string | number | boolean | undefined>,
    ): Promise<T> {
      const response = await sendRequest(
        buildUrl(path, qs),
        { method: "GET" },
        true,
      );
      return handle<T>(response);
    },
    async postJson<T>(
      path: string,
      body: unknown,
      qs?: Record<string, string | number | boolean | undefined>,
    ): Promise<T> {
      const response = await sendRequest(
        buildUrl(path, qs),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
        true,
      );
      return handle<T>(response);
    },
    async patchJson<T>(
      path: string,
      body: unknown,
      qs?: Record<string, string | number | boolean | undefined>,
    ): Promise<T> {
      const response = await sendRequest(
        buildUrl(path, qs),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
        true,
      );
      return handle<T>(response);
    },
    async postForm<T>(
      path: string,
      form: FormData,
      qs?: Record<string, string | number | boolean | undefined>,
    ): Promise<T> {
      const response = await sendRequest(
        buildUrl(path, qs),
        { method: "POST", body: form },
        true,
      );
      return handle<T>(response);
    },
    async delete<T>(
      path: string,
      qs?: Record<string, string | number | boolean | undefined>,
    ): Promise<T> {
      const response = await sendRequest(
        buildUrl(path, qs),
        { method: "DELETE" },
        true,
      );
      return handle<T>(response);
    },
  },
};
