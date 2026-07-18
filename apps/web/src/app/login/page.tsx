"use client";

import { Github } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SoftAurora } from "@/components/soft-aurora";
import { authClient, useSession } from "@/lib/auth-client";

export default function LoginPage() {
	const router = useRouter();
	const { data: session, isPending } = useSession();
	const [signingIn, setSigningIn] = useState(false);

	useEffect(() => {
		if (!isPending && session) {
			router.replace("/");
		}
	}, [isPending, session, router]);

	async function handleGithubSignIn() {
		setSigningIn(true);
		await authClient.signIn.social({
			provider: "github",
			callbackURL: "/auth/loading",
		});
	}

	return (
		<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#FAF9F6]">
			<div className="absolute inset-0">
				<SoftAurora />
			</div>

			<motion.div
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6, ease: "easeOut" }}
				className="relative z-10 flex w-[340px] flex-col items-center gap-6 rounded-2xl border border-white/60 bg-white/50 px-8 py-10 text-center shadow-[0_8px_32px_rgba(41,37,36,0.12),inset_0_0_0_1px_rgba(255,255,255,0.4)] backdrop-blur-xl"
			>
				<div className="flex flex-col gap-1.5">
					<div className="font-extrabold text-[#292524] text-[22px] tracking-[-0.02em]">
						LE-REMINDER
					</div>
					<div className="text-[#78716c] text-[13px]">
						Private dashboard. Sign in to continue.
					</div>
				</div>

				<button
					type="button"
					onClick={handleGithubSignIn}
					disabled={signingIn}
					className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-[#292524] bg-[#292524] px-4 py-2.5 font-semibold text-[13.5px] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
				>
					<Github className="size-4" />
					{signingIn ? "Redirecting to GitHub…" : "Continue with GitHub"}
				</button>

				<div className="text-[#a8a29e] text-[11px]">
					Access is restricted to one authorized account.
				</div>
			</motion.div>
		</div>
	);
}
