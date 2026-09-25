import "server-only";
import { disconnectPlaid } from "@/lib/plaid";
import { redirectTo } from "@/lib/redirect";

export async function POST() {
  disconnectPlaid();
  return redirectTo("/admin?plaid=disconnected");
}
