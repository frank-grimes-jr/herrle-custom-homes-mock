import "server-only";
import { NextResponse } from "next/server";
import { saveAnalysisSettings } from "@/lib/settings";

export async function POST(request: Request) {
  const form = await request.formData();
  saveAnalysisSettings({
    reasonModel: String(form.get("reasonModel") ?? "claude-opus-4-8"),
    enrichModel: String(form.get("enrichModel") ?? "claude-haiku-4-5"),
    systemPrompt: String(form.getAll("systemPrompt").pop() ?? ""),
    windowDays: Number(form.get("windowDays")) || 30,
    maxThreads: Number(form.get("maxThreads")) || 40,
  });
  return NextResponse.redirect(new URL("/admin?analysis=saved", request.url), { status: 303 });
}
