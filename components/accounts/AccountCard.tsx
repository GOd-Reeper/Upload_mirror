"use client";

import { SupabaseAccount } from "@/lib/supabase";
import { formatMB } from "@/lib/utils";
import { Database, MoreVertical, Pencil, Trash2, RefreshCw, ExternalLink, HardDrive, Loader2, Pause, AlertTriangle, CircleSlash, CircleCheck } from "lucide-react";
import { useState } from "react";

interface AccountCardProps {
  account: SupabaseAccount;
  onEdit: (account: SupabaseAccount) => void;
  onDelete: (account: SupabaseAccount) => void;
  onTest: (account: SupabaseAccount) => void;
  onSync?: (account: SupabaseAccount) => void;
  onMarkAsFull?: (account: SupabaseAccount) => void;
  onMarkAsUseable?: (account: SupabaseAccount) => void;
  isSyncing?: boolean;
}

function StorageBar({ used, limit, isPaused }: { used: number; limit: number; isPaused: boolean }) {
  const percentage = Math.min((used / limit) * 100, 100);

  // Determine color based on percentage
  let color = '#22c55e'; // green - available
  if (percentage >= 90) {
    color = '#ef4444'; // red - full
  } else if (percentage >= 75) {
    color = '#f59e0b'; // yellow - almost full
  }

  // If paused, use gray
  if (isPaused) {
    color = '#666677';
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ color: isPaused ? '#555566' : '#888899', fontSize: '12px' }}>{formatMB(used)} used</span>
        <span style={{ color: '#666677', fontSize: '12px' }}>{formatMB(limit)}</span>
      </div>
      <div style={{
        height: '6px',
        borderRadius: '3px',
        background: '#1a1a24',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          borderRadius: '3px',
          background: color,
          transition: 'width 0.3s',
          opacity: isPaused ? 0.5 : 1
        }} />
      </div>
    </div>
  );
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'error' | 'accent' | 'paused' | 'empty' }) {
  const colors = {
    default: { bg: '#1a1a24', text: '#888899' },
    success: { bg: 'rgba(34, 197, 94, 0.12)', text: '#22c55e' },
    warning: { bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b' },
    error: { bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444' },
    accent: { bg: 'rgba(0, 212, 212, 0.12)', text: '#00d4d4' },
    paused: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
    empty: { bg: 'rgba(139, 92, 246, 0.12)', text: '#a78bfa' }
  };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '3px 8px',
      borderRadius: '6px',
      background: colors[variant].bg,
      color: colors[variant].text,
      fontSize: '11px',
      fontWeight: 500
    }}>
      {children}
    </span>
  );
}

export function AccountCard({ account, onEdit, onDelete, onTest, onSync, onMarkAsFull, onMarkAsUseable, isSyncing = false }: AccountCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [menuBtnHovered, setMenuBtnHovered] = useState(false);

  // Determine account status
  const isPaused = account.is_paused || account.status === 'paused';
  const isFull = account.status === 'full';
  const isEmpty = account.used_storage_mb === 0 && account.storage_limit_mb > 0;
  const isUseable = account.status === 'useable' && !isPaused && !isFull;

  // Get status badge info
  const getStatusBadge = () => {
    if (isPaused) {
      return { label: 'Paused', variant: 'paused' as const, icon: <Pause size={10} /> };
    }
    if (isFull) {
      return { label: 'Full', variant: 'error' as const, icon: <AlertTriangle size={10} /> };
    }
    if (isEmpty) {
      return { label: 'Empty', variant: 'empty' as const, icon: null };
    }
    return { label: 'Active', variant: 'success' as const, icon: null };
  };

  const statusBadge = getStatusBadge();

  // Card border and background colors
  const getCardStyles = () => {
    if (isPaused) {
      return {
        background: hovered ? '#1a1a14' : '#18180f',
        border: hovered ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(245, 158, 11, 0.15)',
        boxShadow: hovered ? '0 0 20px rgba(245, 158, 11, 0.08)' : 'none'
      };
    }
    return {
      background: hovered ? '#14141c' : '#12121a',
      border: hovered ? '1px solid rgba(0, 212, 212, 0.2)' : '1px solid #1e1e2e',
      boxShadow: 'none'
    };
  };

  const cardStyles = getCardStyles();

  // Icon colors
  const iconColor = isPaused ? '#f59e0b' : '#00d4d4';
  const iconBg = isPaused ? 'rgba(245, 158, 11, 0.1)' : 'rgba(0, 212, 212, 0.1)';

  return (
    <div
      style={{
        position: 'relative',
        background: cardStyles.background,
        border: cardStyles.border,
        borderRadius: '14px',
        padding: '18px',
        transition: 'all 0.2s',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: cardStyles.boxShadow,
        zIndex: showMenu ? 100 : 'auto'
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Paused Indicator Strip */}
      {isPaused && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)',
          borderRadius: '14px 14px 0 0'
        }} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isPaused ? 0.8 : 1
          }}>
            {isPaused ? <Pause size={20} color={iconColor} /> : <Database size={20} color={iconColor} />}
          </div>
          <div>
            <h3 style={{
              color: isPaused ? '#ccccaa' : '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              marginBottom: '2px'
            }}>
              {account.name || "Unnamed Account"}
            </h3>
            <p style={{
              color: '#555566',
              fontSize: '12px',
              maxWidth: '180px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {account.bucket_name}
            </p>
          </div>
        </div>

        {/* Menu & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Status Badge */}
          <Badge variant={statusBadge.variant}>
            {statusBadge.icon}
            {statusBadge.label}
          </Badge>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              onMouseEnter={() => setMenuBtnHovered(true)}
              onMouseLeave={() => setMenuBtnHovered(false)}
              style={{
                padding: '6px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: menuBtnHovered ? '#1e1e2e' : 'transparent',
                color: menuBtnHovered ? '#ffffff' : '#666677',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <MoreVertical size={16} />
            </button>

            {showMenu && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                  onClick={() => setShowMenu(false)}
                />
                <MenuDropdown
                  account={account}
                  onEdit={() => { setShowMenu(false); onEdit(account); }}
                  onTest={() => { setShowMenu(false); onTest(account); }}
                  onSync={onSync ? () => { setShowMenu(false); onSync(account); } : undefined}
                  onMarkAsFull={onMarkAsFull ? () => { setShowMenu(false); onMarkAsFull(account); } : undefined}
                  onMarkAsUseable={onMarkAsUseable ? () => { setShowMenu(false); onMarkAsUseable(account); } : undefined}
                  onDelete={() => { setShowMenu(false); onDelete(account); }}
                />
              </>
            )}

            {/* Syncing indicator */}
            {isSyncing && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(0, 212, 212, 0.1)',
                borderRadius: '8px',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Loader2 size={14} color="#00d4d4" className="animate-spin" />
                <span style={{ fontSize: '11px', color: '#00d4d4' }}>Syncing...</span>
              </div>
            )}
          </div>
        </div>
      </div>



      {/* Storage Bar */}
      <StorageBar used={account.used_storage_mb} limit={account.storage_limit_mb} isPaused={isPaused} />

      {/* Info */}
      <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #1e1e2e' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
          <div>
            <span style={{ color: '#666677' }}>Remaining:</span>
            <span style={{ color: isPaused ? '#888877' : '#ffffff', fontWeight: 500, marginLeft: '6px' }}>
              {isPaused ? '—' : formatMB(account.storage_limit_mb - account.used_storage_mb)}
            </span>
          </div>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ color: '#666677' }}>Endpoint:</span>
            <span style={{ color: '#555566', marginLeft: '6px' }}>
              {account.s3_endpoint.replace("https://", "").slice(0, 15)}...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuDropdown({
  account,
  onEdit,
  onTest,
  onSync,
  onMarkAsFull,
  onMarkAsUseable,
  onDelete
}: {
  account: SupabaseAccount;
  onEdit: () => void;
  onTest: () => void;
  onSync?: () => void;
  onMarkAsFull?: () => void;
  onMarkAsUseable?: () => void;
  onDelete: () => void;
}) {
  const isPaused = account.is_paused || account.status === 'paused';
  const isFull = account.status === 'full';

  return (
    <div style={{
      position: 'absolute',
      right: 0,
      top: '100%',
      marginTop: '4px',
      zIndex: 20,
      width: '180px',
      background: '#12121a',
      border: '1px solid #1e1e2e',
      borderRadius: '10px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
      padding: '4px',
      overflow: 'hidden'
    }}>
      <MenuItem icon={Pencil} label="Edit" onClick={onEdit} />
      <MenuItem icon={RefreshCw} label="Test Connection" onClick={onTest} />
      {onSync && (
        <MenuItem icon={HardDrive} label="Sync Storage" onClick={onSync} accent />
      )}
      <a
        href={account.project_url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: 'none' }}
      >
        <MenuItem icon={ExternalLink} label="Open Project" onClick={() => { }} />
      </a>

      {/* Status Toggle Section */}
      {!isPaused && (
        <>
          <div style={{ height: '1px', background: '#1e1e2e', margin: '4px 0' }} />
          {isFull ? (
            // If currently full, show option to mark as useable
            onMarkAsUseable && (
              <MenuItem
                icon={CircleCheck}
                label="Mark as Useable"
                onClick={onMarkAsUseable}
                success
              />
            )
          ) : (
            // If currently useable, show option to mark as full
            onMarkAsFull && (
              <MenuItem
                icon={CircleSlash}
                label="Mark as Full"
                onClick={onMarkAsFull}
                warning
              />
            )
          )}
        </>
      )}

      <div style={{ height: '1px', background: '#1e1e2e', margin: '4px 0' }} />
      <MenuItem icon={Trash2} label="Delete" onClick={onDelete} danger />
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger = false,
  accent = false,
  warning = false,
  success = false
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
  accent?: boolean;
  warning?: boolean;
  success?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  const getColors = () => {
    if (danger) {
      return {
        bg: hovered ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
        color: hovered ? '#ef4444' : '#888899'
      };
    }
    if (warning) {
      return {
        bg: hovered ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
        color: hovered ? '#f59e0b' : '#888899'
      };
    }
    if (success) {
      return {
        bg: hovered ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
        color: hovered ? '#22c55e' : '#888899'
      };
    }
    if (accent) {
      return {
        bg: hovered ? 'rgba(0, 212, 212, 0.1)' : 'transparent',
        color: hovered ? '#00d4d4' : '#888899'
      };
    }
    return {
      bg: hovered ? '#1a1a24' : 'transparent',
      color: hovered ? '#ffffff' : '#888899'
    };
  };

  const colors = getColors();

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 10px',
        borderRadius: '6px',
        border: 'none',
        cursor: 'pointer',
        background: colors.bg,
        color: colors.color,
        fontSize: '13px',
        textAlign: 'left',
        transition: 'all 0.15s'
      }}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
