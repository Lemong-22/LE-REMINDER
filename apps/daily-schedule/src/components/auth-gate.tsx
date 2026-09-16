"use client";

import { KeyRound, Lock, LogOut, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import Hyperspeed from "@/components/ui/Hyperspeed";

export function AuthGate({ children }: { children: React.ReactNode }) {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
	const [isWarping, setIsWarping] = useState(false);
	const [passcode, setPasscode] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		async function checkAuth() {
			try {
				const res = await fetch("/api/auth");
				const data = await res.json();
				setIsAuthenticated(Boolean(data.authenticated));
			} catch {
				setIsAuthenticated(false);
			}
		}
		checkAuth();
	}, []);

	async function handleLogin(e: React.FormEvent) {
		e.preventDefault();
		setError("");
		setIsLoading(true);

		try {
			const res = await fetch("/api/auth", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ passcode }),
			});

			const data = await res.json();
			if (res.ok && data.success) {
				setIsWarping(true);
				setTimeout(() => {
					setIsAuthenticated(true);
					setIsWarping(false);
					setPasscode("");
				}, 2200);
			} else {
				setError(data.error || "Incorrect passcode");
			}
		} catch {
			setError("Unable to verify passcode. Please try again.");
		} finally {
			setIsLoading(false);
		}
	}

	async function handleLogout() {
		try {
			await fetch("/api/auth", { method: "DELETE" });
			setIsAuthenticated(false);
		} catch {
			setIsAuthenticated(false);
		}
	}

	if (isAuthenticated === null) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-black text-[#888888]">
				<div className="flex flex-col items-center gap-3">
					<div className="size-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
					<span className="font-mono text-[#666666] text-xs">
						Authenticating...
					</span>
				</div>
			</div>
		);
	}

	if (isWarping) {
		return (
			<div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-black">
				<Hyperspeed
					effectOptions={{
						distortion: "turbulentDistortion",
						length: 400,
						roadWidth: 10,
						islandWidth: 2,
						lanesPerRoad: 4,
						fov: 90,
						fovSpeedUp: 150,
						speedUp: 3,
						carLightsFade: 0.4,
						totalSideLightSticks: 20,
						lightPairsPerRoadWay: 40,
						colors: {
							roadColor: 0x080808,
							islandColor: 0x0a0a0a,
							background: 0x000000,
							shoulderLines: 0xffffff,
							brokenLines: 0xffffff,
							leftCars: [0xd856bf, 0x6750a2, 0xc247ac],
							rightCars: [0x03b3c3, 0x0e5ea5, 0x324555],
							sticks: 0x03b3c3,
						},
					}}
				/>
				<div className="relative z-10 flex flex-col items-center gap-2.5 rounded-2xl border border-white/10 bg-black/75 px-6 py-3.5 shadow-2xl backdrop-blur-xl">
					<div className="flex items-center gap-2">
						<span className="size-2 animate-ping rounded-full bg-cyan-400" />
						<span className="font-mono text-cyan-300 text-xs uppercase tracking-widest">
							ACCESS GRANTED
						</span>
					</div>
					<span className="font-mono text-[10px] text-zinc-400">
						Initializing Live Schedule...
					</span>
				</div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-[#EDEDED]">
				<div className="relative w-full max-w-sm rounded-[24px] border border-white/[0.08] bg-[#111111] p-6 shadow-2xl sm:p-7">
					{/* Header */}
					<div className="mb-6 flex flex-col items-center text-center">
						<div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-[#1A1A1A] text-white">
							<Lock className="size-5" />
						</div>
						<h1 className="font-bold text-white text-xl tracking-tight">
							Schedule Access
						</h1>
						<p className="mt-1 text-[#777777] text-xs">
							Enter admin passcode to continue
						</p>
					</div>

					<form onSubmit={handleLogin} className="flex flex-col gap-4">
						<div className="flex flex-col gap-1.5">
							<div className="relative flex items-center">
								<KeyRound className="pointer-events-none absolute left-3.5 size-4 text-[#666666]" />
								<input
									id="passcode-input"
									type="password"
									value={passcode}
									onChange={(e) => setPasscode(e.target.value)}
									placeholder="Enter admin passcode..."
									disabled={isLoading}
									className="w-full rounded-xl border border-white/[0.08] bg-[#1A1A1A] py-3 pr-4 pl-10 font-sans text-sm text-white placeholder-[#555555] outline-none transition-all duration-200 focus:border-white/30 focus:ring-1 focus:ring-white/20"
								/>
							</div>
						</div>

						{error && (
							<div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-950/30 px-3.5 py-2 text-red-300 text-xs">
								<ShieldAlert className="size-4 shrink-0 text-red-400" />
								<span>{error}</span>
							</div>
						)}

						<button
							type="submit"
							disabled={isLoading || !passcode.trim()}
							className="mt-1 flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl bg-white px-4 py-2.5 font-semibold text-black text-sm transition-all duration-200 hover:bg-neutral-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
						>
							{isLoading ? "Verifying..." : "Unlock"}
						</button>
					</form>
				</div>
			</div>
		);
	}

	return (
		<div className="relative min-h-screen bg-black">
			{/* Minimalist Logout Button */}
			<div className="absolute top-4 right-4 z-30 sm:top-6 sm:right-6">
				<button
					type="button"
					onClick={handleLogout}
					title="Sign Out"
					className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#141414] px-3 py-1.5 font-medium text-[#777777] text-xs transition-colors hover:border-white/20 hover:text-white active:scale-95"
				>
					<LogOut className="size-3.5" />
					<span className="hidden sm:inline">Sign out</span>
				</button>
			</div>
			{children}
		</div>
	);
}
