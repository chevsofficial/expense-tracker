export type ApiError = {
  error: {
    message: string;
  };
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as T | ApiError | null;
  if (!response.ok) {
    const message = (payload as ApiError | null)?.error?.message ?? response.statusText;
    throw new Error(message || "Request failed");
  }

  if ((payload as ApiError | null)?.error?.message) {
    throw new Error((payload as ApiError).error.message);
  }

  return payload as T;
}

export async function getJSON<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  return parseJsonResponse<T>(response);
}

export async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  return parseJsonResponse<T>(response);
}

export async function putJSON<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  return parseJsonResponse<T>(response);
}

export async function delJSON<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });
  return parseJsonResponse<T>(response);
}
