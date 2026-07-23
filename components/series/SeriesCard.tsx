"use client";

import { useState, useRef, useEffect } from "react";
import { Series, SeriesStatus } from "@/lib/supabase";
import { 
  MoreVertical, 
  Tv, 
  Clapperboard, 
  Play, 
  Edit3, 
  Trash2,
  Calendar,
  Film,
  ChevronDown
} from "lucide-react";
import Image from "next/image";

// Default placeholder image path
const PLACEHOLDER_IMAGE = "/not_uploaded.jpg";

interface SeriesCardProps {
  series: Series;
  onEdit?: (series: Series) => void;
  onDelete?: (series: Series) => void;
  onStatusChange?: (series: Series, newStatus: SeriesStatus) => void;
  onClick?: (series: Series) => void;
}

const STATUS_CONFIG: Record<SeriesStatus, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Pending', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  ONGOING: { label: 'Ongoing', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  COMPLETED: { label: 'Completed', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
};

export function SeriesCard({ series, onEdit, onDelete, onStatusChange, onClick }: SeriesCardProps) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  const isTv = series.type === "tv";
  const statusConfig = STATUS_CONFIG[series.status] || STATUS_CONFIG.PENDING;
  const posterUrl = series.poster_url && !imageError ? series.poster_url : PLACEHOLDER_IMAGE;

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setStatusMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClick?.(series)}
      style={{
        position: 'relative',
        background: '#0c0c12',
        border: hovered ? '1px solid rgba(0, 212, 212, 0.3)' : '1px solid #1a1a24',
        borderRadius: '16px',
        overflow: 'hidden',
        transition: 'all 0.25s ease',
        transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered 
          ? '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 212, 212, 0.1)' 
          : '0 4px 16px rgba(0, 0, 0, 0.2)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Poster Image - 3:4 Aspect Ratio */}
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '3 / 4',
        background: 'linear-gradient(180deg, #0a0a10 0%, #0c0c14 100%)',
        overflow: 'hidden',
      }}>
        <Image
          src={posterUrl}
          alt={series.title}
          fill
          style={{
            objectFit: 'cover',
            transition: 'transform 0.4s ease',
            transform: hovered ? 'scale(1.05)' : 'scale(1)',
          }}
          onError={() => setImageError(true)}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        
        {/* Gradient Overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, transparent 40%, rgba(12, 12, 18, 0.8) 80%, rgba(12, 12, 18, 1) 100%)',
          pointerEvents: 'none',
        }} />

        {/* Type Badge - Top Left */}
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '5px 10px',
          borderRadius: '8px',
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          {isTv ? <Tv size={12} color="#00d4d4" /> : <Clapperboard size={12} color="#f59e0b" />}
          <span style={{ color: isTv ? '#00d4d4' : '#f59e0b', fontSize: '11px', fontWeight: 600 }}>
            {isTv ? 'TV' : 'Movie'}
          </span>
        </div>

        {/* Menu Button - Top Right */}
        <div ref={menuRef} style={{ position: 'absolute', top: '12px', right: '12px' }}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              background: menuOpen ? 'rgba(0, 212, 212, 0.2)' : 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(8px)',
              color: menuOpen ? '#00d4d4' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
              opacity: hovered || menuOpen ? 1 : 0,
            }}
          >
            <MoreVertical size={16} />
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '6px',
              background: '#16161e',
              border: '1px solid #2a2a3a',
              borderRadius: '12px',
              padding: '6px',
              minWidth: '140px',
              zIndex: 50,
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
            }}>
              <MenuButton icon={Play} label="View" onClick={() => { onClick?.(series); setMenuOpen(false); }} />
              <MenuButton icon={Edit3} label="Edit" onClick={() => { onEdit?.(series); setMenuOpen(false); }} />
              <MenuButton icon={Trash2} label="Delete" color="#ef4444" onClick={() => { onDelete?.(series); setMenuOpen(false); }} />
            </div>
          )}
        </div>

        {/* Stats Badges - Bottom of Image */}
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          right: '12px',
          display: 'flex',
          gap: '8px',
        }}>
          {series.seas_count && (
            <StatBadge icon={Film} value={series.seas_count} label="Seasons" />
          )}
          {series.ep_count && (
            <StatBadge icon={Calendar} value={series.ep_count} label="Episodes" />
          )}
        </div>
      </div>

      {/* Card Content */}
      <div style={{ padding: '16px' }}>
        {/* Title */}
        <h3 style={{
          color: '#ffffff',
          fontSize: '15px',
          fontWeight: 600,
          marginBottom: '8px',
          lineHeight: 1.3,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {series.title}
        </h3>

        {/* Description */}
        {series.description && (
          <p style={{
            color: '#666677',
            fontSize: '12px',
            lineHeight: 1.5,
            marginBottom: '12px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {series.description}
          </p>
        )}

        {/* Status Badge with Dropdown */}
        <div ref={statusMenuRef} style={{ position: 'relative', display: 'inline-block' }}>
          <button
            onClick={(e) => { 
              e.stopPropagation(); 
              if (onStatusChange) setStatusMenuOpen(!statusMenuOpen); 
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              background: statusConfig.bg,
              color: statusConfig.color,
              fontSize: '12px',
              fontWeight: 600,
              cursor: onStatusChange ? 'pointer' : 'default',
              transition: 'all 0.15s',
            }}
          >
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: statusConfig.color,
            }} />
            {statusConfig.label}
            {onStatusChange && <ChevronDown size={12} style={{ 
              transform: statusMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }} />}
          </button>

          {/* Status Dropdown */}
          {statusMenuOpen && onStatusChange && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              marginBottom: '6px',
              background: '#16161e',
              border: '1px solid #2a2a3a',
              borderRadius: '10px',
              padding: '6px',
              minWidth: '130px',
              zIndex: 50,
              boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.5)',
            }}>
              {(Object.keys(STATUS_CONFIG) as SeriesStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(series, status);
                    setStatusMenuOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: series.status === status ? STATUS_CONFIG[status].bg : 'transparent',
                    color: series.status === status ? STATUS_CONFIG[status].color : '#888899',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'left',
                  }}
                >
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: STATUS_CONFIG[status].color,
                  }} />
                  {STATUS_CONFIG[status].label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper Components
function MenuButton({ icon: Icon, label, color = '#ffffff', onClick }: { icon: React.ElementType; label: string; color?: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        padding: '10px 12px',
        borderRadius: '8px',
        border: 'none',
        background: hovered ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
        color: hovered ? color : '#888899',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.15s',
        textAlign: 'left',
      }}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

function StatBadge({ icon: Icon, value, label }: { icon: React.ElementType; value: string; label: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      borderRadius: '6px',
      background: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
    }}>
      <Icon size={10} color="#888899" />
      <span style={{ color: '#ffffff', fontSize: '10px', fontWeight: 600 }}>{value}</span>
      <span style={{ color: '#666677', fontSize: '9px' }}>{label}</span>
    </div>
  );
}

export default SeriesCard;

