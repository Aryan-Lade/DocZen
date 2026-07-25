import { useState } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  LayoutDashboard,
  Wrench,
  FolderKanban,
  Activity as ActivityIcon,
  ChevronDown,
  LogOut,
  Menu,
  X,
  Layers,
  Scissors,
  FileArchive,
  Edit3,
  FileCode,
  Image as ImageIcon,
  Eye,
  Shield,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/tools', label: 'All Tools', icon: Wrench },
  { to: '/files', label: 'My Files', icon: FolderKanban },
  { to: '/activity', label: 'Activity', icon: ActivityIcon },
];

const headerTools = [
  { to: '/tools/pdf-merge', icon: Layers, label: 'Merge PDF', desc: 'Combine files into one' },
  { to: '/tools/pdf-split', icon: Scissors, label: 'Split PDF', desc: 'Extract specific pages' },
  { to: '/tools/pdf-compress', icon: FileArchive, label: 'Compress PDF', desc: 'Shrink document size' },
  { to: '/tools/pdf-edit', icon: Edit3, label: 'Edit PDF', desc: 'Add text and notes' },
  { to: '/tools/word-to-pdf', icon: FileText, label: 'Word to PDF', desc: 'Convert DOCX to PDF' },
  { to: '/tools/pdf-to-word', icon: FileCode, label: 'PDF to Word', desc: 'Make editable DOCX' },
  { to: '/tools/image-to-pdf', icon: ImageIcon, label: 'Images to PDF', desc: 'Photos into PDF' },
  { to: '/tools/ocr', icon: Eye, label: 'OCR Extract', desc: 'Extract text from scans' },
  { to: '/tools/pdf-protect', icon: Shield, label: 'Protect PDF', desc: 'Encrypted password' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const initials = (user?.name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">
            <div className="brand-mark">
              <FileText size={22} strokeWidth={2.5} />
            </div>
            <span>
              Doc<em>Zen</em>
            </span>
            <span className="brand-badge">Pro</span>
          </Link>

          <nav className={`topnav${mobileNavOpen ? ' mobile-open' : ''}`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileNavOpen(false)}
                  className={({ isActive }) => `topnav-link${isActive ? ' active' : ''}`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}

            <div
              className="topnav-dropdown"
              onMouseEnter={() => setMenuOpen(true)}
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button
                className={`topnav-link dd-trigger${menuOpen ? ' open' : ''}`}
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <Wrench size={16} />
                <span>PDF Tools</span>
                <ChevronDown className="chev" size={14} />
              </button>
              {menuOpen && (
                <div className="dd-menu">
                  {headerTools.map((t) => {
                    const TIcon = t.icon;
                    return (
                      <Link
                        key={t.to}
                        to={t.to}
                        className="dd-item"
                        onClick={() => {
                          setMenuOpen(false);
                          setMobileNavOpen(false);
                        }}
                      >
                        <div className="dd-ico">
                          <TIcon size={18} />
                        </div>
                        <div>
                          <span className="dd-label">{t.label}</span>
                          <span className="dd-desc">{t.desc}</span>
                        </div>
                      </Link>
                    );
                  })}
                  <Link
                    to="/tools"
                    className="dd-all"
                    onClick={() => {
                      setMenuOpen(false);
                      setMobileNavOpen(false);
                    }}
                  >
                    View all 17+ tools →
                  </Link>
                </div>
              )}
            </div>
          </nav>

          <div className="topbar-right">
            <div className="user-chip" onClick={() => navigate('/profile')} title="View Profile & Settings">
              <div className="avatar">{initials}</div>
              <span className="user-name">{user?.name?.split(' ')[0]}</span>
            </div>
            <button className="logout-btn" onClick={logout} title="Sign out of DocZen">
              <LogOut size={16} />
              <span className="logout-txt">Sign out</span>
            </button>
            <button
              className="mobile-nav-toggle"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label="Toggle navigation"
            >
              {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="footer-brand">Doc<em>Zen</em></span>
            <span style={{ fontSize: 13, color: 'var(--text-light)' }}>| All-in-One Document Suite</span>
          </div>
          <span className="footer-note">
            Private &amp; secure document processing. Built with care for speed & accuracy.
          </span>
        </div>
      </footer>
    </div>
  );
}

