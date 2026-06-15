export async function getApiErrorMessage(
  response: Response,
  fallback: string,
) {
  try {
    const body = (await response.json()) as {
      message?: unknown;
      error?: unknown;
    };

    if (typeof body.message === "string" && body.message.trim()) {
      return body.message.trim();
    }

    if (Array.isArray(body.message)) {
      const messages = body.message.filter(
        (item): item is string =>
          typeof item === "string" && Boolean(item.trim()),
      );

      if (messages.length) {
        return messages.join(" ");
      }
    }

    if (typeof body.error === "string" && body.error.trim()) {
      return body.error.trim();
    }
  } catch {
    // The API may return an empty or non-JSON error body.
  }

  return fallback;
}
