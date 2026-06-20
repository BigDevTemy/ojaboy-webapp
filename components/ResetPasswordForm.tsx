"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import { API_BASE_URL, SET_PASSWORD_URL } from "@/Serverurls";
import { getApiErrorMessage } from "@/lib/apiError";
import { isAuthSession, saveAuthSession } from "@/lib/authSession";

const setPasswordEndpoint = `${API_BASE_URL}${SET_PASSWORD_URL}`;

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("Password setup link is invalid or expired.");
      return;
    }

    if (!password) {
      setError("New password is required.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(setPasswordEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          token,
          password,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(
            response,
            "Password setup link is invalid or expired.",
          ),
        );
      }

      const session = (await response.json()) as unknown;

      if (!isAuthSession(session)) {
        throw new Error("Password setup returned an invalid session.");
      }

      saveAuthSession(session);
      router.replace("/dashboard");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to set password. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="p-6 sm:p-8 lg:p-10" onSubmit={handleSubmit}>
      <Link
        className="mb-7 inline-flex items-center gap-2 text-sm font-black text-black/50 transition hover:text-[#f10606]"
        href="/login"
      >
        <ArrowLeft size={17} />
        Login
      </Link>

      <div className="mb-7">
        <p className="mb-2 text-sm font-black uppercase text-[#f10606]">Reset password</p>
        <h1 className="text-3xl font-black tracking-normal text-black">Set a new password</h1>
        <p className="mt-2 text-sm font-medium leading-6 text-black/55">
          Enter a new password for your Ojaboy account. This reset link can only be used once.
        </p>
      </div>

      {!token ? (
        <div className="rounded-xl border border-[#f10606]/20 bg-[#f10606]/5 p-4 text-sm font-bold leading-6 text-[#f10606]">
          Password setup link is invalid or expired. Request a new reset link to continue.
        </div>
      ) : null}

      <div className="grid gap-4">
        <label className="block">
          <span className="text-xs font-black uppercase text-black/45">New Password</span>
          <input
            className="mt-2 h-12 w-full rounded-lg border border-black/10 px-4 text-sm font-bold text-black outline-none placeholder:text-black/35 focus:border-[#f10606]/40 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Create a new password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isLoading || !token}
            required
          />
        </label>
        <label className="block">
          <span className="text-xs font-black uppercase text-black/45">Confirm Password</span>
          <input
            className="mt-2 h-12 w-full rounded-lg border border-black/10 px-4 text-sm font-bold text-black outline-none placeholder:text-black/35 focus:border-[#f10606]/40 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Confirm your new password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={isLoading || !token}
            required
          />
        </label>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-xl bg-[#fbfbfb] p-4">
        <ShieldCheck className="mt-0.5 shrink-0 text-[#f10606]" size={18} />
        <p className="text-xs font-medium leading-5 text-black/55">
          Use at least 8 characters. After your password is set, you will be signed in automatically.
        </p>
      </div>

      {error ? <p className="mt-4 text-xs font-bold text-[#f10606]">{error}</p> : null}

      <button
        className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#f10606] text-sm font-black text-white shadow-[0_12px_24px_rgba(241,6,6,0.2)] transition hover:bg-[#d80505] disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isLoading || !token}
      >
        <LockKeyhole size={18} />
        {isLoading ? "Setting password..." : "Set Password"}
      </button>

      <p className="mt-5 text-center text-sm font-medium text-black/55">
        Need another link? <Link className="font-black text-[#f10606]" href="/forgot-password">Request password reset</Link>
      </p>
    </form>
  );
}
