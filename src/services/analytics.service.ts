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

// KV-based endpoint tracking (persistent across deployments)
interface EndpointStats {
  count: number;
  errors: number;
  totalDuration: number;
  lastAccess: string;
}

interface AllEndpointStats {
  endpoints: Record<string, EndpointStats>;
  updatedAt: string;
}

const KV_KEY = "endpoint_stats";

// Track endpoint request to KV (fire-and-forget, non-blocking)
export async function trackEndpointKV(
  kv: KVNamespace | undefined,
  endpoint: string,
  method: string,
  status: number,
  duration: number
): Promise<void> {
  if (!kv) return;

  const key = `${method} ${endpoint}`;

  try {
    // Read current stats
    const data = await kv.get<AllEndpointStats>(KV_KEY, "json");
    const stats: AllEndpointStats = data || { endpoints: {}, updatedAt: "" };

    // Initialize endpoint if not exists
    if (!stats.endpoints[key]) {
      stats.endpoints[key] = { count: 0, errors: 0, totalDuration: 0, lastAccess: "" };
    }

    // Update counters
    stats.endpoints[key].count++;
    stats.endpoints[key].totalDuration += duration;
    stats.endpoints[key].lastAccess = new Date().toISOString();
    if (status >= 400) {
      stats.endpoints[key].errors++;
    }
    stats.updatedAt = new Date().toISOString();

    // Write back (fire-and-forget)
    await kv.put(KV_KEY, JSON.stringify(stats));
  } catch (error) {
    console.error("Failed to track endpoint to KV:", error);
  }
}

// Get endpoint stats from KV
export async function getEndpointStatsKV(kv: KVNamespace | undefined) {
  if (!kv) {
    return { total: 0, endpoints: [], note: "KV not configured" };
  }

  try {
    const data = await kv.get<AllEndpointStats>(KV_KEY, "json");
    if (!data) {
      return { total: 0, endpoints: [], note: "No data yet" };
    }

    const stats = Object.entries(data.endpoints)
      .map(([endpoint, d]) => ({
        endpoint,
        requests: d.count,
        errors: d.errors,
        avgDuration: d.count > 0 ? Math.round(d.totalDuration / d.count) : 0,
        errorRate: d.count > 0 ? ((d.errors / d.count) * 100).toFixed(1) + "%" : "0%",
        lastAccess: d.lastAccess,
      }))
      .sort((a, b) => b.requests - a.requests);

    return {
      total: stats.reduce((sum, s) => sum + s.requests, 0),
      endpoints: stats,
      updatedAt: data.updatedAt,
    };
  } catch (error) {
    console.error("Failed to get endpoint stats from KV:", error);
    return { total: 0, endpoints: [], error: "Failed to read KV" };
  }
}

// Reset endpoint stats in KV
export async function resetEndpointStatsKV(kv: KVNamespace | undefined): Promise<boolean> {
  if (!kv) return false;
  try {
    await kv.delete(KV_KEY);
    return true;
  } catch {
    return false;
  }
}

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

export function getSubrequestStats(hours?: number) {
  if (!hours) {
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

  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  const filteredLogs = subrequestLogs.filter(
    (log) => Date.parse(log.timestamp) >= cutoff
  );
  const aggregates: Record<string, { count: number; totalDuration: number; errors: number }> = {};

  for (const log of filteredLogs) {
    if (!aggregates[log.target]) {
      aggregates[log.target] = { count: 0, totalDuration: 0, errors: 0 };
    }
    aggregates[log.target].count++;
    aggregates[log.target].totalDuration += log.duration;
    if (log.status >= 400) {
      aggregates[log.target].errors++;
    }
  }

  const stats = Object.entries(aggregates).map(([target, data]) => ({
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
    recentLogs: filteredLogs.slice(-50).reverse(),
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

interface SubrequestOriginMetrics {
  sum: {
    subrequests: number;
    requestBodySize: number;
    responseBodySize: number;
    timeToResponseUs: number;
  };
  quantiles: {
    timeToResponseUsP50: number;
    timeToResponseUsP99: number;
  };
  dimensions: {
    hostname: string;
    httpResponseStatus: number;
    cacheStatus: number;
    requestOutcome: string;
  };
}

interface GraphQLResponse {
  data?: {
    viewer: {
      accounts: Array<{
        workersInvocationsAdaptive?: WorkerMetrics[];
        workersSubrequestsAdaptiveGroups?: SubrequestOriginMetrics[];
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

// Query for subrequest origins (the data you see in Cloudflare dashboard)
const SUBREQUEST_ORIGINS_QUERY = `
query GetSubrequestOrigins($accountTag: String!, $datetimeStart: Time!, $datetimeEnd: Time!, $scriptName: String!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      workersSubrequestsAdaptiveGroups(
        filter: { scriptName: $scriptName datetime_geq: $datetimeStart datetime_leq: $datetimeEnd }
        limit: 100
        orderBy: [sum_subrequests_DESC]
      ) {
        sum {
          subrequests
          requestBodySize
          responseBodySize
          timeToResponseUs
        }
        quantiles {
          timeToResponseUsP50
          timeToResponseUsP99
        }
        dimensions {
          hostname
          httpResponseStatus
          cacheStatus
          requestOutcome
        }
      }
    }
  }
}`;

async function queryGraphQL(
  apiToken: string,
  query: string,
  variables: Record<string, string>
): Promise<GraphQLResponse> {
  const response = await trackedFetch("/api/analytics", GRAPHQL_ENDPOINT, {
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

// Helper to format microseconds to human readable
function formatDuration(us: number): string {
  if (us < 1000) return `${us.toFixed(1)}µs`;
  if (us < 1000000) return `${(us / 1000).toFixed(1)}ms`;
  return `${(us / 1000000).toFixed(2)}s`;
}

// Aggregate origin metrics by hostname (like Cloudflare dashboard)
function aggregateOrigins(metrics: SubrequestOriginMetrics[]) {
  // Group by hostname
  const byHostname: Record<string, {
    requests: number;
    status2xx: number;
    status4xx: number;
    status5xx: number;
    totalResponseTimeUs: number;
    cached: number;
    uncached: number;
  }> = {};

  for (const m of metrics) {
    const hostname = m.dimensions?.hostname || "unknown";
    const status = m.dimensions?.httpResponseStatus || 0;
    const count = m.sum?.subrequests || 0;
    const responseTime = m.sum?.timeToResponseUs || 0;
    const isCached = m.dimensions?.cacheStatus === 1;

    if (!byHostname[hostname]) {
      byHostname[hostname] = {
        requests: 0,
        status2xx: 0,
        status4xx: 0,
        status5xx: 0,
        totalResponseTimeUs: 0,
        cached: 0,
        uncached: 0,
      };
    }

    byHostname[hostname].requests += count;
    byHostname[hostname].totalResponseTimeUs += responseTime;

    if (status >= 200 && status < 300) {
      byHostname[hostname].status2xx += count;
    } else if (status >= 400 && status < 500) {
      byHostname[hostname].status4xx += count;
    } else if (status >= 500) {
      byHostname[hostname].status5xx += count;
    }

    if (isCached) {
      byHostname[hostname].cached += count;
    } else {
      byHostname[hostname].uncached += count;
    }
  }

  // Format output like Cloudflare dashboard
  const origins = Object.entries(byHostname)
    .map(([hostname, data]) => ({
      hostname,
      requests: data.requests,
      status: {
        "2xx": data.status2xx,
        "4xx": data.status4xx,
        "5xx": data.status5xx,
      },
      avgResponseTime: data.requests > 0
        ? formatDuration(data.totalResponseTimeUs / data.requests)
        : "0ms",
      avgResponseTimeUs: data.requests > 0
        ? Math.round(data.totalResponseTimeUs / data.requests)
        : 0,
      cacheRate: data.requests > 0
        ? `${((data.cached / data.requests) * 100).toFixed(0)}%`
        : "0%",
    }))
    .sort((a, b) => b.requests - a.requests);

  return origins;
}

export async function getWorkerAnalytics(apiToken: string, hours: number = 168, kv?: KVNamespace) {
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
    const [mainResponse, statusResponse, hourlyResponse, originsResponse] = await Promise.all([
      queryGraphQL(apiToken, MAIN_QUERY, variables),
      queryGraphQL(apiToken, STATUS_QUERY, variables),
      queryGraphQL(apiToken, HOURLY_QUERY, variables),
      queryGraphQL(apiToken, SUBREQUEST_ORIGINS_QUERY, variables),
    ]);

    // Check for errors
    const errors = [
      ...(mainResponse.errors || []),
      ...(statusResponse.errors || []),
      ...(hourlyResponse.errors || []),
      ...(originsResponse.errors || []),
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
    const originMetrics =
      originsResponse.data?.viewer?.accounts?.[0]?.workersSubrequestsAdaptiveGroups || [];

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
      // Endpoint tracking (persistent via KV)
      endpointStats: await getEndpointStatsKV(kv),
      hourlyBreakdown: hourlyMetrics.slice(0, 24).map((m) => ({
        hour: m.dimensions?.datetimeHour || "N/A",
        requests: m.sum?.requests || 0,
        errors: m.sum?.errors || 0,
        subrequests: m.sum?.subrequests || 0,
        cpuTimeP50: m.quantiles?.cpuTimeP50 || 0,
        cpuTimeP99: m.quantiles?.cpuTimeP99 || 0,
      })),
      // Subrequest origins from Cloudflare (matches dashboard view)
      origins: aggregateOrigins(originMetrics),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
