"use client";

import { useState } from "react";
import { SupabaseAccount } from "@/lib/supabase";
import { RefreshCw, CheckCircle, XCircle, Database, Key, Settings, Loader2, Eye, EyeOff } from "lucide-react";

interface AccountFormProps {
  account?: SupabaseAccount | null;
  onSubmit: (data: AccountFormData) => Promise<void>;
  onCancel: () => void;
  onTest?: (data: AccountFormData) => Promise<boolean>;
}

export interface AccountFormData {
  name: string;
  project_url: string;
  s3_endpoint: string;
  bucket_name: string;
  s3_access_key: string;
  s3_secret_key: string;
  service_role_key: string;
  storage_limit_mb: number;
  is_active: boolean;
}

function FormInput({
  label,
  placeholder,
  value,
  onChange,
  error,
  hint,
  type = "text",
  showPasswordToggle = false
}: {
  label: string;
  placeholder: string;
  value: string | number;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  type?: string;
  showPasswordToggle?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [eyeHovered, setEyeHovered] = useState(false);

  const inputType = showPasswordToggle ? (showPassword ? "text" : "password") : type;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ color: '#888899', fontSize: '13px', fontWeight: 500 }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            padding: showPasswordToggle ? '11px 42px 11px 14px' : '11px 14px',
            fontSize: '14px',
            borderRadius: '10px',
            border: error ? '1px solid #ef4444' : focused ? '1px solid rgba(0, 212, 212, 0.5)' : '1px solid #1e1e2e',
            background: '#0a0a0e',
            color: '#ffffff',
            outline: 'none',
            transition: 'all 0.2s',
            boxShadow: focused ? '0 0 0 3px rgba(0, 212, 212, 0.1)' : 'none'
          }}
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            onMouseEnter={() => setEyeHovered(true)}
            onMouseLeave={() => setEyeHovered(false)}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              color: eyeHovered ? '#00d4d4' : '#555566',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s'
            }}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && (
        <p style={{ color: '#ef4444', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#ef4444' }} />
          {error}
        </p>
      )}
      {hint && !error && (
        <p style={{ color: '#555566', fontSize: '12px' }}>{hint}</p>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        background: 'rgba(0, 212, 212, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Icon size={16} color="#00d4d4" />
      </div>
      <h3 style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600 }}>{title}</h3>
    </div>
  );
}

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
        padding: '10px 20px',
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

function SecondaryButton({ children, onClick, disabled = false, loading = false }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
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
        border: hovered ? '1px solid rgba(0, 212, 212, 0.3)' : '1px solid #1e1e2e',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        background: hovered ? 'rgba(0, 212, 212, 0.05)' : '#12121a',
        color: hovered ? '#00d4d4' : '#888899',
        transition: 'all 0.2s',
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

export function AccountForm({ account, onSubmit, onCancel, onTest }: AccountFormProps) {
  const [formData, setFormData] = useState<AccountFormData>({
    name: account?.name || "",
    project_url: account?.project_url || "",
    s3_endpoint: account?.s3_endpoint || "",
    bucket_name: account?.bucket_name || "hls_media",
    s3_access_key: account?.s3_access_key || "",
    s3_secret_key: account?.s3_secret_key || "",
    service_role_key: account?.service_role_key || "",
    storage_limit_mb: account?.storage_limit_mb || 1024,
    is_active: account?.is_active ?? true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checkboxHovered, setCheckboxHovered] = useState(false);

  const handleChange = (field: keyof AccountFormData, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setTestResult(null);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.project_url.trim()) newErrors.project_url = "Project URL is required";
    if (!formData.s3_endpoint.trim()) newErrors.s3_endpoint = "S3 Endpoint is required";
    if (!formData.bucket_name.trim()) newErrors.bucket_name = "Bucket name is required";
    if (!formData.s3_access_key.trim()) newErrors.s3_access_key = "Access key is required";
    if (!formData.s3_secret_key.trim()) newErrors.s3_secret_key = "Secret key is required";
    if (formData.storage_limit_mb <= 0) newErrors.storage_limit_mb = "Must be greater than 0";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    if (!validate()) return;

    setIsTesting(true);
    setTestResult(null);
    try {
      const success = onTest ? await onTest(formData) : false;
      setTestResult(success ? "success" : "error");
    } catch {
      setTestResult("error");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Basic Info */}
      <div>
        <SectionHeader icon={Database} title="Basic Information" />
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px'
        }}>
          <FormInput
            label="Account Name"
            placeholder="My Supabase Account"
            value={formData.name}
            onChange={(v) => handleChange("name", v)}
            error={errors.name}
          />
          <FormInput
            label="Project URL"
            placeholder="https://xxxxx.supabase.co"
            value={formData.project_url}
            onChange={(v) => handleChange("project_url", v)}
            error={errors.project_url}
          />
        </div>
      </div>

      {/* S3 Configuration */}
      <div>
        <SectionHeader icon={Database} title="S3 Configuration" />
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px'
        }}>
          <FormInput
            label="S3 Endpoint"
            placeholder="https://xxxxx.supabase.co/storage/v1/s3"
            value={formData.s3_endpoint}
            onChange={(v) => handleChange("s3_endpoint", v)}
            error={errors.s3_endpoint}
            hint="Usually: project_url + /storage/v1/s3"
          />
          <FormInput
            label="Bucket Name"
            placeholder="hls_media"
            value={formData.bucket_name}
            onChange={(v) => handleChange("bucket_name", v)}
            error={errors.bucket_name}
          />
        </div>
      </div>

      {/* Credentials */}
      <div>
        <SectionHeader icon={Key} title="Credentials" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <FormInput
            label="S3 Access Key"
            placeholder="Your S3 access key"
            value={formData.s3_access_key}
            onChange={(v) => handleChange("s3_access_key", v)}
            error={errors.s3_access_key}
          />
          <FormInput
            label="S3 Secret Key"
            placeholder="Your S3 secret key"
            value={formData.s3_secret_key}
            onChange={(v) => handleChange("s3_secret_key", v)}
            error={errors.s3_secret_key}
            showPasswordToggle
          />
          <FormInput
            label="Service Role Key (Optional)"
            placeholder="For bucket creation"
            value={formData.service_role_key}
            onChange={(v) => handleChange("service_role_key", v)}
            hint="Only needed if bucket doesn't exist yet"
            showPasswordToggle
          />
        </div>
      </div>

      {/* Settings */}
      <div>
        <SectionHeader icon={Settings} title="Settings" />
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '14px',
          alignItems: 'end'
        }}>
          <FormInput
            label="Storage Limit (MB)"
            type="number"
            placeholder="1024"
            value={formData.storage_limit_mb}
            onChange={(v) => handleChange("storage_limit_mb", parseInt(v) || 0)}
            error={errors.storage_limit_mb}
          />
          <div style={{ paddingBottom: '4px' }}>
            <label
              onMouseEnter={() => setCheckboxHovered(true)}
              onMouseLeave={() => setCheckboxHovered(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                padding: '10px 14px',
                borderRadius: '10px',
                border: checkboxHovered ? '1px solid rgba(0, 212, 212, 0.3)' : '1px solid #1e1e2e',
                background: checkboxHovered ? 'rgba(0, 212, 212, 0.03)' : 'transparent',
                transition: 'all 0.2s'
              }}
            >
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '6px',
                border: formData.is_active ? '2px solid #00d4d4' : '2px solid #3a3a4a',
                background: formData.is_active ? 'rgba(0, 212, 212, 0.15)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}>
                {formData.is_active && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="#00d4d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => handleChange("is_active", e.target.checked)}
                style={{ display: 'none' }}
              />
              <span style={{ color: formData.is_active ? '#ffffff' : '#888899', fontSize: '14px', fontWeight: 500 }}>
                Active
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Test Connection */}
      {onTest && (
        <div style={{
          background: '#0f0f15',
          border: '1px solid #1e1e2e',
          borderRadius: '12px',
          padding: '16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <h4 style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                Test Connection
              </h4>
              <p style={{ color: '#666677', fontSize: '13px' }}>
                Verify S3 credentials before saving
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {testResult === "success" && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#22c55e' }}>
                  <CheckCircle size={18} />
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>Connected</span>
                </div>
              )}
              {testResult === "error" && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444' }}>
                  <XCircle size={18} />
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>Failed</span>
                </div>
              )}
              <SecondaryButton onClick={handleTest} loading={isTesting}>
                <RefreshCw size={16} />
                Test
              </SecondaryButton>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '12px',
        paddingTop: '16px',
        borderTop: '1px solid #1e1e2e'
      }}>
        <GhostButton onClick={onCancel}>Cancel</GhostButton>
        <PrimaryButton type="submit" loading={isLoading}>
          {account ? "Update Account" : "Add Account"}
        </PrimaryButton>
      </div>
    </form>
  );
}
