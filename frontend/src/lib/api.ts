import { clearSession, getAccessToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean;
};

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, auth = false, headers, ...rest } = options;
  const token = auth ? getAccessToken() : null;

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string | string[] }
    | T
    | null;

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
    }

    const message = Array.isArray(
      payload && "message" in payload ? payload.message : undefined,
    )
      ? (payload as { message: string[] }).message[0]
      : payload &&
          typeof payload === "object" &&
          "message" in payload &&
          typeof payload.message === "string"
        ? payload.message
        : "Something went wrong";

    throw new ApiError(response.status, message);
  }

  return payload as T;
}
