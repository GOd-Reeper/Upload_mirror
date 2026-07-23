"use client";

import {
  Upload,
  Database,
  HardDrive,
  Film,
  LogOut,
  Menu,
  X,
  User,
  ChevronDown,
  Server
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: "Upload", href: "/dashboard/upload", icon: Upload },
  { label: "Accounts", href: "/dashboard/accounts", icon: Database },
  { label: "Storage", href: "/dashboard/storage", icon: HardDrive },
  { label: "Series", href: "/dashboard/series", icon: Film },
  { label: "Activity", href: "/dashboard/table-record", icon: Server },
];

interface NavbarProps {
  user?: { email: string } | null;
  onLogout?: () => void;
}

export function Navbar({ user, onLogout }: NavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [menuBtnHovered, setMenuBtnHovered] = useState(false);
  const [logoutBtnHovered, setLogoutBtnHovered] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      width: '100%',
      background: 'rgba(10, 10, 14, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid #1a1a24'
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
          {/* Logo */}
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(0, 212, 212, 0.15) 0%, rgba(0, 212, 212, 0.05) 100%)',
              border: '1px solid rgba(0, 212, 212, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Upload size={18} color="#00d4d4" strokeWidth={1.5} />
            </div>
            <span style={{
              fontSize: '16px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #00d4d4 0%, #00ffff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              UPLOAD_MIRROR
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '5px',
            borderRadius: '12px',
            background: 'rgba(18, 18, 26, 0.6)',
            border: '1px solid #1e1e2e'
          }}>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <NavLink key={item.href} item={item} isActive={isActive} />
              );
            })}
          </div>

          {/* User Menu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {user && (
              <div style={{ position: 'relative' }} ref={userMenuRef}>
                <UserMenuButton
                  user={user}
                  isOpen={userMenuOpen}
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                />
                {userMenuOpen && (
                  <UserDropdown
                    user={user}
                    onLogout={() => { setUserMenuOpen(false); onLogout?.(); }}
                  />
                )}
              </div>
            )}

            {/* Mobile Logout */}
            {onLogout && (
              <button
                onClick={onLogout}
                onMouseEnter={() => setLogoutBtnHovered(true)}
                onMouseLeave={() => setLogoutBtnHovered(false)}
                title="Logout"
                style={{
                  display: 'none',
                  padding: '10px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  background: logoutBtnHovered ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                  color: logoutBtnHovered ? '#ef4444' : '#666677',
                  transition: 'all 0.2s'
                }}
              >
                <LogOut size={18} />
              </button>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              onMouseEnter={() => setMenuBtnHovered(true)}
              onMouseLeave={() => setMenuBtnHovered(false)}
              style={{
                display: 'none',
                padding: '10px',
                borderRadius: '10px',
                border: mobileMenuOpen ? '1px solid rgba(0, 212, 212, 0.3)' : '1px solid #1e1e2e',
                cursor: 'pointer',
                background: mobileMenuOpen ? 'rgba(0, 212, 212, 0.1)' : menuBtnHovered ? '#14141c' : 'transparent',
                color: mobileMenuOpen ? '#00d4d4' : '#888899',
                transition: 'all 0.2s'
              }}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div style={{
          background: 'rgba(10, 10, 14, 0.95)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid #1e1e2e',
          padding: '12px 16px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: 500,
                    background: isActive ? 'rgba(0, 212, 212, 0.1)' : 'transparent',
                    color: isActive ? '#00d4d4' : '#888899',
                    border: isActive ? '1px solid rgba(0, 212, 212, 0.2)' : '1px solid transparent'
                  }}
                >
                  <item.icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                  {item.label}
                </Link>
              );
            })}
            {user && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                marginTop: '8px',
                borderTop: '1px solid #1e1e2e'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(0, 212, 212, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <User size={16} color="#00d4d4" />
                </div>
                <span style={{ color: '#888899', fontSize: '13px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={item.href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 14px',
        borderRadius: '8px',
        textDecoration: 'none',
        fontSize: '13px',
        fontWeight: 500,
        background: isActive ? 'rgba(0, 212, 212, 0.12)' : hovered ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
        color: isActive ? '#00d4d4' : hovered ? '#ffffff' : '#888899',
        transition: 'all 0.15s'
      }}
    >
      <item.icon size={16} strokeWidth={isActive ? 2 : 1.5} />
      {item.label}
    </Link>
  );
}

function UserMenuButton({ user, isOpen, onClick }: { user: { email: string }; isOpen: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '6px 12px',
        borderRadius: '10px',
        border: isOpen ? '1px solid rgba(0, 212, 212, 0.3)' : '1px solid #1e1e2e',
        cursor: 'pointer',
        background: isOpen ? 'rgba(0, 212, 212, 0.05)' : hovered ? '#14141c' : 'transparent',
        color: isOpen ? '#ffffff' : hovered ? '#ffffff' : '#888899',
        transition: 'all 0.2s'
      }}
    >
      <div style={{
        width: '28px',
        height: '28px',
        borderRadius: '8px',
        background: 'rgba(0, 212, 212, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <User size={14} color="#00d4d4" />
      </div>
      <span style={{ fontSize: '13px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {user.email}
      </span>
      <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
    </button>
  );
}

function UserDropdown({ user, onLogout }: { user: { email: string }; onLogout: () => void }) {
  const [logoutHovered, setLogoutHovered] = useState(false);

  return (
    <div style={{
      position: 'absolute',
      right: 0,
      top: '100%',
      marginTop: '8px',
      width: '220px',
      background: '#12121a',
      border: '1px solid #1e1e2e',
      borderRadius: '12px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
      overflow: 'hidden'
    }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e1e2e' }}>
        <p style={{ color: '#ffffff', fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.email}
        </p>
        <p style={{ color: '#666677', fontSize: '11px', marginTop: '2px' }}>Signed in</p>
      </div>
      <div style={{ padding: '6px' }}>
        <button
          onClick={onLogout}
          onMouseEnter={() => setLogoutHovered(true)}
          onMouseLeave={() => setLogoutHovered(false)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            background: logoutHovered ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
            color: logoutHovered ? '#ef4444' : '#888899',
            fontSize: '13px',
            transition: 'all 0.15s',
            textAlign: 'left'
          }}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  );
}
