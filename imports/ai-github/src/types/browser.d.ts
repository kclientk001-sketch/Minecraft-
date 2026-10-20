export {};
declare global {
  interface Window {
    MC_NETWORK?: { staticMode?: boolean; apiBase?: string; adminUrl?: string };
  }
}
