/**
 * Application Wizards API client (fetch + session cookies).
 * Uses fetch instead of axios so 404 does not trigger the global axios sign-out interceptor.
 */

export class WizardApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'WizardApiError'
    this.status = status
    this.body = body
  }
}

async function parseJson(res: Response) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

function extractErrorMessage(json: any, fallback: string) {
  if (!json) return fallback
  if (typeof json.error === 'string') return json.error
  if (typeof json.error?.message === 'string') return json.error.message
  if (typeof json.message === 'string') return json.message
  return fallback
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })

  const json = await parseJson(res)

  if (!res.ok) {
    throw new WizardApiError(
      extractErrorMessage(json, `Request failed (${res.status})`),
      res.status,
      json
    )
  }

  if (json && typeof json === 'object' && 'data' in json) {
    return json.data as T
  }
  return json as T
}

export const wizardApi = {
  list: () => request<{ wizards: any[] }>('/api/admin/wizards'),

  get: (id: string) => request<{ wizard: any }>(`/api/admin/wizards/${id}`),

  create: (body: unknown) =>
    request<{ wizard: any }>('/api/admin/wizards', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (id: string, body: unknown) =>
    request<{ wizard: any }>(`/api/admin/wizards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    request<{ id: string }>(`/api/admin/wizards/${id}`, {
      method: 'DELETE',
    }),
}
