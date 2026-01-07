import { RuntimeConfig } from "../../config";
import { buildDocsOverview } from "../../docs";
import { jsonResponse } from "../../utils/response";

export function docsInfoEndpoint(baseUrl: string, config: RuntimeConfig) {
  return jsonResponse(buildDocsOverview(baseUrl, config));
}
