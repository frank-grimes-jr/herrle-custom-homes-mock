import "server-only";
import { disconnectQuickBooks } from "@/lib/quickbooks";
import { redirectTo } from "@/lib/redirect";

export async function POST() {
  disconnectQuickBooks();
  return redirectTo("/admin?quickbooks=disconnected");
}
