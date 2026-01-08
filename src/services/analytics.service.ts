/**
 * Analytics Service
 * Queries Cloudflare GraphQL Analytics API server-side
 * Tracks subrequests made by the worker
 */

const GRAPHQL_ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";
const ACCOUNT_ID = "c4cd2fdc1a3327a4fcec8c151333c267";
const SCRIPT_NAME = "x402-api";

// In-memory subrequest tracking (resets on worker restart)
interface SubrequestLog {
  timestamp: string;
  endpoint: string;
  target: string;
  method: string;
  status: number;
  duration: number;
}

const subrequestLogs: SubrequestLog[] = [];
const MAX_LOGS = 1000;

// Subrequest counters by target
const subrequestCounters: Record<string, { count: number; totalDuration: number; errors: number }> = {};

export function trackSubrequest(
  endpoint: string,
  target: string,
  method: string,
  status: number,
  duration: number
): void {
  // Add to logs (circular buffer)
  subrequestLogs.push({
    timestamp: new Date().toISOString(),
    endpoint,
    target,
    method,
    status,
    duration,
  });

  if (subrequestLogs.length > MAX_LOGS) {
    subrequestLogs.shift();
  }

  // Update counters
  if (!subrequestCounters[target]) {
    subrequestCounters[target] = { count: 0, totalDuration: 0, errors: 0 };
  }
  subrequestCounters[target].count++;
  subrequestCounters[target].totalDuration += duration;
  if (status >= 400) {
    subrequestCounters[target].errors++;
  }
}

export function getSubrequestStats() {
  const stats = Object.entries(subrequestCounters).map(([target, data]) => ({
    target,
    count: data.count,
    errors: data.errors,
    avgDuration: data.count > 0 ? Math.round(data.totalDuration / data.count) : 0,
    errorRate: data.count > 0 ? ((data.errors / data.count) * 100).toFixed(2) + "%" : "0%",
  }));

  return {
    totals: {
      count: stats.reduce((sum, s) => sum + s.count, 0),
      errors: stats.reduce((sum, s) => sum + s.errors, 0),
    },
    byTarget: stats.sort((a, b) => b.count - a.count),
    recentLogs: subrequestLogs.slice(-50).reverse(),
  };
}

// Tracked fetch wrapper
export async function trackedFetch(
  endpoint: string,
  url: string | URL,
  init?: RequestInit
): Promise<Response> {
  const startTime = Date.now();
  const urlString = url.toString();
  const target = new URL(urlString).hostname;
  const method = init?.method || "GET";

  try {
    const response = await fetch(url, init);
    const duration = Date.now() - startTime;
    trackSubrequest(endpoint, target, method, response.status, duration);
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    trackSubrequest(endpoint, target, method, 0, duration);
    throw error;
  }
}

// GraphQL query types
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
  errors?: Array<{ message: string }>;
}

const MAIN_QUERY = `
query GetWorkersAnalytics($accountTag: String!, $datetimeStart: Time!, $datetimeEnd: Time!, $scriptName: String!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      workersInvocationsAdaptive(
        filter: { scriptName: $scriptName datetime_geq: $datetimeStart datetime_leq: $datetimeEnd }
        limit: 1000
        orderBy: [datetime_DESC]
      ) {
        sum { requests errors subrequests }
        quantiles { cpuTimeP50 cpuTimeP99 }
        dimensions { datetime scriptName status }
      }
    }
  }
}`;

const STATUS_QUERY = `
query GetWorkersStatusBreakdown($accountTag: String!, $datetimeStart: Time!, $datetimeEnd: Time!, $scriptName: String!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      workersInvocationsAdaptive(
        filter: { scriptName: $scriptName datetime_geq: $datetimeStart datetime_leq: $datetimeEnd }
        limit: 100
        orderBy: [sum_requests_DESC]
      ) {
        sum { requests errors }
        dimensions { status scriptName }
      }
    }
  }
}`;

const HOURLY_QUERY = `
query GetWorkersHourlyBreakdown($accountTag: String!, $datetimeStart: Time!, $datetimeEnd: Time!, $scriptName: String!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      workersInvocationsAdaptive(
        filter: { scriptName: $scriptName datetime_geq: $datetimeStart datetime_leq: $datetimeEnd }
        limit: 168
        orderBy: [datetimeHour_DESC]
      ) {
        sum { requests errors subrequests }
        quantiles { cpuTimeP50 cpuTimeP99 }
        dimensions { datetimeHour scriptName }
      }
    }
  }
}`;

async function queryGraphQL(
  apiToken: string,
  query: string,
  variables: Record<string, string>
): Promise<GraphQLResponse> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status}`);
  }

  return response.json();
}

export async function getWorkerAnalytics(apiToken: string, hours: number = 24) {
  const now = new Date();
  const datetimeEnd = now.toISOString();
  const datetimeStart = new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();

  const variables = {
    accountTag: ACCOUNT_ID,
    scriptName: SCRIPT_NAME,
    datetimeStart,
    datetimeEnd,
  };

  try {
    const [mainResponse, statusResponse, hourlyResponse] = await Promise.all([
      queryGraphQL(apiToken, MAIN_QUERY, variables),
      queryGraphQL(apiToken, STATUS_QUERY, variables),
      queryGraphQL(apiToken, HOURLY_QUERY, variables),
    ]);

    // Check for errors
    const errors = [
      ...(mainResponse.errors || []),
      ...(statusResponse.errors || []),
      ...(hourlyResponse.errors || []),
    ];

    if (errors.length > 0) {
      return {
        success: false,
        error: errors.map((e) => e.message).join(", "),
      };
    }

    const mainMetrics =
      mainResponse.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive || [];
    const statusMetrics =
      statusResponse.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive || [];
    const hourlyMetrics =
      hourlyResponse.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive || [];

    // Aggregate totals
    const totals = mainMetrics.reduce(
      (acc, m) => ({
        requests: acc.requests + (m.sum?.requests || 0),
        errors: acc.errors + (m.sum?.errors || 0),
        subrequests: acc.subrequests + (m.sum?.subrequests || 0),
      }),
      { requests: 0, errors: 0, subrequests: 0 }
    );

    // Get max percentile values
    let cpuTimeP50 = 0;
    let cpuTimeP99 = 0;
    for (const m of mainMetrics) {
      if (m.quantiles?.cpuTimeP50 > cpuTimeP50) cpuTimeP50 = m.quantiles.cpuTimeP50;
      if (m.quantiles?.cpuTimeP99 > cpuTimeP99) cpuTimeP99 = m.quantiles.cpuTimeP99;
    }

    return {
      success: true,
      timeRange: { start: datetimeStart, end: datetimeEnd, hours },
      summary: {
        ...totals,
        successRate:
          totals.requests > 0
            ? (((totals.requests - totals.errors) / totals.requests) * 100).toFixed(1) + "%"
            : "0%",
        errorRate:
          totals.requests > 0
            ? ((totals.errors / totals.requests) * 100).toFixed(2) + "%"
            : "0%",
        subrequestRatio:
          totals.requests > 0
            ? (totals.subrequests / totals.requests).toFixed(2) + " per request"
            : "0",
        cpuTimeP50,
        cpuTimeP99,
      },
      statusBreakdown: statusMetrics.map((m) => ({
        status: m.dimensions?.status || "unknown",
        requests: m.sum?.requests || 0,
        errors: m.sum?.errors || 0,
        errorRate:
          m.sum?.requests > 0
            ? (((m.sum?.errors || 0) / m.sum.requests) * 100).toFixed(2) + "%"
            : "0%",
      })),
      hourlyBreakdown: hourlyMetrics.slice(0, 24).map((m) => ({
        hour: m.dimensions?.datetimeHour || "N/A",
        requests: m.sum?.requests || 0,
        errors: m.sum?.errors || 0,
        subrequests: m.sum?.subrequests || 0,
        cpuTimeP50: m.quantiles?.cpuTimeP50 || 0,
        cpuTimeP99: m.quantiles?.cpuTimeP99 || 0,
      })),
      // Include live subrequest tracking from this worker instance
      subrequestTracking: getSubrequestStats(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
