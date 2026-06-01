export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  authProviders: string[];
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  tokenType: string;
  expiresIn: string;
};

const AUTH_SESSION_KEY = "ojaboy.auth.session";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<AuthSession>;
  const user = session.user as Partial<AuthUser> | undefined;

  return (
    !!user &&
    typeof user.id === "string" &&
    typeof user.email === "string" &&
    typeof user.fullName === "string" &&
    typeof user.role === "string" &&
    isStringArray(user.authProviders) &&
    typeof session.accessToken === "string" &&
    typeof session.tokenType === "string" &&
    typeof session.expiresIn === "string"
  );
}

export function saveAuthSession(session: AuthSession) {
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function getAuthSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(AUTH_SESSION_KEY);

  if (!value) {
    return null;
  }

  try {
    const session = JSON.parse(value) as unknown;

    if (isAuthSession(session)) {
      return session;
    }

    clearAuthSession();
    return null;
  } catch {
    clearAuthSession();
    return null;
  }
}

export function clearAuthSession() {
  window.localStorage.removeItem(AUTH_SESSION_KEY);
}
