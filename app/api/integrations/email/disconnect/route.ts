import "server-only";
import { deleteSecret, IMAP_USER, IMAP_PASSWORD, IMAP_HOST } from "@/lib/secrets";
import { redirectTo } from "@/lib/redirect";

export async function POST() {
  deleteSecret(IMAP_USER);
  deleteSecret(IMAP_PASSWORD);
  deleteSecret(IMAP_HOST);
  return redirectTo("/admin?email=disconnected");
}
