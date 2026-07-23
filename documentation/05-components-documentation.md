# UI Components Reference (November 2025)

Tabadl Alkon CRM composes its interface from reusable React components located under `src/components`. The system blends shadcn/ui primitives, Radix UI, and bespoke modules tailored to business workflows.

## Design System
- **Styling:** Tailwind CSS 4 with CSS variables for theming
- **Typography:** Geist & Geist Mono fonts (bundled under `public/fonts`)
- **Icons:** Lucide React icon set
- **Animation:** Framer Motion for micro-interactions

## Foundation
| Component | Purpose |
| --- | --- |
| `ui/button` | Primary, secondary, ghost, destructive variants with Tailwind tokens |
| `ui/card` & `ui/badge` | Layout surfaces and status chips |
| `ui/dialog`, `ui/drawer`, `ui/dropdown-menu` | Modal interactions (Radix-based) |
| `ui/input`, `ui/textarea`, `ui/email-input` | Form controls with validation feedback |
| `ui/table`, `ui/data-table` | Tabular presentations integrated with react-table |
| `ui/toast` (`sonner`) | Notification system |
| `ui/tabs`, `ui/accordion`, `ui/tooltip` | Secondary navigation |

## Layout & Navigation
- `LayoutShell` — base layout for admin/client portals
- `PermissionAwareSidebar`, `ClientSidebar` — role-driven navigation trees
- `Topbar`, `Breadcrumbs`, `CommandPalette` — quick navigation and context

## Data Visualization
- `AnalyticsCard`, `MetricTrend`, `RevenueChart`, `LeadsByCountryMap`
- Built atop Recharts with Tailwind theming; responsive by default

## Forms & Wizards
- `FormSection`, `FormField`, `FormStepper` — wrappers around React Hook Form
- `FileUploader`, `DocumentStatusBadge` — document-specific interactions
- `RolePermissionMatrix`, `PermissionToggle` — RBAC management UI

## Messaging & Collaboration
- `ConversationList`, `MessageComposer`, `TypingIndicator`
- `NotificationBell`, `NotificationList`
- Socket hooks (`use-socket`) feed real-time updates into these components

## Application & Task Modules
- `ApplicationSummary`, `ApplicationTimeline`, `TaskBoard`
- `StatusBadge`, `PriorityIndicator`, `AssignmentAvatarGroup`

## Client-Facing Widgets
- `ServiceHighlights`, `TestimonialCarousel`, `HeroCta`, `FAQAccordion`
- `ContactForm` integrates with `/api/settings/email/contact`
- `WhatsAppShareButton` uses configured base URL for document links

## Utilities
- `SuspenseFallbacks` for skeleton loading states
- `EmptyState` & `ErrorState` for consistent blank page messaging
- `DataFilters` (search, date range, status chips)

## Best Practices
1. Keep component props typed with explicit interfaces.
2. Favor composition over configuration—small focused building blocks.
3. Leverage Tailwind design tokens to maintain visual consistency.
4. Couple form components with Zod schemas to provide inline validation.
5. Co-locate stories/examples when adding new primitives to ease onboarding.

---
**Last Updated:** 10 November 2025

