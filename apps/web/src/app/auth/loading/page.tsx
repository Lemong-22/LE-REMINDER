"use client";

import { Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SoftAurora } from "@/components/soft-aurora";
import { useSession } from "@/lib/auth-client";

const SHOWN_DURATION_MS = 900;
const EXIT_DURATION_MS = 350;

type Phase = "waiting" | "shown" | "exiting";

// GitHub's OAuth callback lands here (see login/page.tsx's callbackURL)
// instead of routing straight to "/" — gives the glass card a beat to
// fade in, show a welcome state, then fade out before the real dashboard
// mounts, instead of an instant snap.
export default function AuthLoadingPage() {
	const router = useRouter();
	const { data: session, isPending } = useSession();
	const [phase, setPhase] = useState<Phase>("waiting");
	const startedRef = useRef(false);

	// Deliberately depends on `isPending` only, not `phase` — this effect
	// itself calls setPhase("shown"), and if `phase` were a dependency too,
	// that state update would re-run the effect, whose cleanup would clear
	// the timer it had just scheduled a moment earlier. Net effect: phase
	// gets stuck on "shown" forever and the page never advances past
	// /auth/loading. startedRef guards against running twice.
	useEffect(() => {
		if (isPending || startedRef.current) return;
		startedRef.current = true;
		setPhase("shown");
		const timer = setTimeout(() => setPhase("exiting"), SHOWN_DURATION_MS);
		return () => clearTimeout(timer);
	}, [isPending]);

	useEffect(() => {
		if (phase !== "exiting") return;
		// The whitelist can still reject a brand-new account at this point
		// (databaseHooks.user.create.before in packages/auth) — no session
		// means bounce back to /login instead of dead-ending here.
		const timer = setTimeout(() => {
			if (session) {
				router.replace("/");
			} else {
				router.replace("/login");
			}
		}, EXIT_DURATION_MS);
		return () => clearTimeout(timer);
	}, [phase, session, router]);

	const exiting = phase === "exiting";

	return (
		<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#FAF9F6]">
			<div className="absolute inset-0">
				<SoftAurora />
			</div>

			<motion.div
				initial={{ opacity: 0, y: 12, scale: 0.97 }}
				animate={
					exiting
						? { opacity: 0, y: -8, scale: 0.97 }
						: { opacity: 1, y: 0, scale: 1 }
				}
				transition={{
					duration: exiting ? EXIT_DURATION_MS / 1000 : 0.5,
					ease: "easeOut",
				}}
				className="relative z-10 flex flex-col items-center gap-4 rounded-2xl border border-white/60 bg-white/50 px-10 py-9 text-center shadow-[0_8px_32px_rgba(41,37,36,0.12),inset_0_0_0_1px_rgba(255,255,255,0.4)] backdrop-blur-xl"
			>
				<Loader2 className="size-6 animate-spin text-[#292524]" />
				<div className="font-extrabold text-[#292524] text-[17px] tracking-[-0.015em]">
					{isPending ? "Verifying your session…" : "Welcome back"}
				</div>
				<div className="text-[#a8a29e] text-[12px]">
					Taking you to your dashboard…
				</div>
			</motion.div>
		</div>
	);
}
