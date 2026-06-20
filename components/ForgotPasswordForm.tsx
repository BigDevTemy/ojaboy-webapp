"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft, MailCheck, ShieldCheck } from "lucide-react";
import { getApiErrorMessage } from "@/lib/apiError";
import { API_BASE_URL, FORGOT_PASSWORD_URL } from "@/Serverurls";

const forgotPasswordEndpoint = `${API_BASE_URL}${FORGOT_PASSWORD_URL}`;

type ForgotPasswordResponse = {
  message?: string;
};

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Registered email address is required.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(forgotPasswordEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: trimmedEmail,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(
            response,
            "Unable to send password reset email. Please try again.",
          ),
        );
      }

      const result = (await response.json().catch(() => ({}))) as ForgotPasswordResponse;

      setSentEmail(trimmedEmail);
      setSuccessMessage(
        typeof result.message === "string" && result.message.trim()
          ? result.message.trim()
          : "We sent a password reset link to your registered email address.",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to send password reset email. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (sentEmail) {
    return (
      <div className="p-6 sm:p-8 lg:p-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <MailCheck size={28} />
        </div>
        <p className="mt-6 text-sm font-black uppercase text-emerald-600">Reset email sent</p>
        <h1 className="mt-2 text-3xl font-black tracking-normal text-black">Check your email</h1>
        <p className="mt-3 text-sm font-medium leading-7 text-black/58">{successMessage}</p>
        <div className="mt-5 rounded-xl border border-black/10 bg-[#fbfbfb] px-4 py-3 text-sm font-black text-black">
          {sentEmail}
        </div>
        <p className="mt-4 text-xs font-medium leading-5 text-black/50">
          Open the reset link in your inbox to continue changing your password. Check your spam folder if it does not arrive shortly.
        </p>
        <Link
          className="mt-6 flex h-12 items-center justify-center rounded-lg bg-[#f10606] text-sm font-black text-white"
          href="/login"
        >
          Back to Login
        </Link>
        <button
          className="mt-3 h-11 w-full text-sm font-black text-black/55 transition hover:text-[#f10606]"
          type="button"
          onClick={() => {
            setSentEmail("");
            setSuccessMessage("");
          }}
        >
          Use a different email
        </button>
      </div>
    );
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
        <p className="mb-2 text-sm font-black uppercase text-[#f10606]">Forgot password</p>
        <h1 className="text-3xl font-black tracking-normal text-black">Send password reset link</h1>
        <p className="mt-2 text-sm font-medium leading-6 text-black/55">
          Enter the email address registered with your Ojaboy account and we will send a secure link to help you change your password.
        </p>
      </div>

      <label className="block">
        <span className="text-xs font-black uppercase text-black/45">Registered Email Address</span>
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

      <div className="mt-4 flex items-start gap-3 rounded-xl bg-[#fbfbfb] p-4">
        <ShieldCheck className="mt-0.5 shrink-0 text-[#f10606]" size={18} />
        <p className="text-xs font-medium leading-5 text-black/55">
          For your security, reset links are sent only to registered account email addresses.
        </p>
      </div>

      {error ? <p className="mt-4 text-xs font-bold text-[#f10606]">{error}</p> : null}

      <button
        className="mt-5 h-12 w-full rounded-lg bg-[#f10606] text-sm font-black text-white shadow-[0_12px_24px_rgba(241,6,6,0.2)] transition hover:bg-[#d80505] disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isLoading}
      >
        {isLoading ? "Sending link..." : "Send Reset Link"}
      </button>
    </form>
  );
}
