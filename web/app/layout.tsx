import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SWRProvider } from "@/components/SWRProvider";
import { NavShell } from "@/components/NavShell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ComplianceRadar",
  description: "Real-time regulatory compliance monitoring",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="h-full bg-background antialiased overflow-hidden" suppressHydrationWarning>
        <SWRProvider>
          <NavShell>
            <main className="h-full overflow-hidden">{children}</main>
          </NavShell>
        </SWRProvider>
      </body>
    </html>
  );
}
