// Is the app shown inside another page (a sandboxed preview iframe)? There, new windows, downloads and tel: links
// may be blocked silently, so the UI offers a fallback (copyable text) instead.
export function isFramed(): boolean {
  try {
    return window.top !== window.self;
  } catch {
    return true; // cross-origin parent: reading window.top threw
  }
}
