import axios, { AxiosInstance, AxiosResponse } from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";

export interface RestSession {
  client: AxiosInstance;
  jar: CookieJar;
  /** Ambil cookie value dari jar */
  cookie(name: string, origin: string): string | undefined;
}

/**
 * Buat sesi REST baru dengan cookie jar tersendiri.
 * Setiap "user" atau "admin" butuh sesi terpisah.
 */
export function createRestSession(baseURL: string): RestSession {
  const jar = new CookieJar();
  const client = wrapper(
    axios.create({
      baseURL,
      withCredentials: true,
      // Jangan lempar exception untuk status apapun — kita assert manual
      validateStatus: () => true,
      jar,
      headers: { "Content-Type": "application/json" },
    }),
  );

  return {
    client,
    jar,
    cookie(name, origin) {
      const cookies = jar.getCookiesSync(origin);
      return cookies.find((c) => c.key === name)?.value;
    },
  };
}

/** Shorthand: parse body response sebagai typed object */
export function body<T = Record<string, unknown>>(
  res: AxiosResponse,
): T {
  return res.data as T;
}
