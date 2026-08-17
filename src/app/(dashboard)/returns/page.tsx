import { requirePermission } from "@/lib/auth";
import { ReturnsClient } from "./returns-client";

export default async function ReturnsPage() {
  const session = await requirePermission("returns.view");
  return <ReturnsClient canCreate={session.permissions.includes("returns.create")} />;
}
