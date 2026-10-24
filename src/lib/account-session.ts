export const DEMO_ACCOUNT_SESSION_KEY = "exch-demo-account-session";
export const DEMO_CUSTOMER_ID = "WmZXuiLVHUcv1rrgALNia4";
let inMemoryDemoSession = false;

export function hasDemoAccountSession(): boolean {
  try {
    return inMemoryDemoSession || (typeof window !== "undefined" && window.sessionStorage.getItem(DEMO_ACCOUNT_SESSION_KEY) === "signed-in");
  } catch {
    return false;
  }
}

export function startDemoAccountSession(): void {
  inMemoryDemoSession = true;
  try {
    window.sessionStorage.setItem(DEMO_ACCOUNT_SESSION_KEY, "signed-in");
  } catch {
    // The demo flow can continue for this navigation if session storage is unavailable.
  }
}

export function endDemoAccountSession(): void {
  inMemoryDemoSession = false;
  try {
    window.sessionStorage.removeItem(DEMO_ACCOUNT_SESSION_KEY);
  } catch {
    // The gate will ask the user to sign in again on the next route load.
  }
}
