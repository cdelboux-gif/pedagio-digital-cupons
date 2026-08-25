import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

type AccessLevel = "admin" | "manager" | "operator" | "viewer";

function hasAccess(ctx: TrpcContext, allowed: AccessLevel[]) {
  if (!ctx.user) return false;
  if (ctx.user.role === "admin") return true;
  return allowed.includes(ctx.user.accessLevel as AccessLevel);
}

const accessProcedure = (allowed: AccessLevel[], anonymousCode: "FORBIDDEN" | "UNAUTHORIZED" = "UNAUTHORIZED") =>
  t.procedure.use(
    t.middleware(async opts => {
      const { ctx, next } = opts;
      if (!hasAccess(ctx, allowed)) {
        throw new TRPCError({ code: ctx.user ? "FORBIDDEN" : anonymousCode, message: ctx.user ? NOT_ADMIN_ERR_MSG : UNAUTHED_ERR_MSG });
      }
      return next({ ctx: { ...ctx, user: ctx.user! } });
    }),
  );

/** Backward-compatible alias for management operations. */
export const adminProcedure = accessProcedure(["admin", "manager"], "FORBIDDEN");
export const viewProcedure = accessProcedure(["admin", "manager", "operator", "viewer"]);
export const operationProcedure = accessProcedure(["admin", "manager", "operator"]);
export const superAdminProcedure = accessProcedure(["admin"]);
