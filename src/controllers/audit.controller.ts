import { Request, Response } from "express";
import { getPayment } from "x402-stacks";
import { getContractSource } from "../services/stacks.service";
import { performSecurityAudit } from "../services/audit.service";

interface AuditRequest {
  contractIdentifier?: string;
  contractCode?: string;
  contractName?: string;
}

export async function auditContract(req: Request, res: Response) {
  const payment = getPayment(req);
  console.log(`  Payment verified: ${payment.txId}`);

  try {
    const { contractIdentifier, contractCode, contractName = "unnamed-contract" } = req.body as AuditRequest;

    let sourceCode: string;
    let finalContractName: string;
    let finalContractIdentifier: string | undefined;

    // Fetch from Stacks API if identifier provided
    if (contractIdentifier) {
      console.log(`  Fetching contract from Stacks API: ${contractIdentifier}`);
      sourceCode = await getContractSource(contractIdentifier);
      const [, name] = contractIdentifier.split(".");
      finalContractName = name;
      finalContractIdentifier = contractIdentifier;
    } else if (contractCode) {
      sourceCode = contractCode;
      finalContractName = contractName;
    } else {
      return res.status(400).json({
        error: "Either 'contractIdentifier' or 'contractCode' must be provided",
      });
    }

    console.log(`  Analyzing contract: ${finalContractName} (${sourceCode.length} chars)`);

    const auditResult = await performSecurityAudit(
      sourceCode,
      finalContractName,
      finalContractIdentifier
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
