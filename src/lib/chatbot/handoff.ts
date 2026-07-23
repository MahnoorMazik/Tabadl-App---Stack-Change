const HANDOFF_TRIGGERS = [
  'talk to human',
  'speak to agent',
  'real person',
  'human agent',
  'call me',
  'manager',
  'complaint',
  'insan se baat',
  'insaan se baat',
  'bande se baat',
  'admi se baat',
  'agent se',
  'shikayat',
  'انسان',
  'آدمی',
  'مینیجر',
  'شکایت',
  'ایجنٹ',
  'connect me',
  'live agent',
  'support team',
]

export function extractHumanHandoffIntent(text: string): boolean {
  const lower = text.toLowerCase()
  return HANDOFF_TRIGGERS.some((t) => lower.includes(t) || text.includes(t))
}

export const HANDOFF_REPLY =
  "Of course! I'm connecting you with our support team now — a team member will reply here shortly."

export const BOT_UNAVAILABLE_REPLY =
  "Our AI assistant is temporarily unavailable. A team member will assist you shortly."
