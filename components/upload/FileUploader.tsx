"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { 
  Upload, 
  X, 
  File, 
  FileVideo, 
  FileAudio, 
  Folder,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CloudUpload,
  ArrowUp,
  FolderOpen,
  Zap,
  Clock,
  Files,
  Pause,
  Play,
  RotateCcw
} from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { 
  UploadProgress, 
  BulkUploadProgress,
  UploadResult, 
  S3Credentials,
  FileWithPath,
  BulkUploadManager,
  processDroppedItems,
  processFileInput,
  formatUploadSpeed,
  formatRemainingTime,
  formatFileCount,
} from "@/lib/upload-service";

interface FileUploaderProps {
  credentials: S3Credentials;
  destinationPath: string;
  onUploadComplete?: (result: UploadResult) => void;
  onAllComplete?: (results: UploadResult[]) => void;
}

// Get file icon based on type
function getFileIcon(fileName: string, mimeType?: string) {
  const type = mimeType || '';
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  if (type.startsWith('video/') || ['mp4', 'mkv', 'avi', 'mov', 'ts', 'm3u8'].includes(ext || '')) {
    return <FileVideo size={16} color="#3b82f6" />;
  }
  if (type.startsWith('audio/') || ['mp3', 'wav', 'aac', 'flac', 'm4a'].includes(ext || '')) {
    return <FileAudio size={16} color="#22c55e" />;
  }
  return <File size={16} color="#666677" />;
}

// Compact Progress Bar
function CompactProgressBar({ percentage, status }: { percentage: number; status: string }) {
  const isActive = status === 'uploading';
  
  return (
    <div style={{
      height: '3px',
      background: '#1a1a24',
      borderRadius: '2px',
      overflow: 'hidden',
      width: '100%'
    }}>
      <div 
        className={isActive ? 'progress-stripe' : ''}
        style={{
          width: `${percentage}%`,
          height: '100%',
          background: status === 'completed' 
            ? '#22c55e' 
            : status === 'failed' 
              ? '#ef4444'
              : 'linear-gradient(90deg, #00d4d4, #00e8e8)',
          borderRadius: '2px',
          transition: 'width 0.2s ease'
        }} 
      />
    </div>
  );
}

// Bulk Progress Header
function BulkProgressHeader({ 
  progress, 
  onPause, 
  onResume,
  onRetry
}: { 
  progress: BulkUploadProgress;
  onPause: () => void;
  onResume: () => void;
  onRetry: () => void;
}) {
  const isUploading = progress.status === 'uploading';
  const isPaused = progress.status === 'paused';
  const isCompleted = progress.status === 'completed';
  const hasFailed = progress.failedFiles > 0;
  
  // Determine icon and colors based on status
  const getStatusIcon = () => {
    if (isUploading) return <Loader2 size={22} color="#000" className="animate-spin" />;
    if (isPaused) return <Pause size={22} color="#f59e0b" />;
    if (isCompleted) return <CheckCircle2 size={22} color="#fff" />;
    return <CloudUpload size={22} color="#666" />;
  };
  
  const getStatusBackground = () => {
    if (isUploading) return 'linear-gradient(135deg, #00d4d4 0%, #00b8b8 100%)';
    if (isPaused) return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
    if (isCompleted) return 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
    return '#1e1e2e';
  };
  
  const getStatusText = () => {
    if (isCompleted) return 'Upload Complete!';
    if (isPaused) return 'Paused';
    if (isUploading) return 'Uploading...';
    return 'Ready to Upload';
  };
  
  return (
    <div style={{
      padding: '16px',
      background: isPaused 
        ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.04) 100%)'
        : 'linear-gradient(135deg, rgba(0, 212, 212, 0.08) 0%, rgba(0, 184, 184, 0.04) 100%)',
      borderBottom: `1px solid ${isPaused ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0, 212, 212, 0.15)'}`,
      borderRadius: '12px 12px 0 0'
    }}>
      {/* Main Stats */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: getStatusBackground(),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isUploading ? '0 4px 20px rgba(0, 212, 212, 0.3)' : 
                       isPaused ? '0 4px 20px rgba(245, 158, 11, 0.3)' : 'none'
          }}>
            {getStatusIcon()}
          </div>
          <div>
            <p style={{ 
              color: isPaused ? '#f59e0b' : '#fff', 
              fontSize: '16px', 
              fontWeight: 600, 
              margin: 0 
            }}>
              {getStatusText()}
            </p>
            <p style={{ color: '#888899', fontSize: '13px', margin: 0 }}>
              {formatFileCount(progress.completedFiles)} of {formatFileCount(progress.totalFiles)} files
              {progress.failedFiles > 0 && (
                <span style={{ color: '#ef4444' }}> • {progress.failedFiles} failed</span>
              )}
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Pause/Resume Button */}
          {(isUploading || isPaused) && (
            <button
              onClick={isPaused ? onResume : onPause}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: isPaused 
                  ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                  : 'rgba(245, 158, 11, 0.15)',
                color: isPaused ? '#ffffff' : '#f59e0b',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.15s'
              }}
            >
              {isPaused ? (
                <>
                  <Play size={16} />
                  Resume
                </>
              ) : (
                <>
                  <Pause size={16} />
                  Pause
                </>
              )}
            </button>
          )}
          
          {/* Retry Failed Button */}
          {hasFailed && !isUploading && (
            <button
              onClick={onRetry}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.15s'
              }}
            >
              <RotateCcw size={16} />
              Retry Failed
            </button>
          )}
          
          <div style={{ textAlign: 'right' }}>
            <p style={{ 
              color: isPaused ? '#f59e0b' : '#00d4d4', 
              fontSize: '24px', 
              fontWeight: 700, 
              margin: 0,
              fontFamily: 'var(--font-mono)'
            }}>
              {progress.percentage}%
            </p>
            {isUploading && (
              <p style={{ color: '#888899', fontSize: '12px', margin: 0 }}>
                {formatUploadSpeed(progress.speed)}
              </p>
            )}
            {isPaused && (
              <p style={{ color: '#f59e0b', fontSize: '12px', margin: 0 }}>
                Click Resume
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{
        height: '8px',
        background: '#1a1a24',
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: '12px'
      }}>
        <div 
          className={isUploading ? 'progress-stripe' : ''}
          style={{
            width: `${progress.percentage}%`,
            height: '100%',
            background: isCompleted
              ? 'linear-gradient(90deg, #22c55e, #16a34a)'
              : isPaused
                ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                : 'linear-gradient(90deg, #00d4d4, #00e8e8)',
            borderRadius: '4px',
            transition: 'width 0.3s ease'
          }} 
        />
      </div>

      {/* Stats Row */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '12px',
        fontSize: '12px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#666677', margin: '0 0 2px 0' }}>
            <Files size={12} style={{ display: 'inline', marginRight: '4px' }} />
            Files
          </p>
          <p style={{ color: '#fff', fontWeight: 600, margin: 0 }}>
            {formatFileCount(progress.totalFiles)}
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#666677', margin: '0 0 2px 0' }}>
            <Zap size={12} style={{ display: 'inline', marginRight: '4px' }} />
            Speed
          </p>
          <p style={{ color: '#00d4d4', fontWeight: 600, margin: 0 }}>
            {isUploading ? formatUploadSpeed(progress.speed) : '—'}
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#666677', margin: '0 0 2px 0' }}>
            <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
            ETA
          </p>
          <p style={{ color: '#fff', fontWeight: 600, margin: 0 }}>
            {isUploading ? formatRemainingTime(progress.remainingTime) : '—'}
          </p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#666677', margin: '0 0 2px 0' }}>Size</p>
          <p style={{ color: '#fff', fontWeight: 600, margin: 0 }}>
            {formatBytes(progress.uploadedBytes)} / {formatBytes(progress.totalBytes)}
          </p>
        </div>
      </div>
    </div>
  );
}

// Compact File Row for thousands of files
function CompactFileRow({ 
  id,
  progress,
}: { 
  id: string;
  progress: UploadProgress;
}) {
  const statusColors = {
    pending: '#666677',
    uploading: '#00d4d4',
    paused: '#f59e0b',
    completed: '#22c55e',
    failed: '#ef4444',
    cancelled: '#666677',
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 12px',
      borderBottom: '1px solid #1a1a24',
      fontSize: '12px'
    }}>
      {/* Status Indicator */}
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: statusColors[progress.status],
        flexShrink: 0
      }} />
      
      {/* File Icon */}
      {getFileIcon(progress.fileName)}
      
      {/* File Name & Path */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          color: '#fff',
          fontSize: '12px',
          margin: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {progress.relativePath || progress.fileName}
        </p>
      </div>
      
      {/* Size */}
      <span style={{ color: '#666677', fontSize: '11px', flexShrink: 0 }}>
        {formatBytes(progress.fileSize)}
      </span>
      
      {/* Progress or Status */}
      <div style={{ width: '60px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        {progress.status === 'uploading' ? (
          <CompactProgressBar percentage={progress.percentage} status={progress.status} />
        ) : progress.status === 'completed' ? (
          <CheckCircle2 size={14} color="#22c55e" />
        ) : progress.status === 'failed' ? (
          <AlertCircle size={14} color="#ef4444" />
        ) : progress.status === 'paused' ? (
          <span style={{ color: '#f59e0b', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Pause size={12} />
            Paused
          </span>
        ) : (
          <span style={{ color: '#666677', fontSize: '11px' }}>Queued</span>
        )}
      </div>
    </div>
  );
}

export default function FileUploader({ 
  credentials, 
  destinationPath,
  onUploadComplete,
  onAllComplete 
}: FileUploaderProps) {
  const [files, setFiles] = useState<FileWithPath[]>([]);
  const [fileProgress, setFileProgress] = useState<Map<string, UploadProgress>>(new Map());
  const [bulkProgress, setBulkProgress] = useState<BulkUploadProgress>({
    totalFiles: 0,
    completedFiles: 0,
    failedFiles: 0,
    totalBytes: 0,
    uploadedBytes: 0,
    percentage: 0,
    speed: 0,
    remainingTime: 0,
    status: 'idle',
    currentBatch: 0,
    totalBatches: 0,
  });
  const [isDragOver, setIsDragOver] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showAllFiles, setShowAllFiles] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const uploadManagerRef = useRef<BulkUploadManager | null>(null);
  
  // Use refs for callbacks to avoid recreating the upload manager on every render
  const onUploadCompleteRef = useRef(onUploadComplete);
  const onAllCompleteRef = useRef(onAllComplete);
  
  // Keep refs in sync with props
  useEffect(() => {
    onUploadCompleteRef.current = onUploadComplete;
    onAllCompleteRef.current = onAllComplete;
  }, [onUploadComplete, onAllComplete]);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize upload manager - only once on mount
  useEffect(() => {
    uploadManagerRef.current = new BulkUploadManager({
      concurrentUploads: 10,
      batchSize: 10,
      maxRetries: 3,
      onFileProgress: (fileId, progress) => {
        setFileProgress(prev => {
          const newMap = new Map(prev);
          newMap.set(fileId, progress);
          return newMap;
        });
      },
      onBulkProgress: (progress) => {
        setBulkProgress(progress);
      },
      onFileComplete: (result) => {
        onUploadCompleteRef.current?.(result);
      },
      onAllComplete: (results) => {
        onAllCompleteRef.current?.(results);
      },
    });

    return () => {
      uploadManagerRef.current?.cancel();
    };
  }, []); // Empty deps - only run once on mount

  // Add files to queue
  const addFiles = useCallback((newFiles: FileWithPath[]) => {
    setFiles(prev => [...prev, ...newFiles]);
    uploadManagerRef.current?.addFiles(newFiles);
    
    // Update file progress map
    setFileProgress(prev => {
      const newMap = new Map(prev);
      for (const f of newFiles) {
        newMap.set(f.id, {
          fileName: f.file.name,
          fileSize: f.file.size,
          bytesUploaded: 0,
          percentage: 0,
          speed: 0,
          remainingTime: 0,
          status: 'pending',
          relativePath: f.relativePath,
        });
      }
      return newMap;
    });
  }, []);

  // Start upload
  const startUpload = useCallback(async () => {
    if (!uploadManagerRef.current) return;
    await uploadManagerRef.current.startUpload(credentials, destinationPath);
  }, [credentials, destinationPath]);

  // Pause upload
  const pauseUpload = useCallback(() => {
    uploadManagerRef.current?.pause();
  }, []);

  // Resume upload
  const resumeUpload = useCallback(async () => {
    if (!uploadManagerRef.current) return;
    await uploadManagerRef.current.resume();
  }, []);

  // Retry failed uploads
  const retryFailed = useCallback(async () => {
    if (!uploadManagerRef.current) return;
    // Resume will retry any pending files
    await uploadManagerRef.current.resume();
  }, []);

  // Cancel upload
  const cancelUpload = useCallback(() => {
    uploadManagerRef.current?.cancel();
    setFiles([]);
    setFileProgress(new Map());
    setBulkProgress({
      totalFiles: 0,
      completedFiles: 0,
      failedFiles: 0,
      totalBytes: 0,
      uploadedBytes: 0,
      percentage: 0,
      speed: 0,
      remainingTime: 0,
      status: 'idle',
      currentBatch: 0,
      totalBatches: 0,
    });
  }, []);

  // Clear completed
  const clearCompleted = useCallback(() => {
    uploadManagerRef.current?.clearCompleted();
    setFileProgress(prev => {
      const newMap = new Map(prev);
      newMap.forEach((progress, id) => {
        if (progress.status === 'completed') {
          newMap.delete(id);
        }
      });
      return newMap;
    });
    setFiles(prev => prev.filter(f => {
      const progress = fileProgress.get(f.id);
      return progress?.status !== 'completed';
    }));
  }, [fileProgress]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const filesWithPaths = await processDroppedItems(e.dataTransfer);
    if (filesWithPaths.length > 0) {
      addFiles(filesWithPaths);
    }
  }, [addFiles]);

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesWithPaths = processFileInput(e.target.files, true);
      addFiles(filesWithPaths);
      e.target.value = ''; // Reset input
    }
  }, [addFiles]);

  // Computed values
  const hasFiles = files.length > 0;
  const isUploading = bulkProgress.status === 'uploading';
  const isPaused = bulkProgress.status === 'paused';
  const isCompleted = bulkProgress.status === 'completed';
  const canStartUpload = hasFiles && !isUploading && !isPaused && bulkProgress.completedFiles < files.length;

  // Get visible files (limit for performance)
  const visibleFiles = useMemo(() => {
    const entries = Array.from(fileProgress.entries());
    if (showAllFiles) return entries;
    return entries.slice(0, 50);
  }, [fileProgress, showAllFiles]);

  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);
  const folderCount = new Set(files.map(f => {
    const parts = f.relativePath.split('/');
    return parts.length > 1 ? parts[0] : null;
  }).filter(Boolean)).size;

  return (
    <div style={{ 
      background: '#12121a', 
      border: '1px solid #1e1e2e', 
      borderRadius: '16px',
      overflow: 'hidden'
    }}>
      {/* Bulk Progress Header (when files are queued) */}
      {hasFiles && (
        <BulkProgressHeader 
          progress={bulkProgress} 
          onPause={pauseUpload}
          onResume={resumeUpload}
          onRetry={retryFailed}
        />
      )}

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        style={{
          padding: hasFiles ? '20px' : '40px 24px',
          textAlign: 'center',
          cursor: isUploading ? 'default' : 'pointer',
          background: isDragOver 
            ? 'linear-gradient(135deg, rgba(0, 212, 212, 0.15) 0%, rgba(0, 232, 232, 0.08) 100%)'
            : 'transparent',
          borderBottom: hasFiles ? '1px solid #1e1e2e' : 'none',
          transition: 'all 0.2s',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Animated border on drag */}
        {isDragOver && (
          <div style={{
            position: 'absolute',
            inset: '8px',
            border: '2px dashed #00d4d4',
            borderRadius: '12px',
            pointerEvents: 'none',
            animation: 'pulse-accent 1.5s infinite'
          }} />
        )}
        
        <div style={{
          width: hasFiles ? '40px' : '64px',
          height: hasFiles ? '40px' : '64px',
          borderRadius: hasFiles ? '10px' : '16px',
          background: isDragOver 
            ? 'linear-gradient(135deg, rgba(0, 212, 212, 0.25) 0%, rgba(0, 212, 212, 0.15) 100%)'
            : 'linear-gradient(135deg, rgba(0, 212, 212, 0.1) 0%, rgba(0, 184, 184, 0.05) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
          marginBottom: hasFiles ? '10px' : '16px',
          transition: 'all 0.2s',
          transform: isDragOver ? 'scale(1.1)' : 'scale(1)'
        }}>
          <CloudUpload 
            size={hasFiles ? 20 : 28} 
            color="#00d4d4" 
            style={{ 
              transition: 'all 0.2s',
              transform: isDragOver ? 'translateY(-2px)' : 'translateY(0)'
            }} 
          />
        </div>
        
        <h3 style={{ 
          color: isDragOver ? '#00d4d4' : '#ffffff', 
          fontSize: hasFiles ? '14px' : '16px', 
          fontWeight: 600, 
          marginBottom: '6px',
          transition: 'color 0.2s'
        }}>
          {isDragOver ? 'Drop files or folders here' : hasFiles ? 'Add more files' : 'Drag & drop files or folders'}
        </h3>
        <p style={{ 
          color: '#666677', 
          fontSize: '12px',
          marginBottom: hasFiles ? '0' : '16px'
        }}>
          {hasFiles 
            ? `${files.length.toLocaleString()} files • ${formatBytes(totalSize)}${folderCount > 0 ? ` • ${folderCount} folder${folderCount > 1 ? 's' : ''}` : ''}`
            : 'Supports 10,000+ files • Preserves folder structure'}
        </p>
        
        {!hasFiles && (
          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            justifyContent: 'center', 
            marginTop: '16px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid #2a2a3a',
                background: 'rgba(255, 255, 255, 0.02)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <Upload size={16} />
              Select Files
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                folderInputRef.current?.click();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(0, 212, 212, 0.3)',
                background: 'rgba(0, 212, 212, 0.08)',
                color: '#00d4d4',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <FolderOpen size={16} />
              Select Folder
            </button>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-expect-error webkitdirectory is not in the type definition
          webkitdirectory=""
          multiple
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
      </div>

      {/* Action Bar */}
      {hasFiles && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '10px 12px' : '12px 16px',
          background: '#0a0a0f',
          borderBottom: '1px solid #1e1e2e',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {bulkProgress.completedFiles > 0 && (
              <button
                onClick={clearCompleted}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'rgba(34, 197, 94, 0.1)',
                  color: '#22c55e',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <CheckCircle2 size={12} />
                Clear {bulkProgress.completedFiles} done
              </button>
            )}
            {!isUploading && (
              <button
                onClick={cancelUpload}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'transparent',
                  color: '#666677',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Clear All
              </button>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {(isUploading || isPaused) && (
              <button
                onClick={cancelUpload}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <X size={14} />
                Cancel
              </button>
            )}
            {isPaused && (
              <button
                onClick={resumeUpload}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: isMobile ? '8px 14px' : '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: '0 4px 20px rgba(34, 197, 94, 0.3)'
                }}
              >
                <Play size={16} />
                {isMobile ? 'Resume' : 'Resume Upload'}
              </button>
            )}
            {canStartUpload && (
              <button
                onClick={startUpload}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: isMobile ? '8px 14px' : '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #00d4d4 0%, #00b8b8 100%)',
                  color: '#000000',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: '0 4px 20px rgba(0, 212, 212, 0.3)'
                }}
              >
                <ArrowUp size={16} />
                {isMobile ? 'Upload' : `Upload ${files.length.toLocaleString()} Files`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* File List */}
      {hasFiles && (
        <div style={{ 
          maxHeight: '300px', 
          overflowY: 'auto',
          background: '#0d0d12'
        }}>
          {visibleFiles.map(([id, progress]) => (
            <CompactFileRow
              key={id}
              id={id}
              progress={progress}
            />
          ))}
          
          {/* Show more button */}
          {fileProgress.size > 50 && !showAllFiles && (
            <button
              onClick={() => setShowAllFiles(true)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#1a1a24',
                border: 'none',
                color: '#00d4d4',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              Show all {fileProgress.size.toLocaleString()} files
            </button>
          )}
          
          {showAllFiles && fileProgress.size > 50 && (
            <button
              onClick={() => setShowAllFiles(false)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#1a1a24',
                border: 'none',
                color: '#666677',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Show less
            </button>
          )}
        </div>
      )}
    </div>
  );
}
