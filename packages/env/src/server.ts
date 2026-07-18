import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
		// Required for a real hosted Turso database (libsql://...); a local
		// file: URL needs no auth, so this stays optional.
		TURSO_AUTH_TOKEN: z.string().min(1).optional(),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),

		// Phase 0.5 — Better Auth (GitHub OAuth, single whitelisted user).
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.string().min(1),
		GITHUB_CLIENT_ID: z.string().min(1),
		GITHUB_CLIENT_SECRET: z.string().min(1),
		// The only email allowed to ever sign in. Enforced in
		// packages/auth/src/auth.ts's databaseHooks.user.create.before —
		// not a UI-level check, so it can't be bypassed by calling the
		// OAuth callback directly.
		ALLOWED_EMAIL: z.string().email(),

		// M2M credential for VIN (the owner's automation agent) to POST new
		// routines via apps/web/src/app/api/agent/routines/route.ts — a
		// route deliberately outside Better Auth's session-cookie model.
		// Same strength floor as BETTER_AUTH_SECRET since it's the only
		// thing standing between that endpoint and the public internet.
		VIN_SECRET_KEY: z.string().min(32),
		// Not a DB column — routines has no per-user ownership (Phase 0.5
		// is still single-tenant). This is an intent-confirmation value the
		// agent must echo back in its request body, checked alongside the
		// bearer secret; see the route's comment for why.
		AGENT_USER_ID: z.string().min(1),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
