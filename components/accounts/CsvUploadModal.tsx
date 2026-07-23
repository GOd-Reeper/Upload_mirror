"use client";

import { useState, useRef } from "react";
import { Upload, FileDown, X, CheckCircle2, AlertTriangle, Loader2, Download } from "lucide-react";
import { AccountFormData } from "./AccountForm";
import { formatMB } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

interface CsvUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (accounts: AccountFormData[]) => Promise<void>;
}

interface ParsedAccount extends AccountFormData {
    id: string; // Temp ID for selection
    selected: boolean;
    isValid: boolean;
    errors: string[];
}

export function CsvUploadModal({ isOpen, onClose, onImport }: CsvUploadModalProps) {
    const [step, setStep] = useState<'upload' | 'preview'>('upload');
    const [parsedAccounts, setParsedAccounts] = useState<ParsedAccount[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { addToast } = useToast();

    if (!isOpen) return null;

    const downloadTemplate = () => {
        const headers = ["email", "bucket_name", "s3_endpoint", "s3_access_key", "s3_secret_key"];
        const example = ["my-account", "my-bucket", "https://<project_id>.storage.supabase.co/storage/v1/s3", "access_key_here", "secret_key_here"];
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), example.join(",")].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "accounts_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            parseCsv(text);
        };
        reader.readAsText(file);
    };

    const parseCsv = (text: string) => {
        try {
            const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
            if (lines.length < 2) {
                addToast("error", "CSV file is empty or missing headers");
                return;
            }

            const headers = lines[0].split(",").map(h => h.trim().toLowerCase());

            // Determine column indices
            const colMap = {
                name: headers.indexOf("email"), // Mapping 'email' to 'name'
                bucket: headers.indexOf("bucket_name"),
                endpoint: headers.indexOf("s3_endpoint"),
                access: headers.indexOf("s3_access_key"),
                secret: headers.indexOf("s3_secret_key"),
            };

            if (Object.values(colMap).some(idx => idx === -1)) {
                addToast("error", "Missing required columns in CSV");
                return;
            }

            const accounts: ParsedAccount[] = [];

            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(",").map(c => c.trim());
                if (cols.length < headers.length) continue; // Skip malformed rows

                const s3Endpoint = cols[colMap.endpoint] || "";
                // Auto-derive project URL: remove '/storage/v1/s3' suffix
                const projectUrl = s3Endpoint.replace(/\/storage\/v1\/s3\/?$/, "");

                const validationErrors: string[] = [];
                if (!cols[colMap.name]) validationErrors.push("Missing name/email");
                if (!cols[colMap.bucket]) validationErrors.push("Missing bucket");
                if (!s3Endpoint) validationErrors.push("Missing endpoint");
                if (!cols[colMap.access]) validationErrors.push("Missing access key");

                accounts.push({
                    id: Math.random().toString(36).substr(2, 9),
                    name: cols[colMap.name],
                    bucket_name: cols[colMap.bucket],
                    s3_endpoint: s3Endpoint,
                    project_url: projectUrl,
                    s3_access_key: cols[colMap.access],
                    s3_secret_key: cols[colMap.secret],
                    service_role_key: "", // Optional
                    storage_limit_mb: 1024, // Default
                    is_active: true,
                    selected: validationErrors.length === 0,
                    isValid: validationErrors.length === 0,
                    errors: validationErrors
                });
            }

            if (accounts.length === 0) {
                addToast("error", "No valid accounts found in CSV");
                return;
            }

            setParsedAccounts(accounts);
            setStep('preview');
        } catch (error) {
            console.error("CSV Parse Error:", error);
            addToast("error", "Failed to parse CSV file");
        }
    };

    const toggleSelection = (id: string) => {
        setParsedAccounts(prev => prev.map(acc =>
            acc.id === id ? { ...acc, selected: !acc.selected } : acc
        ));
    };

    const toggleAll = () => {
        const allSelected = parsedAccounts.every(acc => acc.selected || !acc.isValid);
        setParsedAccounts(prev => prev.map(acc => ({
            ...acc,
            selected: acc.isValid ? !allSelected : false
        })));
    };

    const handleImport = async () => {
        const selected = parsedAccounts.filter(acc => acc.selected);
        if (selected.length === 0) return;

        setIsProcessing(true);
        try {
            await onImport(selected);
            onClose();
            // Reset state
            setStep('upload');
            setParsedAccounts([]);
        } catch (error) {
            console.error("Import failed", error);
        } finally {
            setIsProcessing(false);
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
            padding: '16px'
        }}>
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(4px)'
                }}
            />
            <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: step === 'preview' ? '800px' : '500px',
                background: '#12121a',
                border: '1px solid #1e1e2e',
                borderRadius: '16px',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '85vh'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #1e1e2e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div>
                        <h2 style={{ color: '#ffffff', fontSize: '18px', fontWeight: 600, margin: 0 }}>Import Accounts</h2>
                        <p style={{ color: '#666677', fontSize: '13px', margin: '4px 0 0 0' }}>
                            {step === 'upload' ? 'Upload a CSV file to bulk add accounts' : 'Review and select accounts to import'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            background: 'transparent',
                            color: '#666677'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                    {step === 'upload' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    width: '100%',
                                    border: '2px dashed #1e1e2e',
                                    borderRadius: '12px',
                                    padding: '40px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '12px',
                                    cursor: 'pointer',
                                    background: 'rgba(255, 255, 255, 0.01)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#00d4d4';
                                    e.currentTarget.style.background = 'rgba(0, 212, 212, 0.02)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = '#1e1e2e';
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)';
                                }}
                            >
                                <div style={{
                                    padding: '16px',
                                    background: 'rgba(0, 212, 212, 0.1)',
                                    borderRadius: '50%',
                                    color: '#00d4d4'
                                }}>
                                    <Upload size={32} />
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ color: '#ffffff', fontWeight: 500, margin: '0 0 4px 0' }}>Click to upload CSV</p>
                                    <p style={{ color: '#666677', fontSize: '13px', margin: 0 }}>or drag and drop file here</p>
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept=".csv"
                                    onChange={handleFileUpload}
                                    style={{ display: 'none' }}
                                />
                            </div>

                            <button
                                onClick={downloadTemplate}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    color: '#00d4d4',
                                    background: 'transparent',
                                    border: 'none',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    fontWeight: 500
                                }}
                            >
                                <Download size={16} />
                                Download CSV Template
                            </button>
                        </div>
                    ) : (
                        <div>
                            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <p style={{ color: '#888899', fontSize: '13px' }}>
                                    Found {parsedAccounts.length} accounts. Select the ones you want to import.
                                </p>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => { setStep('upload'); setParsedAccounts([]); }}
                                        style={{
                                            background: 'transparent',
                                            border: '1px solid #1e1e2e',
                                            color: '#888899',
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Upload Different File
                                    </button>
                                </div>
                            </div>

                            <div style={{
                                border: '1px solid #1e1e2e',
                                borderRadius: '8px',
                                overflow: 'hidden'
                            }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead style={{ background: '#0a0a0f' }}>
                                        <tr>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', width: '40px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={parsedAccounts.every(a => a.selected || !a.isValid)}
                                                    onChange={toggleAll}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                            </th>
                                            <th style={{ padding: '12px', textAlign: 'left', color: '#666677', fontWeight: 500 }}>Name</th>
                                            <th style={{ padding: '12px', textAlign: 'left', color: '#666677', fontWeight: 500 }}>Bucket</th>
                                            <th style={{ padding: '12px', textAlign: 'left', color: '#666677', fontWeight: 500 }}>Project URL</th>
                                            <th style={{ padding: '12px', textAlign: 'left', color: '#666677', fontWeight: 500 }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedAccounts.map((acc, i) => (
                                            <tr key={acc.id} style={{ borderTop: '1px solid #1e1e2e', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={acc.selected}
                                                        onChange={() => toggleSelection(acc.id)}
                                                        disabled={!acc.isValid}
                                                        style={{ cursor: acc.isValid ? 'pointer' : 'not-allowed' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '12px', color: '#ffffff' }}>{acc.name}</td>
                                                <td style={{ padding: '12px', color: '#888899' }}>{acc.bucket_name}</td>
                                                <td style={{ padding: '12px', color: '#888899' }}>{acc.project_url}</td>
                                                <td style={{ padding: '12px' }}>
                                                    {acc.isValid ? (
                                                        <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <CheckCircle2 size={14} /> Valid
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }} title={acc.errors.join(", ")}>
                                                            <AlertTriangle size={14} /> Invalid
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === 'preview' && (
                    <div style={{
                        padding: '20px 24px',
                        borderTop: '1px solid #1e1e2e',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '12px'
                    }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'transparent',
                                color: '#666677',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={isProcessing || parsedAccounts.filter(a => a.selected).length === 0}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                background: isProcessing ? '#1e1e2e' : '#00d4d4',
                                color: isProcessing ? '#666677' : '#000000',
                                cursor: isProcessing ? 'not-allowed' : 'pointer',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                opacity: parsedAccounts.filter(a => a.selected).length === 0 ? 0.5 : 1
                            }}
                        >
                            {isProcessing && <Loader2 size={16} className="animate-spin" />}
                            Import {parsedAccounts.filter(a => a.selected).length} Accounts
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
