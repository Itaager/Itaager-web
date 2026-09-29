import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create an account" };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const requested = (await searchParams).username;
  const username = typeof requested === "string" ? requested.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30) : "";
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Create your account</h1>
      <p className="mt-1 text-sm text-ink-2">Start receiving support in a few minutes.</p>
      <RegisterForm defaultUsername={username} />
      <p className="mt-6 text-center text-sm text-ink-2">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">Sign in</Link>
      </p>
    </>
  );
}
