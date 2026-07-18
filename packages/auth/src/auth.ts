import { db } from "@LE-REMINDER/db";
import * as authSchema from "@LE-REMINDER/db/schema/auth";
import { env } from "@LE-REMINDER/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";

// Infra-only: Better Auth's server instance, its Drizzle adapter, and the
// GitHub provider config. Deliberately has no knowledge of Routine/
// CompletionEvent — this package sits beside @LE-REMINDER/db, not inside
// @LE-REMINDER/core, so the domain layer stays framework/auth-free.
//
// Single-user lockdown: any GitHub account whose primary email isn't
// ALLOWED_EMAIL is rejected before a user row is ever created. This runs
// at account-creation time (databaseHooks), not as a UI-level check, so it
// can't be bypassed by hitting /api/auth/callback/github directly.
export const auth = betterAuth({
	baseURL: env.BETTER_AUTH_URL,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, {
		provider: "sqlite",
		schema: authSchema,
	}),
	socialProviders: {
		github: {
			clientId: env.GITHUB_CLIENT_ID,
			clientSecret: env.GITHUB_CLIENT_SECRET,
		},
	},
	databaseHooks: {
		user: {
			create: {
				before: async (user) => {
					if (user.email !== env.ALLOWED_EMAIL) {
						throw new APIError("FORBIDDEN", {
							message: "This GitHub account is not authorized for LE-REMINDER.",
						});
					}
					return { data: user };
				},
			},
		},
	},
});

export type Session = typeof auth.$Infer.Session;
