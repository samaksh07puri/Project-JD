import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Sign up | ResumeAid",
  description: "Create an account to save your tailored resumes.",
};

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
