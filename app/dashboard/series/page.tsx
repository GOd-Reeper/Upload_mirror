"use client";

import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/components/ui/Toast";
import { db, Series, SeriesStatus } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { SeriesCard } from "@/components/series";
import { 
  Film, 
  Plus, 
  Tv, 
  Clapperboard,
  Loader2,
  X,
  Search,
  Filter,
  SlidersHorizontal
} from "lucide-react";

// Filter tabs for status
type FilterType = 'all' | SeriesStatus;

const FILTER_OPTIONS: { value: FilterType; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: '#888899' },
  { value: 'PENDING', label: 'Pending', color: '#f59e0b' },
  { value: 'ONGOING', label: 'Ongoing', color: '#3b82f6' },
  { value: 'COMPLETED', label: 'Completed', color: '#10b981' },
];

function PrimaryButton({ children, onClick, disabled = false, loading = false, type = "button" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean; type?: "button" | "submit" }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type={type}
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
        fontWeight: 600,
        borderRadius: '10px',
        border: 'none',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        background: hovered && !disabled ? 'linear-gradient(135deg, #00e8e8 0%, #00d4d4 100%)' : 'linear-gradient(135deg, #00d4d4 0%, #00b8b8 100%)',
        color: '#000000',
        transition: 'all 0.2s',
        boxShadow: hovered && !disabled ? '0 0 25px rgba(0, 212, 212, 0.4)' : '0 4px 12px rgba(0, 212, 212, 0.2)',
        opacity: disabled || loading ? 0.6 : 1
      }}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : children}
    </button>
  );
}

function GhostButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
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

function FilterTab({ value, label, color, selected, onClick, count }: { 
  value: string; 
  label: string; 
  color: string;
  selected: boolean; 
  onClick: () => void;
  count: number;
}) {
  const [hovered, setHovered] = useState(false);
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 14px',
        borderRadius: '10px',
        border: selected ? `1px solid ${color}40` : hovered ? '1px solid #2a2a3a' : '1px solid transparent',
        background: selected ? `${color}15` : hovered ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
        color: selected ? color : hovered ? '#ffffff' : '#666677',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {label}
      <span style={{
        padding: '2px 7px',
        borderRadius: '6px',
        background: selected ? `${color}25` : 'rgba(255, 255, 255, 0.05)',
        color: selected ? color : '#666677',
        fontSize: '11px',
        fontWeight: 600,
      }}>
        {count}
      </span>
    </button>
  );
}

function Modal({ isOpen, onClose, title, children, maxWidth = '480px' }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: string }) {
  const [closeHovered, setCloseHovered] = useState(false);
  if (!isOpen) return null;
  
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div 
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)'
        }}
      />
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth,
        background: '#12121a',
        border: '1px solid #1e1e2e',
        borderRadius: '16px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid #1e1e2e'
        }}>
          <h2 style={{ color: '#ffffff', fontSize: '18px', fontWeight: 600 }}>{title}</h2>
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
        <div style={{ padding: '24px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function TypeButton({ type, selected, onClick, icon: Icon, label }: { type: string; selected: boolean; onClick: () => void; icon: React.ElementType; label: string }) {
  const [hovered, setHovered] = useState(false);
  
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px',
        borderRadius: '10px',
        border: selected ? '1px solid rgba(0, 212, 212, 0.4)' : hovered ? '1px solid #2a2a3a' : '1px solid #1e1e2e',
        background: selected ? 'rgba(0, 212, 212, 0.1)' : hovered ? '#14141c' : 'transparent',
        color: selected ? '#00d4d4' : '#888899',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}

function StatusButton({ status, selected, onClick }: { status: SeriesStatus; selected: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const config = {
    PENDING: { label: 'Pending', color: '#f59e0b' },
    ONGOING: { label: 'Ongoing', color: '#3b82f6' },
    COMPLETED: { label: 'Completed', color: '#10b981' },
  }[status];
  
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '10px',
        borderRadius: '10px',
        border: selected ? `1px solid ${config.color}60` : hovered ? '1px solid #2a2a3a' : '1px solid #1e1e2e',
        background: selected ? `${config.color}15` : hovered ? '#14141c' : 'transparent',
        color: selected ? config.color : '#888899',
        fontSize: '12px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
    >
      <span style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: config.color,
      }} />
      {config.label}
    </button>
  );
}

export default function SeriesPage() {
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [formData, setFormData] = useState({ 
    title: "", 
    type: "tv" as "tv" | "movie", 
    description: "",
    poster_url: "",
    seas_count: "",
    ep_count: "",
    status: "PENDING" as SeriesStatus
  });
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterType>('all');
  const [searchFocused, setSearchFocused] = useState(false);
  const { addToast } = useToast();

  // Fetch series data
  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const data = await db.series.getAll();
        setSeriesList(data);
      } catch (error) {
        console.error("Error fetching series:", error);
        addToast("error", "Failed to load series");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSeries();
  }, []);

  // Calculate counts for filter tabs
  const statusCounts = useMemo(() => {
    const counts: Record<FilterType, number> = {
      all: seriesList.length,
      PENDING: 0,
      ONGOING: 0,
      COMPLETED: 0,
    };
    seriesList.forEach(s => {
      if (s.status in counts) {
        counts[s.status as SeriesStatus]++;
      }
    });
    return counts;
  }, [seriesList]);

  // Filter series based on search and status filter
  const filteredSeries = useMemo(() => {
    return seriesList.filter(series => {
      // Search filter
      const matchesSearch = searchQuery === "" || 
        series.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (series.description?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Status filter
      const matchesStatus = filterStatus === 'all' || series.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [seriesList, searchQuery, filterStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      addToast("error", "Title is required");
      return;
    }

    setIsSaving(true);
    try {
      if (editingSeries) {
        // Update existing series
        const { data, error } = await supabase
          .from("series")
          .update({
            title: formData.title,
            type: formData.type,
            description: formData.description || null,
            poster_url: formData.poster_url || null,
            seas_count: formData.seas_count || null,
            ep_count: formData.ep_count || null,
            status: formData.status,
          })
          .eq("id", editingSeries.id)
          .select()
          .single();
        
        if (error) throw error;
        addToast("success", "Series updated successfully");
      } else {
        // Create new series
        const { data, error } = await supabase
          .from("series")
          .insert({
            title: formData.title,
            type: formData.type,
            description: formData.description || null,
            poster_url: formData.poster_url || null,
            seas_count: formData.seas_count || null,
            ep_count: formData.ep_count || null,
            status: formData.status,
          })
          .select()
          .single();
        
        if (error) throw error;
        addToast("success", "Series created successfully");
      }
      
      setShowModal(false);
      setEditingSeries(null);
      resetForm();
      const data = await db.series.getAll();
      setSeriesList(data);
    } catch (error) {
      console.error("Error saving series:", error);
      addToast("error", editingSeries ? "Failed to update series" : "Failed to create series");
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({ 
      title: "", 
      type: "tv", 
      description: "",
      poster_url: "",
      seas_count: "",
      ep_count: "",
      status: "PENDING"
    });
  };

  const handleEdit = (series: Series) => {
    setEditingSeries(series);
    setFormData({
      title: series.title,
      type: series.type,
      description: series.description || "",
      poster_url: series.poster_url || "",
      seas_count: series.seas_count || "",
      ep_count: series.ep_count || "",
      status: series.status,
    });
    setShowModal(true);
  };

  const handleDelete = async (series: Series) => {
    if (!confirm(`Are you sure you want to delete "${series.title}"?`)) return;
    
    try {
      const { error } = await supabase
        .from("series")
        .delete()
        .eq("id", series.id);
      
      if (error) throw error;
      addToast("success", "Series deleted successfully");
      const data = await db.series.getAll();
      setSeriesList(data);
    } catch (error) {
      console.error("Error deleting series:", error);
      addToast("error", "Failed to delete series");
    }
  };

  const handleStatusChange = async (series: Series, newStatus: SeriesStatus) => {
    try {
      const { error } = await supabase
        .from("series")
        .update({ status: newStatus })
        .eq("id", series.id);
      
      if (error) throw error;
      
      // Update local state
      setSeriesList(prev => prev.map(s => 
        s.id === series.id ? { ...s, status: newStatus } : s
      ));
      addToast("success", `Status changed to ${newStatus.toLowerCase()}`);
    } catch (error) {
      console.error("Error updating status:", error);
      addToast("error", "Failed to update status");
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: '#00d4d4' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ color: '#ffffff', fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>
            Series Library
          </h1>
          <p style={{ color: '#666677', fontSize: '14px' }}>
            Manage your uploaded series and movies
          </p>
        </div>
        <PrimaryButton onClick={() => { resetForm(); setEditingSeries(null); setShowModal(true); }}>
          <Plus size={18} />
          Add Series
        </PrimaryButton>
      </div>

      {/* Search and Filter Bar */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px',
        background: '#0c0c12',
        border: '1px solid #1a1a24',
        borderRadius: '14px',
      }}>
        {/* Search Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          borderRadius: '12px',
          border: searchFocused ? '1px solid rgba(0, 212, 212, 0.4)' : '1px solid #1e1e2e',
          background: '#0a0a0e',
          transition: 'all 0.2s',
        }}>
          <Search size={18} color={searchFocused ? '#00d4d4' : '#666677'} />
          <input
            type="text"
            placeholder="Search series by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              color: '#ffffff',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                padding: '4px',
                borderRadius: '4px',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#666677',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
        }}>
          <SlidersHorizontal size={16} color="#666677" />
          {FILTER_OPTIONS.map(option => (
            <FilterTab
              key={option.value}
              value={option.value}
              label={option.label}
              color={option.color}
              selected={filterStatus === option.value}
              onClick={() => setFilterStatus(option.value)}
              count={statusCounts[option.value]}
            />
          ))}
        </div>
      </div>

      {/* Empty State */}
      {seriesList.length === 0 ? (
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
            <Film size={32} color="#00d4d4" />
          </div>
          <h3 style={{ color: '#ffffff', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
            No series yet
          </h3>
          <p style={{ color: '#666677', fontSize: '14px', maxWidth: '360px', marginBottom: '24px' }}>
            Create your first series to organize your uploaded content.
          </p>
          <PrimaryButton onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus size={18} />
            Add Series
          </PrimaryButton>
        </div>
      ) : filteredSeries.length === 0 ? (
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
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid #1e1e2e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px'
          }}>
            <Search size={32} color="#666677" />
          </div>
          <h3 style={{ color: '#ffffff', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
            No results found
          </h3>
          <p style={{ color: '#666677', fontSize: '14px', maxWidth: '360px' }}>
            Try adjusting your search or filter to find what you're looking for.
          </p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
          gap: '20px' 
        }}>
          {filteredSeries.map((series) => (
            <SeriesCard 
              key={series.id} 
              series={series}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Series Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingSeries(null); resetForm(); }}
        title={editingSeries ? "Edit Series" : "Add Series"}
        maxWidth="520px"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', color: '#888899', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
              Title *
            </label>
            <input
              type="text"
              placeholder="Chainsaw Man"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: '14px',
                borderRadius: '10px',
                border: '1px solid #1e1e2e',
                background: '#0a0a0e',
                color: '#ffffff',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(0, 212, 212, 0.4)'}
              onBlur={(e) => e.target.style.borderColor = '#1e1e2e'}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#888899', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
              Type
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <TypeButton type="tv" selected={formData.type === "tv"} onClick={() => setFormData({ ...formData, type: "tv" })} icon={Tv} label="TV Series" />
              <TypeButton type="movie" selected={formData.type === "movie"} onClick={() => setFormData({ ...formData, type: "movie" })} icon={Clapperboard} label="Movie" />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', color: '#888899', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
              Status
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <StatusButton status="PENDING" selected={formData.status === "PENDING"} onClick={() => setFormData({ ...formData, status: "PENDING" })} />
              <StatusButton status="ONGOING" selected={formData.status === "ONGOING"} onClick={() => setFormData({ ...formData, status: "ONGOING" })} />
              <StatusButton status="COMPLETED" selected={formData.status === "COMPLETED"} onClick={() => setFormData({ ...formData, status: "COMPLETED" })} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: '#888899', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
                Seasons
              </label>
              <input
                type="text"
                placeholder="1"
                value={formData.seas_count}
                onChange={(e) => setFormData({ ...formData, seas_count: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '14px',
                  borderRadius: '10px',
                  border: '1px solid #1e1e2e',
                  background: '#0a0a0e',
                  color: '#ffffff',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(0, 212, 212, 0.4)'}
                onBlur={(e) => e.target.style.borderColor = '#1e1e2e'}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: '#888899', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
                Episodes
              </label>
              <input
                type="text"
                placeholder="12"
                value={formData.ep_count}
                onChange={(e) => setFormData({ ...formData, ep_count: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '14px',
                  borderRadius: '10px',
                  border: '1px solid #1e1e2e',
                  background: '#0a0a0e',
                  color: '#ffffff',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(0, 212, 212, 0.4)'}
                onBlur={(e) => e.target.style.borderColor = '#1e1e2e'}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', color: '#888899', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
              Poster URL
            </label>
            <input
              type="url"
              placeholder="https://image.tmdb.org/t/p/w500/..."
              value={formData.poster_url}
              onChange={(e) => setFormData({ ...formData, poster_url: e.target.value })}
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: '14px',
                borderRadius: '10px',
                border: '1px solid #1e1e2e',
                background: '#0a0a0e',
                color: '#ffffff',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(0, 212, 212, 0.4)'}
              onBlur={(e) => e.target.style.borderColor = '#1e1e2e'}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#888899', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
              Description
            </label>
            <textarea
              placeholder="Brief description..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: '14px',
                borderRadius: '10px',
                border: '1px solid #1e1e2e',
                background: '#0a0a0e',
                color: '#ffffff',
                outline: 'none',
                resize: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(0, 212, 212, 0.4)'}
              onBlur={(e) => e.target.style.borderColor = '#1e1e2e'}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px', borderTop: '1px solid #1e1e2e' }}>
            <GhostButton onClick={() => { setShowModal(false); setEditingSeries(null); resetForm(); }}>
              Cancel
            </GhostButton>
            <PrimaryButton type="submit" loading={isSaving}>
              {editingSeries ? "Update Series" : "Create Series"}
            </PrimaryButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
