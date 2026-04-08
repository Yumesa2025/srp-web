import ky, { HTTPError, type BeforeErrorState } from "ky";

type ErrorPayload = {
  error?: string;
  message?: string;
};

async function getResponseErrorMessage(response: Response): Promise<string | undefined> {
  const contentType = response.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const payload = (await response.clone().json()) as ErrorPayload;
      return payload.error || payload.message;
    }

    const text = (await response.clone().text()).trim();
    return text ? text.slice(0, 500) : undefined;
  } catch {
    return undefined;
  }
}

async function enrichHttpError({ error }: BeforeErrorState): Promise<Error> {
  if (!(error instanceof HTTPError)) {
    return error;
  }

  const responseMessage = await getResponseErrorMessage(error.response);
  const fallbackMessage = `HTTP ${error.response.status} ${error.response.statusText}`.trim();

  error.message = responseMessage || fallbackMessage;
  return error;
}

export const api = ky.create({
  timeout: 15_000,
  retry: {
    limit: 2,
    methods: ["get"],
    statusCodes: [408, 429, 500, 502, 503, 504],
  },
  hooks: {
    beforeError: [enrichHttpError],
  },
});

export const externalApi = ky.create({
  timeout: 30_000,
  retry: {
    limit: 1,
    methods: ["get"],
    statusCodes: [408, 429, 500, 502, 503, 504],
  },
  hooks: {
    beforeError: [enrichHttpError],
  },
});
