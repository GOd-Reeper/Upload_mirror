"use client";

import { useState, useEffect } from "react";
import { db, SupabaseAccount } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import {
    Database,
    Loader2,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Clock,
    Server,
    Activity,
    AlertTriangle,
    Copy,
    ChevronDown,
    Zap
} from "lucide-react";

interface ServerActivityRecord {
    id: number;
    pinged_at: string;
    source: string;
    created_at: string;
}

interface TableRecordResult {
    success: boolean;
    records?: ServerActivityRecord[];
    table_exists: boolean;
    total_count?: number;
    error?: string;
    latency_ms: number;
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
}

function getTimeSince(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

function getActivityStatus(lastPing: string): { status: 'active' | 'warning' | 'danger'; label: string } {
    const date = new Date(lastPing);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays < 1) return { status: 'active', label: 'Active' };
    if (diffDays < 5) return { status: 'warning', label: 'Warning' };
    return { status: 'danger', label: 'At Risk' };
}

export default function TableRecordPage() {
    const [accounts, setAccounts] = useState<SupabaseAccount[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<SupabaseAccount | null>(null);
    const [result, setResult] = useState<TableRecordResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [accountsLoading, setAccountsLoading] = useState(true);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [copiedSQL, setCopiedSQL] = useState(false);
    const { addToast } = useToast();

    // Load accounts on mount
    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        setAccountsLoading(true);
        try {
            const data = await db.accounts.getAll();
            // Filter accounts that have service_role_key
            const validAccounts = (data || []).filter((acc: SupabaseAccount) => acc.service_role_key);
            setAccounts(validAccounts);
        } catch (error) {
            addToast("error", "Failed to load accounts");
        } finally {
            setAccountsLoading(false);
        }
    };

    const fetchTableRecords = async () => {
        if (!selectedAccount) {
            addToast("error", "Please select an account first");
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const response = await fetch('/api/accounts/table-record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_url: selectedAccount.project_url,
                    service_role_key: selectedAccount.service_role_key
                })
            });

            const data = await response.json();
            setResult(data);

            if (data.success && data.table_exists) {
                addToast("success", "Records fetched successfully!");
            } else if (!data.table_exists) {
                addToast("warning", "Table not found - Run the setup SQL");
            } else {
                addToast("error", data.error || "Failed to fetch records");
            }
        } catch (error) {
            addToast("error", "Failed to fetch records");
        } finally {
            setLoading(false);
        }
    };

    const triggerManualPing = async () => {
        if (!selectedAccount) {
            addToast("error", "Please select an account first");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/accounts/pause-prevent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_url: selectedAccount.project_url,
                    service_role_key: selectedAccount.service_role_key
                })
            });

            const data = await response.json();

            if (data.success) {
                addToast("success", "Activity recorded successfully!");
                // Refresh the records
                await fetchTableRecords();
            } else {
                addToast("error", data.error || "Failed to record activity");
            }
        } catch (error) {
            addToast("error", "Failed to record activity");
        } finally {
            setLoading(false);
        }
    };

    const setupSQL = `CREATE TABLE IF NOT EXISTS public.server_activity (
    id SERIAL PRIMARY KEY,
    pinged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source TEXT NOT NULL DEFAULT 'manual',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.server_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on server_activity" ON public.server_activity;
CREATE POLICY "Allow all operations on server_activity" ON public.server_activity
    FOR ALL
    USING (true)
    WITH CHECK (true);

GRANT ALL ON public.server_activity TO service_role;
GRANT ALL ON public.server_activity TO anon;
GRANT ALL ON public.server_activity TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.server_activity_id_seq TO service_role, anon, authenticated;

INSERT INTO public.server_activity (pinged_at, source) VALUES (NOW(), 'initial_setup');

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('server-keep-alive') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'server-keep-alive'
);

SELECT cron.schedule(
    'server-keep-alive',
    '0 * * * *',
    $$INSERT INTO public.server_activity (pinged_at, source) VALUES (NOW(), 'pg_cron_hourly');$$
);`;

    const copySQL = () => {
        navigator.clipboard.writeText(setupSQL);
        setCopiedSQL(true);
        addToast("success", "SQL copied to clipboard!");
        setTimeout(() => setCopiedSQL(false), 2000);
    };

    return (
        <div style={{ minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, rgba(0, 212, 212, 0.15) 0%, rgba(0, 212, 212, 0.05) 100%)',
                        border: '1px solid rgba(0, 212, 212, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Server size={24} color="#00d4d4" />
                    </div>
                    <div>
                        <h1 style={{
                            fontSize: '28px',
                            fontWeight: 700,
                            color: '#ffffff',
                            margin: 0
                        }}>
                            Server Activity Records
                        </h1>
                        <p style={{ color: '#666677', fontSize: '14px', margin: 0 }}>
                            View and manage server_activity table records for each account
                        </p>
                    </div>
                </div>
            </div>

            {/* Account Selector */}
            <div style={{
                background: '#12121a',
                border: '1px solid #1e1e2e',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
                        <label style={{
                            display: 'block',
                            color: '#888899',
                            fontSize: '13px',
                            marginBottom: '8px',
                            fontWeight: 500
                        }}>
                            Select Account
                        </label>
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            disabled={accountsLoading}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                background: '#0a0a0f',
                                border: dropdownOpen ? '1px solid rgba(0, 212, 212, 0.3)' : '1px solid #1e1e2e',
                                borderRadius: '10px',
                                color: selectedAccount ? '#ffffff' : '#666677',
                                fontSize: '14px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <span style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {accountsLoading ? 'Loading accounts...' :
                                    selectedAccount ? (selectedAccount.name || 'Unnamed Account') :
                                        'Select an account'}
                            </span>
                            <ChevronDown
                                size={18}
                                style={{
                                    transition: 'transform 0.2s',
                                    transform: dropdownOpen ? 'rotate(180deg)' : 'none',
                                    flexShrink: 0
                                }}
                            />
                        </button>

                        {/* Dropdown */}
                        {dropdownOpen && accounts.length > 0 && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                marginTop: '4px',
                                background: '#12121a',
                                border: '1px solid #1e1e2e',
                                borderRadius: '10px',
                                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
                                zIndex: 10,
                                maxHeight: '300px',
                                overflowY: 'auto'
                            }}>
                                {accounts.map((account) => (
                                    <button
                                        key={account.id}
                                        onClick={() => {
                                            setSelectedAccount(account);
                                            setDropdownOpen(false);
                                            setResult(null);
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px',
                                            background: selectedAccount?.id === account.id ? 'rgba(0, 212, 212, 0.1)' : 'transparent',
                                            border: 'none',
                                            borderBottom: '1px solid #1a1a24',
                                            color: selectedAccount?.id === account.id ? '#00d4d4' : '#ffffff',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px'
                                        }}
                                    >
                                        <Database size={16} color={selectedAccount?.id === account.id ? '#00d4d4' : '#666677'} />
                                        <div style={{ overflow: 'hidden' }}>
                                            <div style={{
                                                fontWeight: 500,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {account.name || 'Unnamed Account'}
                                            </div>
                                            <div style={{
                                                color: '#555566',
                                                fontSize: '12px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {account.project_url}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '12px', paddingTop: '28px' }}>
                        <button
                            onClick={fetchTableRecords}
                            disabled={!selectedAccount || loading}
                            style={{
                                padding: '12px 20px',
                                background: 'linear-gradient(135deg, #00d4d4 0%, #00b8b8 100%)',
                                border: 'none',
                                borderRadius: '10px',
                                color: '#000000',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: !selectedAccount || loading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                opacity: !selectedAccount || loading ? 0.6 : 1,
                                transition: 'all 0.2s'
                            }}
                        >
                            {loading ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <RefreshCw size={16} />
                            )}
                            Fetch Records
                        </button>

                        <button
                            onClick={triggerManualPing}
                            disabled={!selectedAccount || loading}
                            style={{
                                padding: '12px 20px',
                                background: '#12121a',
                                border: '1px solid #1e1e2e',
                                borderRadius: '10px',
                                color: '#888899',
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: !selectedAccount || loading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                opacity: !selectedAccount || loading ? 0.6 : 1,
                                transition: 'all 0.2s'
                            }}
                        >
                            <Zap size={16} />
                            Manual Ping
                        </button>
                    </div>
                </div>
            </div>

            {/* Results Section */}
            {result && (
                <div style={{
                    background: '#12121a',
                    border: '1px solid #1e1e2e',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    marginBottom: '24px'
                }}>
                    {/* Status Header */}
                    <div style={{
                        padding: '20px 24px',
                        borderBottom: '1px solid #1e1e2e',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '16px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {result.table_exists ? (
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: 'rgba(34, 197, 94, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <CheckCircle2 size={20} color="#22c55e" />
                                </div>
                            ) : (
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    background: 'rgba(245, 158, 11, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <AlertTriangle size={20} color="#f59e0b" />
                                </div>
                            )}
                            <div>
                                <h3 style={{
                                    color: '#ffffff',
                                    fontSize: '16px',
                                    fontWeight: 600,
                                    margin: 0
                                }}>
                                    {result.table_exists ? 'Table Found' : 'Table Not Found'}
                                </h3>
                                <p style={{ color: '#666677', fontSize: '13px', margin: 0 }}>
                                    {result.table_exists
                                        ? `${result.records?.length || 0} shown • ${result.total_count || 0} total • ${result.latency_ms}ms`
                                        : 'Run the setup SQL to create the table'
                                    }
                                </p>
                            </div>
                        </div>

                        {result.table_exists && result.records && result.records.length > 0 && (
                            <div style={{ display: 'flex', gap: '12px' }}>
                                {(() => {
                                    const status = getActivityStatus(result.records[0].pinged_at);
                                    const colors = {
                                        active: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e' },
                                        warning: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' },
                                        danger: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' }
                                    };
                                    return (
                                        <span style={{
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            background: colors[status.status].bg,
                                            color: colors[status.status].text,
                                            fontSize: '13px',
                                            fontWeight: 500
                                        }}>
                                            {status.label}
                                        </span>
                                    );
                                })()}
                            </div>
                        )}
                    </div>

                    {/* Records Table */}
                    {result.table_exists && result.records && result.records.length > 0 && (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontSize: '14px'
                            }}>
                                <thead>
                                    <tr style={{ background: '#0a0a0f' }}>
                                        <th style={{
                                            padding: '14px 20px',
                                            textAlign: 'left',
                                            color: '#666677',
                                            fontWeight: 500,
                                            fontSize: '12px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>ID</th>
                                        <th style={{
                                            padding: '14px 20px',
                                            textAlign: 'left',
                                            color: '#666677',
                                            fontWeight: 500,
                                            fontSize: '12px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>Pinged At</th>
                                        <th style={{
                                            padding: '14px 20px',
                                            textAlign: 'left',
                                            color: '#666677',
                                            fontWeight: 500,
                                            fontSize: '12px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>Source</th>
                                        <th style={{
                                            padding: '14px 20px',
                                            textAlign: 'left',
                                            color: '#666677',
                                            fontWeight: 500,
                                            fontSize: '12px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>Created At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.records.map((record) => (
                                        <tr
                                            key={record.id}
                                            style={{
                                                borderTop: '1px solid #1a1a24'
                                            }}
                                        >
                                            <td style={{ padding: '16px 20px', color: '#888899' }}>
                                                {record.id}
                                            </td>
                                            <td style={{ padding: '16px 20px' }}>
                                                <div style={{ color: '#ffffff', fontWeight: 500 }}>
                                                    {formatDate(record.pinged_at)}
                                                </div>
                                                <div style={{ color: '#00d4d4', fontSize: '12px', marginTop: '2px' }}>
                                                    {getTimeSince(record.pinged_at)}
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 20px' }}>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '6px',
                                                    background: record.source.includes('pg_cron')
                                                        ? 'rgba(139, 92, 246, 0.1)'
                                                        : record.source.includes('api')
                                                            ? 'rgba(0, 212, 212, 0.1)'
                                                            : 'rgba(107, 114, 128, 0.1)',
                                                    color: record.source.includes('pg_cron')
                                                        ? '#8b5cf6'
                                                        : record.source.includes('api')
                                                            ? '#00d4d4'
                                                            : '#888899',
                                                    fontSize: '12px',
                                                    fontWeight: 500
                                                }}>
                                                    {record.source}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px 20px', color: '#666677' }}>
                                                {formatDate(record.created_at)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* No Records */}
                    {result.table_exists && (!result.records || result.records.length === 0) && (
                        <div style={{
                            padding: '60px 20px',
                            textAlign: 'center'
                        }}>
                            <Database size={48} color="#333344" style={{ marginBottom: '16px' }} />
                            <p style={{ color: '#666677', fontSize: '14px' }}>
                                No records found in server_activity table
                            </p>
                        </div>
                    )}

                    {/* Table Not Found - Show Setup Instructions */}
                    {!result.table_exists && (
                        <div style={{ padding: '24px' }}>
                            <div style={{
                                background: 'rgba(245, 158, 11, 0.05)',
                                border: '1px solid rgba(245, 158, 11, 0.15)',
                                borderRadius: '12px',
                                padding: '20px',
                                marginBottom: '20px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                    <AlertTriangle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <div>
                                        <h4 style={{ color: '#f59e0b', fontSize: '14px', fontWeight: 600, margin: 0 }}>
                                            Setup Required
                                        </h4>
                                        <p style={{ color: '#888899', fontSize: '13px', margin: '8px 0 0', lineHeight: 1.5 }}>
                                            The <code style={{
                                                background: 'rgba(245, 158, 11, 0.1)',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                color: '#f59e0b'
                                            }}>server_activity</code> table doesn't exist on this account.
                                            Run the SQL below in your Supabase SQL Editor to set it up with automatic hourly pings.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Setup SQL Section */}
            <div style={{
                background: '#12121a',
                border: '1px solid #1e1e2e',
                borderRadius: '16px',
                overflow: 'hidden'
            }}>
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #1e1e2e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: 'rgba(139, 92, 246, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Activity size={18} color="#8b5cf6" />
                        </div>
                        <div>
                            <h3 style={{ color: '#ffffff', fontSize: '16px', fontWeight: 600, margin: 0 }}>
                                Setup SQL
                            </h3>
                            <p style={{ color: '#666677', fontSize: '12px', margin: 0 }}>
                                Creates table + pg_cron job (runs every hour)
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={copySQL}
                        style={{
                            padding: '10px 16px',
                            background: copiedSQL ? 'rgba(34, 197, 94, 0.1)' : '#0a0a0f',
                            border: copiedSQL ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid #1e1e2e',
                            borderRadius: '8px',
                            color: copiedSQL ? '#22c55e' : '#888899',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                    >
                        {copiedSQL ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                        {copiedSQL ? 'Copied!' : 'Copy SQL'}
                    </button>
                </div>

                <div style={{ padding: '4px' }}>
                    <pre style={{
                        background: '#0a0a0f',
                        borderRadius: '10px',
                        padding: '20px',
                        margin: 0,
                        overflow: 'auto',
                        maxHeight: '400px',
                        fontSize: '13px',
                        lineHeight: 1.6,
                        color: '#e2e8f0',
                        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace'
                    }}>
                        <code>{setupSQL}</code>
                    </pre>
                </div>
            </div>

            {/* Info Banner */}
            <div style={{
                background: 'rgba(0, 212, 212, 0.05)',
                border: '1px solid rgba(0, 212, 212, 0.15)',
                borderRadius: '12px',
                padding: '20px',
                marginTop: '24px'
            }}>
                <h4 style={{ color: '#00d4d4', fontSize: '14px', fontWeight: 600, margin: '0 0 12px' }}>
                    💡 How It Works
                </h4>
                <ul style={{
                    color: '#888899',
                    fontSize: '13px',
                    margin: 0,
                    paddingLeft: '20px',
                    lineHeight: 1.8
                }}>
                    <li><strong style={{ color: '#ffffff' }}>pg_cron</strong> runs a database UPDATE every hour automatically</li>
                    <li><strong style={{ color: '#ffffff' }}>Database writes</strong> count as activity and reset the 7-day pause timer</li>
                    <li><strong style={{ color: '#ffffff' }}>Manual Ping</strong> button lets you trigger an update from the dashboard</li>
                    <li><strong style={{ color: '#ffffff' }}>Source column</strong> shows whether the update came from pg_cron or API</li>
                    <li><strong style={{ color: '#ffffff' }}>Ping count</strong> shows total number of activity records (should increase hourly)</li>
                </ul>
            </div>
        </div>
    );
}
