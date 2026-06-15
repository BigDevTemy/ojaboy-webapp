"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { getApiErrorMessage } from "@/lib/apiError";
import { isAuthSession, saveAuthSession } from "@/lib/authSession";
import { API_BASE_URL, VERIFY_EMAIL_URL } from "@/Serverurls";

const verifyEmailEndpoint = `${API_BASE_URL}${VERIFY_EMAIL_URL}`;

type VerificationStatus = "loading" | "success" | "error";

export function VerifyEmail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [status, setStatus] = useState<VerificationStatus>("loading");
  const [message, setMessage] = useState("Verifying your email address...");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!token) {
      queueMicrotask(() => {
        setStatus("error");
        setMessage("The verification link is missing its token.");
      });
      return;
    }

    let isCancelled = false;
    void fetch(verifyEmailEndpoint, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            await getApiErrorMessage(
              response,
              "The verification link is invalid or has expired.",
            ),
          );
        }

        return response.status === 204
          ? null
          : ((await response.json()) as unknown);
      })
      .then((body) => {
        if (!isAuthSession(body)) {
          throw new Error(
            "Email verification returned an invalid authentication session.",
          );
        }

        if (!isCancelled) {
          saveAuthSession(body);
          setStatus("success");
          setMessage(
            "Your email has been verified and you are now signed in.",
          );
        }
      })
      .catch((requestError: unknown) => {
        if (!isCancelled) {
          setStatus("error");
          setMessage(
            requestError instanceof Error
              ? requestError.message
              : "Unable to verify your email address.",
          );
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [retryCount, token]);

  return (
    <section className="px-5 py-16 sm:px-8">
      <div className="mx-auto max-w-md rounded-2xl border border-black/10 bg-white p-8 text-center shadow-[0_22px_60px_rgba(0,0,0,0.08)]">
        {status === "loading" ? (
          <Loader2 className="mx-auto animate-spin text-[#f10606]" size={42} />
        ) : status === "success" ? (
          <CheckCircle2 className="mx-auto text-emerald-600" size={46} />
        ) : (
          <AlertCircle className="mx-auto text-red-600" size={46} />
        )}

        <p className={`mt-6 text-sm font-black uppercase ${
          status === "success"
            ? "text-emerald-600"
            : status === "error"
              ? "text-red-600"
              : "text-[#f10606]"
        }`}>
          {status === "loading"
            ? "Email verification"
            : status === "success"
              ? "Email verified"
              : "Verification failed"}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-normal text-black">
          {status === "loading"
            ? "Please wait"
            : status === "success"
              ? "You are all set"
              : "We could not verify this link"}
        </h1>
        <p className="mt-3 text-sm font-medium leading-7 text-black/58">
          {message}
        </p>

        {status === "success" ? (
          <button
            className="mt-7 flex h-12 items-center justify-center rounded-lg bg-[#f10606] text-sm font-black text-white"
            type="button"
            onClick={() => router.replace("/dashboard")}
          >
            Continue to Dashboard
          </button>
        ) : null}

        {status === "error" && token ? (
          <button
            className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#f10606] text-sm font-black text-white"
            type="button"
            onClick={() => {
              setStatus("loading");
              setMessage("Verifying your email address...");
              setRetryCount((count) => count + 1);
            }}
          >
            <RefreshCw size={17} />
            Try Again
          </button>
        ) : null}

        {status === "error" ? (
          <Link
            className="mt-3 inline-flex h-11 items-center justify-center px-4 text-sm font-black text-black/55 hover:text-[#f10606]"
            href="/signup"
          >
            Return to Signup
          </Link>
        ) : null}
      </div>
    </section>
  );
}
