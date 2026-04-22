import axios, { AxiosInstance, AxiosResponse } from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";

export interface TrpcSession {
  client: AxiosInstance;
  jar: CookieJar;
  /** GET request (tRPC query) — input dikirim sebagai ?input=<encoded JSON> */
  query(proc: string, input?: unknown): Promise<AxiosResponse>;
  /** POST request (tRPC mutation) — input dikirim sebagai raw JSON body */
  mutate(proc: string, input?: unknown): Promise<AxiosResponse>;
  cookie(name: string, origin: string): string | undefined;
}

/**
 * Buat sesi tRPC baru dengan cookie jar tersendiri.
 *
 * tRPC v11 HTTP protocol:
 *   query    → GET  /trpc/<proc>?input=<encoded JSON>     (NO {json:} wrapper)
 *   mutation → POST /trpc/<proc>  body = raw JSON          (NO {json:} wrapper)
 */
export function createTrpcSession(baseURL: string): TrpcSession {
  const jar = new CookieJar();
  const client = wrapper(
    axios.create({
      baseURL,
      withCredentials: true,
      validateStatus: () => true,
      jar,
      headers: { "Content-Type": "application/json" },
    }),
  );

  return {
    client,
    jar,
    async query(proc, input) {
      const qs =
        input != null
          ? `?input=${encodeURIComponent(JSON.stringify(input))}`
          : "";
      return client.get(`/${proc}${qs}`);
    },
    async mutate(proc, input) {
      return client.post(`/${proc}`, input ?? {});
    },
    cookie(name, origin) {
      const cookies = jar.getCookiesSync(origin);
      return cookies.find((c) => c.key === name)?.value;
    },
  };
}

/**
 * Ekstrak data payload dari respons tRPC.
 * tRPC v11 format sukses: { result: { data: <value> } }
 */
export function trpcData<T = unknown>(res: AxiosResponse): T | null {
  try {
    return (res.data?.result?.data as T) ?? null;
  } catch {
    return null;
  }
}

/**
 * Cek apakah respons adalah tRPC error dengan HTTP status tertentu.
 * tRPC error format: { error: { data: { httpStatus: number } } }
 */
export function isTrpcError(res: AxiosResponse, httpStatus?: number): boolean {
  if (httpStatus !== undefined) {
    return res.data?.error?.data?.httpStatus === httpStatus;
  }
  return res.status >= 400;
}
