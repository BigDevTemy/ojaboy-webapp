import {
  clearAuthSession,
  getAuthSession,
  isAuthSession,
  saveAuthSession,
  type AuthSession,
} from "@/lib/authSession";
import {
  API_BASE_URL,
  LOGOUT_URL,
  REFRESH_TOKEN_URL,
} from "@/Serverurls";

const refreshEndpoint = `${API_BASE_URL}${REFRESH_TOKEN_URL}`;
const logoutEndpoint = `${API_BASE_URL}${LOGOUT_URL}`;
const TOKEN_EXPIRY_BUFFER_SECONDS = 30;

type RefreshResponse = {
  user?: unknown;
  accessToken?: unknown;
  tokenType?: unknown;
  expiresIn?: unknown;
};

let refreshRequest: Promise<AuthSession | null> | null = null;

function parseJwtExpiry(accessToken: string) {
  const payload = accessToken.split(".")[1];

  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = JSON.parse(window.atob(padded)) as { exp?: unknown };

    return typeof decoded.exp === "number" ? decoded.exp : null;
  } catch {
    return null;
  }
}

function isAccessTokenExpired(accessToken: string) {
  const expiresAt = parseJwtExpiry(accessToken);

  if (expiresAt === null) {
    return false;
  }

  return expiresAt <= Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_BUFFER_SECONDS;
}

function mergeRefreshResponse(
  body: unknown,
  currentSession: AuthSession | null,
): AuthSession | null {
  if (isAuthSession(body)) {
    return body;
  }

  if (!body || typeof body !== "object" || !currentSession) {
    return null;
  }

  const response = body as RefreshResponse;

  if (typeof response.accessToken !== "string" || !response.accessToken.trim()) {
    return null;
  }

  const nextSession: AuthSession = {
    user:
      response.user && typeof response.user === "object"
        ? {
            ...currentSession.user,
            ...(response.user as Partial<AuthSession["user"]>),
          }
        : currentSession.user,
    accessToken: response.accessToken,
    tokenType:
      typeof response.tokenType === "string" && response.tokenType.trim()
        ? response.tokenType
        : currentSession.tokenType,
    expiresIn:
      typeof response.expiresIn === "string" && response.expiresIn.trim()
        ? response.expiresIn
        : currentSession.expiresIn,
  };

  return nextSession;
}

export async function refreshAuthSession() {
  if (refreshRequest) {
    return refreshRequest;
  }

  refreshRequest = (async () => {
    const currentSession = getAuthSession();

    try {
      const response = await fetch(refreshEndpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        clearAuthSession();
        return null;
      }

      const body = (await response.json()) as unknown;
      const nextSession = mergeRefreshResponse(body, currentSession);

      if (!nextSession) {
        clearAuthSession();
        return null;
      }

      saveAuthSession(nextSession);
      return nextSession;
    } catch {
      return null;
    } finally {
      refreshRequest = null;
    }
  })();

  return refreshRequest;
}

export async function getActiveAuthSession() {
  const session = getAuthSession();

  if (!session) {
    return null;
  }

  if (!isAccessTokenExpired(session.accessToken)) {
    return session;
  }

  return refreshAuthSession();
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const authSession = await getActiveAuthSession();

  function sendRequest(session: AuthSession | null) {
    const headers = new Headers(init.headers);

    if (session) {
      headers.set(
        "Authorization",
        `${session.tokenType || "Bearer"} ${session.accessToken}`,
      );
    }

    return fetch(input, {
      ...init,
      headers,
      credentials: init.credentials ?? "include",
    });
  }

  let response = await sendRequest(authSession);

  if (response.status === 401 && authSession) {
    const refreshedSession = await refreshAuthSession();

    if (refreshedSession) {
      response = await sendRequest(refreshedSession);
    }
  }

  return response;
}

export async function logout() {
  try {
    await fetch(logoutEndpoint, {
      method: "POST",
      credentials: "include",
    });
  } finally {
    clearAuthSession();
  }
}
