import { ApiResponse, ErrorDetails } from "../types";

function buildHeaders(init?: Record<string, string>) {
  const headers = new Headers(init || {});
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return headers;
}

export function jsonResponse(body: any, status: number = 200, init?: ResponseInit) {
  let headerRecord: Record<string, string> | undefined;

  if (init?.headers instanceof Headers) {
    headerRecord = {};
    init.headers.forEach((value, key) => {
      headerRecord![key] = value;
    });
  } else if (Array.isArray(init?.headers)) {
    headerRecord = Object.fromEntries(init.headers);
  } else {
    headerRecord = init?.headers as Record<string, string> | undefined;
  }

  const headers = buildHeaders(headerRecord);
  return new Response(JSON.stringify(body), {
    ...init,
    status,
    headers,
  });
}

export function sendSuccess<T>(
  data: T,
  statusCode: number = 200,
  settlement?: unknown,
  headers?: Record<string, string>
) {
  const response: ApiResponse<T> = {
    success: true,
    data,
    ...(settlement && { settlement }),
  };

  return jsonResponse(response, statusCode, { headers });
}

export function sendError(
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any,
  headers?: Record<string, string>
) {
  const error: ErrorDetails = {
    message,
    ...(code && { code }),
    ...(details && { details }),
  };

  const response: ApiResponse = {
    success: false,
    error,
  };

  return jsonResponse(response, statusCode, { headers });
}
