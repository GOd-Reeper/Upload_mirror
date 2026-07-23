"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { formatBytes } from "@/lib/utils";
import { 
  Upload, 
  FolderOpen, 
  FileVideo, 
  FileAudio, 
  ChevronRight,
  HardDrive,
  Play,
  AlertCircle,
  Loader2
} from "lucide-react";

interface FolderInfo {
  name: string;
  size: number;
  fileCount: number;
  type: "video" | "audio_subs" | "other";
}

interface ScanResult {
  episodeName: string;
  totalSize: number;
  folders: FolderInfo[];
}

function PrimaryButton({ children, onClick, disabled = false, loading = false }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean }) {
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
        padding: '12px 20px',
        fontSize: '14px',
        fontWeight: 600,
        borderRadius: '12px',
        border: 'none',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        background: hovered && !disabled ? 'linear-gradient(135deg, #00e8e8 0%, #00d4d4 100%)' : 'linear-gradient(135deg, #00d4d4 0%, #00b8b8 100%)',
        color: '#000000',
        transition: 'all 0.2s',
        boxShadow: hovered && !disabled ? '0 0 25px rgba(0, 212, 212, 0.4)' : '0 4px 12px rgba(0, 212, 212, 0.2)',
        opacity: disabled || loading ? 0.6 : 1
      }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : children}
    </button>
  );
}

function FolderCard({ folder }: { folder: FolderInfo }) {
  const [hovered, setHovered] = useState(false);
  const isVideo = folder.type === "video";
  const iconBg = isVideo ? 'rgba(59, 130, 246, 0.12)' : 'rgba(34, 197, 94, 0.12)';
  const iconColor = isVideo ? '#3b82f6' : '#22c55e';
  
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#14141c' : '#12121a',
        border: hovered ? '1px solid rgba(0, 212, 212, 0.2)' : '1px solid #1e1e2e',
        borderRadius: '14px',
        padding: '16px',
        transition: 'all 0.2s'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {isVideo ? <FileVideo size={22} color={iconColor} /> : <FileAudio size={22} color={iconColor} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h4 style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600 }}>
              {folder.name}/
            </h4>
            <span style={{
              padding: '2px 8px',
              borderRadius: '6px',
              background: iconBg,
              color: iconColor,
              fontSize: '11px',
              fontWeight: 500
            }}>
              {isVideo ? `${folder.name}p` : 'Audio/Subs'}
            </span>
          </div>
          <p style={{ color: '#666677', fontSize: '13px' }}>
            {folder.fileCount} files • {formatBytes(folder.size)}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#444455' }}>
          <HardDrive size={16} />
          <ChevronRight size={16} style={{ 
            transition: 'transform 0.2s',
            transform: hovered ? 'translateX(4px)' : 'none'
          }} />
        </div>
      </div>
    </div>
  );
}

export default function UploadPage() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const { addToast } = useToast();

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsScanning(true);

    try {
      const folderMap = new Map<string, { size: number; count: number }>();
      let episodeName = "";

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const pathParts = file.webkitRelativePath.split("/");
        
        if (!episodeName && pathParts.length > 0) {
          episodeName = pathParts[0];
        }

        if (pathParts.length >= 2) {
          const folderName = pathParts[1];
          if (folderName.endsWith(".m3u8")) continue;

          const existing = folderMap.get(folderName) || { size: 0, count: 0 };
          folderMap.set(folderName, {
            size: existing.size + file.size,
            count: existing.count + 1,
          });
        }
      }

      const folders: FolderInfo[] = [];
      let totalSize = 0;

      folderMap.forEach((info, name) => {
        const type = name === "aud-sbs" || name.startsWith("audio") 
          ? "audio_subs" 
          : /^\d+$/.test(name) ? "video" : "other";
        
        folders.push({ name, size: info.size, fileCount: info.count, type });
        totalSize += info.size;
      });

      folders.sort((a, b) => b.size - a.size);
      setScanResult({ episodeName, totalSize, folders });
      addToast("success", `Scanned ${folders.length} folders`);
    } catch (error) {
      console.error("Scan error:", error);
      addToast("error", "Failed to scan folder");
    } finally {
      setIsScanning(false);
    }
  };

  const handleUpload = () => {
    addToast("info", "Upload functionality coming soon!");
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h1 style={{ color: '#ffffff', fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>
          Upload Content
        </h1>
        <p style={{ color: '#666677', fontSize: '14px' }}>
          Select an episode folder to upload to distributed storage
        </p>
      </div>

      {/* Upload Section */}
      <div style={{
        background: '#12121a',
        border: '1px solid #1e1e2e',
        borderRadius: '16px',
        padding: '40px 24px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '18px',
          background: 'rgba(0, 212, 212, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <FolderOpen size={32} color="#00d4d4" />
        </div>
        
        <h3 style={{ color: '#ffffff', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
          Select Episode Folder
        </h3>
        <p style={{ color: '#666677', fontSize: '14px', maxWidth: '400px', margin: '0 auto 24px', lineHeight: 1.6 }}>
          Choose a folder containing HLS quality variants (1080, 720, 480, etc.) and audio/subtitles.
        </p>

        <label style={{ cursor: 'pointer', display: 'inline-block' }}>
          <input
            type="file"
            // @ts-expect-error - webkitdirectory is a non-standard attribute
            webkitdirectory="true"
            directory="true"
            multiple
            onChange={handleFolderSelect}
            style={{ display: 'none' }}
          />
          <PrimaryButton loading={isScanning}>
            <Upload size={18} />
            {isScanning ? "Scanning..." : "Select Folder"}
          </PrimaryButton>
        </label>

        <p style={{ color: '#555566', fontSize: '12px', marginTop: '16px' }}>
          Example: Chainsaw_Man/EP01/
        </p>
      </div>

      {/* Scan Results */}
      {scanResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Episode Info */}
          <div style={{
            background: '#12121a',
            border: '1px solid #1e1e2e',
            borderRadius: '14px',
            padding: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <h3 style={{ color: '#ffffff', fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                {scanResult.episodeName}
              </h3>
              <p style={{ color: '#666677', fontSize: '13px' }}>
                {scanResult.folders.length} folders • {formatBytes(scanResult.totalSize)} total
              </p>
            </div>
            <PrimaryButton onClick={handleUpload}>
              <Play size={16} />
              Start Upload
            </PrimaryButton>
          </div>

          {/* Folder Allocation */}
          <div>
            <h3 style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600, marginBottom: '14px' }}>
              Folder Allocation Preview
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {scanResult.folders.map((folder) => (
                <FolderCard key={folder.name} folder={folder} />
              ))}
            </div>
          </div>

          {/* Info Notice */}
          <div style={{
            background: 'rgba(0, 212, 212, 0.05)',
            border: '1px solid rgba(0, 212, 212, 0.15)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <AlertCircle size={20} color="#00d4d4" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ color: '#ffffff', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                Allocation Algorithm
              </h4>
              <p style={{ color: '#888899', fontSize: '13px', lineHeight: 1.5 }}>
                Folders will be distributed across your storage accounts using bin-packing to maximize storage utilization. Larger folders are allocated first.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
