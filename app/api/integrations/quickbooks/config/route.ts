import "server-only";
import { setSecret, QBO_CLIENT_ID, QBO_CLIENT_SECRET } from "@/lib/secrets";
import { redirectTo } from "@/lib/redirect";

// One-time developer step: store the Intuit app's OAuth client id/secret.
export async function POST(request: Request) {
  const form = await request.formData();
  const id = String(form.get("clientId") ?? "").trim();
  const secret = String(form.get("clientSecret") ?? "").trim();
  if (id) setSecret(QBO_CLIENT_ID, id);
  if (secret) setSecret(QBO_CLIENT_SECRET, secret);
  return redirectTo("/admin?quickbooks=configured");
}
