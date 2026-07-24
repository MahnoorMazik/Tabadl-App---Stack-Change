/**
 * Form Builder API client (fetch + session cookies).
 * Uses fetch instead of axios so 404 "not found" does not trigger the global axios sign-out interceptor.
 */

export class FormApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'FormApiError'
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
    throw new FormApiError(
      extractErrorMessage(json, `Request failed (${res.status})`),
      res.status,
      json
    )
  }

  // Structured success: { success, data } or raw payload
  if (json && typeof json === 'object' && 'data' in json) {
    return json.data as T
  }
  return json as T
}

export const formApi = {
  listTemplates: () =>
    request<{ templates: any[] }>('/api/admin/form-templates'),

  getTemplate: (id: string) =>
    request<{ template: any }>(`/api/admin/form-templates/${id}`),

  createTemplate: (body: unknown) =>
    request<{ template: any }>('/api/admin/form-templates', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateTemplate: (id: string, body: unknown) =>
    request<{ template: any }>(`/api/admin/form-templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteTemplate: (id: string) =>
    request<{ id: string }>(`/api/admin/form-templates/${id}`, {
      method: 'DELETE',
    }),

  listFields: () =>
    request<{ fields: any[] }>('/api/admin/form-fields'),

  createField: (body: unknown) =>
    request<{ field: any }>('/api/admin/form-fields', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  availableServices: (excludeTemplateId?: string) => {
    const qs = excludeTemplateId
      ? `?excludeTemplateId=${encodeURIComponent(excludeTemplateId)}`
      : ''
    return request<{ services: any[] }>(
      `/api/admin/business-services/available-for-form${qs}`
    )
  },
}
