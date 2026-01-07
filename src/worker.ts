import { auditEndpoint } from "./endpoints/audit";
import { docsInfoEndpoint, docsOpenApiEndpoint, docsPageEndpoint } from "./endpoints/docs";
import { healthEndpoint } from "./endpoints/health";
import { newsEndpoint } from "./endpoints/news";
import { researchEndpoint } from "./endpoints/research";
import { sentimentEndpoint } from "./endpoints/sentiment";
import { walletClassifierEndpoint } from "./endpoints/wallet";
import { createRuntimeConfig, EnvBindings } from "./config";
import { sendError } from "./utils/response";
import { requirePayment, PaymentSuccess } from "./utils/payment";
import { initOpenRouter } from "./services/openrouter.service";

type WorkerEnv = EnvBindings & Record<string, string | undefined>;

const worker = {
  async fetch(request: Request, env: WorkerEnv) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const config = createRuntimeConfig(env);

    logRequest(method, url.pathname);

    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "access-control-allow-headers": "*",
          "access-control-max-age": "86400",
        },
      });
    }

    if (method === "GET" && url.pathname === "/health") {
      return healthEndpoint(config);
    }

    if (method === "GET" && url.pathname === "/") {
      return Response.redirect(`${url.origin}/docs`, 302);
    }

    if (method === "GET" && url.pathname === "/docs/info") {
      return docsInfoEndpoint(url.origin, config);
    }

    if (method === "GET" && url.pathname === "/openapi.json") {
      return docsOpenApiEndpoint(url.origin, config);
    }

    if (method === "GET" && url.pathname === "/docs") {
      return docsPageEndpoint(url.origin, config);
    }

    // Require OpenRouter for API endpoints
    if (url.pathname.startsWith("/api/")) {
      initOpenRouter(env.OPENROUTER_API_KEY);
    }

    if (method === "GET" && url.pathname === "/api/news") {
      const paymentResult = await requirePayment(request, url, config, 0.001);
      if (!paymentResult.ok) {
        return (paymentResult as any).response;
      }

      const response = await newsEndpoint.handle({
        payment: (paymentResult as PaymentSuccess).payment,
        config,
      });
      return attachPaymentHeader(response, (paymentResult as PaymentSuccess).paymentHeader);
    }

    if (method === "POST" && url.pathname === "/api/audit") {
      const bodyResult = await parseJsonBody(request);
      if (bodyResult.error) {
        return bodyResult.error;
      }

      const paymentResult = await requirePayment(request, url, config, 0.02, bodyResult.data);
      if (!paymentResult.ok) {
        return (paymentResult as any).response;
      }

      const response = await auditEndpoint.handle({
        body: bodyResult.data as any,
        payment: (paymentResult as PaymentSuccess).payment,
        config,
      });
      return attachPaymentHeader(response, (paymentResult as PaymentSuccess).paymentHeader);
    }

    if (method === "POST" && url.pathname === "/api/wallet/classify") {
      const bodyResult = await parseJsonBody(request);
      if (bodyResult.error) {
        return bodyResult.error;
      }

      const paymentResult = await requirePayment(request, url, config, 0.005, bodyResult.data);
      if (!paymentResult.ok) {
        return (paymentResult as any).response;
      }

      const response = await walletClassifierEndpoint.handle({
        body: bodyResult.data as any,
        payment: (paymentResult as PaymentSuccess).payment,
        config,
      });
      return attachPaymentHeader(response, (paymentResult as PaymentSuccess).paymentHeader);
    }

    if (method === "POST" && url.pathname === "/api/research/user") {
      const bodyResult = await parseJsonBody(request);
      if (bodyResult.error) {
        return bodyResult.error;
      }

      const paymentResult = await requirePayment(request, url, config, 0.005, bodyResult.data);
      if (!paymentResult.ok) {
        return (paymentResult as any).response;
      }

      const response = await researchEndpoint.handle({
        body: bodyResult.data as any,
        payment: (paymentResult as PaymentSuccess).payment,
        config,
      });
      return attachPaymentHeader(response, (paymentResult as PaymentSuccess).paymentHeader);
    }

    if (method === "POST" && url.pathname === "/api/sentiment") {
      const bodyResult = await parseJsonBody(request);
      if (bodyResult.error) {
        return bodyResult.error;
      }

      const paymentResult = await requirePayment(request, url, config, 0.005, bodyResult.data);
      if (!paymentResult.ok) {
        return (paymentResult as any).response;
      }

      const response = await sentimentEndpoint.handle({
        body: bodyResult.data as any,
        payment: (paymentResult as PaymentSuccess).payment,
        config,
      });
      return attachPaymentHeader(response, (paymentResult as PaymentSuccess).paymentHeader);
    }

    return sendError("Not Found", 404, "NOT_FOUND");
  },
};

export default worker;

function logRequest(method: string, path: string) {
  console.log(`[${new Date().toISOString()}] ${method} ${path}`);
}

async function parseJsonBody(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return { data: undefined };
  }

  try {
    const data = await request.json();
    return { data };
  } catch (error) {
    console.error("Failed to parse JSON body:", error);
    return {
      error: sendError(
        "Invalid JSON body",
        400,
        "INVALID_JSON",
        error instanceof Error ? error.message : "Invalid JSON"
      ),
    };
  }
}

function attachPaymentHeader(response: Response, header: string) {
  const headers = new Headers(response.headers);
  headers.set("X-PAYMENT-RESPONSE", header);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
