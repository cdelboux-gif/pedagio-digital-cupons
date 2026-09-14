import { LOGIN_INVITE_COOKIE } from "@shared/const";

export { COOKIE_NAME, LOGIN_INVITE_COOKIE, ONE_YEAR_MS } from "@shared/const";

// Pedágio Digital local authentication entrypoint. The application no longer
// depends on the external Manus OAuth portal for the backoffice login flow.
export const startLogin = (inviteToken?: string) => {
  if (inviteToken) {
    document.cookie = `${LOGIN_INVITE_COOKIE}=${encodeURIComponent(inviteToken)}; Path=/; Max-Age=900; SameSite=Lax; Secure`;
  }
  window.location.href = "/login";
};
