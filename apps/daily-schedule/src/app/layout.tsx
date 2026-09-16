import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Daily Schedule Tracker",
	description: "Personal 7-Day Live Daily Schedule Tracker",
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	themeColor: "#0F1115",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" className="dark">
			<body className="bg-[#0F1115] text-[#F1F5F9] antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
				{children}
			</body>
		</html>
	);
}
