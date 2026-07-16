import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', icon: '📊', label: 'Dashboard', end: true },
  { to: '/tools', icon: '🧰', label: 'All Tools' },
  { to: '/files', icon: '📁', label: 'My Files' },
  { to: '/activity', icon: '🕑', label: 'Activity' },
];

const quickTools = [
  { to: '/tools/pdf-merge', icon: '🔗', label: 'Merge PDF' },
  { to: '/tools/pdf-split', icon: '✂️', label: 'Split PDF' },
  { to: '/tools/pdf-compress', icon: '🗜️', label: 'Compress PDF' },
  { to: '/tools/ocr', icon: '👁️', label: 'OCR' },
  { to: '/tools/language-detect', icon: '🌍', label: 'Detect Language' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = (user?.name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          Doc<em>Zen</em>
        </div>
        <nav>
          <div className="nav-section">Menu</div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="ico">{item.icon}</span>
              <span className="txt">{item.label}</span>
            </NavLink>
          ))}
          <div className="nav-section">Quick Tools</div>
          {quickTools.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="ico">{item.icon}</span>
              <span className="txt">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="user-box">
          <div className="avatar" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }} title="Profile">
            {initials}
          </div>
          <div className="meta" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
            <div className="name">{user?.name}</div>
            <div className="email">{user?.email}</div>
          </div>
          <button onClick={logout} title="Logout">⏻</button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
