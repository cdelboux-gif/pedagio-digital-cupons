import { TRPCError } from "@trpc/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, createLoginInvite: vi.fn(), listLoginInvites: vi.fn(), revokeLoginInvite: vi.fn(), activateLoginInvite: vi.fn(), upsertUser: vi.fn(), getPendingLoginInvite: vi.fn(), getUserByOpenId: vi.fn(), appendAuditLog: vi.fn() };
});

import * as db from "./db";
import { appRouter } from "./routers";
import { buildInvitedUserFields } from "./_core/oauth";
import type { TrpcContext } from "./_core/context";

const createLoginInvite = vi.mocked(db.createLoginInvite);
const listLoginInvites = vi.mocked(db.listLoginInvites);
const revokeLoginInvite = vi.mocked(db.revokeLoginInvite);
const activateLoginInvite = vi.mocked(db.activateLoginInvite);

function context(accessLevel: "admin" | "viewer" = "admin"): TrpcContext {
  return { user: { id: 9, openId: "invite-admin", email: "admin@example.com", name: "Admin", loginMethod: "test", role: accessLevel === "admin" ? "admin" : "user", accessLevel, entityId: null, partnerId: null, storeId: null, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] };
}

const invite = { id: 5, email: "convidado@example.com", tokenHash: "hash-interno", status: "pending", accessLevel: "operator", entityId: null, partnerId: 2, storeId: null, invitedByUserId: 9, acceptedUserId: null, expiresAt: new Date("2026-09-01"), acceptedAt: null, revokedAt: null, createdAt: new Date(), updatedAt: new Date() } as Awaited<ReturnType<typeof db.getLoginInviteById>>;

afterEach(() => { vi.restoreAllMocks(); db.clearDbForTests(); });

beforeEach(() => {
  vi.clearAllMocks();
  const { tokenHash: _tokenHash, ...safeInvite } = invite;
  createLoginInvite.mockResolvedValue({ invite: safeInvite as typeof invite, token: "pd_inv_secret_once" });
  listLoginInvites.mockResolvedValue([safeInvite as typeof invite]);
  revokeLoginInvite.mockResolvedValue({ ...invite, status: "revoked", tokenHash: undefined } as typeof invite);
  activateLoginInvite.mockResolvedValue({ ...safeInvite, status: "accepted", acceptedUserId: 12 } as typeof invite);
  vi.mocked(db.appendAuditLog).mockResolvedValue(undefined);
});

describe("login invite security", () => {
  it("normalizes e-mails and hashes tokens without returning the raw value", () => {
    const token = db.createLoginInviteToken();
    expect(token).toMatch(/^pd_inv_/);
    expect(db.hashLoginInviteToken(token)).toHaveLength(64);
    expect(db.hashLoginInviteToken(token)).not.toBe(token);
    expect(db.normalizeLoginEmail("  Pessoa@Exemplo.COM ")).toBe("pessoa@exemplo.com");
  });

  it("creates a one-time invite URL using the requested frontend origin", async () => {
    const caller = appRouter.createCaller(context());
    const result = await caller.admin.access.invites.create({ email: " Convidado@Example.com ", accessLevel: "operator", partnerId: 2, origin: "https://backoffice.example.com/", expiresInDays: 7 });

    expect(createLoginInvite).toHaveBeenCalledWith(expect.objectContaining({ email: "Convidado@Example.com", accessLevel: "operator", partnerId: 2, invitedByUserId: 9 }));
    expect(result.inviteUrl).toBe("https://backoffice.example.com/convite?token=pd_inv_secret_once");
    expect(result).not.toHaveProperty("tokenHash");
  });

  it("lists and revokes invites without exposing token hashes", async () => {
    const caller = appRouter.createCaller(context());
    const rows = await caller.admin.access.invites.list();
    expect(rows[0]).not.toHaveProperty("tokenHash");
    expect(db.publicLoginInvite(invite)).not.toHaveProperty("tokenHash");
    await caller.admin.access.invites.revoke({ id: 5 });
    expect(revokeLoginInvite).toHaveBeenCalledWith(5);
  });

  it("rejects expired or already consumed tokens and preserves invite scopes", () => {
    expect(db.isLoginInviteUsable({ status: "pending", expiresAt: new Date("2026-09-01") }, new Date("2026-08-25"))).toBe(true);
    expect(db.isLoginInviteUsable({ status: "pending", expiresAt: new Date("2026-08-01") }, new Date("2026-08-25"))).toBe(false);
    expect(db.isLoginInviteUsable({ status: "accepted", expiresAt: new Date("2026-09-01") }, new Date("2026-08-25"))).toBe(false);
    expect(db.buildAcceptedLoginInvitePatch({ status: "pending", expiresAt: new Date("2026-09-01") }, 12, new Date("2026-08-25"))).toEqual({ status: "accepted", acceptedUserId: 12, acceptedAt: new Date("2026-08-25") });
    expect(db.buildAcceptedLoginInvitePatch({ status: "accepted", expiresAt: new Date("2026-09-01") }, 12, new Date("2026-08-25"))).toBeNull();
    expect(db.getLoginInviteAccessPatch({ accessLevel: "operator", entityId: 3, partnerId: 2, storeId: 8 })).toEqual({ accessLevel: "operator", entityId: 3, partnerId: 2, storeId: 8, role: undefined });
  });

  it("consumes a valid token only once in the real acceptance helper", async () => {
    let status: "pending" | "accepted" = "pending";
    const fakeDb = {
      update: () => ({ set: (values: Record<string, unknown>) => ({ where: async () => { if (status !== "pending") return [{ affectedRows: 0 }]; status = values.status as "accepted"; return [{ affectedRows: 1 }]; } }) }),
      select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: async () => [{ ...invite, status }] }), limit: async () => [{ ...invite, status }] }) }) }),
    };
    db.setDbForTests(fakeDb);
    await expect(db.acceptLoginInvite(invite.email, "pd_inv_secret_once", 12)).resolves.toMatchObject({ status: "accepted" });
    await expect(db.acceptLoginInvite(invite.email, "pd_inv_secret_once", 12)).resolves.toBeNull();
    expect(status).toBe("accepted");
  });

  it("builds the OAuth first-login patch with every invited scope", () => {
    expect(buildInvitedUserFields({ accessLevel: "manager", entityId: 3, partnerId: 2, storeId: 8 })).toEqual({ accessLevel: "manager", entityId: 3, partnerId: 2, storeId: 8, role: undefined });
  });

  it("supports admin activation only for the matching invited user", async () => {
    const caller = appRouter.createCaller(context());
    await expect(caller.admin.access.invites.activate({ id: 5, userId: 12 })).resolves.toMatchObject({ status: "accepted", acceptedUserId: 12 });
    expect(activateLoginInvite).toHaveBeenCalledWith(5, 12);
  });

  it("blocks invite creation for Consulta users", async () => {
    const caller = appRouter.createCaller(context("viewer"));
    await expect(caller.admin.access.invites.create({ email: "blocked@example.com", accessLevel: "viewer", origin: "https://backoffice.example.com" })).rejects.toMatchObject<Partial<TRPCError>>({ code: "FORBIDDEN" });
    expect(createLoginInvite).not.toHaveBeenCalled();
  });
});


describe("OAuth invited first login", () => {
  it("persists invited access scopes and consumes the invite before creating session", async () => {
    const { registerOAuthRoutes } = await import("./_core/oauth");
    const { sdk } = await import("./_core/sdk");
    const { LOGIN_INVITE_COOKIE, OAUTH_STATE_COOKIE, encodeOAuthState } = await import("@shared/const");
    const upsertUser = vi.mocked(db.upsertUser);
    const getPending = vi.mocked(db.getPendingLoginInvite);
    const getUser = vi.mocked(db.getUserByOpenId);
    const accept = vi.spyOn(db, "acceptLoginInvite").mockResolvedValue({ ...invite, status: "accepted" } as never);
    const oauthInvite = { ...invite, entityId: 3, storeId: 8 };
    upsertUser.mockResolvedValue(undefined);
    getPending.mockResolvedValue(oauthInvite);
    getUser.mockResolvedValue({ ...oauthInvite, id: 42, openId: "oauth-open-id", email: oauthInvite.email, name: "Convidado", loginMethod: "email", role: "user", accessLevel: "operator", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } as never);
    vi.spyOn(sdk, "exchangeCodeForToken").mockResolvedValue({ accessToken: "access-token" } as never);
    vi.spyOn(sdk, "getUserInfo").mockResolvedValue({ openId: "oauth-open-id", email: invite.email, name: "Convidado", platform: "email", loginMethod: "email" } as never);
    vi.spyOn(sdk, "createSessionToken").mockResolvedValue("session-token");
    let handler: ((req: unknown, res: unknown) => Promise<void>) | undefined;
    registerOAuthRoutes({ get: (_path: string, callback: typeof handler) => { handler = callback; } } as never);
    const state = encodeOAuthState({ redirectUri: "https://backoffice.example.com/api/oauth/callback", nonce: "nonce" });
    const response = { clearCookie: vi.fn(), cookie: vi.fn(), redirect: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() };
    await handler?.({ query: { code: "code", state }, headers: { cookie: `${OAUTH_STATE_COOKIE}=nonce; ${LOGIN_INVITE_COOKIE}=pd_inv_secret_once` } }, response);
    expect(upsertUser).toHaveBeenCalledWith(expect.objectContaining({ accessLevel: "operator", entityId: 3, partnerId: 2, storeId: 8 }));
    expect(accept).toHaveBeenCalledWith(invite.email, "pd_inv_secret_once", 42);
    expect(response.redirect).toHaveBeenCalledWith(302, "/");
  });
});
