// Lightweight client-side mocks for integration calls.
// Replace with real API calls that store credentials server-side and encrypt at rest.

type AffinityConnectPayload = {
  listId: string;
  apiToken: string;
};

export async function connectAffinity(payload: AffinityConnectPayload) {
  await wait(450);
  return {
    ok: true,
    listId: payload.listId,
    tokenLast4: payload.apiToken.slice(-4),
    message: "Saved Affinity credentials (mock). In production, store server-side.",
  };
}

export async function disconnectAffinity() {
  await wait(250);
  return { ok: true };
}

export async function startGoogleAuth() {
  await wait(400);
  return { ok: true, authUrl: "https://accounts.google.com/o/oauth2/auth?mock" };
}

export async function createGoogleSheet(filename: string) {
  await wait(350);
  return {
    ok: true,
    filename,
    url: `https://docs.google.com/spreadsheets/d/mock-${encodeURIComponent(filename)}`,
  };
}

export async function disconnectGoogleSheet() {
  await wait(250);
  return { ok: true };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

