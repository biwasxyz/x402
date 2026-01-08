/**
 * Cloudflare Worker Analytics Script
 * Fetches metrics from Cloudflare GraphQL Analytics API
 *
 * Usage:
 *   CLOUDFLARE_API_TOKEN=your_token bun run scripts/analytics.ts [hours]
 *
 * Required permissions for API token:
 *   - Account Analytics:Read
 *
 * API Reference: https://developers.cloudflare.com/analytics/graphql-api/tutorials/querying-workers-metrics/
 */

import "dotenv/config";

const GRAPHQL_ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";
const ACCOUNT_ID = "c4cd2fdc1a3327a4fcec8c151333c267";
const SCRIPT_NAME = "x402-api";

interface WorkerMetrics {
  sum: {
    requests: number;
    errors: number;
    subrequests: number;
  };
  quantiles: {
    cpuTimeP50: number;
    cpuTimeP99: number;
  };
  dimensions: {
    datetime?: string;
    datetimeHour?: string;
    scriptName?: string;
    status?: string;
  };
}

interface GraphQLResponse {
  data?: {
    viewer: {
      accounts: Array<{
        workersInvocationsAdaptive: WorkerMetrics[];
      }>;
    };
  };
  errors?: Array<{ message: string; path?: string[] }>;
}

// Main query for aggregated metrics
const WORKERS_ANALYTICS_QUERY = `
query GetWorkersAnalytics($accountTag: String!, $datetimeStart: Time!, $datetimeEnd: Time!, $scriptName: String!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      workersInvocationsAdaptive(
        filter: {
          scriptName: $scriptName
          datetime_geq: $datetimeStart
          datetime_leq: $datetimeEnd
        }
        limit: 1000
        orderBy: [datetime_DESC]
      ) {
        sum {
          requests
          errors
          subrequests
        }
        quantiles {
          cpuTimeP50
          cpuTimeP99
        }
        dimensions {
          datetime
          scriptName
          status
        }
      }
    }
  }
}
`;

// Hourly breakdown query
const HOURLY_BREAKDOWN_QUERY = `
query GetWorkersHourlyBreakdown($accountTag: String!, $datetimeStart: Time!, $datetimeEnd: Time!, $scriptName: String!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      workersInvocationsAdaptive(
        filter: {
          scriptName: $scriptName
          datetime_geq: $datetimeStart
          datetime_leq: $datetimeEnd
        }
        limit: 168
        orderBy: [datetimeHour_DESC]
      ) {
        sum {
          requests
          errors
          subrequests
        }
        quantiles {
          cpuTimeP50
          cpuTimeP99
        }
        dimensions {
          datetimeHour
          scriptName
        }
      }
    }
  }
}
`;

// Status breakdown query
const STATUS_BREAKDOWN_QUERY = `
query GetWorkersStatusBreakdown($accountTag: String!, $datetimeStart: Time!, $datetimeEnd: Time!, $scriptName: String!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      workersInvocationsAdaptive(
        filter: {
          scriptName: $scriptName
          datetime_geq: $datetimeStart
          datetime_leq: $datetimeEnd
        }
        limit: 100
        orderBy: [sum_requests_DESC]
      ) {
        sum {
          requests
          errors
        }
        dimensions {
          status
          scriptName
        }
      }
    }
  }
}
`;

async function queryGraphQL(
  query: string,
  variables: Record<string, string>
): Promise<GraphQLResponse> {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!apiToken) {
    throw new Error(
      "CLOUDFLARE_API_TOKEN environment variable is required\n" +
        "Create a token at: https://dash.cloudflare.com/profile/api-tokens\n" +
        "Required permission: Account Analytics:Read"
    );
  }

  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GraphQL request failed: ${response.status} - ${text}`);
  }

  return response.json();
}

function formatDuration(microseconds: number): string {
  if (microseconds < 1000) return `${microseconds.toFixed(2)} us`;
  if (microseconds < 1000000) return `${(microseconds / 1000).toFixed(2)} ms`;
  return `${(microseconds / 1000000).toFixed(2)} s`;
}

function formatNumber(num: number): string {
  return num.toLocaleString("en-US");
}

function printTable(headers: string[], rows: string[][]): void {
  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => (r[i] || "").length))
  );

  const separator = colWidths.map((w) => "-".repeat(w + 2)).join("+");
  const formatRow = (row: string[]) =>
    row.map((cell, i) => ` ${(cell || "").padEnd(colWidths[i])} `).join("|");

  console.log(separator);
  console.log(formatRow(headers));
  console.log(separator);
  rows.forEach((row) => console.log(formatRow(row)));
  console.log(separator);
}

async function fetchAndDisplayAnalytics(): Promise<void> {
  const now = new Date();
  const datetimeEnd = now.toISOString();

  // Default to last 7 days
  const hoursBack = parseInt(process.argv[2] || "168", 10);
  const datetimeStart = new Date(
    now.getTime() - hoursBack * 60 * 60 * 1000
  ).toISOString();

  console.log(`\n${"=".repeat(80)}`);
  console.log(`CLOUDFLARE WORKER ANALYTICS: ${SCRIPT_NAME}`);
  console.log(`${"=".repeat(80)}`);
  console.log(`Time Range: ${datetimeStart} to ${datetimeEnd}`);
  console.log(`Duration: Last ${hoursBack} hours`);
  console.log(`${"=".repeat(80)}\n`);

  const variables = {
    accountTag: ACCOUNT_ID,
    scriptName: SCRIPT_NAME,
    datetimeStart,
    datetimeEnd,
  };

  console.log("Fetching worker metrics...\n");

  try {
    const [mainResponse, hourlyResponse, statusResponse] = await Promise.all([
      queryGraphQL(WORKERS_ANALYTICS_QUERY, variables),
      queryGraphQL(HOURLY_BREAKDOWN_QUERY, variables),
      queryGraphQL(STATUS_BREAKDOWN_QUERY, variables),
    ]);

    // Check for errors
    for (const response of [mainResponse, hourlyResponse, statusResponse]) {
      if (response.errors) {
        console.error("GraphQL Errors:", JSON.stringify(response.errors, null, 2));
      }
    }

    // Process main metrics
    const mainMetrics =
      mainResponse.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive || [];

    if (mainMetrics.length === 0) {
      console.log("No metrics data available for the specified time range.\n");
      console.log("Possible reasons:");
      console.log("  - Worker has no traffic in this time period");
      console.log("  - API token lacks 'Account Analytics:Read' permission");
      console.log("  - Worker name or account ID is incorrect\n");
      return;
    }

    // Aggregate totals
    const totals = mainMetrics.reduce(
      (acc, m) => ({
        requests: acc.requests + (m.sum?.requests || 0),
        errors: acc.errors + (m.sum?.errors || 0),
        subrequests: acc.subrequests + (m.sum?.subrequests || 0),
      }),
      { requests: 0, errors: 0, subrequests: 0 }
    );

    // Get percentile data (use max values across all metrics)
    let cpuTimeP50 = 0;
    let cpuTimeP99 = 0;
    for (const m of mainMetrics) {
      if (m.quantiles?.cpuTimeP50 > cpuTimeP50) cpuTimeP50 = m.quantiles.cpuTimeP50;
      if (m.quantiles?.cpuTimeP99 > cpuTimeP99) cpuTimeP99 = m.quantiles.cpuTimeP99;
    }

    // Summary Table
    console.log("SUMMARY METRICS");
    console.log("-".repeat(50));
    printTable(
      ["Metric", "Value"],
      [
        ["Total Requests", formatNumber(totals.requests)],
        ["Total Errors", formatNumber(totals.errors)],
        ["Error Rate", `${((totals.errors / totals.requests) * 100 || 0).toFixed(2)}%`],
        ["Success Rate", `${(((totals.requests - totals.errors) / totals.requests) * 100 || 0).toFixed(2)}%`],
        ["Total Subrequests", formatNumber(totals.subrequests)],
        ["Subrequest Ratio", `${((totals.subrequests / totals.requests) || 0).toFixed(2)} per request`],
      ]
    );

    // CPU Time Table
    console.log("\nCPU TIME");
    console.log("-".repeat(50));
    printTable(
      ["Percentile", "Value"],
      [
        ["P50 (Median)", formatDuration(cpuTimeP50)],
        ["P99", formatDuration(cpuTimeP99)],
      ]
    );

    // Status Breakdown
    const statusMetrics =
      statusResponse.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive || [];

    if (statusMetrics.length > 0) {
      console.log("\nSTATUS BREAKDOWN");
      console.log("-".repeat(50));
      printTable(
        ["Status", "Requests", "Errors", "Error Rate"],
        statusMetrics.map((m) => [
          m.dimensions?.status || "unknown",
          formatNumber(m.sum?.requests || 0),
          formatNumber(m.sum?.errors || 0),
          `${(((m.sum?.errors || 0) / (m.sum?.requests || 1)) * 100).toFixed(2)}%`,
        ])
      );
    }

    // Hourly Breakdown
    const hourlyMetrics =
      hourlyResponse.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive || [];

    if (hourlyMetrics.length > 0) {
      console.log("\nHOURLY BREAKDOWN (Last 24 data points)");
      console.log("-".repeat(50));
      printTable(
        ["Hour (UTC)", "Requests", "Errors", "Subreqs", "CPU P50", "CPU P99"],
        hourlyMetrics.slice(0, 24).map((m) => [
          m.dimensions?.datetimeHour?.replace("T", " ").replace("Z", "") || "N/A",
          formatNumber(m.sum?.requests || 0),
          formatNumber(m.sum?.errors || 0),
          formatNumber(m.sum?.subrequests || 0),
          formatDuration(m.quantiles?.cpuTimeP50 || 0),
          formatDuration(m.quantiles?.cpuTimeP99 || 0),
        ])
      );
    }

    // Output JSON for programmatic use
    if (process.argv.includes("--json")) {
      console.log("\nRAW JSON OUTPUT");
      console.log("-".repeat(50));
      console.log(
        JSON.stringify(
          {
            summary: {
              ...totals,
              errorRate: ((totals.errors / totals.requests) * 100 || 0).toFixed(2) + "%",
              cpuTimeP50,
              cpuTimeP99,
            },
            statusBreakdown: statusMetrics.map((m) => ({
              status: m.dimensions?.status,
              requests: m.sum?.requests,
              errors: m.sum?.errors,
            })),
            hourlyBreakdown: hourlyMetrics.map((m) => ({
              hour: m.dimensions?.datetimeHour,
              requests: m.sum?.requests,
              errors: m.sum?.errors,
              subrequests: m.sum?.subrequests,
              cpuTimeP50: m.quantiles?.cpuTimeP50,
              cpuTimeP99: m.quantiles?.cpuTimeP99,
            })),
          },
          null,
          2
        )
      );
    }

    console.log(`\n${"=".repeat(80)}`);
    console.log("Available Metrics from workersInvocationsAdaptive:");
    console.log("-".repeat(80));
    printTable(
      ["Category", "Field", "Description"],
      [
        ["sum", "requests", "Total request count"],
        ["sum", "errors", "Total error count"],
        ["sum", "subrequests", "Total fetch() calls made"],
        ["quantiles", "cpuTimeP50", "Median CPU time (microseconds)"],
        ["quantiles", "cpuTimeP99", "99th percentile CPU time (microseconds)"],
        ["dimensions", "datetime", "Timestamp"],
        ["dimensions", "datetimeHour", "Hourly bucket"],
        ["dimensions", "scriptName", "Worker script name"],
        ["dimensions", "status", "Request status (success/error)"],
      ]
    );
    console.log(`${"=".repeat(80)}`);
    console.log("\nUsage:");
    console.log("  bun run scripts/analytics.ts [hours]  - Query last N hours (default: 168)");
    console.log("  bun run scripts/analytics.ts 168      - Query last 7 days");
    console.log("  bun run scripts/analytics.ts --json   - Include raw JSON output");
    console.log("  npm run analytics:ui                  - Open HTML dashboard");
    console.log(`${"=".repeat(80)}\n`);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error fetching analytics:", error.message);
    } else {
      console.error("Error fetching analytics:", error);
    }
    process.exit(1);
  }
}

fetchAndDisplayAnalytics();
