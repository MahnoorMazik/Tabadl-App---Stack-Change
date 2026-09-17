import { redirect } from "next/navigation";

// Redirect old /support/[id] route to main support page (now uses dialog)
export default function RedirectSupportDetail({ params }: { params: Promise<{ id: string }> }) {
  // We can't redirect to a specific ticket view since it's now a dialog
  // Just redirect to the main support page
  redirect("/admin/support");
}
