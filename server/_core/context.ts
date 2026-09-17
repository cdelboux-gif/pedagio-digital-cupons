import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { ENV } from "./env";

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
    const now = new Date();
    user = {
      id: 0,
      openId: "pd_homologation_admin",
      name: "Homologação Pedágio Digital",
      email: "homologacao@pedagiodigital.com.br",
      loginMethod: "homologation_bypass",
      role: "admin",
      accessLevel: "admin",
      entityId: null,
      partnerId: null,
      storeId: null,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    };
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
