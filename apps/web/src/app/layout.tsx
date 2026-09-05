import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import "../index.css";
import Providers from "@/components/providers";

const inter = Inter({
	variable: "--font-sans",
	subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
	variable: "--font-mono",
	weight: ["400", "500", "600"],
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "LE-REMINDER",
	description: "LE-REMINDER",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${inter.variable} ${ibmPlexMono.variable} min-h-screen w-full bg-[#131722] text-[#F1F5F9] antialiased`}
			>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
