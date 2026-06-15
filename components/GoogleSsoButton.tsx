"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { isAuthSession, saveAuthSession } from "@/lib/authSession";
import { API_BASE_URL, GOOGLE_LOGIN_URL } from "@/Serverurls";

const googleLoginEndpoint = `${API_BASE_URL}${GOOGLE_LOGIN_URL}`;

export function GoogleSsoButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const buttonRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const renderedRef = useRef(false);

  const initializeGoogle = useCallback(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!clientId) {
      setError("Google sign-in is not configured.");
      return false;
    }

    if (!window.google?.accounts?.id) {
      setError("Google sign-in is still loading. Try again.");
      return false;
    }

    if (!initializedRef.current) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        use_fedcm_for_prompt: false,
        callback: async (response) => {
          if (!response.credential) {
            setError("Google did not return an ID token.");
            return;
          }

          setIsLoading(true);
          setError("");

          try {
            const result = await fetch(googleLoginEndpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({ idToken: response.credential }),
            });

            if (!result.ok) {
              throw new Error("Google sign-in failed.");
            }

            const session = (await result.json()) as unknown;

            if (!isAuthSession(session)) {
              throw new Error("Google sign-in returned an invalid session.");
            }

            saveAuthSession(session);
            router.replace("/dashboard");
          } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Google sign-in failed.");
          } finally {
            setIsLoading(false);
          }
        },
      });
      initializedRef.current = true;
    }

    if (buttonRef.current && !renderedRef.current) {
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: buttonRef.current.offsetWidth || 360,
      });
      renderedRef.current = true;
    }

    return true;
  }, [router]);

  useEffect(() => {
    const existingScript = document.querySelector<HTMLScriptElement>("script[data-google-identity]");

    if (existingScript) {
      if (window.google?.accounts?.id) {
        window.setTimeout(initializeGoogle, 0);
      } else {
        existingScript.addEventListener("load", initializeGoogle, { once: true });
      }

      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.addEventListener("load", initializeGoogle, { once: true });
    document.head.appendChild(script);
  }, [initializeGoogle]);

  return (
    <div>
      <div className={isLoading ? "pointer-events-none opacity-60" : ""} ref={buttonRef} />
      {error ? <p className="mt-2 text-xs font-bold text-[#f10606]">{error}</p> : null}
      {isLoading ? <p className="mt-2 text-xs font-bold text-black/45">Signing in with Google...</p> : null}
    </div>
  );
}
