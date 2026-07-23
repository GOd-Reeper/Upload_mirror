"use client";

import { useState, useEffect } from "react";
import { AccountCard, AccountForm, AccountFormData, CsvUploadModal } from "@/components/accounts";
import { useToast } from "@/components/ui/Toast";
import { db, SupabaseAccount } from "@/lib/supabase";
import { formatMB } from "@/lib/utils";
import { Plus, Database, Loader2, X, RefreshCw, AlertTriangle, Activity, CheckCircle2, XCircle, Clock, Pause, Filter, Upload, Shield, Zap } from "lucide-react";

// Filter types
type FilterType = 'all' | 'useable' | 'full' | 'paused' | 'empty';

function StatCard({ label, value, subtext, accent = false }: { label: string; value: string; subtext: string; accent?: boolean }) {
  return (
    <div style={{
      background: '#12121a',
      border: '1px solid #1e1e2e',
      borderRadius: '14px',
      padding: '16px'
    }}>
      <p style={{ color: '#666677', fontSize: '13px', marginBottom: '4px' }}>{label}</p>
      <p style={{ color: accent ? '#00d4d4' : '#ffffff', fontSize: '24px', fontWeight: 700 }}>{value}</p>
      <p style={{ color: '#555566', fontSize: '12px', marginTop: '4px' }}>{subtext}</p>
    </div>
  );
}

function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 18px',
        fontSize: '14px',
        fontWeight: 600,
        borderRadius: '10px',
        border: 'none',
        cursor: 'pointer',
        background: hovered ? 'linear-gradient(135deg, #00e8e8 0%, #00d4d4 100%)' : 'linear-gradient(135deg, #00d4d4 0%, #00b8b8 100%)',
        color: '#000000',
        transition: 'all 0.2s',
        boxShadow: hovered ? '0 0 25px rgba(0, 212, 212, 0.4)' : '0 4px 12px rgba(0, 212, 212, 0.2)'
      }}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '10px 18px',
        fontSize: '14px',
        fontWeight: 500,
        borderRadius: '10px',
        border: 'none',
        cursor: 'pointer',
        background: hovered ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
        color: '#888899',
        transition: 'all 0.2s'
      }}
    >
      {children}
    </button>
  );
}

function DangerButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '10px 18px',
        fontSize: '14px',
        fontWeight: 600,
        borderRadius: '10px',
        border: 'none',
        cursor: 'pointer',
        background: hovered ? 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: '#ffffff',
        transition: 'all 0.2s',
        boxShadow: hovered ? '0 0 20px rgba(239, 68, 68, 0.3)' : 'none'
      }}
    >
      {children}
    </button>
  );
}

function Modal({ isOpen, onClose, title, children, size = 'md' }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  const [closeHovered, setCloseHovered] = useState(false);
  if (!isOpen) return null;

  const widths = { sm: '420px', md: '520px', lg: '640px' };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '24px 16px',
      overflowY: 'auto'
    }}>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)'
        }}
      />
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: widths[size],
        background: '#12121a',
        border: '1px solid #1e1e2e',
        borderRadius: '16px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
        margin: 'auto 0'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 22px',
          borderBottom: '1px solid #1e1e2e',
          position: 'sticky',
          top: 0,
          background: '#12121a',
          borderRadius: '16px 16px 0 0',
          zIndex: 1
        }}>
          <h2 style={{ color: '#ffffff', fontSize: '17px', fontWeight: 600 }}>{title}</h2>
          <button
            onClick={onClose}
            onMouseEnter={() => setCloseHovered(true)}
            onMouseLeave={() => setCloseHovered(false)}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              background: closeHovered ? '#1e1e2e' : 'transparent',
              color: closeHovered ? '#ffffff' : '#666677',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '20px 22px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function SecondaryButton({ children, onClick, disabled = false, loading = false }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; loading?: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 18px',
        fontSize: '14px',
        fontWeight: 500,
        borderRadius: '10px',
        border: hovered && !disabled ? '1px solid rgba(0, 212, 212, 0.3)' : '1px solid #1e1e2e',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        background: hovered && !disabled ? 'rgba(0, 212, 212, 0.05)' : '#12121a',
        color: hovered && !disabled ? '#00d4d4' : '#888899',
        transition: 'all 0.2s',
        opacity: disabled || loading ? 0.6 : 1
      }}
    >
      {children}
    </button>
  );
}

// Filter Tab Component
function FilterTab({
  label,
  count,
  active,
  onClick,
  color,
  icon
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color?: string;
  icon?: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  const accentColor = color || '#00d4d4';

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        fontSize: '13px',
        fontWeight: 500,
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        background: active
          ? `rgba(${color === '#22c55e' ? '34, 197, 94' : color === '#ef4444' ? '239, 68, 68' : color === '#f59e0b' ? '245, 158, 11' : '0, 212, 212'}, 0.15)`
          : hovered ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
        color: active ? accentColor : hovered ? '#ffffff' : '#888899',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap'
      }}
    >
      {icon}
      {label}
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '20px',
        height: '20px',
        padding: '0 6px',
        borderRadius: '10px',
        background: active ? accentColor : '#1e1e2e',
        color: active ? '#000000' : '#666677',
        fontSize: '11px',
        fontWeight: 600
      }}>
        {count}
      </span>
    </button>
  );
}

// Health Check Result Interface
interface HealthCheckResult {
  accountId: string;
  accountName: string;
  status: 'pending' | 'checking' | 'healthy' | 'unhealthy';
  latency_ms?: number;
  error?: string;
  method?: string;
}

// Health Check Modal Component
function HealthCheckModal({
  isOpen,
  onClose,
  accounts,
  onStartHealthCheck
}: {
  isOpen: boolean;
  onClose: () => void;
  accounts: SupabaseAccount[];
  onStartHealthCheck: () => void;
}) {
  const [closeHovered, setCloseHovered] = useState(false);
  const [results, setResults] = useState<HealthCheckResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [summary, setSummary] = useState<{ healthy: number; unhealthy: number; total: number } | null>(null);

  // Initialize results when modal opens - only check non-paused accounts
  useEffect(() => {
    if (isOpen && accounts.length > 0) {
      setResults(accounts.filter(acc => !acc.is_paused && acc.status !== 'paused').map(acc => ({
        accountId: acc.id,
        accountName: acc.name || 'Unnamed Account',
        status: 'pending'
      })));
      setCurrentIndex(-1);
      setSummary(null);
      setIsRunning(false);
    }
  }, [isOpen, accounts]);

  const runHealthChecks = async () => {
    setIsRunning(true);
    setSummary(null);
    // Only check non-paused accounts
    const activeAccounts = accounts.filter(acc => !acc.is_paused && acc.status !== 'paused');
    let healthyCount = 0;
    let unhealthyCount = 0;

    for (let i = 0; i < activeAccounts.length; i++) {
      const account = activeAccounts[i];
      setCurrentIndex(i);

      // Update status to checking
      setResults(prev => prev.map((r, idx) =>
        idx === i ? { ...r, status: 'checking' as const } : r
      ));

      try {
        const response = await fetch('/api/accounts/health-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_url: account.project_url,
            s3_endpoint: account.s3_endpoint,
            service_role_key: account.service_role_key,
          }),
        });

        const result = await response.json();

        if (result.success) {
          healthyCount++;
          setResults(prev => prev.map((r, idx) =>
            idx === i ? {
              ...r,
              status: 'healthy' as const,
              latency_ms: result.latency_ms,
              method: result.method
            } : r
          ));
        } else {
          unhealthyCount++;
          setResults(prev => prev.map((r, idx) =>
            idx === i ? {
              ...r,
              status: 'unhealthy' as const,
              latency_ms: result.latency_ms,
              error: result.error,
              method: result.method
            } : r
          ));
        }
      } catch (error) {
        unhealthyCount++;
        setResults(prev => prev.map((r, idx) =>
          idx === i ? {
            ...r,
            status: 'unhealthy' as const,
            error: error instanceof Error ? error.message : 'Network error'
          } : r
        ));
      }

      // Small delay between checks for visual feedback
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setCurrentIndex(-1);
    setIsRunning(false);
    setSummary({
      healthy: healthyCount,
      unhealthy: unhealthyCount,
      total: activeAccounts.length
    });
  };

  if (!isOpen) return null;

  const activeAccountsCount = accounts.filter(acc => !acc.is_paused && acc.status !== 'paused').length;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '24px 16px',
      overflowY: 'auto'
    }}>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)'
        }}
      />
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '600px',
        background: '#12121a',
        border: '1px solid #1e1e2e',
        borderRadius: '16px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
        margin: 'auto 0',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 22px',
          borderBottom: '1px solid #1e1e2e',
          background: '#12121a',
          borderRadius: '16px 16px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(0, 212, 212, 0.15) 0%, rgba(0, 212, 212, 0.05) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Activity size={18} color="#00d4d4" />
            </div>
            <div>
              <h2 style={{ color: '#ffffff', fontSize: '17px', fontWeight: 600, margin: 0 }}>Health Check</h2>
              <p style={{ color: '#666677', fontSize: '12px', margin: 0 }}>
                {activeAccountsCount} active account{activeAccountsCount !== 1 ? 's' : ''} to check
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            onMouseEnter={() => setCloseHovered(true)}
            onMouseLeave={() => setCloseHovered(false)}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              background: closeHovered ? '#1e1e2e' : 'transparent',
              color: closeHovered ? '#ffffff' : '#666677',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: '20px 22px',
          overflowY: 'auto',
          flex: 1
        }}>
          {/* Info Banner */}
          <div style={{
            background: 'rgba(0, 212, 212, 0.05)',
            border: '1px solid rgba(0, 212, 212, 0.15)',
            borderRadius: '10px',
            padding: '14px 16px',
            marginBottom: '20px'
          }}>
            <p style={{ color: '#888899', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
              <strong style={{ color: '#00d4d4' }}>Why Health Check?</strong><br />
              Supabase free-tier projects are paused after 7 days of inactivity.
              Running health checks keeps your projects active and prevents data loss.
            </p>
          </div>

          {/* Summary (shown after completion) */}
          {summary && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{
                background: '#0a0a0f',
                borderRadius: '10px',
                padding: '14px',
                textAlign: 'center'
              }}>
                <p style={{ color: '#666677', fontSize: '11px', marginBottom: '4px' }}>Total</p>
                <p style={{ color: '#ffffff', fontSize: '20px', fontWeight: 700 }}>{summary.total}</p>
              </div>
              <div style={{
                background: 'rgba(34, 197, 94, 0.08)',
                borderRadius: '10px',
                padding: '14px',
                textAlign: 'center'
              }}>
                <p style={{ color: '#22c55e', fontSize: '11px', marginBottom: '4px' }}>Healthy</p>
                <p style={{ color: '#22c55e', fontSize: '20px', fontWeight: 700 }}>{summary.healthy}</p>
              </div>
              <div style={{
                background: summary.unhealthy > 0 ? 'rgba(239, 68, 68, 0.08)' : '#0a0a0f',
                borderRadius: '10px',
                padding: '14px',
                textAlign: 'center'
              }}>
                <p style={{ color: summary.unhealthy > 0 ? '#ef4444' : '#666677', fontSize: '11px', marginBottom: '4px' }}>Unhealthy</p>
                <p style={{ color: summary.unhealthy > 0 ? '#ef4444' : '#888899', fontSize: '20px', fontWeight: 700 }}>{summary.unhealthy}</p>
              </div>
            </div>
          )}

          {/* Results List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {results.map((result, index) => (
              <HealthCheckResultItem
                key={result.accountId}
                result={result}
                isActive={currentIndex === index}
              />
            ))}
          </div>

          {/* Empty State */}
          {results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Activity size={40} color="#333344" style={{ marginBottom: '12px' }} />
              <p style={{ color: '#666677', fontSize: '14px' }}>
                No active accounts to check
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 22px',
          borderTop: '1px solid #1e1e2e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <p style={{ color: '#555566', fontSize: '12px', margin: 0 }}>
            {isRunning ? `Checking account ${currentIndex + 1} of ${results.length}...` :
              summary ? 'Health check completed' : 'Click Start to begin health check'}
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <GhostButton onClick={onClose}>Close</GhostButton>
            <PrimaryButton onClick={runHealthChecks}>
              {isRunning ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Activity size={16} />
                  {summary ? 'Run Again' : 'Start Health Check'}
                </>
              )}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// Health Check Result Item Component
function HealthCheckResultItem({ result, isActive }: { result: HealthCheckResult; isActive: boolean }) {
  const getStatusIcon = () => {
    switch (result.status) {
      case 'pending':
        return <Clock size={16} color="#555566" />;
      case 'checking':
        return <Loader2 size={16} color="#00d4d4" className="animate-spin" />;
      case 'healthy':
        return <CheckCircle2 size={16} color="#22c55e" />;
      case 'unhealthy':
        return <XCircle size={16} color="#ef4444" />;
    }
  };

  const getStatusColor = () => {
    switch (result.status) {
      case 'pending': return '#555566';
      case 'checking': return '#00d4d4';
      case 'healthy': return '#22c55e';
      case 'unhealthy': return '#ef4444';
    }
  };

  const getStatusText = () => {
    switch (result.status) {
      case 'pending': return 'Waiting...';
      case 'checking': return 'Checking...';
      case 'healthy': return result.latency_ms ? `Healthy (${result.latency_ms}ms)` : 'Healthy';
      case 'unhealthy': return result.error || 'Unhealthy';
    }
  };

  return (
    <div style={{
      background: isActive ? 'rgba(0, 212, 212, 0.05)' : '#0a0a0f',
      border: isActive ? '1px solid rgba(0, 212, 212, 0.2)' : '1px solid #1a1a24',
      borderRadius: '10px',
      padding: '14px 16px',
      transition: 'all 0.2s'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: result.status === 'healthy' ? 'rgba(34, 197, 94, 0.1)' :
              result.status === 'unhealthy' ? 'rgba(239, 68, 68, 0.1)' :
                result.status === 'checking' ? 'rgba(0, 212, 212, 0.1)' : '#1a1a24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {getStatusIcon()}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 500,
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {result.accountName}
            </p>
            {result.method && result.status !== 'pending' && result.status !== 'checking' && (
              <p style={{ color: '#555566', fontSize: '11px', margin: 0 }}>
                via {result.method}
              </p>
            )}
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0
        }}>
          <span style={{
            color: getStatusColor(),
            fontSize: '12px',
            fontWeight: 500,
            maxWidth: '200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {getStatusText()}
          </span>
        </div>
      </div>
      {/* Error details for unhealthy */}
      {result.status === 'unhealthy' && result.error && (
        <div style={{
          marginTop: '10px',
          padding: '10px 12px',
          background: 'rgba(239, 68, 68, 0.05)',
          borderRadius: '6px',
          border: '1px solid rgba(239, 68, 68, 0.1)'
        }}>
          <p style={{ color: '#ef4444', fontSize: '12px', margin: 0, lineHeight: 1.4 }}>
            {result.error}
          </p>
        </div>
      )}
    </div>
  );
}

// Pause Prevent Result Interface
interface PausePreventResult {
  accountId: string;
  accountName: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  latency_ms?: number;
  error?: string;
  query_result?: string;
  hasServiceKey: boolean;
}

// Pause Prevent Modal Component
function PausePreventModal({
  isOpen,
  onClose,
  accounts
}: {
  isOpen: boolean;
  onClose: () => void;
  accounts: SupabaseAccount[];
}) {
  const [closeHovered, setCloseHovered] = useState(false);
  const [results, setResults] = useState<PausePreventResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [summary, setSummary] = useState<{ success: number; failed: number; skipped: number; total: number } | null>(null);

  // Initialize results when modal opens
  useEffect(() => {
    if (isOpen && accounts.length > 0) {
      const activeAccounts = accounts.filter(acc => !acc.is_paused && acc.status !== 'paused');
      setResults(activeAccounts.map(acc => ({
        accountId: acc.id,
        accountName: acc.name || 'Unnamed Account',
        status: acc.service_role_key ? 'pending' : 'skipped',
        hasServiceKey: !!acc.service_role_key,
        error: acc.service_role_key ? undefined : 'Missing service_role_key'
      })));
      setCurrentIndex(-1);
      setSummary(null);
      setIsRunning(false);
    }
  }, [isOpen, accounts]);

  const runPausePrevent = async () => {
    setIsRunning(true);
    setSummary(null);
    const activeAccounts = accounts.filter(acc => !acc.is_paused && acc.status !== 'paused');
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < activeAccounts.length; i++) {
      const account = activeAccounts[i];
      setCurrentIndex(i);

      // Skip accounts without service_role_key
      if (!account.service_role_key) {
        skippedCount++;
        continue;
      }

      // Update status to running
      setResults(prev => prev.map((r, idx) =>
        idx === i ? { ...r, status: 'running' as const } : r
      ));

      try {
        const response = await fetch('/api/accounts/pause-prevent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_url: account.project_url,
            service_role_key: account.service_role_key,
          }),
        });

        const result = await response.json();

        if (result.success) {
          successCount++;
          setResults(prev => prev.map((r, idx) =>
            idx === i ? {
              ...r,
              status: 'success' as const,
              latency_ms: result.latency_ms,
              query_result: result.query_result
            } : r
          ));
        } else {
          failedCount++;
          setResults(prev => prev.map((r, idx) =>
            idx === i ? {
              ...r,
              status: 'failed' as const,
              latency_ms: result.latency_ms,
              error: result.error
            } : r
          ));
        }
      } catch (error) {
        failedCount++;
        setResults(prev => prev.map((r, idx) =>
          idx === i ? {
            ...r,
            status: 'failed' as const,
            error: error instanceof Error ? error.message : 'Network error'
          } : r
        ));
      }

      // Small delay between checks
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    setCurrentIndex(-1);
    setIsRunning(false);
    setSummary({
      success: successCount,
      failed: failedCount,
      skipped: skippedCount,
      total: activeAccounts.length
    });
  };

  if (!isOpen) return null;

  const activeAccountsCount = accounts.filter(acc => !acc.is_paused && acc.status !== 'paused').length;
  const accountsWithKey = accounts.filter(acc => !acc.is_paused && acc.status !== 'paused' && acc.service_role_key).length;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '24px 16px',
      overflowY: 'auto'
    }}>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)'
        }}
      />
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '600px',
        background: '#12121a',
        border: '1px solid #1e1e2e',
        borderRadius: '16px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
        margin: 'auto 0',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 22px',
          borderBottom: '1px solid #1e1e2e',
          background: '#12121a',
          borderRadius: '16px 16px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Shield size={18} color="#22c55e" />
            </div>
            <div>
              <h2 style={{ color: '#ffffff', fontSize: '17px', fontWeight: 600, margin: 0 }}>Pause Prevent</h2>
              <p style={{ color: '#666677', fontSize: '12px', margin: 0 }}>
                {accountsWithKey} of {activeAccountsCount} accounts ready
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            onMouseEnter={() => setCloseHovered(true)}
            onMouseLeave={() => setCloseHovered(false)}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              background: closeHovered ? '#1e1e2e' : 'transparent',
              color: closeHovered ? '#ffffff' : '#666677',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: '20px 22px',
          overflowY: 'auto',
          flex: 1
        }}>
          {/* Info Banner */}
          <div style={{
            background: 'rgba(34, 197, 94, 0.05)',
            border: '1px solid rgba(34, 197, 94, 0.15)',
            borderRadius: '10px',
            padding: '14px 16px',
            marginBottom: '20px'
          }}>
            <p style={{ color: '#888899', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
              <strong style={{ color: '#22c55e' }}>How it works:</strong><br />
              Runs a SQL query on each project&apos;s database, which counts as activity
              and prevents Supabase from pausing free-tier projects after 7 days.
            </p>
          </div>

          {/* Warning for missing keys */}
          {accountsWithKey < activeAccountsCount && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.05)',
              border: '1px solid rgba(245, 158, 11, 0.15)',
              borderRadius: '10px',
              padding: '14px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ color: '#f59e0b', fontSize: '13px', margin: 0 }}>
                <strong>{activeAccountsCount - accountsWithKey} account{activeAccountsCount - accountsWithKey > 1 ? 's' : ''}</strong> missing service_role_key.
                Add key in account settings to enable pause prevention.
              </p>
            </div>
          )}

          {/* Summary (shown after completion) */}
          {summary && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '10px',
              marginBottom: '20px'
            }}>
              <div style={{ background: '#0a0a0f', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <p style={{ color: '#666677', fontSize: '10px', marginBottom: '4px' }}>Total</p>
                <p style={{ color: '#ffffff', fontSize: '18px', fontWeight: 700 }}>{summary.total}</p>
              </div>
              <div style={{ background: 'rgba(34, 197, 94, 0.08)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <p style={{ color: '#22c55e', fontSize: '10px', marginBottom: '4px' }}>Protected</p>
                <p style={{ color: '#22c55e', fontSize: '18px', fontWeight: 700 }}>{summary.success}</p>
              </div>
              <div style={{ background: summary.failed > 0 ? 'rgba(239, 68, 68, 0.08)' : '#0a0a0f', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <p style={{ color: summary.failed > 0 ? '#ef4444' : '#666677', fontSize: '10px', marginBottom: '4px' }}>Failed</p>
                <p style={{ color: summary.failed > 0 ? '#ef4444' : '#888899', fontSize: '18px', fontWeight: 700 }}>{summary.failed}</p>
              </div>
              <div style={{ background: summary.skipped > 0 ? 'rgba(245, 158, 11, 0.08)' : '#0a0a0f', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                <p style={{ color: summary.skipped > 0 ? '#f59e0b' : '#666677', fontSize: '10px', marginBottom: '4px' }}>Skipped</p>
                <p style={{ color: summary.skipped > 0 ? '#f59e0b' : '#888899', fontSize: '18px', fontWeight: 700 }}>{summary.skipped}</p>
              </div>
            </div>
          )}

          {/* Results List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {results.map((result, index) => (
              <PausePreventResultItem
                key={result.accountId}
                result={result}
                isActive={currentIndex === index}
              />
            ))}
          </div>

          {/* Empty State */}
          {results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Shield size={40} color="#333344" style={{ marginBottom: '12px' }} />
              <p style={{ color: '#666677', fontSize: '14px' }}>
                No active accounts to protect
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 22px',
          borderTop: '1px solid #1e1e2e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <p style={{ color: '#555566', fontSize: '12px', margin: 0 }}>
            {isRunning ? `Processing ${currentIndex + 1} of ${results.length}...` :
              summary ? 'Pause prevention completed' : 'Click Start to protect your projects'}
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <GhostButton onClick={onClose}>Close</GhostButton>
            <button
              onClick={runPausePrevent}
              disabled={isRunning || accountsWithKey === 0}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '10px',
                border: 'none',
                cursor: isRunning || accountsWithKey === 0 ? 'not-allowed' : 'pointer',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: '#ffffff',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                opacity: isRunning || accountsWithKey === 0 ? 0.6 : 1
              }}
            >
              {isRunning ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Zap size={16} />
                  {summary ? 'Run Again' : 'Start Protection'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Pause Prevent Result Item Component
function PausePreventResultItem({ result, isActive }: { result: PausePreventResult; isActive: boolean }) {
  const getStatusIcon = () => {
    switch (result.status) {
      case 'pending':
        return <Clock size={16} color="#555566" />;
      case 'running':
        return <Loader2 size={16} color="#22c55e" className="animate-spin" />;
      case 'success':
        return <CheckCircle2 size={16} color="#22c55e" />;
      case 'failed':
        return <XCircle size={16} color="#ef4444" />;
      case 'skipped':
        return <AlertTriangle size={16} color="#f59e0b" />;
    }
  };

  const getStatusColor = () => {
    switch (result.status) {
      case 'pending': return '#555566';
      case 'running': return '#22c55e';
      case 'success': return '#22c55e';
      case 'failed': return '#ef4444';
      case 'skipped': return '#f59e0b';
    }
  };

  const getStatusText = () => {
    switch (result.status) {
      case 'pending': return 'Waiting...';
      case 'running': return 'Running SQL...';
      case 'success': return result.latency_ms ? `Protected (${result.latency_ms}ms)` : 'Protected';
      case 'failed': return result.error || 'Failed';
      case 'skipped': return 'No service key';
    }
  };

  return (
    <div style={{
      background: isActive ? 'rgba(34, 197, 94, 0.05)' : result.status === 'skipped' ? 'rgba(245, 158, 11, 0.03)' : '#0a0a0f',
      border: isActive ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid #1a1a24',
      borderRadius: '10px',
      padding: '14px 16px',
      transition: 'all 0.2s',
      opacity: result.status === 'skipped' ? 0.7 : 1
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: result.status === 'success' ? 'rgba(34, 197, 94, 0.1)' :
              result.status === 'failed' ? 'rgba(239, 68, 68, 0.1)' :
                result.status === 'running' ? 'rgba(34, 197, 94, 0.1)' :
                  result.status === 'skipped' ? 'rgba(245, 158, 11, 0.1)' : '#1a1a24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {getStatusIcon()}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{
              color: result.status === 'skipped' ? '#888899' : '#ffffff',
              fontSize: '13px',
              fontWeight: 500,
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {result.accountName}
            </p>
            {result.query_result && result.status === 'success' && (
              <p style={{ color: '#555566', fontSize: '11px', margin: 0 }}>
                {result.query_result}
              </p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{
            color: getStatusColor(),
            fontSize: '12px',
            fontWeight: 500,
            maxWidth: '200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {getStatusText()}
          </span>
        </div>
      </div>
      {/* Error details for failed */}
      {result.status === 'failed' && result.error && (
        <div style={{
          marginTop: '10px',
          padding: '10px 12px',
          background: 'rgba(239, 68, 68, 0.05)',
          borderRadius: '6px',
          border: '1px solid rgba(239, 68, 68, 0.1)'
        }}>
          <p style={{ color: '#ef4444', fontSize: '12px', margin: 0, lineHeight: 1.4 }}>
            {result.error}
          </p>
        </div>
      )}
    </div>
  );
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<SupabaseAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<SupabaseAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<SupabaseAccount | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);
  const [showHealthCheckModal, setShowHealthCheckModal] = useState(false);
  const [showPausePreventModal, setShowPausePreventModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const { addToast } = useToast();

  const fetchAccounts = async () => {
    try {
      const data = await db.accounts.getAll();
      setAccounts(data);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      addToast("error", "Failed to load accounts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSubmit = async (data: AccountFormData) => {
    try {
      if (editingAccount) {
        await db.accounts.update(editingAccount.id, data);
        addToast("success", "Account updated successfully");
      } else {
        await db.accounts.create({
          ...data,
          used_storage_mb: 0,
          is_useable: true,
          is_paused: false,
          status: 'useable'
        });
        addToast("success", "Account added successfully");
      }
      setShowModal(false);
      setEditingAccount(null);
      fetchAccounts();
    } catch (error) {
      console.error("Error saving account:", error);
      addToast("error", "Failed to save account");
    }
  };

  const handleCsvImport = async (accounts: AccountFormData[]) => {
    try {
      let successCount = 0;
      let failCount = 0;

      for (const acc of accounts) {
        try {
          // Extract only the fields we want to save, ignoring temp fields like id, selected, etc.
          const {
            name,
            project_url,
            s3_endpoint,
            bucket_name,
            s3_access_key,
            s3_secret_key,
            service_role_key,
            storage_limit_mb,
            is_active
          } = acc;

          await db.accounts.create({
            name,
            project_url,
            s3_endpoint,
            bucket_name,
            s3_access_key,
            s3_secret_key,
            service_role_key: service_role_key || "",
            storage_limit_mb: storage_limit_mb || 1024,
            is_active: is_active ?? true,
            used_storage_mb: 0,
            is_useable: true,
            is_paused: false,
            status: 'useable'
          });
          successCount++;
        } catch (err) {
          console.error(`Failed to import account ${acc.name}:`, JSON.stringify(err, null, 2));
          failCount++;
        }
      }

      if (successCount > 0) {
        addToast("success", `Successfully imported ${successCount} accounts`);
      }
      if (failCount > 0) {
        addToast("error", `Failed to import ${failCount} accounts`);
      }

      fetchAccounts();
    } catch (error) {
      console.error("Import error:", error);
      addToast("error", "Failed to import accounts");
    }
  };

  const handleTest = async (data: AccountFormData): Promise<boolean> => {
    try {
      const response = await fetch("/api/accounts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          s3_endpoint: data.s3_endpoint,
          bucket_name: data.bucket_name,
          s3_access_key: data.s3_access_key,
          s3_secret_key: data.s3_secret_key,
        }),
      });
      const result = await response.json();
      if (result.success) {
        addToast("success", "Connection successful!");
        return true;
      } else {
        // Show error with hint if available
        const errorMsg = result.error || "Connection failed";
        const hint = result.hint;

        if (hint) {
          // Show detailed error message with hint
          addToast("error", `${errorMsg}. ${hint}`);
        } else {
          addToast("error", errorMsg);
        }
        return false;
      }
    } catch (error) {
      console.error("Test error:", error);
      addToast("error", "Connection test failed - network error");
      return false;
    }
  };

  const handleDelete = async () => {
    if (!deletingAccount) return;
    try {
      await db.accounts.delete(deletingAccount.id);
      addToast("success", "Account deleted successfully");
      setDeletingAccount(null);
      fetchAccounts();
    } catch (error) {
      console.error("Error deleting account:", error);
      addToast("error", "Failed to delete account");
    }
  };

  const handleSyncStorage = async (account: SupabaseAccount) => {
    setSyncingAccountId(account.id);
    try {
      const response = await fetch("/api/accounts/sync-storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          s3_endpoint: account.s3_endpoint,
          bucket_name: account.bucket_name,
          s3_access_key: account.s3_access_key,
          s3_secret_key: account.s3_secret_key,
        }),
      });
      const result = await response.json();

      if (result.success) {
        // Update the account with the new storage usage
        await db.accounts.update(account.id, {
          used_storage_mb: result.used_storage_mb,
        });
        addToast("success", `Storage synced: ${formatMB(result.used_storage_mb)} used (${result.total_objects} files)`);
        fetchAccounts();
      } else {
        // Handle errors
        if (result.errorCode === "PROJECT_PAUSED") {
          addToast("warning", "Project is paused. Please restore it from Supabase Dashboard.");
        } else {
          addToast("error", result.hint ? `${result.error}. ${result.hint}` : result.error);
        }
      }
    } catch (error) {
      console.error("Sync storage error:", error);
      addToast("error", "Failed to sync storage - network error");
    } finally {
      setSyncingAccountId(null);
    }
  };

  const handleMarkAsFull = async (account: SupabaseAccount) => {
    try {
      await db.accounts.update(account.id, { status: 'full' });
      addToast("success", `${account.name || 'Account'} marked as full`);
      fetchAccounts();
    } catch (error) {
      console.error("Error marking account as full:", error);
      addToast("error", "Failed to update account status");
    }
  };

  const handleMarkAsUseable = async (account: SupabaseAccount) => {
    try {
      await db.accounts.update(account.id, { status: 'useable' });
      addToast("success", `${account.name || 'Account'} marked as useable`);
      fetchAccounts();
    } catch (error) {
      console.error("Error marking account as useable:", error);
      addToast("error", "Failed to update account status");
    }
  };

  const handleSyncAllStorage = async () => {
    setIsSyncing(true);
    let successCount = 0;
    let errorCount = 0;

    for (const account of accounts) {
      // Skip paused accounts
      if (account.is_paused || account.status === 'paused') continue;

      setSyncingAccountId(account.id);
      try {
        const response = await fetch("/api/accounts/sync-storage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            s3_endpoint: account.s3_endpoint,
            bucket_name: account.bucket_name,
            s3_access_key: account.s3_access_key,
            s3_secret_key: account.s3_secret_key,
          }),
        });
        const result = await response.json();

        if (result.success) {
          await db.accounts.update(account.id, {
            used_storage_mb: result.used_storage_mb,
          });
          successCount++;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    setSyncingAccountId(null);
    setIsSyncing(false);

    if (successCount > 0) {
      addToast("success", `Synced ${successCount} account${successCount > 1 ? 's' : ''} successfully`);
      fetchAccounts();
    }
    if (errorCount > 0) {
      addToast("warning", `Failed to sync ${errorCount} account${errorCount > 1 ? 's' : ''}`);
    }
  };

  // Filter accounts based on status (excluding paused from storage calculations)
  const useableAccounts = accounts.filter(acc => acc.status === 'useable' && !acc.is_paused);
  const fullAccounts = accounts.filter(acc => acc.status === 'full');
  const pausedAccounts = accounts.filter(acc => acc.is_paused || acc.status === 'paused');
  const emptyAccounts = accounts.filter(acc => acc.used_storage_mb === 0 && acc.storage_limit_mb > 0 && !acc.is_paused && acc.status !== 'paused');

  // Only count storage from non-paused AND non-full accounts (useable accounts)
  const activeStorageAccounts = accounts.filter(acc =>
    !acc.is_paused &&
    acc.status !== 'paused' &&
    acc.status !== 'full'
  );

  const totalStorage = activeStorageAccounts.reduce((sum, acc) => sum + acc.storage_limit_mb, 0);
  const usedStorage = activeStorageAccounts.reduce((sum, acc) => sum + acc.used_storage_mb, 0);

  // Filter accounts for display
  const filteredAccounts = accounts.filter(acc => {
    if (filter === 'all') return true;
    if (filter === 'useable') return acc.status === 'useable' && !acc.is_paused;
    if (filter === 'full') return acc.status === 'full';
    if (filter === 'paused') return acc.is_paused || acc.status === 'paused';
    if (filter === 'empty') return acc.used_storage_mb === 0 && acc.storage_limit_mb > 0 && !acc.is_paused && acc.status !== 'paused';
    return true;
  }).sort((a, b) => {
    // Sort priority: 1. Full accounts last, 2. By used storage (less first)
    const aIsFull = a.status === 'full' ? 1 : 0;
    const bIsFull = b.status === 'full' ? 1 : 0;

    // If one is full and the other isn't, full goes last
    if (aIsFull !== bIsFull) return aIsFull - bIsFull;

    // Otherwise sort by used storage (less used first)
    return a.used_storage_mb - b.used_storage_mb;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ color: '#ffffff', fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>
            Storage Accounts
          </h1>
          <p style={{ color: '#666677', fontSize: '14px' }}>
            Manage your Supabase storage accounts
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <SecondaryButton onClick={() => setShowCsvModal(true)}>
            <Upload size={16} />
            Import CSV
          </SecondaryButton>
          {accounts.length > 0 && (
            <>
              <SecondaryButton onClick={() => setShowHealthCheckModal(true)} disabled={isSyncing}>
                <Activity size={16} />
                Health Check
              </SecondaryButton>
              <button
                onClick={() => setShowPausePreventModal(true)}
                disabled={isSyncing}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  fontSize: '14px',
                  fontWeight: 500,
                  borderRadius: '10px',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  cursor: isSyncing ? 'not-allowed' : 'pointer',
                  background: 'rgba(34, 197, 94, 0.1)',
                  color: '#22c55e',
                  transition: 'all 0.2s',
                  opacity: isSyncing ? 0.6 : 1
                }}
              >
                <Shield size={16} />
                Pause Prevent
              </button>
              <SecondaryButton onClick={handleSyncAllStorage} disabled={isSyncing}>
                <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? 'Syncing...' : 'Sync All Storage'}
              </SecondaryButton>
            </>
          )}
          <PrimaryButton onClick={() => { setEditingAccount(null); setShowModal(true); }}>
            <Plus size={18} />
            Add Account
          </PrimaryButton>
        </div>
      </div>

      {/* Stats */}
      {accounts.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
          <StatCard
            label="Total Accounts"
            value={String(accounts.length)}
            subtext={`${useableAccounts.length} useable, ${pausedAccounts.length} paused`}
          />
          <StatCard
            label="Active Storage"
            value={formatMB(totalStorage)}
            subtext="useable table storage"
            accent
          />
          <StatCard
            label="Used Storage"
            value={formatMB(usedStorage)}
            subtext={`${formatMB(totalStorage - usedStorage)} available`}
          />
          <StatCard
            label="Full Accounts"
            value={String(fullAccounts.length)}
            subtext={fullAccounts.length > 0 ? 'need attention' : 'all good'}
          />
        </div>
      )}

      {/* Filter Tabs */}
      {accounts.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          padding: '4px',
          background: '#0a0a0f',
          borderRadius: '12px',
          border: '1px solid #1e1e2e'
        }}>
          <FilterTab
            label="All"
            count={accounts.length}
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          <FilterTab
            label="Useable"
            count={useableAccounts.length}
            active={filter === 'useable'}
            onClick={() => setFilter('useable')}
            color="#22c55e"
          />
          <FilterTab
            label="Full"
            count={fullAccounts.length}
            active={filter === 'full'}
            onClick={() => setFilter('full')}
            color="#ef4444"
          />
          <FilterTab
            label="Paused"
            count={pausedAccounts.length}
            active={filter === 'paused'}
            onClick={() => setFilter('paused')}
            color="#f59e0b"
            icon={<Pause size={12} />}
          />
          <FilterTab
            label="Empty"
            count={emptyAccounts.length}
            active={filter === 'empty'}
            onClick={() => setFilter('empty')}
            color="#a78bfa"
          />
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
          <Loader2 className="animate-spin" size={32} style={{ color: '#00d4d4' }} />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && accounts.length === 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, rgba(0, 212, 212, 0.15) 0%, rgba(0, 212, 212, 0.05) 100%)',
            border: '1px solid rgba(0, 212, 212, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px'
          }}>
            <Database size={32} color="#00d4d4" />
          </div>
          <h3 style={{ color: '#ffffff', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
            No accounts yet
          </h3>
          <p style={{ color: '#666677', fontSize: '14px', maxWidth: '360px', marginBottom: '24px' }}>
            Add your first Supabase storage account to start uploading content.
          </p>
          <PrimaryButton onClick={() => { setEditingAccount(null); setShowModal(true); }}>
            <Plus size={18} />
            Add Account
          </PrimaryButton>
        </div>
      )}

      {/* Accounts Grid */}
      {!isLoading && accounts.length > 0 && (
        <>
          {filteredAccounts.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 20px',
              textAlign: 'center',
              background: '#0a0a0f',
              borderRadius: '14px',
              border: '1px solid #1e1e2e'
            }}>
              <Filter size={32} color="#333344" style={{ marginBottom: '12px' }} />
              <p style={{ color: '#666677', fontSize: '14px' }}>
                No accounts match the selected filter
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
              {filteredAccounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onEdit={(acc) => { setEditingAccount(acc); setShowModal(true); }}
                  onDelete={(acc) => setDeletingAccount(acc)}
                  onTest={async (acc) => {
                    await handleTest({
                      name: acc.name || "",
                      project_url: acc.project_url,
                      s3_endpoint: acc.s3_endpoint,
                      bucket_name: acc.bucket_name,
                      s3_access_key: acc.s3_access_key,
                      s3_secret_key: acc.s3_secret_key,
                      service_role_key: acc.service_role_key || "",
                      storage_limit_mb: acc.storage_limit_mb,
                      is_active: acc.is_active,
                    });
                  }}
                  onSync={handleSyncStorage}
                  onMarkAsFull={handleMarkAsFull}
                  onMarkAsUseable={handleMarkAsUseable}
                  isSyncing={syncingAccountId === account.id}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingAccount(null); }}
        title={editingAccount ? "Edit Account" : "Add Account"}
        size="lg"
      >
        <AccountForm
          account={editingAccount}
          onSubmit={handleSubmit}
          onCancel={() => { setShowModal(false); setEditingAccount(null); }}
          onTest={handleTest}
        />
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={!!deletingAccount}
        onClose={() => setDeletingAccount(null)}
        title="Delete Account"
        size="sm"
      >
        <div>
          <p style={{ color: '#888899', fontSize: '14px', marginBottom: '20px' }}>
            Are you sure you want to delete{' '}
            <span style={{ color: '#ffffff', fontWeight: 500 }}>
              {deletingAccount?.name || "this account"}
            </span>
            ? This action cannot be undone.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
            <GhostButton onClick={() => setDeletingAccount(null)}>Cancel</GhostButton>
            <DangerButton onClick={handleDelete}>Delete</DangerButton>
          </div>
        </div>
      </Modal>

      {/* Health Check Modal */}
      <HealthCheckModal
        isOpen={showHealthCheckModal}
        onClose={() => setShowHealthCheckModal(false)}
        accounts={accounts}
        onStartHealthCheck={() => { }}
      />

      {/* Pause Prevent Modal */}
      <PausePreventModal
        isOpen={showPausePreventModal}
        onClose={() => setShowPausePreventModal(false)}
        accounts={accounts}
      />

      <CsvUploadModal
        isOpen={showCsvModal}
        onClose={() => setShowCsvModal(false)}
        onImport={handleCsvImport}
      />
    </div>
  );
}
