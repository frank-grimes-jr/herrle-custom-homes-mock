import "server-only";
import { dismiss } from "@/lib/signals";
import { redirectTo } from "@/lib/redirect";

export async function POST(request: Request) {
  const form = await request.formData();
  const sig = String(form.get("signature") ?? "");
  if (sig) dismiss(sig);
  return redirectTo("/");
}
