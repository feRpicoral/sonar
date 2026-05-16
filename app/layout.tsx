import "./globals.css";

import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { Toaster } from "sonner";

import { ThemeProvider } from "@/components/theme-provider";
import { PostHogProvider } from "@/lib/observability/posthog-provider";

export const metadata: Metadata = {
  title: "Sonar - AI sales enablement workspace",
  description:
    "Multi-agent orchestration for sales teams. Upload a call, get research, analysis, strategy, and a follow-up email in seconds.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} h-full`}
    >
      <body className="bg-background text-foreground flex min-h-screen flex-col font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PostHogProvider>
            {children}
            <Toaster richColors closeButton />
          </PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
