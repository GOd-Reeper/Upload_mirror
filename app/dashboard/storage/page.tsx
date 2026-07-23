"use client";

import { useState, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/Toast";
import { db, SupabaseAccount } from "@/lib/supabase";
import { formatBytes, formatMB } from "@/lib/utils";
import { FileUploader } from "@/components/upload";
import { UploadResult } from "@/lib/upload-service";
import {
  HardDrive,
  Folder,
  FileVideo,
  FileAudio,
  File,
  RefreshCw,
  Loader2,
  ChevronRight,
  ArrowLeft,
  AlertTriangle,
  ExternalLink,
  Search,
  X,
  Pause,
  Play,
  Check,
  Database,
  MoreVertical,
  Pencil,
  Trash2,
  Download,
  Copy,
  Eye,
  Link,
  FolderInput,
  FolderPlus,
  Calendar,
  FileType,
  Upload,
  CloudUpload,
  AlertCircle,
  CircleSlash,
  CircleCheck
} from "lucide-react";

// Filter types for storage accounts
type StorageFilterType = 'all' | 'useable' | 'full' | 'empty';

interface StorageFile {
  name: string;
  size: number;
  type: "folder" | "video" | "audio" | "playlist" | "other";
  lastModified?: string;
}

interface FetchError {
  message: string;
  hint?: string;
  errorCode?: string;
}

interface FileInfo {
  key: string;
  size: number;
  contentType: string;
  lastModified?: string;
  etag?: string;
  publicUrl: string;
}

// Storage Bar Component
function StorageBar({ used, limit, compact = false }: { used: number; limit: number; compact?: boolean }) {
  const percentage = Math.min((used / limit) * 100, 100);

  let color = '#22c55e';
  if (percentage >= 90) {
    color = '#ef4444';
  } else if (percentage >= 75) {
    color = '#f59e0b';
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        height: compact ? '4px' : '6px',
        borderRadius: '3px',
        background: '#1a1a24',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          borderRadius: '3px',
          background: color,
          transition: 'width 0.3s'
        }} />
      </div>
    </div>
  );
}

// Context Menu for Files/Folders
function FileContextMenu({
  file,
  currentPath,
  position,
  onClose,
  onAction
}: {
  file: StorageFile;
  currentPath: string;
  position: { x: number; y: number };
  onClose: () => void;
  onAction: (action: string, file: StorageFile) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const isFolder = file.type === "folder";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const menuItems = isFolder ? [
    { icon: Pencil, label: "Rename", action: "rename" },
    { icon: Download, label: "Download", action: "download" },
    { icon: Copy, label: "Copy Path", action: "copyPath" },
    { divider: true },
    { icon: Trash2, label: "Delete", action: "delete", danger: true },
  ] : [
    { icon: Eye, label: "View Details", action: "view" },
    { icon: Link, label: "Get URL", action: "getUrl" },
    { icon: Pencil, label: "Rename", action: "rename" },
    { icon: FolderInput, label: "Move", action: "move" },
    { icon: Download, label: "Download", action: "download" },
    { divider: true },
    { icon: Trash2, label: "Delete", action: "delete", danger: true },
  ];

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        zIndex: 100,
        minWidth: '180px',
        background: '#12121a',
        border: '1px solid #1e1e2e',
        borderRadius: '10px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
        padding: '4px',
        overflow: 'hidden'
      }}
    >
      {menuItems.map((item, index) =>
        item.divider ? (
          <div key={index} style={{ height: '1px', background: '#1e1e2e', margin: '4px 0' }} />
        ) : (
          <ContextMenuItem
            key={index}
            icon={item.icon!}
            label={item.label!}
            danger={item.danger}
            onClick={() => {
              onAction(item.action!, file);
              onClose();
            }}
          />
        )
      )}
    </div>
  );
}

function ContextMenuItem({
  icon: Icon,
  label,
  onClick,
  danger = false
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

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
        padding: '9px 12px',
        borderRadius: '6px',
        border: 'none',
        cursor: 'pointer',
        background: hovered
          ? danger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)'
          : 'transparent',
        color: danger
          ? hovered ? '#ef4444' : '#888899'
          : hovered ? '#ffffff' : '#888899',
        fontSize: '13px',
        textAlign: 'left',
        transition: 'all 0.15s'
      }}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

// File Details Modal
function FileDetailsModal({
  isOpen,
  onClose,
  fileInfo,
  fileName,
  isLoading
}: {
  isOpen: boolean;
  onClose: () => void;
  fileInfo: FileInfo | null;
  fileName: string;
  isLoading: boolean;
}) {
  const [closeHovered, setCloseHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();

  if (!isOpen) return null;

  const handleCopyUrl = () => {
    if (fileInfo?.publicUrl) {
      navigator.clipboard.writeText(fileInfo.publicUrl);
      setCopied(true);
      addToast("success", "URL copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (fileInfo?.publicUrl) {
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = fileInfo.publicUrl;
      link.download = fileName || 'download';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px'
    }}>
      <div onClick={onClose} style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)'
      }} />
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '440px',
        background: '#12121a',
        border: '1px solid #1e1e2e',
        borderRadius: '16px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 22px',
          borderBottom: '1px solid #1e1e2e'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(0, 212, 212, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <FileVideo size={20} color="#00d4d4" />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2 style={{
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: 600,
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {fileName}
              </h2>
              {fileInfo && (
                <p style={{ color: '#666677', fontSize: '12px', margin: 0 }}>
                  {fileInfo.contentType} - {formatBytes(fileInfo.size)}
                </p>
              )}
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
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 22px' }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
              <Loader2 className="animate-spin" size={24} style={{ color: '#00d4d4' }} />
            </div>
          ) : fileInfo ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Info Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <InfoRow icon={FileType} label="Type" value={fileInfo.contentType} />
                <InfoRow icon={HardDrive} label="Size" value={formatBytes(fileInfo.size)} />
                <InfoRow icon={Calendar} label="Added on" value={formatDate(fileInfo.lastModified)} />
                <InfoRow icon={Calendar} label="Last modified" value={formatDate(fileInfo.lastModified)} />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <ActionButton
                  icon={Download}
                  label="Download"
                  onClick={handleDownload}
                />
                <ActionButton
                  icon={copied ? Check : Link}
                  label={copied ? "Copied!" : "Get URL"}
                  onClick={handleCopyUrl}
                  primary
                />
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <p style={{ color: '#666677' }}>Failed to load file info</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        background: '#0a0a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        <Icon size={14} color="#666677" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: '#555566', fontSize: '11px', margin: 0 }}>{label}</p>
        <p style={{
          color: '#ffffff',
          fontSize: '13px',
          margin: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {value}
        </p>
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  primary = false
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '10px 16px',
        borderRadius: '10px',
        border: primary ? 'none' : '1px solid #1e1e2e',
        cursor: 'pointer',
        background: primary
          ? hovered ? 'linear-gradient(135deg, #00e8e8 0%, #00d4d4 100%)' : 'linear-gradient(135deg, #00d4d4 0%, #00b8b8 100%)'
          : hovered ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
        color: primary ? '#000000' : '#888899',
        fontSize: '13px',
        fontWeight: 500,
        transition: 'all 0.2s'
      }}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

// Rename Modal
function RenameModal({
  isOpen,
  onClose,
  currentName,
  isFolder,
  onRename
}: {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  isFolder: boolean;
  onRename: (newName: string) => void;
}) {
  const [newName, setNewName] = useState(currentName);
  const [closeHovered, setCloseHovered] = useState(false);

  useEffect(() => {
    setNewName(currentName);
  }, [currentName, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim() && newName !== currentName) {
      onRename(newName.trim());
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px'
    }}>
      <div onClick={onClose} style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)'
      }} />
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '400px',
        background: '#12121a',
        border: '1px solid #1e1e2e',
        borderRadius: '16px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 22px',
          borderBottom: '1px solid #1e1e2e'
        }}>
          <h2 style={{ color: '#ffffff', fontSize: '17px', fontWeight: 600, margin: 0 }}>
            Rename {isFolder ? 'Folder' : 'File'}
          </h2>
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
        <form onSubmit={handleSubmit} style={{ padding: '20px 22px' }}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid #1e1e2e',
              background: '#0a0a0f',
              color: '#ffffff',
              fontSize: '14px',
              outline: 'none',
              marginBottom: '16px'
            }}
          />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                background: 'transparent',
                color: '#888899',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newName.trim() || newName === currentName}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: 'none',
                cursor: newName.trim() && newName !== currentName ? 'pointer' : 'not-allowed',
                background: newName.trim() && newName !== currentName
                  ? 'linear-gradient(135deg, #00d4d4 0%, #00b8b8 100%)'
                  : '#1e1e2e',
                color: newName.trim() && newName !== currentName ? '#000000' : '#666677',
                fontSize: '14px',
                fontWeight: 600
              }}
            >
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Create Folder Modal
function CreateFolderModal({
  isOpen,
  onClose,
  onCreate
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const [folderName, setFolderName] = useState("");
  const [closeHovered, setCloseHovered] = useState(false);

  useEffect(() => {
    if (isOpen) setFolderName("");
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (folderName.trim()) {
      onCreate(folderName.trim());
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px'
    }}>
      <div onClick={onClose} style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)'
      }} />
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '400px',
        background: '#12121a',
        border: '1px solid #1e1e2e',
        borderRadius: '16px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 22px',
          borderBottom: '1px solid #1e1e2e'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FolderPlus size={18} color="#f59e0b" />
            </div>
            <h2 style={{ color: '#ffffff', fontSize: '17px', fontWeight: 600, margin: 0 }}>
              Create Folder
            </h2>
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
        <form onSubmit={handleSubmit} style={{ padding: '20px 22px' }}>
          <input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Folder name"
            autoFocus
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid #1e1e2e',
              background: '#0a0a0f',
              color: '#ffffff',
              fontSize: '14px',
              outline: 'none',
              marginBottom: '16px'
            }}
          />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                background: 'transparent',
                color: '#888899',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!folderName.trim()}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: 'none',
                cursor: folderName.trim() ? 'pointer' : 'not-allowed',
                background: folderName.trim()
                  ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                  : '#1e1e2e',
                color: folderName.trim() ? '#000000' : '#666677',
                fontSize: '14px',
                fontWeight: 600
              }}
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Confirmation Modal
function DeleteConfirmModal({
  isOpen,
  onClose,
  itemName,
  isFolder,
  onConfirm,
  isDeleting
}: {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  isFolder: boolean;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
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
      padding: '24px 16px'
    }}>
      <div onClick={onClose} style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)'
      }} />
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '400px',
        background: '#12121a',
        border: '1px solid #1e1e2e',
        borderRadius: '16px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 22px',
          borderBottom: '1px solid #1e1e2e'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Trash2 size={18} color="#ef4444" />
            </div>
            <h2 style={{ color: '#ffffff', fontSize: '17px', fontWeight: 600, margin: 0 }}>
              Delete {isFolder ? 'Folder' : 'File'}
            </h2>
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
        <div style={{ padding: '20px 22px' }}>
          <p style={{ color: '#888899', fontSize: '14px', marginBottom: '8px' }}>
            Are you sure you want to delete
          </p>
          <p style={{
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 500,
            marginBottom: '8px',
            padding: '10px 12px',
            background: '#0a0a0f',
            borderRadius: '8px',
            wordBreak: 'break-all'
          }}>
            {itemName}{isFolder && '/'}
          </p>
          {isFolder && (
            <p style={{ color: '#f59e0b', fontSize: '13px', marginBottom: '20px' }}>
              ⚠️ This will delete all files inside the folder
            </p>
          )}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              disabled={isDeleting}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                background: 'transparent',
                color: '#888899',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                border: 'none',
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                opacity: isDeleting ? 0.7 : 1
              }}
            >
              {isDeleting && <Loader2 size={16} className="animate-spin" />}
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Move File Modal
function MoveFileModal({
  isOpen,
  onClose,
  fileName,
  currentPath,
  onMove
}: {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  currentPath: string;
  onMove: (newPath: string) => void;
}) {
  const [newPath, setNewPath] = useState(currentPath);
  const [closeHovered, setCloseHovered] = useState(false);

  useEffect(() => {
    setNewPath(currentPath);
  }, [currentPath, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onMove(newPath);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px'
    }}>
      <div onClick={onClose} style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)'
      }} />
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '440px',
        background: '#12121a',
        border: '1px solid #1e1e2e',
        borderRadius: '16px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 22px',
          borderBottom: '1px solid #1e1e2e'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(0, 212, 212, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FolderInput size={18} color="#00d4d4" />
            </div>
            <h2 style={{ color: '#ffffff', fontSize: '17px', fontWeight: 600, margin: 0 }}>
              Move File
            </h2>
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
        <form onSubmit={handleSubmit} style={{ padding: '20px 22px' }}>
          <p style={{ color: '#888899', fontSize: '13px', marginBottom: '12px' }}>
            Moving: <span style={{ color: '#ffffff' }}>{fileName}</span>
          </p>
          <label style={{ display: 'block', color: '#666677', fontSize: '12px', marginBottom: '8px' }}>
            Destination path (leave empty for root)
          </label>
          <input
            type="text"
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            placeholder="folder/subfolder/"
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid #1e1e2e',
              background: '#0a0a0f',
              color: '#ffffff',
              fontSize: '14px',
              outline: 'none',
              marginBottom: '16px'
            }}
          />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                background: 'transparent',
                color: '#888899',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #00d4d4 0%, #00b8b8 100%)',
                color: '#000000',
                fontSize: '14px',
                fontWeight: 600
              }}
            >
              Move
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Search Files Input
function SearchFilesInput({
  value,
  onChange,
  onClear
}: {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      background: '#0a0a0f',
      borderRadius: '8px',
      border: '1px solid #1e1e2e',
      flex: 1,
      maxWidth: '200px'
    }}>
      <Search size={14} color="#666677" />
      <input
        type="text"
        placeholder="Search files..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: '#ffffff',
          fontSize: '13px',
          minWidth: 0
        }}
      />
      {value && (
        <button
          onClick={onClear}
          style={{
            padding: '2px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#666677',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}

// Filter Tab for Storage Accounts
function StorageFilterTab({
  label,
  count,
  active,
  onClick,
  color
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color?: string;
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
        gap: '4px',
        padding: '5px 10px',
        fontSize: '11px',
        fontWeight: 500,
        borderRadius: '6px',
        border: 'none',
        cursor: 'pointer',
        background: active
          ? `rgba(${color === '#22c55e' ? '34, 197, 94' : color === '#ef4444' ? '239, 68, 68' : color === '#a78bfa' ? '167, 139, 250' : '0, 212, 212'}, 0.15)`
          : hovered ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
        color: active ? accentColor : hovered ? '#ffffff' : '#888899',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap'
      }}
    >
      {label}
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '16px',
        height: '16px',
        padding: '0 4px',
        borderRadius: '8px',
        background: active ? accentColor : '#1e1e2e',
        color: active ? '#000000' : '#666677',
        fontSize: '10px',
        fontWeight: 600
      }}>
        {count}
      </span>
    </button>
  );
}

interface AccountButtonProps {
  account: SupabaseAccount;
  isSelected: boolean;
  onClick: () => void;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  isSyncing: boolean;
  isEditing: boolean;
  editingName: string;
  onEditingNameChange: (name: string) => void;
  onStartRename: () => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onSync: () => void;
  onTogglePause: () => void;
  onMarkAsFull: () => void;
  onMarkAsUseable: () => void;
  onDelete: () => void;
}

function AccountButton({
  account,
  isSelected,
  onClick,
  isMenuOpen,
  onMenuToggle,
  onMenuClose,
  isSyncing,
  isEditing,
  editingName,
  onEditingNameChange,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onSync,
  onTogglePause,
  onMarkAsFull,
  onMarkAsUseable,
  onDelete
}: AccountButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [menuBtnHovered, setMenuBtnHovered] = useState(false);
  const isPaused = account.is_paused || account.status === 'paused';
  const isFull = account.status === 'full';
  const availableStorage = account.storage_limit_mb - account.used_storage_mb;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSaveRename();
    } else if (e.key === 'Escape') {
      onCancelRename();
    }
  };

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuBtnHovered(false); }}
    >
      <div
        onClick={onClick}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '10px',
          textAlign: 'left',
          cursor: 'pointer',
          background: isSelected
            ? 'rgba(0, 212, 212, 0.1)'
            : isPaused
              ? 'rgba(245, 158, 11, 0.05)'
              : hovered ? '#14141c' : 'transparent',
          border: isSelected
            ? '1px solid rgba(0, 212, 212, 0.3)'
            : isPaused
              ? '1px solid rgba(245, 158, 11, 0.2)'
              : '1px solid #1e1e2e',
          transition: 'all 0.2s',
          opacity: isSyncing ? 0.7 : 1
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: isPaused
              ? 'rgba(245, 158, 11, 0.1)'
              : isFull
                ? 'rgba(239, 68, 68, 0.1)'
                : 'rgba(0, 212, 212, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {isSyncing ? (
              <Loader2 size={16} color="#00d4d4" className="animate-spin" />
            ) : isPaused ? (
              <Pause size={16} color="#f59e0b" />
            ) : (
              <HardDrive size={16} color={isSelected ? '#00d4d4' : isFull ? '#ef4444' : '#00d4d4'} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {isEditing ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => onEditingNameChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={onSaveRename}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #00d4d4',
                  background: '#1a1a24',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 500,
                  outline: 'none'
                }}
              />
            ) : (
              <p
                onDoubleClick={(e) => { e.stopPropagation(); onStartRename(); }}
                style={{
                  color: isSelected ? '#00d4d4' : isPaused ? '#f59e0b' : '#ffffff',
                  fontSize: '13px',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  cursor: 'text'
                }}
                title="Double-click to rename"
              >
                {account.name || "Unnamed"}
              </p>
            )}
            <p style={{
              color: '#555566',
              fontSize: '11px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {account.bucket_name}
            </p>
          </div>
          <span style={{
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 500,
            background: isPaused
              ? 'rgba(245, 158, 11, 0.15)'
              : isFull
                ? 'rgba(239, 68, 68, 0.15)'
                : 'rgba(34, 197, 94, 0.15)',
            color: isPaused ? '#f59e0b' : isFull ? '#ef4444' : '#22c55e'
          }}>
            {isPaused ? 'Paused' : isFull ? 'Full' : 'Active'}
          </span>
        </div>

        <div style={{ marginBottom: '8px' }}>
          <StorageBar used={account.used_storage_mb} limit={account.storage_limit_mb} compact />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
          <span style={{ color: '#666677' }}>
            {formatMB(account.used_storage_mb)} / {formatMB(account.storage_limit_mb)}
          </span>
          <span style={{ color: isPaused ? '#666677' : availableStorage > 0 ? '#22c55e' : '#ef4444' }}>
            {isPaused ? '—' : `${formatMB(availableStorage)} free`}
          </span>
        </div>
      </div>

      {/* Hamburger Menu Button */}
      {(hovered || isMenuOpen) && (
        <button
          onClick={(e) => { e.stopPropagation(); onMenuToggle(); }}
          onMouseEnter={() => setMenuBtnHovered(true)}
          onMouseLeave={() => setMenuBtnHovered(false)}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            padding: '6px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            background: menuBtnHovered || isMenuOpen ? '#1e1e2e' : 'rgba(0,0,0,0.3)',
            color: menuBtnHovered || isMenuOpen ? '#ffffff' : '#888899',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: isMenuOpen ? 101 : 1
          }}
        >
          <MoreVertical size={14} />
        </button>
      )}

      {/* Dropdown Menu */}
      {isMenuOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 100 }}
            onClick={onMenuClose}
          />
          <div style={{
            position: 'absolute',
            right: 0,
            top: '40px',
            zIndex: 101,
            width: '160px',
            background: '#12121a',
            border: '1px solid #1e1e2e',
            borderRadius: '10px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
            padding: '4px',
            overflow: 'hidden'
          }}>
            <AccountMenuItem icon={Pencil} label="Rename" onClick={() => { onMenuClose(); onStartRename(); }} />
            <AccountMenuItem icon={RefreshCw} label="Sync Storage" onClick={() => { onMenuClose(); onSync(); }} accent />
            <AccountMenuItem
              icon={isPaused ? Play : Pause}
              label={isPaused ? "Resume" : "Pause"}
              onClick={() => { onMenuClose(); onTogglePause(); }}
            />
            <a
              href={account.project_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <AccountMenuItem icon={ExternalLink} label="Open Project" onClick={() => onMenuClose()} />
            </a>

            {!isPaused && (
              <>
                <div style={{ height: '1px', background: '#1e1e2e', margin: '4px 0' }} />
                {isFull ? (
                  <AccountMenuItem icon={CircleCheck} label="Mark Useable" onClick={() => { onMenuClose(); onMarkAsUseable(); }} success />
                ) : (
                  <AccountMenuItem icon={CircleSlash} label="Mark Full" onClick={() => { onMenuClose(); onMarkAsFull(); }} warning />
                )}
              </>
            )}

            <div style={{ height: '1px', background: '#1e1e2e', margin: '4px 0' }} />
            <AccountMenuItem icon={Trash2} label="Delete" onClick={() => { onMenuClose(); onDelete(); }} danger />
          </div>
        </>
      )}
    </div>
  );
}

// Menu item for account dropdown
function AccountMenuItem({
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
    if (danger) return { bg: hovered ? 'rgba(239, 68, 68, 0.1)' : 'transparent', color: hovered ? '#ef4444' : '#888899' };
    if (warning) return { bg: hovered ? 'rgba(245, 158, 11, 0.1)' : 'transparent', color: hovered ? '#f59e0b' : '#888899' };
    if (success) return { bg: hovered ? 'rgba(34, 197, 94, 0.1)' : 'transparent', color: hovered ? '#22c55e' : '#888899' };
    if (accent) return { bg: hovered ? 'rgba(0, 212, 212, 0.1)' : 'transparent', color: hovered ? '#00d4d4' : '#888899' };
    return { bg: hovered ? '#1a1a24' : 'transparent', color: hovered ? '#ffffff' : '#888899' };
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
        gap: '8px',
        padding: '8px 10px',
        borderRadius: '6px',
        border: 'none',
        cursor: 'pointer',
        background: colors.bg,
        color: colors.color,
        fontSize: '12px',
        textAlign: 'left',
        transition: 'all 0.15s'
      }}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

// Account Search Modal (simplified for brevity - keeping the same as before)
function AccountSearchModal({
  isOpen,
  onClose,
  accounts,
  onSelect,
  selectedAccountId
}: {
  isOpen: boolean;
  onClose: () => void;
  accounts: SupabaseAccount[];
  onSelect: (account: SupabaseAccount) => void;
  selectedAccountId?: string;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showPaused, setShowPaused] = useState(false);
  const [closeHovered, setCloseHovered] = useState(false);

  if (!isOpen) return null;

  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch =
      (acc.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      acc.bucket_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPaused = showPaused || (!acc.is_paused && acc.status !== 'paused');
    return matchesSearch && matchesPaused;
  });

  const pausedCount = accounts.filter(acc => acc.is_paused || acc.status === 'paused').length;
  const nonPausedAccounts = accounts.filter(acc => !acc.is_paused && acc.status !== 'paused');
  const totalStorage = nonPausedAccounts.reduce((sum, acc) => sum + acc.storage_limit_mb, 0);
  const usedStorage = nonPausedAccounts.reduce((sum, acc) => sum + acc.used_storage_mb, 0);
  const availableStorage = totalStorage - usedStorage;

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
      <div onClick={onClose} style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)'
      }} />
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '560px',
        background: '#12121a',
        border: '1px solid #1e1e2e',
        borderRadius: '16px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
        margin: 'auto 0',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 22px',
          borderBottom: '1px solid #1e1e2e'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(0, 212, 212, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Database size={18} color="#00d4d4" />
            </div>
            <h2 style={{ color: '#ffffff', fontSize: '17px', fontWeight: 600, margin: 0 }}>
              Select Account
            </h2>
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
              display: 'flex'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '16px 22px', background: '#0a0a0f', borderBottom: '1px solid #1e1e2e' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#666677', fontSize: '11px', marginBottom: '2px' }}>Total</p>
              <p style={{ color: '#00d4d4', fontSize: '16px', fontWeight: 600 }}>{formatMB(totalStorage)}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#666677', fontSize: '11px', marginBottom: '2px' }}>Used</p>
              <p style={{ color: '#ffffff', fontSize: '16px', fontWeight: 600 }}>{formatMB(usedStorage)}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#666677', fontSize: '11px', marginBottom: '2px' }}>Available</p>
              <p style={{ color: '#22c55e', fontSize: '16px', fontWeight: 600 }}>{formatMB(availableStorage)}</p>
            </div>
          </div>
          <StorageBar used={usedStorage} limit={totalStorage} />
        </div>

        <div style={{ padding: '16px 22px', borderBottom: '1px solid #1e1e2e' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            background: '#0a0a0f',
            borderRadius: '10px',
            border: '1px solid #1e1e2e',
            marginBottom: '12px'
          }}>
            <Search size={16} color="#666677" />
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#ffffff', fontSize: '14px' }}
            />
          </div>

          <button
            onClick={() => setShowPaused(!showPaused)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: showPaused ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
              border: showPaused ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid #1e1e2e',
              borderRadius: '8px',
              cursor: 'pointer',
              color: showPaused ? '#f59e0b' : '#666677',
              fontSize: '12px',
              fontWeight: 500
            }}
          >
            <Pause size={14} />
            Show Paused ({pausedCount})
            {showPaused && <Check size={14} />}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredAccounts.map((account) => (
            <button
              key={account.id}
              onClick={() => { onSelect(account); onClose(); }}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '10px',
                textAlign: 'left',
                cursor: 'pointer',
                background: selectedAccountId === account.id ? 'rgba(0, 212, 212, 0.1)' : 'transparent',
                border: selectedAccountId === account.id ? '1px solid rgba(0, 212, 212, 0.3)' : '1px solid #1e1e2e',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <HardDrive size={18} color={selectedAccountId === account.id ? '#00d4d4' : '#666677'} />
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: 500, margin: 0 }}>{account.name || 'Unnamed'}</p>
                  <p style={{ color: '#555566', fontSize: '12px', margin: 0 }}>{account.bucket_name}</p>
                </div>
                <p style={{ color: '#22c55e', fontSize: '13px', fontWeight: 600 }}>
                  {formatMB(account.storage_limit_mb - account.used_storage_mb)} free
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FileRow({
  file,
  currentPath,
  onClick,
  onContextMenu
}: {
  file: StorageFile;
  currentPath: string;
  onClick?: () => void;
  onContextMenu: (e: React.MouseEvent, file: StorageFile) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [menuBtnHovered, setMenuBtnHovered] = useState(false);
  const isFolder = file.type === "folder";

  const getIcon = () => {
    const iconStyle = { flexShrink: 0 };
    switch (file.type) {
      case "folder": return <Folder size={18} color="#f59e0b" style={iconStyle} />;
      case "video": return <FileVideo size={18} color="#3b82f6" style={iconStyle} />;
      case "audio": return <FileAudio size={18} color="#22c55e" style={iconStyle} />;
      case "playlist": return <File size={18} color="#00d4d4" style={iconStyle} />;
      default: return <File size={18} color="#666677" style={iconStyle} />;
    }
  };

  return (
    <div
      onClick={isFolder ? onClick : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        cursor: isFolder ? 'pointer' : 'default',
        background: hovered ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
        borderBottom: '1px solid #1e1e2e',
        transition: 'background 0.15s'
      }}
    >
      {getIcon()}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          color: '#ffffff',
          fontSize: '13px',
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {file.name}{isFolder && '/'}
        </p>
      </div>
      {!isFolder && (
        <span style={{
          padding: '3px 8px',
          borderRadius: '6px',
          background: '#1a1a24',
          color: '#888899',
          fontSize: '11px',
          fontWeight: 500
        }}>
          {formatBytes(file.size)}
        </span>
      )}

      {/* 3-dot menu button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onContextMenu(e, file);
        }}
        onMouseEnter={() => setMenuBtnHovered(true)}
        onMouseLeave={() => setMenuBtnHovered(false)}
        style={{
          padding: '6px',
          borderRadius: '6px',
          border: 'none',
          cursor: 'pointer',
          background: menuBtnHovered ? '#1e1e2e' : 'transparent',
          color: menuBtnHovered ? '#ffffff' : '#555566',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s',
          opacity: hovered || menuBtnHovered ? 1 : 0
        }}
      >
        <MoreVertical size={16} />
      </button>

      {isFolder && (
        <ChevronRight size={16} color="#444455" style={{
          transition: 'transform 0.15s',
          transform: hovered ? 'translateX(2px)' : 'none'
        }} />
      )}
    </div>
  );
}

export default function StoragePage() {
  const [accounts, setAccounts] = useState<SupabaseAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<SupabaseAccount | null>(null);
  const [currentPath, setCurrentPath] = useState("");
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingFiles, setIsFetchingFiles] = useState(false);
  const [refreshHovered, setRefreshHovered] = useState(false);
  const [backHovered, setBackHovered] = useState(false);
  const [fetchError, setFetchError] = useState<FetchError | null>(null);
  const [showAccountSearch, setShowAccountSearch] = useState(false);
  const [searchBtnHovered, setSearchBtnHovered] = useState(false);
  const [createFolderHovered, setCreateFolderHovered] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ file: StorageFile; position: { x: number; y: number } } | null>(null);

  // Modal states
  const [showFileDetails, setShowFileDetails] = useState(false);
  const [selectedFileInfo, setSelectedFileInfo] = useState<FileInfo | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [isLoadingFileInfo, setIsLoadingFileInfo] = useState(false);

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState<StorageFile | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StorageFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTarget, setMoveTarget] = useState<StorageFile | null>(null);

  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);

  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [uploadBtnHovered, setUploadBtnHovered] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  // Filter state for accounts
  const [accountFilter, setAccountFilter] = useState<StorageFilterType>('all');

  // Account action states
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteAccountTarget, setDeleteAccountTarget] = useState<SupabaseAccount | null>(null);
  const [showAccountDeleteModal, setShowAccountDeleteModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState<string | null>(null);

  const { addToast } = useToast();

  useEffect(() => {
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
    fetchAccounts();
  }, []);

  // Base accounts (non-paused)
  const nonPausedAccounts = accounts.filter(acc => !acc.is_paused && acc.status !== 'paused');

  // Account counts for filter tabs
  const useableAccountsCount = nonPausedAccounts.filter(acc => acc.status === 'useable').length;
  const fullAccountsCount = nonPausedAccounts.filter(acc => acc.status === 'full').length;
  const emptyAccountsCount = nonPausedAccounts.filter(acc => acc.used_storage_mb === 0 && acc.storage_limit_mb > 0).length;

  // Filter and sort accounts
  const visibleAccounts = nonPausedAccounts
    .filter(acc => {
      if (accountFilter === 'all') return true;
      if (accountFilter === 'useable') return acc.status === 'useable';
      if (accountFilter === 'full') return acc.status === 'full';
      if (accountFilter === 'empty') return acc.used_storage_mb === 0 && acc.storage_limit_mb > 0;
      return true;
    })
    .sort((a, b) => {
      // Sort priority: 1. Full accounts last, 2. By used storage (less first)
      const aIsFull = a.status === 'full' ? 1 : 0;
      const bIsFull = b.status === 'full' ? 1 : 0;

      if (aIsFull !== bIsFull) return aIsFull - bIsFull;
      return a.used_storage_mb - b.used_storage_mb;
    });

  const totalStorage = nonPausedAccounts.reduce((sum, acc) => sum + acc.storage_limit_mb, 0);
  const usedStorage = nonPausedAccounts.reduce((sum, acc) => sum + acc.used_storage_mb, 0);
  const availableStorage = totalStorage - usedStorage;

  // Refresh accounts from database
  const refreshAccounts = async () => {
    try {
      const data = await db.accounts.getAll();
      setAccounts(data);
      // Update selected account if it exists
      if (selectedAccount) {
        const updated = data.find(a => a.id === selectedAccount.id);
        if (updated) setSelectedAccount(updated);
      }
    } catch (error) {
      console.error("Error refreshing accounts:", error);
    }
  };

  // Sync single account storage
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
        await db.accounts.update(account.id, {
          used_storage_mb: result.used_storage_mb,
        });
        addToast("success", `Storage synced: ${formatMB(result.used_storage_mb)} used`);
        refreshAccounts();
      } else {
        if (result.errorCode === "PROJECT_PAUSED") {
          addToast("warning", "Project is paused");
        } else {
          addToast("error", result.error || "Failed to sync storage");
        }
      }
    } catch (error) {
      console.error("Sync storage error:", error);
      addToast("error", "Failed to sync storage");
    } finally {
      setSyncingAccountId(null);
    }
  };

  // Sync all accounts storage
  const handleSyncAllStorage = async () => {
    setIsSyncingAll(true);
    let successCount = 0;
    let errorCount = 0;

    for (const account of accounts) {
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
    setIsSyncingAll(false);

    if (successCount > 0) {
      addToast("success", `Synced ${successCount} account${successCount > 1 ? 's' : ''}`);
      refreshAccounts();
    }
    if (errorCount > 0) {
      addToast("warning", `Failed to sync ${errorCount} account${errorCount > 1 ? 's' : ''}`);
    }
  };

  // Toggle account pause state
  const handleTogglePause = async (account: SupabaseAccount) => {
    const isPaused = account.is_paused || account.status === 'paused';
    try {
      await db.accounts.update(account.id, { is_paused: !isPaused });
      addToast("success", `${account.name || 'Account'} ${isPaused ? 'resumed' : 'paused'}`);
      refreshAccounts();
    } catch (error) {
      console.error("Toggle pause error:", error);
      addToast("error", "Failed to update account");
    }
  };

  // Mark account as full
  const handleMarkAsFull = async (account: SupabaseAccount) => {
    try {
      await db.accounts.update(account.id, { status: 'full' });
      addToast("success", `${account.name || 'Account'} marked as full`);
      refreshAccounts();
    } catch (error) {
      console.error("Mark as full error:", error);
      addToast("error", "Failed to update account");
    }
  };

  // Mark account as useable
  const handleMarkAsUseable = async (account: SupabaseAccount) => {
    try {
      await db.accounts.update(account.id, { status: 'useable' });
      addToast("success", `${account.name || 'Account'} marked as useable`);
      refreshAccounts();
    } catch (error) {
      console.error("Mark as useable error:", error);
      addToast("error", "Failed to update account");
    }
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (!deleteAccountTarget) return;
    setIsDeletingAccount(true);
    try {
      await db.accounts.delete(deleteAccountTarget.id);
      addToast("success", `${deleteAccountTarget.name || 'Account'} deleted`);
      setShowAccountDeleteModal(false);
      setDeleteAccountTarget(null);
      if (selectedAccount?.id === deleteAccountTarget.id) {
        setSelectedAccount(null);
        setFiles([]);
        setCurrentPath("");
      }
      refreshAccounts();
    } catch (error) {
      console.error("Delete account error:", error);
      addToast("error", "Failed to delete account");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Rename account
  const handleRenameAccount = async (accountId: string, newName: string) => {
    try {
      await db.accounts.update(accountId, { name: newName });
      addToast("success", "Account renamed");
      refreshAccounts();
    } catch (error) {
      console.error("Rename account error:", error);
      addToast("error", "Failed to rename account");
    }
    setEditingAccountId(null);
    setEditingName("");
  };

  // Start inline rename
  const handleStartRename = (account: SupabaseAccount) => {
    setEditingAccountId(account.id);
    setEditingName(account.name || "");
    setAccountMenuOpen(null);
  };

  const fetchFiles = async (account: SupabaseAccount, path: string = "") => {
    setIsFetchingFiles(true);
    setFetchError(null);
    try {
      const response = await fetch(`/api/storage/list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          s3_endpoint: account.s3_endpoint,
          bucket_name: account.bucket_name,
          s3_access_key: account.s3_access_key,
          s3_secret_key: account.s3_secret_key,
          prefix: path,
        }),
      });
      const result = await response.json();
      if (result.success) {
        // Filter out placeholder files that shouldn't be visible to users
        const visibleFiles = (result.files || []).filter(
          (f: StorageFile) => f.name !== '.emptyFolderPlaceholder'
        );
        setFiles(visibleFiles);
        setFetchError(null);
      } else {
        setFetchError({
          message: result.error || "Failed to list files",
          hint: result.hint,
          errorCode: result.errorCode,
        });
        setFiles([]);
        if (result.errorCode !== "PROJECT_PAUSED") {
          addToast("error", result.error || "Failed to list files");
        }
      }
    } catch (error) {
      console.error("Error fetching files:", error);
      setFetchError({
        message: "Failed to fetch files",
        hint: "Network error - please check your connection.",
      });
      setFiles([]);
    } finally {
      setIsFetchingFiles(false);
    }
  };

  const handleSelectAccount = (account: SupabaseAccount) => {
    setSelectedAccount(account);
    setCurrentPath("");
    setSearchQuery("");
    fetchFiles(account, "");
  };

  const handleNavigate = (folderName: string) => {
    if (!selectedAccount) return;
    const newPath = currentPath ? `${currentPath}${folderName}/` : `${folderName}/`;
    setCurrentPath(newPath);
    setSearchQuery("");
    fetchFiles(selectedAccount, newPath);
  };

  const handleBack = () => {
    if (!selectedAccount || !currentPath) return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    const newPath = parts.length > 0 ? parts.join("/") + "/" : "";
    setCurrentPath(newPath);
    setSearchQuery("");
    fetchFiles(selectedAccount, newPath);
  };

  const handleContextMenu = (e: React.MouseEvent, file: StorageFile) => {
    e.preventDefault();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setContextMenu({
      file,
      position: { x: Math.min(e.clientX, window.innerWidth - 200), y: Math.min(e.clientY, window.innerHeight - 300) }
    });
  };

  const handleFileAction = async (action: string, file: StorageFile) => {
    if (!selectedAccount) return;

    const fullKey = currentPath + file.name + (file.type === 'folder' ? '/' : '');

    switch (action) {
      case 'view':
        setSelectedFileName(file.name);
        setShowFileDetails(true);
        setIsLoadingFileInfo(true);
        try {
          const response = await fetch('/api/storage/manage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'getInfo',
              s3_endpoint: selectedAccount.s3_endpoint,
              bucket_name: selectedAccount.bucket_name,
              s3_access_key: selectedAccount.s3_access_key,
              s3_secret_key: selectedAccount.s3_secret_key,
              key: fullKey,
            }),
          });
          const result = await response.json();
          if (result.success) {
            setSelectedFileInfo(result.info);
          } else {
            addToast('error', result.error || 'Failed to get file info');
          }
        } catch {
          addToast('error', 'Failed to get file info');
        } finally {
          setIsLoadingFileInfo(false);
        }
        break;

      case 'getUrl':
        try {
          const response = await fetch('/api/storage/manage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'getUrl',
              s3_endpoint: selectedAccount.s3_endpoint,
              bucket_name: selectedAccount.bucket_name,
              s3_access_key: selectedAccount.s3_access_key,
              s3_secret_key: selectedAccount.s3_secret_key,
              key: fullKey,
            }),
          });
          const result = await response.json();
          if (result.success) {
            navigator.clipboard.writeText(result.url);
            addToast('success', 'URL copied to clipboard');
          }
        } catch {
          addToast('error', 'Failed to get URL');
        }
        break;

      case 'rename':
        setRenameTarget(file);
        setShowRenameModal(true);
        break;

      case 'move':
        setMoveTarget(file);
        setShowMoveModal(true);
        break;

      case 'download':
        try {
          const response = await fetch('/api/storage/manage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'getUrl',
              s3_endpoint: selectedAccount.s3_endpoint,
              bucket_name: selectedAccount.bucket_name,
              s3_access_key: selectedAccount.s3_access_key,
              s3_secret_key: selectedAccount.s3_secret_key,
              key: fullKey,
            }),
          });
          const result = await response.json();
          if (result.success) {
            // Create a temporary anchor element to trigger download
            const link = document.createElement('a');
            link.href = result.url;
            link.download = file.name || 'download';
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            addToast('success', 'Download started');
          }
        } catch {
          addToast('error', 'Failed to download');
        }
        break;

      case 'copyPath':
        const path = `${selectedAccount.bucket_name}/${fullKey}`;
        navigator.clipboard.writeText(path);
        addToast('success', 'Path copied to clipboard');
        break;

      case 'delete':
        setDeleteTarget(file);
        setShowDeleteModal(true);
        break;
    }
  };

  const handleRename = async (newName: string) => {
    if (!selectedAccount || !renameTarget) return;

    const isFolder = renameTarget.type === 'folder';
    const oldKey = currentPath + renameTarget.name + (isFolder ? '/' : '');
    const newKey = currentPath + newName + (isFolder ? '/' : '');

    try {
      const response = await fetch('/api/storage/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rename',
          s3_endpoint: selectedAccount.s3_endpoint,
          bucket_name: selectedAccount.bucket_name,
          s3_access_key: selectedAccount.s3_access_key,
          s3_secret_key: selectedAccount.s3_secret_key,
          key: oldKey,
          newKey: newKey,
        }),
      });
      const result = await response.json();
      if (result.success) {
        addToast('success', 'Renamed successfully');
        fetchFiles(selectedAccount, currentPath);
      } else {
        addToast('error', result.error || 'Failed to rename');
      }
    } catch {
      addToast('error', 'Failed to rename');
    }

    setShowRenameModal(false);
    setRenameTarget(null);
  };

  const handleDelete = async () => {
    if (!selectedAccount || !deleteTarget) return;

    setIsDeleting(true);
    const isFolder = deleteTarget.type === 'folder';
    const key = currentPath + deleteTarget.name + (isFolder ? '/' : '');

    try {
      const response = await fetch('/api/storage/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          s3_endpoint: selectedAccount.s3_endpoint,
          bucket_name: selectedAccount.bucket_name,
          s3_access_key: selectedAccount.s3_access_key,
          s3_secret_key: selectedAccount.s3_secret_key,
          key: key,
        }),
      });
      const result = await response.json();
      if (result.success) {
        addToast('success', 'Deleted successfully');
        fetchFiles(selectedAccount, currentPath);
      } else {
        addToast('error', result.error || 'Failed to delete');
      }
    } catch {
      addToast('error', 'Failed to delete');
    }

    setIsDeleting(false);
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  const handleMove = async (newPath: string) => {
    if (!selectedAccount || !moveTarget) return;

    const key = currentPath + moveTarget.name;
    const destPath = newPath.endsWith('/') ? newPath : (newPath ? newPath + '/' : '');

    try {
      const response = await fetch('/api/storage/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move',
          s3_endpoint: selectedAccount.s3_endpoint,
          bucket_name: selectedAccount.bucket_name,
          s3_access_key: selectedAccount.s3_access_key,
          s3_secret_key: selectedAccount.s3_secret_key,
          key: key,
          destinationPath: destPath,
        }),
      });
      const result = await response.json();
      if (result.success) {
        addToast('success', 'File moved successfully');
        fetchFiles(selectedAccount, currentPath);
      } else {
        addToast('error', result.error || 'Failed to move file');
      }
    } catch {
      addToast('error', 'Failed to move file');
    }

    setShowMoveModal(false);
    setMoveTarget(null);
  };

  const handleCreateFolder = async (folderName: string) => {
    if (!selectedAccount) return;

    const folderKey = currentPath + folderName + '/';

    try {
      const response = await fetch('/api/storage/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createFolder',
          s3_endpoint: selectedAccount.s3_endpoint,
          bucket_name: selectedAccount.bucket_name,
          s3_access_key: selectedAccount.s3_access_key,
          s3_secret_key: selectedAccount.s3_secret_key,
          key: folderKey,
        }),
      });
      const result = await response.json();
      if (result.success) {
        addToast('success', 'Folder created successfully');
        fetchFiles(selectedAccount, currentPath);
      } else {
        addToast('error', result.error || 'Failed to create folder');
      }
    } catch {
      addToast('error', 'Failed to create folder');
    }

    setShowCreateFolderModal(false);
  };

  const handleUploadComplete = (result: UploadResult) => {
    if (result.success) {
      addToast('success', `Uploaded ${result.fileName}`);
    }
  };

  const handleAllUploadsComplete = () => {
    // Refresh file list after all uploads complete
    if (selectedAccount) {
      fetchFiles(selectedAccount, currentPath);
    }
  };

  // Filter files based on search
  const filteredFiles = searchQuery
    ? files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: '#00d4d4' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', flexShrink: 0, marginBottom: '16px' }}>
        <div>
          <h1 style={{ color: '#ffffff', fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>
            Storage Browser
          </h1>
          <p style={{ color: '#666677', fontSize: '14px' }}>
            Browse and manage files in your storage buckets
          </p>
        </div>

        {accounts.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '12px 18px',
              background: '#12121a',
              borderRadius: '12px',
              border: '1px solid #1e1e2e'
            }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#666677', fontSize: '11px', marginBottom: '2px' }}>Total</p>
                <p style={{ color: '#00d4d4', fontSize: '14px', fontWeight: 600 }}>{formatMB(totalStorage)}</p>
              </div>
              <div style={{ width: '1px', height: '30px', background: '#1e1e2e' }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#666677', fontSize: '11px', marginBottom: '2px' }}>Used</p>
                <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600 }}>{formatMB(usedStorage)}</p>
              </div>
              <div style={{ width: '1px', height: '30px', background: '#1e1e2e' }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#666677', fontSize: '11px', marginBottom: '2px' }}>Available</p>
                <p style={{ color: '#22c55e', fontSize: '14px', fontWeight: 600 }}>{formatMB(availableStorage)}</p>
              </div>
            </div>

            <button
              onClick={handleSyncAllStorage}
              disabled={isSyncingAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                borderRadius: '10px',
                border: 'none',
                cursor: isSyncingAll ? 'not-allowed' : 'pointer',
                background: isSyncingAll
                  ? 'rgba(0, 212, 212, 0.1)'
                  : 'linear-gradient(135deg, #00d4d4 0%, #00b8b8 100%)',
                color: isSyncingAll ? '#00d4d4' : '#000000',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.2s',
                opacity: isSyncingAll ? 0.8 : 1
              }}
            >
              <RefreshCw size={16} className={isSyncingAll ? 'animate-spin' : ''} />
              {isSyncingAll ? 'Syncing...' : 'Sync All'}
            </button>
          </div>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(280px, 320px) 1fr',
        gap: '20px',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden'
      }}
        className="storage-layout"
      >
        {/* Account List */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          background: '#12121a',
          border: '1px solid #1e1e2e',
          borderRadius: '14px',
          overflow: 'hidden',
          minHeight: 0,
          height: '100%'
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid #1e1e2e',
            background: '#0a0a0f',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ color: '#888899', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Storage Accounts ({nonPausedAccounts.length})
              </h3>
              <button
                onClick={() => setShowAccountSearch(true)}
                onMouseEnter={() => setSearchBtnHovered(true)}
                onMouseLeave={() => setSearchBtnHovered(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: searchBtnHovered ? 'rgba(0, 212, 212, 0.1)' : 'transparent',
                  color: searchBtnHovered ? '#00d4d4' : '#666677',
                  fontSize: '12px',
                  transition: 'all 0.15s'
                }}
              >
                <Search size={14} />
                All
              </button>
            </div>

            {/* Filter Tabs */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              flexWrap: 'wrap'
            }}>
              <StorageFilterTab
                label="All"
                count={nonPausedAccounts.length}
                active={accountFilter === 'all'}
                onClick={() => setAccountFilter('all')}
              />
              <StorageFilterTab
                label="Useable"
                count={useableAccountsCount}
                active={accountFilter === 'useable'}
                onClick={() => setAccountFilter('useable')}
                color="#22c55e"
              />
              <StorageFilterTab
                label="Full"
                count={fullAccountsCount}
                active={accountFilter === 'full'}
                onClick={() => setAccountFilter('full')}
                color="#ef4444"
              />
              <StorageFilterTab
                label="Empty"
                count={emptyAccountsCount}
                active={accountFilter === 'empty'}
                onClick={() => setAccountFilter('empty')}
                color="#a78bfa"
              />
            </div>
          </div>

          {/* Scrollable Account List */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px',
            minHeight: 0
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {visibleAccounts.length === 0 ? (
                <div style={{
                  padding: '24px',
                  textAlign: 'center'
                }}>
                  <p style={{ color: '#666677', fontSize: '13px' }}>
                    {accountFilter === 'all' ? 'No active accounts' : `No ${accountFilter} accounts`}
                  </p>
                </div>
              ) : (
                visibleAccounts.map((account) => (
                  <AccountButton
                    key={account.id}
                    account={account}
                    isSelected={selectedAccount?.id === account.id}
                    onClick={() => handleSelectAccount(account)}
                    isMenuOpen={accountMenuOpen === account.id}
                    onMenuToggle={() => setAccountMenuOpen(accountMenuOpen === account.id ? null : account.id)}
                    onMenuClose={() => setAccountMenuOpen(null)}
                    isSyncing={syncingAccountId === account.id}
                    isEditing={editingAccountId === account.id}
                    editingName={editingAccountId === account.id ? editingName : ''}
                    onEditingNameChange={setEditingName}
                    onStartRename={() => handleStartRename(account)}
                    onSaveRename={() => {
                      if (editingAccountId && editingName.trim()) {
                        handleRenameAccount(editingAccountId, editingName.trim());
                      } else {
                        setEditingAccountId(null);
                        setEditingName('');
                      }
                    }}
                    onCancelRename={() => { setEditingAccountId(null); setEditingName(''); }}
                    onSync={() => handleSyncStorage(account)}
                    onTogglePause={() => handleTogglePause(account)}
                    onMarkAsFull={() => handleMarkAsFull(account)}
                    onMarkAsUseable={() => handleMarkAsUseable(account)}
                    onDelete={() => { setDeleteAccountTarget(account); setShowAccountDeleteModal(true); }}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* File Browser */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', height: '100%' }}>
          {!selectedAccount ? (
            <div style={{
              background: '#12121a',
              border: '1px solid #1e1e2e',
              borderRadius: '14px',
              padding: '60px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'rgba(0, 212, 212, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <HardDrive size={28} color="#00d4d4" />
              </div>
              <h3 style={{ color: '#ffffff', fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                Select an account
              </h3>
              <p style={{ color: '#666677', fontSize: '13px' }}>
                Choose a storage account to browse its files
              </p>
            </div>
          ) : (
            <div style={{
              background: '#12121a',
              border: '1px solid #1e1e2e',
              borderRadius: '14px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0
            }}>
              {/* Account Info Bar */}
              <div style={{
                padding: '14px 16px',
                background: '#0a0a0f',
                borderBottom: '1px solid #1e1e2e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <HardDrive size={18} color="#00d4d4" />
                  <div>
                    <p style={{ color: '#ffffff', fontSize: '14px', fontWeight: 500, margin: 0 }}>
                      {selectedAccount.name || 'Unnamed'}
                    </p>
                    <p style={{ color: '#555566', fontSize: '11px', margin: 0 }}>
                      {selectedAccount.bucket_name}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: '#22c55e', fontSize: '13px', fontWeight: 600, margin: 0 }}>
                      {formatMB(selectedAccount.storage_limit_mb - selectedAccount.used_storage_mb)} free
                    </p>
                    <p style={{ color: '#555566', fontSize: '11px', margin: 0 }}>
                      of {formatMB(selectedAccount.storage_limit_mb)}
                    </p>
                  </div>
                  <div style={{ width: '60px' }}>
                    <StorageBar used={selectedAccount.used_storage_mb} limit={selectedAccount.storage_limit_mb} compact />
                  </div>
                </div>
              </div>

              {/* Toolbar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid #1e1e2e',
                gap: '12px',
                flexWrap: 'wrap',
                flexShrink: 0
              }}>
                {/* Breadcrumb */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                  {currentPath && (
                    <button
                      onClick={handleBack}
                      onMouseEnter={() => setBackHovered(true)}
                      onMouseLeave={() => setBackHovered(false)}
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        background: backHovered ? '#1e1e2e' : 'transparent',
                        color: '#888899',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s'
                      }}
                    >
                      <ArrowLeft size={16} />
                    </button>
                  )}
                  <span style={{ color: '#666677', fontSize: '13px' }}>/</span>
                  {currentPath && (
                    <span style={{
                      color: '#ffffff',
                      fontSize: '13px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {currentPath}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SearchFilesInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onClear={() => setSearchQuery('')}
                  />

                  <button
                    onClick={() => setShowUploadPanel(!showUploadPanel)}
                    onMouseEnter={() => setUploadBtnHovered(true)}
                    onMouseLeave={() => setUploadBtnHovered(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      background: showUploadPanel
                        ? 'linear-gradient(135deg, #00d4d4 0%, #00b8b8 100%)'
                        : uploadBtnHovered
                          ? 'rgba(0, 212, 212, 0.15)'
                          : 'rgba(0, 212, 212, 0.1)',
                      color: showUploadPanel ? '#000000' : '#00d4d4',
                      fontSize: '13px',
                      fontWeight: showUploadPanel ? 600 : 500,
                      transition: 'all 0.15s'
                    }}
                  >
                    <Upload size={16} />
                    <span className="hidden sm:inline">
                      Upload
                    </span>
                  </button>

                  <button
                    onClick={() => setShowCreateFolderModal(true)}
                    onMouseEnter={() => setCreateFolderHovered(true)}
                    onMouseLeave={() => setCreateFolderHovered(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      background: createFolderHovered ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                      color: createFolderHovered ? '#f59e0b' : '#666677',
                      fontSize: '13px',
                      transition: 'all 0.15s'
                    }}
                  >
                    <FolderPlus size={16} />
                    <span className="hidden sm:inline">
                      New Folder
                    </span>
                  </button>

                  <button
                    onClick={() => fetchFiles(selectedAccount, currentPath)}
                    disabled={isFetchingFiles}
                    onMouseEnter={() => setRefreshHovered(true)}
                    onMouseLeave={() => setRefreshHovered(false)}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: isFetchingFiles ? 'not-allowed' : 'pointer',
                      background: refreshHovered ? '#1e1e2e' : 'transparent',
                      color: '#888899',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s'
                    }}
                  >
                    <RefreshCw size={16} className={isFetchingFiles ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {/* File List */}
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {isFetchingFiles ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
                    <Loader2 className="animate-spin" size={24} style={{ color: '#00d4d4' }} />
                  </div>
                ) : fetchError ? (
                  <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '16px',
                      background: fetchError.errorCode === 'PROJECT_PAUSED' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px'
                    }}>
                      <AlertTriangle size={28} color={fetchError.errorCode === 'PROJECT_PAUSED' ? '#f59e0b' : '#ef4444'} />
                    </div>
                    <h3 style={{ color: fetchError.errorCode === 'PROJECT_PAUSED' ? '#f59e0b' : '#ef4444', fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                      {fetchError.message}
                    </h3>
                    {fetchError.hint && (
                      <p style={{ color: '#888899', fontSize: '13px', maxWidth: '320px', margin: '0 auto 16px' }}>
                        {fetchError.hint}
                      </p>
                    )}
                    {fetchError.errorCode === 'PROJECT_PAUSED' ? (
                      <a
                        href={selectedAccount.project_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 18px',
                          fontSize: '14px',
                          fontWeight: 600,
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          color: '#000000',
                          textDecoration: 'none'
                        }}
                      >
                        <ExternalLink size={16} />
                        Open Supabase Dashboard
                      </a>
                    ) : (
                      <button
                        onClick={() => fetchFiles(selectedAccount, currentPath)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 18px',
                          fontSize: '14px',
                          fontWeight: 500,
                          borderRadius: '10px',
                          border: '1px solid #2a2a3a',
                          cursor: 'pointer',
                          background: '#1a1a24',
                          color: '#888899'
                        }}
                      >
                        <RefreshCw size={16} />
                        Try Again
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Upload Panel (collapsible) */}
                    {showUploadPanel && (
                      <div style={{
                        padding: '16px',
                        borderBottom: filteredFiles.length > 0 ? '1px solid #1e1e2e' : 'none'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '12px'
                        }}>
                          <h3 style={{
                            color: '#ffffff',
                            fontSize: '14px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <Upload size={16} color="#00d4d4" />
                            Upload Files
                          </h3>
                          <button
                            onClick={() => setShowUploadPanel(false)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              background: 'transparent',
                              color: '#666677',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'color 0.15s'
                            }}
                          >
                            <X size={14} />
                            Close
                          </button>
                        </div>
                        <FileUploader
                          credentials={{
                            s3_endpoint: selectedAccount.s3_endpoint,
                            bucket_name: selectedAccount.bucket_name,
                            s3_access_key: selectedAccount.s3_access_key,
                            s3_secret_key: selectedAccount.s3_secret_key,
                          }}
                          destinationPath={currentPath}
                          onUploadComplete={handleUploadComplete}
                          onAllComplete={handleAllUploadsComplete}
                        />
                      </div>
                    )}

                    {/* File List or Empty State */}
                    {filteredFiles.length > 0 ? (
                      filteredFiles.map((file, index) => (
                        <FileRow
                          key={index}
                          file={file}
                          currentPath={currentPath}
                          onClick={() => file.type === "folder" && handleNavigate(file.name)}
                          onContextMenu={handleContextMenu}
                        />
                      ))
                    ) : !showUploadPanel ? (
                      <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                        <div style={{
                          width: '72px',
                          height: '72px',
                          borderRadius: '18px',
                          background: 'linear-gradient(135deg, rgba(0, 212, 212, 0.1) 0%, rgba(0, 184, 184, 0.05) 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 20px'
                        }}>
                          <CloudUpload size={32} color="#00d4d4" />
                        </div>
                        <h3 style={{ color: '#ffffff', fontSize: '17px', fontWeight: 600, marginBottom: '8px' }}>
                          {searchQuery ? 'No files match your search' : 'This folder is empty'}
                        </h3>
                        <p style={{ color: '#666677', fontSize: '13px', marginBottom: '20px' }}>
                          {searchQuery ? 'Try adjusting your search terms' : 'Drop files here or click upload to add files'}
                        </p>
                        {!searchQuery && (
                          <button
                            onClick={() => setShowUploadPanel(true)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '12px 24px',
                              borderRadius: '12px',
                              border: 'none',
                              cursor: 'pointer',
                              background: 'linear-gradient(135deg, #00d4d4 0%, #00b8b8 100%)',
                              color: '#000000',
                              fontSize: '14px',
                              fontWeight: 600,
                              boxShadow: '0 4px 20px rgba(0, 212, 212, 0.25)',
                              transition: 'all 0.2s'
                            }}
                          >
                            <Upload size={18} />
                            Upload Files
                          </button>
                        )}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <FileContextMenu
          file={contextMenu.file}
          currentPath={currentPath}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onAction={handleFileAction}
        />
      )}

      {/* Modals */}
      <AccountSearchModal
        isOpen={showAccountSearch}
        onClose={() => setShowAccountSearch(false)}
        accounts={accounts}
        onSelect={handleSelectAccount}
        selectedAccountId={selectedAccount?.id}
      />

      <FileDetailsModal
        isOpen={showFileDetails}
        onClose={() => { setShowFileDetails(false); setSelectedFileInfo(null); }}
        fileInfo={selectedFileInfo}
        fileName={selectedFileName}
        isLoading={isLoadingFileInfo}
      />

      <RenameModal
        isOpen={showRenameModal}
        onClose={() => { setShowRenameModal(false); setRenameTarget(null); }}
        currentName={renameTarget?.name || ''}
        isFolder={renameTarget?.type === 'folder'}
        onRename={handleRename}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
        itemName={deleteTarget?.name || ''}
        isFolder={deleteTarget?.type === 'folder'}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />

      <MoveFileModal
        isOpen={showMoveModal}
        onClose={() => { setShowMoveModal(false); setMoveTarget(null); }}
        fileName={moveTarget?.name || ''}
        currentPath={currentPath}
        onMove={handleMove}
      />

      <CreateFolderModal
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        onCreate={handleCreateFolder}
      />

      {/* Account Delete Confirmation Modal */}
      {showAccountDeleteModal && deleteAccountTarget && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              zIndex: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => { setShowAccountDeleteModal(false); setDeleteAccountTarget(null); }}
          >
            <div
              style={{
                background: '#12121a',
                border: '1px solid #1e1e2e',
                borderRadius: '16px',
                padding: '24px',
                maxWidth: '400px',
                width: '90%'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Trash2 size={28} color="#ef4444" />
              </div>

              <h3 style={{
                color: '#ffffff',
                fontSize: '18px',
                fontWeight: 600,
                textAlign: 'center',
                marginBottom: '8px'
              }}>
                Delete Account?
              </h3>

              <p style={{
                color: '#888899',
                fontSize: '14px',
                textAlign: 'center',
                marginBottom: '24px'
              }}>
                Are you sure you want to delete <strong style={{ color: '#ffffff' }}>{deleteAccountTarget.name || 'this account'}</strong>?
                This will only remove it from this app, not from Supabase.
              </p>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => { setShowAccountDeleteModal(false); setDeleteAccountTarget(null); }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #2a2a3a',
                    cursor: 'pointer',
                    background: 'transparent',
                    color: '#888899',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: isDeletingAccount ? 'not-allowed' : 'pointer',
                    background: isDeletingAccount ? 'rgba(239, 68, 68, 0.3)' : '#ef4444',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {isDeletingAccount && <Loader2 size={16} className="animate-spin" />}
                  {isDeletingAccount ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
