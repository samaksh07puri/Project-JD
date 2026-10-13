import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import adminBg from "@/assets/Admin.jpg";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResumeAid | AI Resume Customizer",
  description:
    "Tailor your resume to any job description in seconds. AI-powered rewriting, keyword matching, ATS scoring and cover letters.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="bg-cover bg-center bg-fixed bg-no-repeat"
        style={{ backgroundImage: `url(${adminBg.src})` }}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
