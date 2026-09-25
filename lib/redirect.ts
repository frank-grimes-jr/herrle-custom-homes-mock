// Same-app redirect with a RELATIVE Location, so the browser stays on the address
// Dave is actually using (http://herrle.internal). `new URL(path, request.url)`
// would send him to http://localhost:3000 — Next builds request.url from its own
// listen address, not the Host header.
export function redirectTo(path: string, status = 303): Response {
  return new Response(null, { status, headers: { Location: path } });
}
