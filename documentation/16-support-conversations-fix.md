# Support Conversations Fix Log (January 2025)

## Symptoms
- Clients could not see staff replies in some threads.
- Typing indicators flickered or displayed for wrong user.
- Unauthorized staff roles accessed conversations outside their assignments.

## Fix Summary
1. **Authorization Guard** – Tightened API filters to ensure only participants (or admins) can fetch a conversation.
2. **Socket Namespaces** – Segmented Socket.IO rooms per conversation to prevent cross-talk.
3. **Typing Indicator** – Added debounce and user-specific keys to remove flicker; auto-clear on disconnect.
4. **Audit Trail** – Logged conversation joins/leaves for compliance.

## Validation
- Multi-user manual tests executed 28 January 2025.
- Re-tested during November 2025 realtime QA; no regressions.

## Next Steps
- Automate support transcript export for compliance.
- Consider adding SLA timers to highlight idle conversations.

---
**Status:** Resolved (v1.0) — Stable as of 10 November 2025.

