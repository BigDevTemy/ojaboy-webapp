"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { GoogleSsoButton } from "@/components/GoogleSsoButton";
import { getApiErrorMessage } from "@/lib/apiError";
import { API_BASE_URL, REGISTER_URL } from "@/Serverurls";
import { LockKeyhole, MailCheck } from "lucide-react";

const registerEndpoint = `${API_BASE_URL}${REGISTER_URL}`;

type SignupVerificationResponse = {
  message: string;
  email: string;
  requiresEmailVerification: true;
};

function isSignupVerificationResponse(
  value: unknown,
): value is SignupVerificationResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const response = value as Partial<SignupVerificationResponse>;

  return (
    typeof response.message === "string" &&
    typeof response.email === "string" &&
    response.requiresEmailVerification === true
  );
}

export function SignupForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [verification, setVerification] =
    useState<SignupVerificationResponse | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!fullName.trim() || !email.trim() || !password) {
      setError("Full name, email, and password are required.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(registerEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(
            response,
            "Signup failed. Please check your details and try again.",
          ),
        );
      }

      const result = (await response.json()) as unknown;

      if (!isSignupVerificationResponse(result)) {
        throw new Error("Signup returned an invalid verification response.");
      }

      setVerification(result);
      setPassword("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Signup failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (verification) {
    return (
      <div className="flex min-h-full flex-col justify-center p-6 sm:p-8 lg:p-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <MailCheck size={28} />
        </div>
        <p className="mt-6 text-sm font-black uppercase text-emerald-600">
          Verify your email
        </p>
        <h2 className="mt-2 text-3xl font-black tracking-normal text-black">
          Check your inbox
        </h2>
        <p className="mt-3 text-sm font-medium leading-7 text-black/58">
          {verification.message}
        </p>
        <div className="mt-5 rounded-xl border border-black/10 bg-[#fbfbfb] px-4 py-3 text-sm font-black text-black">
          {verification.email}
        </div>
        <p className="mt-4 text-xs font-medium leading-5 text-black/50">
          Open the verification link in the email, then return to log in. Check
          your spam folder if it does not arrive shortly.
        </p>
        <Link
          className="mt-6 flex h-12 items-center justify-center rounded-lg bg-[#f10606] text-sm font-black text-white"
          href="/login"
        >
          Go to Login
        </Link>
        <button
          className="mt-3 h-11 text-sm font-black text-black/55 transition hover:text-[#f10606]"
          type="button"
          onClick={() => setVerification(null)}
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form className="p-6 sm:p-8 lg:p-10" onSubmit={handleSubmit}>
      <div className="mb-7">
        <p className="mb-2 text-sm font-black uppercase text-[#f10606]">Get started</p>
        <h2 className="text-3xl font-black tracking-normal text-black">Set up your profile</h2>
        <p className="mt-2 text-sm font-medium text-black/55">Use your details so Ojaboy can personalize markets, alerts, and delivery.</p>
      </div>

      <GoogleSsoButton />
      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-black/10" />
        <span className="text-xs font-bold uppercase text-black/40">or</span>
        <span className="h-px flex-1 bg-black/10" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-xs font-black uppercase text-black/45">Full Name</span>
          <input
            className="mt-2 h-12 w-full rounded-lg border border-black/10 px-4 text-sm font-bold text-black outline-none placeholder:text-black/35 focus:border-[#f10606]/40 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Temiloluwa Ade"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            disabled={isLoading}
            required
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-black uppercase text-black/45">Email Address</span>
          <input
            className="mt-2 h-12 w-full rounded-lg border border-black/10 px-4 text-sm font-bold text-black outline-none placeholder:text-black/35 focus:border-[#f10606]/40 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="you@example.com"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isLoading}
            required
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-black uppercase text-black/45">Password</span>
          <input
            className="mt-2 h-12 w-full rounded-lg border border-black/10 px-4 text-sm font-bold text-black outline-none placeholder:text-black/35 focus:border-[#f10606]/40 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Create a secure password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isLoading}
            required
          />
        </label>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-xl bg-[#fbfbfb] p-4">
        <LockKeyhole className="mt-0.5 shrink-0 text-[#f10606]" size={18} />
        <p className="text-xs font-medium leading-5 text-black/55">
          By creating an account, you agree to receive market alerts and accept Ojaboy&apos;s terms and privacy policy.
        </p>
      </div>

      {error ? <p className="mt-4 text-xs font-bold text-[#f10606]">{error}</p> : null}

      <button
        className="mt-5 h-12 w-full rounded-lg bg-[#f10606] text-sm font-black text-white shadow-[0_12px_24px_rgba(241,6,6,0.2)] transition hover:bg-[#d80505] disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isLoading}
      >
        {isLoading ? "Creating account..." : "Create Account"}
      </button>

      <p className="mt-5 text-center text-sm font-medium text-black/55">
        Already have an account? <Link className="font-black text-[#f10606]" href="/login">Log in</Link>
      </p>
    </form>
  );
}
