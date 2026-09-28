import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../stores/AuthContext';
import { authService } from '../services/apiServices';
import { getErrorMessage } from '../services/api';
import { SmokeyBackground } from '../components/ui/smokey-background';
import { ShinyButton } from '../components/ui/shiny-button';

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [name, setName]                   = useState('');
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]   = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [error, setError]                 = useState('');
  const [isLoading, setIsLoading]         = useState(false);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordStrong = password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!passwordStrong) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    try {
      const { access_token } = await authService.register(email, password, name);
      await login(access_token);
      navigate('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden">
      <SmokeyBackground />

      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 1, background: 'rgba(7,11,20,0.45)' }}
      />

      <div className="relative w-full max-w-md animate-slide-up" style={{ zIndex: 2 }}>
        {/* Brand */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 animate-float p-1"
            style={{
              background: 'linear-gradient(135deg, rgba(58,82,234,0.1), rgba(77,110,245,0.1))',
              boxShadow: '0 0 30px 8px rgba(77,110,245,0.15)',
            }}
          >
            <img src="/logo.png" alt="VoxMentor" className="w-12 h-12 rounded-xl object-contain" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">VoxMentor</h1>
          <p className="text-surface-muted mt-2 text-sm tracking-wide uppercase">
            Talk. Practice. Improve.
          </p>
        </div>

        {/* Glass card */}
        <div className="auth-glass p-8">
          <h2 className="text-xl font-semibold text-white mb-1">Create your account</h2>
          <p className="text-surface-muted text-sm mb-6">Start your AI-powered practice journey</p>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 p-4 rounded-xl text-sm"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#f87171',
              }}
            >
              <span className="shrink-0 mt-0.5">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Full Name */}
            <div>
              <label className="label" htmlFor="name">Full name</label>
              <div className="relative">
                <User
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-muted w-4 h-4 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="name"
                  type="text"
                  className="input pl-10"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="label" htmlFor="reg-email">Email address</label>
              <div className="relative">
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-muted w-4 h-4 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="reg-email"
                  type="email"
                  className="input pl-10"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label" htmlFor="reg-password">Password</label>
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-muted w-4 h-4 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input pl-10 pr-11"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-muted hover:text-white transition-colors"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" aria-hidden="true" />
                    : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
              {/* Strength hint */}
              {password.length > 0 && (
                <p className={`text-xs mt-1.5 ${passwordStrong ? 'text-green-400' : 'text-orange-400'}`}>
                  {passwordStrong ? '✓ Strong enough' : '✗ At least 8 characters required'}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="label" htmlFor="reg-confirm">Confirm password</label>
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-muted w-4 h-4 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="reg-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  className="input pl-10 pr-11"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-muted hover:text-white transition-colors"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm
                    ? <EyeOff className="w-4 h-4" aria-hidden="true" />
                    : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
                {passwordsMatch && (
                  <CheckCircle
                    className="absolute right-10 top-1/2 -translate-y-1/2 text-green-400 w-4 h-4"
                    aria-hidden="true"
                  />
                )}
              </div>
            </div>

            <ShinyButton
              id="register-submit"
              type="submit"
              fullWidth
              isLoading={isLoading}
              className="mt-2"
            >
              <span>Create Account</span>
              {!isLoading && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
            </ShinyButton>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <span className="text-xs text-surface-muted/60 uppercase tracking-wider">or</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Google button */}
          <button
            type="button"
            onClick={() => {
              window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/auth/google`;
            }}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-medium text-white hover:bg-white/5 transition-colors"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <p className="text-center text-sm text-surface-muted mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
