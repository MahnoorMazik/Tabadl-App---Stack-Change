import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { Module, Action, hasPermission } from "@/lib/rbac";
import { NewSupportTicketPage } from "./NewSupportTicketPage";

export default async function NewSupportTicketRoute() {
  const session = await auth();

  if (!session) {
    redirect("/admin/login");
  }

  const canCreate = await hasPermission(
    session.user.id,
    `${Module.SUPPORT}.${Action.CREATE}`
  );

  if (!canCreate) {
    redirect("/admin/dashboard");
  }

  return <NewSupportTicketPage />;
}