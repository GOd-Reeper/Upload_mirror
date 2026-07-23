"use client";

import { Upload, Database, HardDrive, Film, ArrowRight, Zap, Shield, Cloud } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const quickActions = [
  {
    title: "Upload Content",
    description: "Upload HLS folders to distributed storage",
    icon: Upload,
    href: "/dashboard/upload",
    iconBg: "rgba(0, 212, 212, 0.12)",
    iconColor: "#00d4d4",
  },
  {
    title: "Manage Accounts",
    description: "Configure Supabase storage accounts",
    icon: Database,
    href: "/dashboard/accounts",
    iconBg: "rgba(59, 130, 246, 0.12)",
    iconColor: "#3b82f6",
  },
  {
    title: "Storage Browser",
    description: "View files in connected buckets",
    icon: HardDrive,
    href: "/dashboard/storage",
    iconBg: "rgba(34, 197, 94, 0.12)",
    iconColor: "#22c55e",
  },
  {
    title: "Series Library",
    description: "Manage your uploaded series",
    icon: Film,
    href: "/dashboard/series",
    iconBg: "rgba(245, 158, 11, 0.12)",
    iconColor: "#f59e0b",
  },
];

const features = [
  { icon: Zap, title: "Lightning Fast", description: "Parallel uploads" },
  { icon: Shield, title: "Secure", description: "Private storage" },
  { icon: Cloud, title: "Distributed", description: "Smart allocation" },
];

function ActionCard({ action, index }: { action: typeof quickActions[0]; index: number }) {
  const [hovered, setHovered] = useState(false);
  
  return (
    <Link href={action.href}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? '#14141c' : '#12121a',
          border: hovered ? '1px solid rgba(0, 212, 212, 0.3)' : '1px solid #1e1e2e',
          borderRadius: '16px',
          padding: '20px',
          transition: 'all 0.2s',
          transform: hovered ? 'translateY(-2px)' : 'none',
          boxShadow: hovered ? '0 10px 30px rgba(0, 0, 0, 0.3)' : 'none',
          cursor: 'pointer',
          height: '100%'
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: action.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            transition: 'transform 0.2s',
            transform: hovered ? 'scale(1.05)' : 'none'
          }}
        >
          <action.icon size={24} color={action.iconColor} strokeWidth={1.5} />
        </div>
        <h3 style={{ 
          color: hovered ? '#00d4d4' : '#ffffff', 
          fontSize: '15px', 
          fontWeight: 600, 
          marginBottom: '6px',
          transition: 'color 0.2s'
        }}>
          {action.title}
        </h3>
        <p style={{ color: '#666677', fontSize: '13px', lineHeight: 1.5 }}>
          {action.description}
        </p>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px', 
          marginTop: '12px',
          color: '#00d4d4',
          fontSize: '13px',
          fontWeight: 500,
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'translateX(0)' : 'translateX(-8px)',
          transition: 'all 0.2s'
        }}>
          Open <ArrowRight size={14} />
        </div>
      </div>
    </Link>
  );
}

function StepCard({ step, title, description, link }: { step: number; title: string; description: string; link: string | null }) {
  const [hovered, setHovered] = useState(false);
  
  const content = (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        padding: '14px',
        borderRadius: '12px',
        background: hovered && link ? '#0f0f15' : 'transparent',
        border: hovered && link ? '1px solid rgba(0, 212, 212, 0.15)' : '1px solid transparent',
        transition: 'all 0.2s',
        cursor: link ? 'pointer' : 'default'
      }}
    >
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(0, 212, 212, 0.15) 0%, rgba(0, 212, 212, 0.05) 100%)',
        border: '1px solid rgba(0, 212, 212, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'transform 0.2s',
        transform: hovered && link ? 'scale(1.1)' : 'none'
      }}>
        <span style={{ color: '#00d4d4', fontSize: '13px', fontWeight: 700 }}>{step}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{ 
          color: hovered && link ? '#00d4d4' : '#ffffff', 
          fontSize: '14px', 
          fontWeight: 500,
          marginBottom: '4px',
          transition: 'color 0.2s'
        }}>
          {title}
        </h4>
        <p style={{ color: '#666677', fontSize: '13px', lineHeight: 1.5 }}>
          {description}
        </p>
      </div>
      {link && (
        <ArrowRight 
          size={18} 
          style={{ 
            color: '#444455',
            flexShrink: 0,
            marginTop: '2px',
            transition: 'all 0.2s',
            transform: hovered ? 'translateX(4px)' : 'none',
            opacity: hovered ? 1 : 0.5
          }} 
        />
      )}
    </div>
  );
  
  return link ? <Link href={link}>{content}</Link> : content;
}

export default function DashboardPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0, 212, 212, 0.06) 0%, #12121a 50%, #12121a 100%)',
        border: '1px solid rgba(0, 212, 212, 0.15)',
        borderRadius: '20px',
        padding: '28px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow effect */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-10%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 212, 212, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        
        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '20px',
            background: 'rgba(0, 212, 212, 0.1)',
            border: '1px solid rgba(0, 212, 212, 0.2)',
            marginBottom: '16px'
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00d4d4' }} />
            <span style={{ color: '#00d4d4', fontSize: '12px', fontWeight: 500 }}>Dashboard</span>
          </div>
          
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
            Welcome to{' '}
            <span style={{
              background: 'linear-gradient(135deg, #00d4d4 0%, #00ffff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              UPLOAD_MIRROR
            </span>
          </h1>
          <p style={{ color: '#888899', fontSize: '15px', maxWidth: '600px', lineHeight: 1.6 }}>
            Multi-account HLS upload system with smart distribution across Supabase storage buckets.
          </p>
          
          {/* Features */}
          <div style={{ display: 'flex', gap: '24px', marginTop: '24px', flexWrap: 'wrap' }}>
            {features.map((feature, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(0, 212, 212, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <feature.icon size={18} color="#00d4d4" />
                </div>
                <div>
                  <p style={{ color: '#ffffff', fontSize: '13px', fontWeight: 500 }}>{feature.title}</p>
                  <p style={{ color: '#666677', fontSize: '12px' }}>{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 style={{ color: '#ffffff', fontSize: '16px', fontWeight: 600, marginBottom: '14px' }}>
          Quick Actions
        </h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
          gap: '14px' 
        }}>
          {quickActions.map((action, index) => (
            <ActionCard key={action.href} action={action} index={index} />
          ))}
        </div>
      </div>

      {/* Getting Started */}
      <div style={{
        background: '#12121a',
        border: '1px solid #1e1e2e',
        borderRadius: '16px',
        padding: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(0, 212, 212, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Zap size={18} color="#00d4d4" />
          </div>
          <div>
            <h2 style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600 }}>Getting Started</h2>
            <p style={{ color: '#666677', fontSize: '13px' }}>Follow these steps</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <StepCard 
            step={1} 
            title="Add Storage Accounts" 
            description="Configure Supabase projects with S3 credentials"
            link="/dashboard/accounts"
          />
          <StepCard 
            step={2} 
            title="Select Episode Folder" 
            description="Choose HLS folder with quality variants (1080p, 720p)"
            link="/dashboard/upload"
          />
          <StepCard 
            step={3} 
            title="Automatic Distribution" 
            description="System allocates and uploads automatically"
            link={null}
          />
        </div>
      </div>
    </div>
  );
}
