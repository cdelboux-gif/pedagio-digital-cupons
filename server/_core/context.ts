import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { ENV } from "./env";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  if (!user && ENV.homologationBypassAuth) {
    const openId = "pd_homologation_admin";
    await db.upsertUser({
      openId,
      name: "Homologação Pedágio Digital",
      email: "homologacao@pedagiodigital.com.br",
      loginMethod: "homologation_bypass",
      role: "admin",
      accessLevel: "admin",
      lastSignedIn: new Date(),
    });
    user = (await db.getUserByOpenId(openId)) ?? null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
