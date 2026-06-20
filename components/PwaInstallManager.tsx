"use client";

import { Download, Share2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuthSession } from "@/lib/useAuthSession";

type BeforeInstallPromptChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

type BeforeInstallPromptEvent = Event & {
  platforms?: string[];
  userChoice: Promise<BeforeInstallPromptChoice>;
  prompt: () => Promise<void>;
};

const INSTALL_DISMISSED_KEY = "ojaboy.pwa.install.dismissed.v1";

function isStandaloneDisplay() {
  if (typeof window === "undefined") {
    return false;
  }

  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

function isIosBrowser() {
  if (typeof window === "undefined") {
    return false;
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform.toLowerCase();
  const hasTouchMacPlatform =
    platform === "macintel" && window.navigator.maxTouchPoints > 1;

  return /iphone|ipad|ipod/.test(userAgent) || hasTouchMacPlatform;
}

function getDismissedPreference() {
  try {
    return window.localStorage.getItem(INSTALL_DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

function saveDismissedPreference() {
  try {
    window.localStorage.setItem(INSTALL_DISMISSED_KEY, "true");
  } catch {
    // Private browsing modes can block localStorage writes.
  }
}

export function PwaInstallManager() {
  const session = useAuthSession();
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const shouldUseIosInstructions = useMemo(isIosBrowser, []);

  useEffect(() => {
    setIsStandalone(isStandaloneDisplay());
    setIsDismissed(getDismissedPreference());

    if ("serviceWorker" in navigator) {
      const registerServiceWorker = () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          // Registration can fail on unsupported origins or older browsers.
        });
      };

      if (document.readyState === "complete") {
        registerServiceWorker();
      } else {
        window.addEventListener("load", registerServiceWorker, { once: true });
      }
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      saveDismissedPreference();
      setInstallEvent(null);
      setShowPrompt(false);
      setIsStandalone(true);
      setIsDismissed(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!session || isStandalone || isDismissed) {
      setShowPrompt(false);
      return;
    }

    if (!installEvent && !shouldUseIosInstructions) {
      return;
    }

    const timeoutId = window.setTimeout(() => setShowPrompt(true), 1000);

    return () => window.clearTimeout(timeoutId);
  }, [installEvent, isDismissed, isStandalone, session, shouldUseIosInstructions]);

  async function handleInstall() {
    if (!installEvent) {
      return;
    }

    setIsPrompting(true);

    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;

      if (choice.outcome === "accepted") {
        saveDismissedPreference();
        setIsDismissed(true);
      }

      setInstallEvent(null);
      setShowPrompt(false);
    } finally {
      setIsPrompting(false);
    }
  }

  function handleDismiss() {
    saveDismissedPreference();
    setIsDismissed(true);
    setShowPrompt(false);
  }

  if (!showPrompt || !session || isStandalone) {
    return null;
  }

  return (
    <aside className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-xl border border-black/10 bg-white p-4 text-black shadow-[0_24px_70px_rgba(0,0,0,0.18)] sm:bottom-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f10606] text-white">
          {shouldUseIosInstructions ? <Share2 size={19} /> : <Download size={19} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-sm font-black text-black">Install Ojaboy</h2>
            <button
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-black/50 hover:bg-black/5 hover:text-black"
              type="button"
              aria-label="Dismiss install prompt"
              onClick={handleDismiss}
            >
              <X size={17} />
            </button>
          </div>
          {shouldUseIosInstructions ? (
            <p className="mt-1 text-xs font-semibold leading-5 text-black/55">
              Tap the browser share button, then choose Add to Home Screen.
            </p>
          ) : (
            <p className="mt-1 text-xs font-semibold leading-5 text-black/55">
              Add Ojaboy to your home screen for quicker access after login.
            </p>
          )}
          <div className="mt-3 flex items-center gap-2">
            {installEvent ? (
              <button
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#f10606] px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                disabled={isPrompting}
                onClick={handleInstall}
              >
                <Download size={16} />
                {isPrompting ? "Opening..." : "Install app"}
              </button>
            ) : null}
            <button
              className="h-10 rounded-lg border border-black/10 px-4 text-xs font-black text-black/65 hover:bg-black/5"
              type="button"
              onClick={handleDismiss}
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
