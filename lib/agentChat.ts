import {
  getActiveAuthSession,
  refreshAuthSession,
} from "@/lib/authClient";

// https://ojaboy-ai-agent-1092974911193.us-central1.run.app/ask
const AGENT_ENDPOINT =
  "http://localhost:8000/ask";
  
const AGENT_SESSION_KEY = "ojaboy.agent.session-id";

export type AgentResponse = {
  answer: string;
  sessionId: string;
};

function getSavedSessionId() {
  try {
    return window.localStorage.getItem(AGENT_SESSION_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

function saveSessionId(sessionId: string) {
  try {
    window.localStorage.setItem(AGENT_SESSION_KEY, sessionId);
  } catch {
    // The conversation can continue even when storage is unavailable.
  }
}

export function getAgentSessionId() {
  const savedSessionId = getSavedSessionId();

  if (savedSessionId) {
    return savedSessionId;
  }

  const sessionId = crypto.randomUUID();
  saveSessionId(sessionId);
  return sessionId;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getResponseAnswer(body: unknown) {
  if (typeof body === "string") {
    return readString(body);
  }

  if (!body || typeof body !== "object") {
    return null;
  }

  const record = body as Record<string, unknown>;
  const directAnswer =
    readString(record.answer) ??
    readString(record.response) ??
    readString(record.reply) ??
    readString(record.message);

  if (directAnswer) {
    return directAnswer;
  }

  if (record.data && typeof record.data === "object") {
    return getResponseAnswer(record.data);
  }

  return null;
}

function getResponseSessionId(body: unknown) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const record = body as Record<string, unknown>;
  return readString(record.session_id) ?? readString(record.sessionId);
}

async function getRequestError(response: Response) {
  try {
    const body = (await response.json()) as unknown;
    return getResponseAnswer(body) ?? `The agent request failed (${response.status}).`;
  } catch {
    return `The agent request failed (${response.status}).`;
  }
}

export async function askAgent(
  question: string,
): Promise<AgentResponse> {
  const sessionId = getAgentSessionId();
  const authSession = await getActiveAuthSession();

  function sendRequest(accessToken?: string) {
    const payload: {
      question: string;
      session_id: string;
      token?: string;
    } = {
      question,
      session_id: sessionId,
    };

    if (accessToken?.trim()) {
      payload.token = accessToken;
    }

    return fetch(AGENT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }

  let response = await sendRequest(authSession?.accessToken);

  if (response.status === 401 && authSession) {
    const refreshedSession = await refreshAuthSession();

    if (refreshedSession) {
      response = await sendRequest(refreshedSession.accessToken);
    }
  }

  if (!response.ok) {
    throw new Error(await getRequestError(response));
  }

  const body = (await response.json()) as unknown;
  const answer = getResponseAnswer(body);

  if (!answer) {
    throw new Error("The agent returned an empty response.");
  }

  const responseSessionId = getResponseSessionId(body) ?? sessionId;

  if (responseSessionId !== sessionId) {
    saveSessionId(responseSessionId);
  }

  return {
    answer,
    sessionId: responseSessionId,
  };
}
