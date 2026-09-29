import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const expired = params.error === "link_expired";

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Welcome back</h1>
      <p className="mt-1 text-sm text-ink-2">Sign in to your Itaager account.</p>
      <LoginForm next={next} notice={expired ? "That link has expired or was already used. Please try again." : undefined} />
      <p className="mt-6 text-center text-sm text-ink-2">
        New to Itaager?{" "}
        <Link href="/register" className="font-semibold text-brand hover:underline">Create an account</Link>
      </p>
    </>
  );
}
