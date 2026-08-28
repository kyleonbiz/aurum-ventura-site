// Malware-scanning integration point.
//
// This is a real abstraction, not a real scanner — no malware-scanning
// service is configured anywhere in this project, and inventing one
// would mean silently claiming a security control that doesn't exist.
// `scanFile` is the one place the rest of the code calls into; wiring in
// a real scanner later (VirusTotal API, ClamAV via a sidecar, Cloudmersive,
// etc.) means only rewriting this function.
//
// Until that's wired up, every file is treated as unscanned — the return
// shape says so explicitly so callers/logs never claim otherwise.
export async function scanFile(/* buffer, filename */) {
  return { scanned: false, clean: null, provider: "none" };
}
