import axios, { type InternalAxiosRequestConfig } from "axios";

const configuredBase =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";
export const apiClient = axios.create({
  baseURL: configuredBase.replace(/\/$/, ""),
  withCredentials: true,
  headers: { Accept: "application/json", "Content-Type": "application/json" },
  timeout: 45_000,
});

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
let unauthorizedHandler: (() => void) | null = null;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};
export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  unauthorizedHandler = handler;
};

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as
      (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !String(original.url || "").includes("/auth/")
    ) {
      original._retried = true;
      try {
        if (!refreshPromise) {
          refreshPromise = apiClient
            .post("/auth/refresh")
            .then((r) => {
              const token = r.data?.data?.accessToken;
              setAccessToken(typeof token === "string" ? token : null);
              return typeof token === "string" ? token : null;
            })
            .catch(() => null)
            .finally(() => {
              refreshPromise = null;
            });
        }
        const token = await refreshPromise;
        if (token) {
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        }
      } catch {
        /* handled below */
      }
      setAccessToken(null);
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
    if (error.code === "ECONNABORTED")
      return "The request took too long. Please try again.";
    if (!error.response)
      return "Unable to reach the server. Check the API URL and your connection.";
  }
  return "Something went wrong. Please try again.";
}
export function unwrap<T = any>(response: any): T {
  return response?.data?.data as T;
}
