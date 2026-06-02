"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { isAuthSession, saveAuthSession } from "@/lib/authSession";
import { API_BASE_URL, LOGIN_URL } from "@/Serverurls";

const loginEndpoint = `${API_BASE_URL}${LOGIN_URL}`;

async function getErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as { message?: unknown; error?: unknown };
    const message = body.message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }

    if (Array.isArray(message)) {
      const messages = message.filter((item): item is string => typeof item === "string" && !!item.trim());

      if (messages.length) {
        return messages.join(" ");
      }
    }

    if (typeof body.error === "string" && body.error.trim()) {
      return body.error;
    }
  } catch {
    // The API may return an empty or non-JSON error body.
  }

  return "Login failed. Please check your details and try again.";
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(loginEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const session = (await response.json()) as unknown;

      if (!isAuthSession(session)) {
        throw new Error("Login returned an invalid session.");
      }

      saveAuthSession(session);
      router.replace("/dashboard");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
      <input
        className="h-12 w-full rounded-lg border border-black/10 px-4 text-sm outline-none"
        placeholder="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        disabled={isLoading}
        required
      />
      <input
        className="h-12 w-full rounded-lg border border-black/10 px-4 text-sm outline-none"
        placeholder="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        disabled={isLoading}
        required
      />
      {error ? <p className="text-xs font-bold text-[#f10606]">{error}</p> : null}
      <button
        className="h-12 w-full rounded-lg bg-[#f10606] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isLoading}
      >
        {isLoading ? "Logging in..." : "Log In"}
      </button>
    </form>
  );
}
