import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Log in | ResumeAid",
  description: "Log in to see your saved resume customization history.",
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
