import { NextRequest, NextResponse } from "next/server";

export interface HealthCheckRequest {
  project_url: string;
  s3_endpoint: string;
  service_role_key?: string;
}

export interface HealthCheckResult {
  success: boolean;
  latency_ms: number;
  error?: string;
  method: string;
}

/**
 * Health Check API for Supabase accounts
 * 
 * This endpoint performs a health check on a Supabase project by:
 * 1. Making a simple REST API call to verify the project is active
 * 2. This keeps the project active and prevents Supabase from pausing it
 * 
 * Supabase free-tier projects are paused after 7 days of inactivity.
 * Regular health checks (at least once per week) prevent this.
 */
export async function POST(request: NextRequest) {
  try {
    const body: HealthCheckRequest = await request.json();
    const { project_url, s3_endpoint, service_role_key } = body;

    if (!project_url) {
      return NextResponse.json(
        { success: false, error: "Project URL is required" },
        { status: 400 }
      );
    }

    // Extract project reference from project_url or s3_endpoint
    // project_url format: https://xxx.supabase.co
    // s3_endpoint format: https://xxx.supabase.co/storage/v1/s3
    let projectRef = "";

    try {
      const url = new URL(project_url);
      projectRef = url.hostname.split(".")[0];
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid project URL format" },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    let result: HealthCheckResult;

    // Method 1: Try REST API health check (simplest, just checks if project responds)
    // We'll use the PostgREST endpoint which is always available
    const restUrl = `https://${projectRef}.supabase.co/rest/v1/`;

    try {
      const response = await fetch(restUrl, {
        method: "GET",
        headers: {
          "apikey": service_role_key || "anon", // Use service role key if available
          "Authorization": `Bearer ${service_role_key || "anon"}`,
        },
        // Set a reasonable timeout
        signal: AbortSignal.timeout(15000),
      });

      const latency = Date.now() - startTime;

      if (response.ok || response.status === 200) {
        result = {
          success: true,
          latency_ms: latency,
          method: "REST API",
        };
      } else if (response.status === 401 || response.status === 403) {
        // Authentication error but project is alive - this is still a success for health check
        result = {
          success: true,
          latency_ms: latency,
          method: "REST API (Auth Required)",
        };
      } else if (response.status === 503 || response.status === 502) {
        // Project might be paused
        result = {
          success: false,
          latency_ms: latency,
          error: "Project appears to be paused or unavailable (503/502)",
          method: "REST API",
        };
      } else {
        // Other status - check response for more details
        const text = await response.text().catch(() => "");

        if (text.toLowerCase().includes("paused") || text.toLowerCase().includes("inactive")) {
          result = {
            success: false,
            latency_ms: latency,
            error: "Project is paused due to inactivity",
            method: "REST API",
          };
        } else {
          // Any response means the project is alive
          result = {
            success: true,
            latency_ms: latency,
            method: `REST API (Status: ${response.status})`,
          };
        }
      }
    } catch (fetchError) {
      const latency = Date.now() - startTime;
      const errorMessage = fetchError instanceof Error ? fetchError.message : "Unknown error";

      // Check for timeout
      if (errorMessage.includes("timeout") || errorMessage.includes("aborted")) {
        result = {
          success: false,
          latency_ms: latency,
          error: "Request timed out - project may be paused or slow",
          method: "REST API",
        };
      } else if (errorMessage.includes("ENOTFOUND") || errorMessage.includes("getaddrinfo")) {
        result = {
          success: false,
          latency_ms: latency,
          error: "Project not found - check the project URL",
          method: "REST API",
        };
      } else {
        result = {
          success: false,
          latency_ms: latency,
          error: `Connection failed: ${errorMessage}`,
          method: "REST API",
        };
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      {
        success: false,
        latency_ms: 0,
        error: error instanceof Error ? error.message : "Health check failed",
        method: "Unknown",
      },
      { status: 500 }
    );
  }
}

/**
 * Batch health check for multiple accounts
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { accounts } = body as { accounts: HealthCheckRequest[] };

    if (!accounts || !Array.isArray(accounts)) {
      return NextResponse.json(
        { success: false, error: "Accounts array is required" },
        { status: 400 }
      );
    }

    // Process accounts sequentially to avoid rate limiting
    const results: Array<{ project_url: string; result: HealthCheckResult }> = [];

    for (const account of accounts) {
      const startTime = Date.now();

      try {
        const url = new URL(account.project_url);
        const projectRef = url.hostname.split(".")[0];
        const restUrl = `https://${projectRef}.supabase.co/rest/v1/`;

        const response = await fetch(restUrl, {
          method: "GET",
          headers: {
            "apikey": account.service_role_key || "anon",
            "Authorization": `Bearer ${account.service_role_key || "anon"}`,
          },
          signal: AbortSignal.timeout(15000),
        });

        const latency = Date.now() - startTime;

        // Any response (even auth errors) means project is alive
        const success = response.status !== 503 && response.status !== 502;

        results.push({
          project_url: account.project_url,
          result: {
            success,
            latency_ms: latency,
            method: "REST API",
            error: success ? undefined : "Project appears to be paused",
          },
        });
      } catch (error) {
        const latency = Date.now() - startTime;
        results.push({
          project_url: account.project_url,
          result: {
            success: false,
            latency_ms: latency,
            error: error instanceof Error ? error.message : "Health check failed",
            method: "REST API",
          },
        });
      }

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return NextResponse.json({
      success: true,
      results,
      total: accounts.length,
      healthy: results.filter(r => r.result.success).length,
      unhealthy: results.filter(r => !r.result.success).length,
    });
  } catch (error) {
    console.error("Batch health check error:", error);
    return NextResponse.json(
      { success: false, error: "Batch health check failed" },
      { status: 500 }
    );
  }
}

