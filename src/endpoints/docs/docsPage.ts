import { RuntimeConfig } from "../../config";
import { getDocsHtml } from "../../docs";

export function docsPageEndpoint(baseUrl: string, _config: RuntimeConfig) {
  return new Response(getDocsHtml(baseUrl), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
