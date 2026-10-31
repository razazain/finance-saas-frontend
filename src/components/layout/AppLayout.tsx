import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Activity, ArrowLeftRight, Bell, Building2, ChevronDown, ClipboardList, CreditCard, FileBarChart, FileText, Gauge, LayoutDashboard, LogOut, Menu, Search, Settings2, ShieldCheck, Tags, Users, Wallet, X, Boxes, Repeat2, Sparkles, UserRound, LockKeyhole, BadgeCheck, Bot } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { Role } from '@/types';
import { Button, Dialog, Field, Input } from '@/components/ui';

const navigation = [
  { group: 'Overview', items: [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard }] },
  { group: 'Money', items: [{ label: 'Transactions', to: '/transactions', icon: ArrowLeftRight }, { label: 'Accounts', to: '/accounts', icon: Wallet }, { label: 'Categories', to: '/categories', icon: Tags }] },
  { group: 'Sales', items: [{ label: 'Customers', to: '/customers', icon: Users }, { label: 'Invoices', to: '/invoices', icon: FileText }] },
  { group: 'Purchases', items: [{ label: 'Vendors', to: '/vendors', icon: Building2 }, { label: 'Bills', to: '/bills', icon: ClipboardList }] },
  { group: 'Operations', items: [{ label: 'Recurring', to: '/recurring', icon: Repeat2 }, { label: 'Documents', to: '/documents', icon: FileText }, { label: 'Inventory', to: '/inventory', icon: Boxes }] },
  { group: 'Insights', items: [{ label: 'Reports', to: '/reports', icon: FileBarChart }, { label: 'Financial insights', to: '/insights', icon: Sparkles }, { label: 'AI Assistant', to: '/ai-assistant', icon: Bot }] },
  { group: 'Administration', items: [{ label: 'Notifications', to: '/notifications', icon: Bell }, { label: 'Team', to: '/team', icon: Users }, { label: 'Audit logs', to: '/audit-logs', icon: Activity }, { label: 'Subscription', to: '/subscription', icon: CreditCard }] },
  { group: 'Settings', items: [{ label: 'Business settings', to: '/settings/business', icon: Settings2 }, { label: 'Currency rates', to: '/settings/currency-rates', icon: Wallet }, { label: 'Currency converter', to: '/settings/currency-converter', icon: ArrowLeftRight }, { label: 'Security', to: '/settings/security', icon: ShieldCheck }] },
];
const roleAccess: Record<Role, string[]> = {
  Owner: navigation.flatMap(g => g.items.map(i => i.to)),
  Admin: navigation.flatMap(g => g.items.map(i => i.to)).filter(to => to !== '/settings/business' && to !== '/subscription' && to !== '/settings/currency-rates'),
  Employee: ['/dashboard', '/transactions', '/accounts', '/categories', '/customers', '/invoices', '/vendors', '/bills', '/recurring', '/documents', '/inventory', '/reports', '/insights', '/notifications', '/settings/security', '/settings/currency-converter'],
};


function Sidebar({ mobileOpen, closeMobile }: { mobileOpen: boolean; closeMobile: () => void }) {
  const { data, role } = useApp();
  const allowed = roleAccess[role];
  const unread = data.notifications.filter(n => !n.readAt).length;
  return <>
    {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={closeMobile}/>}
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark">M</div><div className="brand-name"><strong>Munshee</strong></div><button className="icon-button mobile-sidebar-close" onClick={closeMobile} aria-label="Close navigation"><X size={18}/></button></div>
      <div className="workspace-switch"><div className="workspace-avatar">{data.settings.name.split(" ").map(v=>v[0]).slice(0,2).join("").toUpperCase()}</div><div className="workspace-meta"><strong>{data.settings.name}</strong><span>{role} workspace</span></div><ChevronDown size={15}/></div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {navigation.map(group => {
          const visibleItems = group.items.filter(item => allowed.includes(item.to));
          if (!visibleItems.length) return null;
          return <div className="nav-group" key={group.group}><div className="nav-label">{group.group}</div>{visibleItems.map(item => {
            const Icon = item.icon;
            return <NavLink key={item.to} to={item.to} onClick={closeMobile} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={17} strokeWidth={1.8}/><span>{item.label}</span>{item.to === '/notifications' && unread > 0 && <span className="nav-count">{unread}</span>}</NavLink>;
          })}</div>;
        })}
      </nav>
      <div className="sidebar-bottom"><div className="plan-box"><div className="plan-row"><span>{data.subscription.plan} plan</span><strong>{Math.round((data.subscription.documentsUsed / data.subscription.documentsLimit) * 100)}%</strong></div><div className="plan-progress"><span style={{ width: `${Math.min(100, data.subscription.documentsUsed / data.subscription.documentsLimit * 100)}%` }}/></div><small>{data.subscription.documentsUsed} of {data.subscription.documentsLimit} monthly documents</small><NavLink to="/subscription">View plan <span>↗</span></NavLink></div></div>
    </aside>
  </>;
}

function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { data, role, signOut, currentUser } = useApp();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate(); const location = useLocation();
  const user = { name: currentUser?.name || 'Munshee user', email: currentUser?.email || '', initials: String(currentUser?.name || 'M').split(' ').map((v:string)=>v[0]).slice(0,2).join('').toUpperCase() }; 
  const currentLabel = navigation.flatMap(group => group.items).find(item => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))?.label ?? 'Workspace';
  const destinations = useMemo(() => navigation.flatMap(g => g.items).filter(item => roleAccess[role].includes(item.to) && item.label.toLowerCase().includes(search.toLowerCase())), [role, search]);
  return <header className="topbar"><button className="menu-trigger" aria-label="Open navigation" onClick={onToggleSidebar}><Menu size={20}/></button><div className="breadcrumbs"><span>{data.settings.name}</span><span className="crumb-separator">/</span><strong>{currentLabel}</strong></div><div className="topbar-actions"><button className="global-search-trigger" onClick={() => setSearchOpen(true)}><Search size={16}/><span>Search pages</span><kbd>Ctrl K</kbd></button><button className="icon-button header-notification" aria-label="Notifications" onClick={() => navigate('/notifications')}><Bell size={18}/>{data.notifications.some(n => !n.readAt) && <i/>}</button><div className="profile-wrap"><button className="profile-trigger" onClick={() => setProfileOpen(open => !open)} aria-expanded={profileOpen}><span className="avatar">{user.initials}</span><span className="profile-meta"><strong>{user.name}</strong><small>{role}</small></span><ChevronDown size={15}/></button>{profileOpen && <><button className="click-catcher" aria-label="Close profile menu" onClick={() => setProfileOpen(false)}/><div className="profile-menu"><div className="profile-menu-heading">Signed in account</div><div className="profile-role"><span className="avatar avatar-small">{user.initials}</span><span><strong>{user.name}</strong><small>{user.email}</small></span><BadgeCheck size={16} className="role-check"/></div><div className="profile-menu-divider"/><NavLink className="profile-menu-link" to="/settings/security" onClick={() => setProfileOpen(false)}><LockKeyhole size={15}/> Security settings</NavLink><button className="profile-menu-link signout-link" onClick={() => { setProfileOpen(false); signOut(); navigate('/login'); }}><LogOut size={15}/> Sign out</button></div></>}</div></div>
    <Dialog open={searchOpen} onOpenChange={setSearchOpen} title="Search workspace" description="Find a page to open. Search Munshee workspace pages." size="sm"><div className="global-search-content"><Field label="Search pages"><Input autoFocus placeholder="Try invoices or reports…" value={search} onChange={e => setSearch(e.target.value)}/></Field><div className="global-search-results">{destinations.length ? destinations.map(item => <button key={item.to} onClick={() => { navigate(item.to); setSearchOpen(false); setSearch(''); }}><span>{item.label}</span><span className="search-open-label">Open →</span></button>) : <p>No matching pages.</p>}</div></div></Dialog>
  </header>;
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return <div className="app-shell"><Sidebar mobileOpen={mobileOpen} closeMobile={() => setMobileOpen(false)}/><div className="main-shell"><Header onToggleSidebar={() => setMobileOpen(true)}/><main className="main-content"><Outlet/></main><footer className="app-footer"><span>© 2026 Munshee</span><span>Made for clear business finances</span><span>Connected to your Munshee workspace</span></footer></div></div>;
}

export function RoleGuard({ children, allow }: { children: ReactNode; allow: Role[] }) {
  const { role } = useApp();
  if (allow.includes(role)) return <>{children}</>;
  return <div className="restricted-page"><div className="restricted-icon"><LockKeyhole size={25}/></div><h1>Restricted area</h1><p>This screen is not available for your current <strong>{role}</strong> role. Switch to an allowed role using the profile menu to preview the full interface.</p><Button variant="secondary" onClick={() => window.history.back()}>Go back</Button></div>;
}
