"use client";

import { KeyRound, Lock, LogOut, ShieldAlert, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

export function AuthGate({ children }: { children: React.ReactNode }) {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
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
				setIsAuthenticated(true);
				setPasscode("");
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
			<div className="flex min-h-screen items-center justify-center bg-[#0F1115] text-[#94A3B8]">
				<div className="flex flex-col items-center gap-3">
					<div className="size-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
					<span className="font-mono text-xs">Authenticating...</span>
				</div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center bg-[#0F1115] px-4 text-[#F1F5F9]">
				{/* Background ambient aura */}
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
				>
					<div className="absolute top-[25%] left-[50%] size-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[100px]" />
				</div>

				<div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#1A1F2C]/80 p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.05)] backdrop-blur-xl sm:p-8">
					{/* Glowing Header Icon */}
					<div className="mb-6 flex flex-col items-center text-center">
						<div className="relative mb-3 flex size-14 items-center justify-center rounded-2xl border border-cyan-400/40 bg-cyan-950/40 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
							<Lock className="size-6" />
							<Sparkles className="absolute -top-1 -right-1 size-3.5 animate-pulse text-cyan-400" />
						</div>
						<h1 className="font-extrabold text-white text-xl tracking-tight sm:text-2xl">
							Admin Access
						</h1>
						<p className="mt-1 font-mono text-[#94A3B8] text-xs">
							Daily Schedule Tracker · Personal Edition
						</p>
					</div>

					<form onSubmit={handleLogin} className="flex flex-col gap-4">
						<div className="flex flex-col gap-1.5">
							<label
								htmlFor="passcode-input"
								className="font-mono text-[#94A3B8] text-xs uppercase tracking-wider"
							>
								Passcode
							</label>
							<div className="relative flex items-center">
								<KeyRound className="pointer-events-none absolute left-3.5 size-4 text-[#64748B]" />
								<input
									id="passcode-input"
									type="password"
									value={passcode}
									onChange={(e) => setPasscode(e.target.value)}
									placeholder="Enter admin passcode..."
									disabled={isLoading}
									className="w-full rounded-xl border border-white/10 bg-[#121620] py-3 pr-4 pl-10 font-sans text-[#F1F5F9] text-sm placeholder-[#64748B] outline-none transition-all duration-200 focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/20"
								/>
							</div>
						</div>

						{error && (
							<div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/40 px-3.5 py-2 text-red-300 text-xs">
								<ShieldAlert className="size-4 shrink-0 text-red-400" />
								<span>{error}</span>
							</div>
						)}

						<button
							type="submit"
							disabled={isLoading || !passcode.trim()}
							className="mt-1 flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 font-semibold text-sm text-white shadow-[0_0_18px_rgba(6,182,212,0.35)] transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
						>
							{isLoading ? "Verifying..." : "Unlock Schedule"}
						</button>
					</form>

					<div className="mt-6 text-center text-[#64748B] text-[11px]">
						Protected Single-User Workspace
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="relative min-h-screen">
			{/* Floating Logout Button */}
			<div className="absolute top-4 right-4 z-30 sm:top-5 sm:right-6">
				<button
					type="button"
					onClick={handleLogout}
					title="Sign Out"
					className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#1A1F2C]/70 px-2.5 py-1.5 font-mono text-[#94A3B8] text-xs backdrop-blur-md transition-all hover:border-white/20 hover:text-white active:scale-95"
				>
					<LogOut className="size-3.5" />
					<span className="hidden sm:inline">Sign out</span>
				</button>
			</div>
			{children}
		</div>
	);
}
