import { RuntimeConfig } from "../../config";
import { getOpenApiSpec } from "../../docs";
import { jsonResponse } from "../../utils/response";

export function docsOpenApiEndpoint(baseUrl: string, config: RuntimeConfig) {
  return jsonResponse(getOpenApiSpec(baseUrl, config));
}
