import "server-only";
import { setSecret, IMAP_USER, IMAP_PASSWORD } from "@/lib/secrets";
import { verifyLogin } from "@/lib/email";
import { redirectTo } from "@/lib/redirect";

// Dave enters his Gmail address + a 16-char App Password. We verify the login
// before saving, and say WHY it failed (Admin maps the code to a fix).
export async function POST(request: Request) {
  const form = await request.formData();
  const user = String(form.get("email") ?? "").trim();
  const pass = String(form.get("appPassword") ?? "").replace(/\s+/g, ""); // Google shows app passwords with spaces
  const back = (s: string) => redirectTo(`/admin?email=${s}`);

  if (!user || !pass) return back("error");
  const problem = await verifyLogin(user, pass);
  if (problem) return back(problem);

  setSecret(IMAP_USER, user);
  setSecret(IMAP_PASSWORD, pass);
  return back("connected");
}
