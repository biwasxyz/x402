import { performSecurityAudit } from "../../services/audit.service";
import { getContractSource } from "../../services/stacks.service";
import { sendError, sendSuccess } from "../../utils/response";
import { BaseEndpoint } from "../BaseEndpoint";
import { PaidEndpointContext } from "../../types";

interface AuditRequest {
  contractIdentifier: string;
}

export class AuditEndpoint extends BaseEndpoint<AuditRequest, PaidEndpointContext<AuditRequest>> {
  async handle(context: PaidEndpointContext<AuditRequest>) {
    const payment = context.payment;
    console.log(`  Payment verified: ${payment.txId}`);

    try {
      const { contractIdentifier } = context.body || {} as AuditRequest;

      if (!contractIdentifier) {
        return sendError(
          "contractIdentifier is required",
          400,
          "MISSING_CONTRACT_IDENTIFIER"
        );
      }

      console.log(`  Fetching contract from Stacks API: ${contractIdentifier}`);
      const sourceCode = await getContractSource(contractIdentifier, context.config.stacksApiUrl);
      const [, contractName] = contractIdentifier.split(".");

      console.log(`  Analyzing contract: ${contractName} (${sourceCode.length} chars)`);

      const auditResult = await performSecurityAudit(
        sourceCode,
        contractName,
        contractIdentifier
      );

      console.log(`  Audit complete: ${auditResult.overallRisk} risk, ${auditResult.vulnerabilities.length} findings`);

      return sendSuccess(auditResult, 200, payment);
    } catch (error: any) {
      console.error(`  Error:`, error instanceof Error ? error.message : error);

      if (error.message?.includes("User not found")) {
        console.error("  OpenRouter API key issue - check your OPENROUTER_API_KEY");
        return sendError(
          "AI service configuration error. Please contact support.",
          500,
          "AI_SERVICE_ERROR",
          "OpenRouter API authentication failed"
        );
      }

      return sendError(
        error instanceof Error ? error.message : "Failed to analyze contract",
        500,
        "AUDIT_ERROR"
      );
    }
  }
}

export const auditEndpoint = new AuditEndpoint();
