import { EndpointContext } from "../types";

export abstract class BaseEndpoint<TBody = any, TContext extends EndpointContext<TBody> = EndpointContext<TBody>> {
  abstract handle(context: TContext): Promise<Response> | Response;
}
