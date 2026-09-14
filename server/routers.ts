import { createHash, pbkdf2Sync, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { adminRouter } from "./routers/admin";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import * as db from "./db";

function verifyLocalPassword(password: string, encodedHash: string) {
  const [algorithm, iterationsRaw, saltEncoded, hashEncoded] = encodedHash.split("$");
  if (algorithm !== "pbkdf2_sha256" || !iterationsRaw || !saltEncoded || !hashEncoded) return false;

  const iterations = Number(iterationsRaw);
  if (!Number.isInteger(iterations) || iterations < 100_000 || iterations > 1_000_000) return false;

  try {
    const salt = Buffer.from(saltEncoded, "base64url");
    const expected = Buffer.from(hashEncoded, "base64url");
    const actual = pbkdf2Sync(password, salt, iterations, expected.length, "sha256");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function localOpenId(email: string) {
  return `pd_${createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 40)}`;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    login: publicProcedure
      .input(z.object({ email: z.string().email().max(320), password: z.string().min(8).max(256) }))
      .mutation(async ({ input, ctx }) => {
        const configuredEmail = ENV.localAuthEmail.trim().toLowerCase();
        const requestedEmail = input.email.trim().toLowerCase();

        if (!configuredEmail || !ENV.localAuthPasswordHash) {
          throw new Error("Autenticação local não configurada");
        }

        const emailMatches = configuredEmail.length === requestedEmail.length && timingSafeEqual(
          Buffer.from(configuredEmail),
          Buffer.from(requestedEmail),
        );
        const passwordMatches = verifyLocalPassword(input.password, ENV.localAuthPasswordHash);

        if (!emailMatches || !passwordMatches) {
          throw new Error("E-mail ou senha inválidos");
        }

        const openId = localOpenId(configuredEmail);
        await db.upsertUser({
          openId,
          name: ENV.localAuthName,
          email: configuredEmail,
          loginMethod: "local_password",
          role: "admin",
          accessLevel: "admin",
          lastSignedIn: new Date(),
        });

        const sessionToken = await sdk.createSessionToken(openId, {
          name: ENV.localAuthName,
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
