import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export interface TableRecordRequest {
    project_url: string;
    service_role_key: string;
}

export interface ServerActivityRecord {
    id: number;
    pinged_at: string;
    source: string;
    created_at: string;
}

export interface TableRecordResult {
    success: boolean;
    records?: ServerActivityRecord[];
    table_exists: boolean;
    total_count?: number;
    error?: string;
    latency_ms: number;
}

function extractProjectRef(projectUrl: string): string | null {
    try {
        const url = new URL(projectUrl);
        return url.hostname.split(".")[0];
    } catch {
        return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        const body: TableRecordRequest = await request.json();
        const { project_url, service_role_key } = body;

        if (!project_url || !service_role_key) {
            return NextResponse.json(
                { success: false, error: "Project URL and Service Role Key are required", table_exists: false, latency_ms: 0 },
                { status: 400 }
            );
        }

        const projectRef = extractProjectRef(project_url);
        if (!projectRef) {
            return NextResponse.json(
                { success: false, error: "Invalid project URL format", table_exists: false, latency_ms: 0 },
                { status: 400 }
            );
        }

        const supabaseUrl = `https://${projectRef}.supabase.co`;
        const startTime = Date.now();

        try {
            const supabase = createClient(supabaseUrl, service_role_key, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                },
                db: {
                    schema: 'public'
                }
            });

            // Get total count first
            const { count, error: countError } = await supabase
                .from('server_activity')
                .select('*', { count: 'exact', head: true });

            // Fetch latest 50 records (most recent first)
            const { data: records, error: fetchError } = await supabase
                .from('server_activity')
                .select('id, pinged_at, source, created_at')
                .order('id', { ascending: false })
                .limit(50);

            const latency = Date.now() - startTime;

            if (fetchError || countError) {
                const error = fetchError || countError;
                const errorMsg = error?.message || '';
                const errorCode = error?.code || '';

                if (errorCode === 'PGRST116' ||
                    errorCode === '42P01' ||
                    errorMsg.toLowerCase().includes('does not exist') ||
                    errorMsg.toLowerCase().includes('relation') ||
                    errorMsg.includes('PGRST')) {
                    return NextResponse.json({
                        success: true,
                        records: [],
                        table_exists: false,
                        total_count: 0,
                        latency_ms: latency,
                        error: "server_activity table does not exist. Run the setup SQL first."
                    });
                }

                if (errorMsg.includes('JWT') ||
                    errorCode === 'PGRST301' ||
                    errorMsg.toLowerCase().includes('authentication') ||
                    errorMsg.toLowerCase().includes('unauthorized')) {
                    return NextResponse.json({
                        success: false,
                        table_exists: false,
                        latency_ms: latency,
                        error: "Authentication failed - Check your service_role_key"
                    });
                }

                return NextResponse.json({
                    success: false,
                    table_exists: false,
                    latency_ms: latency,
                    error: `Database error: ${errorMsg || errorCode || 'Unknown error'}`
                });
            }

            return NextResponse.json({
                success: true,
                records: records || [],
                table_exists: true,
                total_count: count || 0,
                latency_ms: latency
            });

        } catch (error) {
            const latency = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : "Unknown error";

            if (errorMessage.includes("503") || errorMessage.includes("paused")) {
                return NextResponse.json({
                    success: false,
                    table_exists: false,
                    latency_ms: latency,
                    error: "Project is PAUSED - Unpause it from Supabase dashboard first"
                });
            }

            return NextResponse.json({
                success: false,
                table_exists: false,
                latency_ms: latency,
                error: `Connection failed: ${errorMessage.substring(0, 100)}`
            });
        }

    } catch (error) {
        return NextResponse.json({
            success: false,
            table_exists: false,
            latency_ms: 0,
            error: error instanceof Error ? error.message : "Failed to fetch table records"
        }, { status: 500 });
    }
}
