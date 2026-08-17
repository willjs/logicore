export class ApiClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const res = await fetch(url, {
    ...options,
    headers: {
      ...(!isFormData && { "Content-Type": "application/json" }),
      ...(options.headers ?? {}),
    },
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiClientError(
      body?.error?.message ?? "Error en la solicitud",
      res.status,
    );
  }

  return (body?.data ?? body) as T;
}
