"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { Upload, Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [buttonHovered, setButtonHovered] = useState(false);
  const [toggleHovered, setToggleHovered] = useState(false);
  const { signIn, signUp } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = isLogin
        ? await signIn(email, password)
        : await signUp(email, password);

      if (error) {
        addToast("error", error.message);
      } else {
        if (isLogin) {
          addToast("success", "Welcome back!");
          router.push("/dashboard");
        } else {
          addToast("success", "Account created! Please check your email to verify.");
        }
      }
    } catch {
      addToast("error", "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      style={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 16px',
        position: 'relative',
        overflow: 'hidden',
        background: '#0a0a0e'
      }}
    >
      {/* Background Effects */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div 
          style={{ 
            position: 'absolute',
            top: '20%',
            left: '-200px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0, 212, 212, 0.15) 0%, transparent 70%)',
            filter: 'blur(60px)'
          }}
        />
        <div 
          style={{ 
            position: 'absolute',
            bottom: '20%',
            right: '-200px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0, 212, 212, 0.1) 0%, transparent 70%)',
            filter: 'blur(60px)'
          }}
        />
        {/* Grid pattern */}
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'linear-gradient(rgba(0,212,212,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,212,0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      <div style={{ position: 'relative', width: '100%', maxWidth: '420px' }}>
        {/* Logo Section */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px' }}>
          <div style={{ position: 'relative', marginBottom: '24px' }}>
            {/* Glow */}
            <div 
              style={{ 
                position: 'absolute',
                inset: '-8px',
                borderRadius: '20px',
                background: 'rgba(0, 212, 212, 0.2)',
                filter: 'blur(20px)'
              }}
            />
            {/* Icon Box */}
            <div 
              style={{ 
                position: 'relative',
                width: '80px',
                height: '80px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, rgba(0, 212, 212, 0.2) 0%, rgba(0, 212, 212, 0.05) 100%)',
                border: '1px solid rgba(0, 212, 212, 0.3)'
              }}
            >
              <Upload size={36} color="#00d4d4" strokeWidth={1.5} />
            </div>
            {/* Sparkle */}
            <div 
              style={{ 
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'rgba(0, 212, 212, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Sparkles size={12} color="#00d4d4" />
            </div>
          </div>
          
          <h1 
            style={{
              fontSize: '36px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #00d4d4 0%, #00ffff 50%, #00d4d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            UPLOAD_MIRROR
          </h1>
          <p style={{ marginTop: '8px', color: '#888899', fontSize: '14px' }}>
            Multi-Account Supabase HLS Uploader
          </p>
        </div>

        {/* Login Card */}
        <div 
          style={{
            background: '#12121a',
            borderRadius: '24px',
            padding: '32px',
            border: '1px solid #1e1e2e',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}
        >
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>
                {isLogin ? "Welcome back" : "Create account"}
              </h2>
              <p style={{ fontSize: '14px', color: '#888899' }}>
                {isLogin ? "Sign in to access your dashboard" : "Sign up to get started"}
              </p>
            </div>

            {/* Email Input */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#888899', marginBottom: '8px' }}>
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <div 
                  style={{ 
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: emailFocused ? '#00d4d4' : '#555566',
                    transition: 'color 0.2s',
                    zIndex: 1
                  }}
                >
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  placeholder="you@example.com"
                  required
                  style={{
                    width: '100%',
                    padding: '14px 16px 14px 48px',
                    fontSize: '14px',
                    borderRadius: '12px',
                    border: emailFocused ? '1px solid #00d4d4' : '1px solid #2a2a3a',
                    background: '#0a0a10',
                    color: '#ffffff',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxShadow: emailFocused ? '0 0 0 3px rgba(0, 212, 212, 0.1), 0 0 20px rgba(0, 212, 212, 0.1)' : 'none'
                  }}
                />
              </div>
            </div>

            {/* Password Input */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#888899', marginBottom: '8px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <div 
                  style={{ 
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: passwordFocused ? '#00d4d4' : '#555566',
                    transition: 'color 0.2s',
                    zIndex: 1
                  }}
                >
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '14px 48px 14px 48px',
                    fontSize: '14px',
                    borderRadius: '12px',
                    border: passwordFocused ? '1px solid #00d4d4' : '1px solid #2a2a3a',
                    background: '#0a0a10',
                    color: '#ffffff',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxShadow: passwordFocused ? '0 0 0 3px rgba(0, 212, 212, 0.1), 0 0 20px rgba(0, 212, 212, 0.1)' : 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ 
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    color: '#555566',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              onMouseEnter={() => setButtonHovered(true)}
              onMouseLeave={() => setButtonHovered(false)}
              style={{
                width: '100%',
                padding: '14px 24px',
                fontSize: '15px',
                fontWeight: 600,
                borderRadius: '12px',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: buttonHovered && !isLoading
                  ? 'linear-gradient(135deg, #00e8e8 0%, #00d4d4 100%)'
                  : 'linear-gradient(135deg, #00d4d4 0%, #00b8b8 100%)',
                color: '#000000',
                transition: 'all 0.2s',
                boxShadow: buttonHovered && !isLoading
                  ? '0 0 30px rgba(0, 212, 212, 0.4)'
                  : '0 4px 15px rgba(0, 212, 212, 0.2)',
                opacity: isLoading ? 0.7 : 1
              }}
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  {isLogin ? "Sign In" : "Create Account"}
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {/* Divider */}
            <div style={{ position: 'relative', margin: '24px 0' }}>
              <div style={{ 
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center'
              }}>
                <div style={{ 
                  width: '100%',
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent, #2a2a3a, transparent)'
                }} />
              </div>
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                <span style={{ 
                  padding: '0 16px',
                  background: '#12121a',
                  color: '#555566',
                  fontSize: '12px'
                }}>
                  {isLogin ? "New to UPLOAD_MIRROR?" : "Already have an account?"}
                </span>
              </div>
            </div>

            {/* Toggle Button */}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              onMouseEnter={() => setToggleHovered(true)}
              onMouseLeave={() => setToggleHovered(false)}
              style={{
                width: '100%',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 500,
                borderRadius: '12px',
                border: toggleHovered ? '1px solid rgba(0, 212, 212, 0.4)' : '1px solid #2a2a3a',
                background: toggleHovered ? 'rgba(0, 212, 212, 0.05)' : 'transparent',
                color: toggleHovered ? '#00d4d4' : '#888899',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {isLogin ? "Create a new account" : "Sign in to existing account"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#555566', marginBottom: '12px' }}>
            Secure, privacy-first HLS upload system
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <div 
              style={{ 
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 10px rgba(34, 197, 94, 0.5)'
              }}
            />
            <span style={{ fontSize: '12px', color: '#555566' }}>All systems operational</span>
          </div>
        </div>
      </div>
    </div>
  );
}
