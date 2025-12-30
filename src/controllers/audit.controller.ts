import { Request, Response } from "express";
import { getPayment } from "x402-stacks";
import { getContractSource } from "../services/stacks.service";
import { performSecurityAudit } from "../services/audit.service";

interface AuditRequest {
  contractIdentifier: string;
}

export async function auditContract(req: Request, res: Response) {
  const payment = getPayment(req);
  console.log(`  Payment verified: ${payment.txId}`);

  try {
    const { contractIdentifier } = req.body as AuditRequest;

    if (!contractIdentifier) {
      return res.status(400).json({
        error: "contractIdentifier is required",
      });
    }

    console.log(`  Fetching contract from Stacks API: ${contractIdentifier}`);
    const sourceCode = await getContractSource(contractIdentifier);
    const [, contractName] = contractIdentifier.split(".");

    console.log(`  Analyzing contract: ${contractName} (${sourceCode.length} chars)`);

    const auditResult = await performSecurityAudit(
      sourceCode,
      contractName,
      contractIdentifier
    );

    console.log(`  Audit complete: ${auditResult.overallRisk} risk, ${auditResult.vulnerabilities.length} findings`);

    res.json({
      ...auditResult,
      payment: {
        txId: payment.txId,
        amount: payment.amount.toString(),
        sender: payment.sender,
      },
    });
  } catch (error: any) {
    console.error(`  Error:`, error instanceof Error ? error.message : error);

    if (error.message?.includes("User not found")) {
      console.error("  OpenRouter API key issue - check your OPENROUTER_API_KEY");
      return res.status(500).json({
        error: "AI service configuration error. Please contact support.",
        details: "OpenRouter API authentication failed"
      });
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to analyze contract",
    });
  }
}
