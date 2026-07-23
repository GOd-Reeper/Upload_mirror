    import { NextRequest, NextResponse } from "next/server";
    import { createClient } from "@supabase/supabase-js";

    export interface PausePreventRequest {
        project_url: string;
        service_role_key: string;
    }

    export interface PausePreventResult {
        success: boolean;
        latency_ms: number;
        error?: string;
        method: string;
        query_result?: string;
        table_status?: 'existed' | 'not_found';
        record_id?: number;
        total_records?: number;
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
            const body: PausePreventRequest = await request.json();
            const { project_url, service_role_key } = body;

            if (!project_url || !service_role_key) {
                return NextResponse.json(
                    { success: false, error: "Project URL and Service Role Key are required" },
                    { status: 400 }
                );
            }

            const projectRef = extractProjectRef(project_url);
            if (!projectRef) {
                return NextResponse.json(
                    { success: false, error: "Invalid project URL format" },
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

                // INSERT a new record each time (creates activity history)
                const { data: newRecord, error: insertError } = await supabase
                    .from('server_activity')
                    .insert({
                        pinged_at: new Date().toISOString(),
                        source: 'api_manual_ping'
                    })
                    .select('id')
                    .single();

                const latency = Date.now() - startTime;

                if (insertError) {
                    const errorMsg = insertError.message?.toLowerCase() || '';
                    const errorCode = insertError.code || '';

                    if (errorCode === 'PGRST116' ||
                        errorCode === '42P01' ||
                        errorMsg.includes('does not exist') ||
                        errorMsg.includes('relation')) {

                        return NextResponse.json({
                            success: false,
                            latency_ms: latency,
                            method: "Database INSERT",
                            error: "server_activity table does not exist. Please run the setup SQL first.",
                            table_status: 'not_found'
                        });
                    }

                    if (errorMsg.includes('jwt') ||
                        errorCode === 'PGRST301' ||
                        errorMsg.includes('authentication') ||
                        errorMsg.includes('unauthorized')) {
                        return NextResponse.json({
                            success: false,
                            latency_ms: latency,
                            error: "Authentication failed - Check your service_role_key",
                            method: "Database INSERT"
                        });
                    }

                    return NextResponse.json({
                        success: false,
                        latency_ms: latency,
                        error: `Database error: ${insertError.message}`,
                        method: "Database INSERT"
                    });
                }

                // Get total count
                const { count } = await supabase
                    .from('server_activity')
                    .select('*', { count: 'exact', head: true });

                return NextResponse.json({
                    success: true,
                    latency_ms: latency,
                    method: "Database INSERT",
                    query_result: `Activity recorded! Record #${newRecord?.id || 'N/A'}`,
                    table_status: 'existed',
                    record_id: newRecord?.id,
                    total_records: count || 0
                });

            } catch (error) {
                const latency = Date.now() - startTime;
                const errorMessage = error instanceof Error ? error.message : "Unknown error";

                return NextResponse.json({
                    success: false,
                    latency_ms: latency,
                    error: errorMessage.includes("503") || errorMessage.includes("paused")
                        ? "Project is PAUSED - Unpause it first"
                        : `Connection failed: ${errorMessage.substring(0, 100)}`,
                    method: "Connection"
                });
            }

        } catch (error) {
            return NextResponse.json({
                success: false,
                latency_ms: 0,
                error: error instanceof Error ? error.message : "Pause prevent failed",
                method: "Unknown"
            }, { status: 500 });
        }
    }

    export async function PUT(request: NextRequest) {
        try {
            const body = await request.json();
            const { accounts } = body as { accounts: PausePreventRequest[] };

            if (!accounts || !Array.isArray(accounts)) {
                return NextResponse.json(
                    { success: false, error: "Accounts array is required" },
                    { status: 400 }
                );
            }

            const validAccounts = accounts.filter(acc => acc.service_role_key);
            const skippedAccounts = accounts.filter(acc => !acc.service_role_key);

            if (validAccounts.length === 0) {
                return NextResponse.json({
                    success: false,
                    error: "No accounts have service_role_key configured.",
                    results: [],
                    total: accounts.length,
                    processed: 0,
                    skipped: accounts.length,
                    inserted: 0,
                    failed: 0,
                    skipped_accounts: skippedAccounts.map(acc => ({
                        project_url: acc.project_url,
                        reason: "Missing service_role_key"
                    }))
                });
            }

            const results: Array<{ project_url: string; result: PausePreventResult }> = [];
            let insertedCount = 0;
            let failedCount = 0;

            for (const account of validAccounts) {
                const startTime = Date.now();

                try {
                    const projectRef = extractProjectRef(account.project_url);
                    if (!projectRef) {
                        failedCount++;
                        results.push({
                            project_url: account.project_url,
                            result: {
                                success: false,
                                latency_ms: 0,
                                error: "Invalid project URL",
                                method: "Validation"
                            }
                        });
                        continue;
                    }

                    const supabaseUrl = `https://${projectRef}.supabase.co`;

                    const supabase = createClient(supabaseUrl, account.service_role_key, {
                        auth: {
                            autoRefreshToken: false,
                            persistSession: false
                        },
                        db: {
                            schema: 'public'
                        }
                    });

                    // INSERT a new record
                    const { data: newRecord, error: insertError } = await supabase
                        .from('server_activity')
                        .insert({
                            pinged_at: new Date().toISOString(),
                            source: 'api_batch_ping'
                        })
                        .select('id')
                        .single();

                    const latency = Date.now() - startTime;

                    if (!insertError && newRecord) {
                        insertedCount++;
                        results.push({
                            project_url: account.project_url,
                            result: {
                                success: true,
                                latency_ms: latency,
                                method: "Database INSERT",
                                query_result: `Record #${newRecord.id} created!`,
                                table_status: 'existed',
                                record_id: newRecord.id
                            }
                        });
                    } else {
                        failedCount++;
                        results.push({
                            project_url: account.project_url,
                            result: {
                                success: false,
                                latency_ms: latency,
                                error: insertError?.message || 'Unknown error',
                                method: "Database INSERT"
                            }
                        });
                    }

                } catch (error) {
                    const latency = Date.now() - startTime;
                    const errorMessage = error instanceof Error ? error.message : "Unknown";

                    failedCount++;
                    results.push({
                        project_url: account.project_url,
                        result: {
                            success: false,
                            latency_ms: latency,
                            error: errorMessage.substring(0, 80),
                            method: "Connection"
                        }
                    });
                }

                await new Promise(resolve => setTimeout(resolve, 300));
            }

            return NextResponse.json({
                success: true,
                message: `✅ ${insertedCount} records created | ❌ ${failedCount} failed | ⏭️ ${skippedAccounts.length} skipped`,
                results,
                total: accounts.length,
                processed: validAccounts.length,
                inserted: insertedCount,
                failed: failedCount,
                skipped: skippedAccounts.length,
                skipped_accounts: skippedAccounts.map(acc => ({
                    project_url: acc.project_url,
                    reason: "Missing service_role_key"
                }))
            });
        } catch (error) {
            return NextResponse.json(
                { success: false, error: "Batch pause prevent failed" },
                { status: 500 }
            );
        }
    }
