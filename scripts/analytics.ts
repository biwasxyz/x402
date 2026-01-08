/**
 * Cloudflare Worker Analytics Script
 * Fetches metrics from Cloudflare GraphQL Analytics API
 *
 * Usage:
 *   CLOUDFLARE_API_TOKEN=your_token bun run scripts/analytics.ts
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
    responseBodySize: number;
    wallTime: number;
  };
  quantiles: {
    cpuTimeP25: number;
    cpuTimeP50: number;
    cpuTimeP75: number;
    cpuTimeP90: number;
    cpuTimeP99: number;
    cpuTimeP999: number;
    durationP25: number;
    durationP50: number;
    durationP75: number;
    durationP90: number;
    durationP99: number;
    durationP999: number;
    responseBodySizeP25: number;
    responseBodySizeP50: number;
    responseBodySizeP75: number;
    responseBodySizeP90: number;
    responseBodySizeP99: number;
    responseBodySizeP999: number;
    wallTimeP25: number;
    wallTimeP50: number;
    wallTimeP75: number;
    wallTimeP90: number;
    wallTimeP99: number;
    wallTimeP999: number;
  };
  avg: {
    cpuTime: number;
    duration: number;
    responseBodySize: number;
    sampleInterval: number;
  };
  dimensions: {
    datetime: string;
    datetimeHour?: string;
    datetimeMinute?: string;
    scriptName: string;
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

// Comprehensive query to fetch all available worker metrics
const WORKERS_ANALYTICS_QUERY = `
query GetWorkersAnalytics($accountTag: String!, $datetimeStart: Time!, $datetimeEnd: Time!, $scriptName: String!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      # Aggregated metrics for the time period
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
          responseBodySize
          wallTime
        }
        quantiles {
          cpuTimeP25
          cpuTimeP50
          cpuTimeP75
          cpuTimeP90
          cpuTimeP99
          cpuTimeP999
          durationP25
          durationP50
          durationP75
          durationP90
          durationP99
          durationP999
          responseBodySizeP25
          responseBodySizeP50
          responseBodySizeP75
          responseBodySizeP90
          responseBodySizeP99
          responseBodySizeP999
          wallTimeP25
          wallTimeP50
          wallTimeP75
          wallTimeP90
          wallTimeP99
          wallTimeP999
        }
        avg {
          cpuTime
          duration
          responseBodySize
          sampleInterval
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
        avg {
          cpuTime
          duration
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
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

  // Default to last 24 hours
  const hoursBack = parseInt(process.argv[2] || "24", 10);
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

  // Fetch main metrics
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
        responseBodySize: acc.responseBodySize + (m.sum?.responseBodySize || 0),
        wallTime: acc.wallTime + (m.sum?.wallTime || 0),
      }),
      { requests: 0, errors: 0, subrequests: 0, responseBodySize: 0, wallTime: 0 }
    );

    // Get the latest quantiles for percentile data
    const latestMetric = mainMetrics[0];
    const quantiles = latestMetric?.quantiles || {};
    const avg = latestMetric?.avg || {};

    // Summary Table
    console.log("SUMMARY METRICS");
    console.log("-".repeat(50));
    printTable(
      ["Metric", "Value"],
      [
        ["Total Requests", formatNumber(totals.requests)],
        ["Total Errors", formatNumber(totals.errors)],
        ["Error Rate", `${((totals.errors / totals.requests) * 100 || 0).toFixed(2)}%`],
        ["Total Subrequests", formatNumber(totals.subrequests)],
        ["Total Response Size", formatBytes(totals.responseBodySize)],
        ["Total Wall Time", formatDuration(totals.wallTime)],
      ]
    );

    // CPU Time Percentiles Table
    console.log("\nCPU TIME PERCENTILES (microseconds)");
    console.log("-".repeat(50));
    printTable(
      ["Percentile", "Value"],
      [
        ["P25", formatDuration(quantiles.cpuTimeP25 || 0)],
        ["P50 (Median)", formatDuration(quantiles.cpuTimeP50 || 0)],
        ["P75", formatDuration(quantiles.cpuTimeP75 || 0)],
        ["P90", formatDuration(quantiles.cpuTimeP90 || 0)],
        ["P99", formatDuration(quantiles.cpuTimeP99 || 0)],
        ["P99.9", formatDuration(quantiles.cpuTimeP999 || 0)],
        ["Average", formatDuration(avg.cpuTime || 0)],
      ]
    );

    // Duration Percentiles Table
    console.log("\nREQUEST DURATION PERCENTILES (microseconds)");
    console.log("-".repeat(50));
    printTable(
      ["Percentile", "Value"],
      [
        ["P25", formatDuration(quantiles.durationP25 || 0)],
        ["P50 (Median)", formatDuration(quantiles.durationP50 || 0)],
        ["P75", formatDuration(quantiles.durationP75 || 0)],
        ["P90", formatDuration(quantiles.durationP90 || 0)],
        ["P99", formatDuration(quantiles.durationP99 || 0)],
        ["P99.9", formatDuration(quantiles.durationP999 || 0)],
        ["Average", formatDuration(avg.duration || 0)],
      ]
    );

    // Response Body Size Percentiles Table
    console.log("\nRESPONSE BODY SIZE PERCENTILES");
    console.log("-".repeat(50));
    printTable(
      ["Percentile", "Value"],
      [
        ["P25", formatBytes(quantiles.responseBodySizeP25 || 0)],
        ["P50 (Median)", formatBytes(quantiles.responseBodySizeP50 || 0)],
        ["P75", formatBytes(quantiles.responseBodySizeP75 || 0)],
        ["P90", formatBytes(quantiles.responseBodySizeP90 || 0)],
        ["P99", formatBytes(quantiles.responseBodySizeP99 || 0)],
        ["P99.9", formatBytes(quantiles.responseBodySizeP999 || 0)],
        ["Average", formatBytes(avg.responseBodySize || 0)],
      ]
    );

    // Wall Time Percentiles Table
    console.log("\nWALL TIME PERCENTILES (Total execution time)");
    console.log("-".repeat(50));
    printTable(
      ["Percentile", "Value"],
      [
        ["P25", formatDuration(quantiles.wallTimeP25 || 0)],
        ["P50 (Median)", formatDuration(quantiles.wallTimeP50 || 0)],
        ["P75", formatDuration(quantiles.wallTimeP75 || 0)],
        ["P90", formatDuration(quantiles.wallTimeP90 || 0)],
        ["P99", formatDuration(quantiles.wallTimeP99 || 0)],
        ["P99.9", formatDuration(quantiles.wallTimeP999 || 0)],
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

    // Hourly Breakdown (last 24 hours max)
    const hourlyMetrics =
      hourlyResponse.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive || [];

    if (hourlyMetrics.length > 0) {
      console.log("\nHOURLY BREAKDOWN (Last 24 data points)");
      console.log("-".repeat(50));
      printTable(
        ["Hour", "Requests", "Errors", "Avg CPU", "Avg Duration"],
        hourlyMetrics.slice(0, 24).map((m) => [
          m.dimensions?.datetimeHour || "N/A",
          formatNumber(m.sum?.requests || 0),
          formatNumber(m.sum?.errors || 0),
          formatDuration(m.avg?.cpuTime || 0),
          formatDuration(m.avg?.duration || 0),
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
            summary: totals,
            quantiles,
            averages: avg,
            statusBreakdown: statusMetrics,
            hourlyBreakdown: hourlyMetrics,
          },
          null,
          2
        )
      );
    }

    console.log(`\n${"=".repeat(80)}`);
    console.log("Tips:");
    console.log("  - Use 'bun run scripts/analytics.ts 168' for last 7 days");
    console.log("  - Add '--json' flag for raw JSON output");
    console.log("  - Open scripts/analytics.html for visual dashboard");
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
