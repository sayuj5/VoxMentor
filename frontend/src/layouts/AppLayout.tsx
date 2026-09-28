import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../stores/AuthContext';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { to: '/session/new', label: 'New Session', icon: '▶' },
  { to: '/history', label: 'History', icon: '◷' },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-60 bg-surface-card border-r border-surface-border flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-surface-border">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="VoxMentor" className="w-8 h-8 rounded-lg object-contain" />
            <span className="font-bold text-lg tracking-tight">VoxMentor</span>
          </Link>
          <p className="text-xs text-surface-muted mt-0.5">Talk. Practice. Improve.</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                location.pathname === link.to
                  ? 'bg-brand-600/20 text-brand-400'
                  : 'text-surface-muted hover:text-white hover:bg-surface-border'
              }`}
            >
              <span className="text-base">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-surface-border">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
            <div className="w-8 h-8 bg-brand-700 rounded-full flex items-center justify-center text-sm font-semibold shrink-0">
              {user?.name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-surface-muted truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full mt-1 btn-ghost text-sm text-left">
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-6 py-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
