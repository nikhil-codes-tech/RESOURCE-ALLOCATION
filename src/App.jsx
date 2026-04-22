import { useState, useEffect, useRef, useCallback } from 'react';
import './style.css';
import api from './api/client.js';
import { connectSocket, disconnectSocket } from './socket/index.js';

/* ═══════════════════ API HELPER ═══════════════════ */
// Axios-powered wrapper — same interface as before so all components work unchanged.
// api/client.js handles: JWT interceptors, auto-refresh on 401, env-based URL.
const API = {
  getToken: () => localStorage.getItem('ngone_token'),
  getRefresh: () => localStorage.getItem('ngone_refresh'),
  setToken: (t) => { localStorage.setItem('ngone_token', t); },
  setRefresh: (t) => { localStorage.setItem('ngone_refresh', t); },
  removeToken: () => { localStorage.removeItem('ngone_token'); localStorage.removeItem('ngone_refresh'); },
  // Axios client auto-unwraps { success, data } via response interceptor.
  // These helpers strip the axios response envelope to return raw data.
  get: async (url) => {
    // Strip /api prefix if present — axios baseURL already includes it
    const path = url.replace(/^\/api/, '');
    const res = await api.get(path);
    return res.data;
  },
  post: async (url, body) => {
    const path = url.replace(/^\/api/, '');
    const res = await api.post(path, body);
    return res.data;
  },
  put: async (url, body) => {
    const path = url.replace(/^\/api/, '');
    const res = await api.put(path, body);
    return res.data;
  },
  patch: async (url, body) => {
    const path = url.replace(/^\/api/, '');
    const res = await api.patch(path, body);
    return res.data;
  },
  del: async (url) => {
    const path = url.replace(/^\/api/, '');
    const res = await api.delete(path);
    return res.data;
  },
};

/* ═══ SCROLL REVEAL HOOK ═══ */
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('visible'); obs.unobserve(el); } }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}
function Reveal({ children, className = 'reveal', delay = 0, style }) {
  const ref = useReveal();
  return <div ref={ref} className={className} style={{ transitionDelay: `${delay}ms`, ...style }}>{children}</div>;
}

/* ═══════════════════ STATIC DATA ═══════════════════ */
const TICKERS = [
  '\uD83D\uDFE0 New: Flood Relief in Assam \u2014 50 volunteers deployed',
  '\uD83D\uDFE2 200 volunteers needed in Bihar for post-flood recovery',
  '\uD83D\uDFE1 Healthcare camp starting \u2014 Rajasthan, Jodhpur district',
  '\uD83D\uDFE0 Women\u2019s SHG training programme \u2014 Uttar Pradesh',
  '\uD83D\uDFE2 School kit distribution completed in Odisha \u2014 8,400 kits',
  '\u2764\uFE0F New monthly donor milestone: 3,200 supporters strong!',
];

const IMPACT_IMAGES = [
  { src:'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&h=700&fit=crop', label:'Education, Bihar' },
  { src:'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=700&fit=crop', label:'Health Camp, Rajasthan' },
  { src:'https://images.unsplash.com/photo-1607748862156-7c548e7e98f4?w=600&h=400&fit=crop', label:'SHG Meeting, UP' },
  { src:'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=600&h=400&fit=crop', label:'Disaster Relief, Assam' },
  { src:'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600&h=400&fit=crop', label:'Farmer Training, MP' },
  { src:'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=400&h=400&fit=crop', label:'Community Gathering' },
  { src:'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&h=400&fit=crop', label:'Children Learning' },
];

/* ═══════════════════ APP ═══════════════════ */
export default function App() {
  const [page, setPage] = useState('home');
  const [pageKey, setPageKey] = useState(0);
  const navRef = useRef(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('volunteer');
  const [userName, setUserName] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [showNotif, setShowNotif] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState(null);
  const [detailProg, setDetailProg] = useState(null);
  const [programmes, setProgrammes] = useState([]);
  const [testimonials, setTestimonials] = useState([]);

  // ── Demo/fallback data ──
  const DEMO_PROGRAMMES = [
    { id: 1, title: 'Disaster Response', emoji: '\u26A1', color: '#EF4444', img: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=600&h=400&fit=crop', desc: 'Rapid deployment of trained volunteers within 24 hours of any natural disaster across India.', tags: ['Rescue', 'Relief', 'Rehabilitation'], stat1: '2,400+ ops' },
    { id: 2, title: 'Education', emoji: '\uD83D\uDCDA', color: '#3B82F6', img: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&h=400&fit=crop', desc: 'Running 180+ learning centres, scholarship programmes, and digital literacy camps across rural India.', tags: ['Schools', 'Digital', 'Scholarships'], stat1: '8,400 students' },
    { id: 3, title: 'Healthcare', emoji: '\uD83C\uDFE5', color: '#10B981', img: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop', desc: 'Mobile medical units, free health camps, and mental health counselling in underserved communities.', tags: ['Medical Camps', 'Mental Health', 'Nutrition'], stat1: '120+ camps/yr' },
    { id: 4, title: 'Women Empowerment', emoji: '\uD83D\uDCAA', color: '#EC4899', img: 'https://images.unsplash.com/photo-1607748862156-7c548e7e98f4?w=600&h=400&fit=crop', desc: 'Self-help groups, micro-finance, skill training, and legal aid for women in rural India.', tags: ['SHG', 'Microfinance', 'Skills'], stat1: '3,200 SHGs' },
    { id: 5, title: 'Livelihood', emoji: '\uD83C\uDF31', color: '#F59E0B', img: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600&h=400&fit=crop', desc: 'Farmer training, organic agriculture, and market linkage programmes creating sustainable incomes.', tags: ['Agriculture', 'Training', 'Markets'], stat1: '18,000 farmers' },
    { id: 6, title: 'Grassroots Innovation', emoji: '\uD83D\uDCA1', color: '#8B5CF6', img: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=600&h=400&fit=crop', desc: 'Supporting community-led solutions and local innovations that drive scalable social change.', tags: ['Innovation', 'Community', 'Scale'], stat1: '450+ projects' },
  ];
  const DEMO_TESTIMONIALS = [
    { avatar: 'PM', name: 'Priya Mehta', role: 'Volunteer', city: 'Mumbai', quote: 'Joining NG\uD83D\uDE0ANE was the best decision of my life. I got deployed to Bihar within 48 hours and helped rescue 200+ families from floodwaters.' },
    { avatar: 'RK', name: 'Rajesh Kumar', role: 'NGO Partner', city: 'Lucknow', quote: 'NG\uD83D\uDE0ANE gave our small NGO the visibility and volunteer network we desperately needed. Our impact doubled in one year.' },
    { avatar: 'AS', name: 'Aisha Sheikh', role: 'Donor', city: 'Delhi', quote: 'I love the transparency. Every rupee I donate, I can track exactly where it goes. The 80G receipts are instant. Truly trustworthy.' },
  ];
  const DEMO_NOTIFS = [
    { id: 1, text: '\uD83D\uDFE0 You\'ve been invited to join Bihar Flood Relief team by Arun Mehta', time: '2 hours ago', read: false, actions: true },
    { id: 2, text: '\u2705 Check-in confirmed for Assam Medical Camp. +50 points earned!', time: '5 hours ago', read: false },
    { id: 3, text: '\uD83D\uDCCA Weekly report: You\'re now a Responder! 3 tasks completed this week.', time: '1 day ago', read: true },
    { id: 4, text: '\uD83C\uDFC5 New badge earned: Crisis Hero \u2014 deployed to 5+ disaster zones', time: '2 days ago', read: true },
  ];
  const DEMO_TASKS = [
    { id: 1, title: 'Bihar Flood Relief', location: 'Patna, Bihar', emoji: '\uD83C\uDF0A', urgency: 5, filled: 12, needed: 20, programme: 'Disaster' },
    { id: 2, title: 'Medical Camp Setup', location: 'Jodhpur, Rajasthan', emoji: '\uD83C\uDFE5', urgency: 4, filled: 6, needed: 8, programme: 'Healthcare' },
    { id: 3, title: 'School Kit Distribution', location: 'Bhubaneswar, Odisha', emoji: '\uD83D\uDCDA', urgency: 3, filled: 14, needed: 15, programme: 'Education' },
    { id: 4, title: 'SHG Training Workshop', location: 'Varanasi, UP', emoji: '\uD83D\uDCAA', urgency: 2, filled: 3, needed: 6, programme: 'Women' },
  ];
  const DEMO_VOLUNTEERS = [
    { id: 1, name: 'Arun Mehta', avatar: 'AM', city: 'Mumbai', skills: ['Medical', 'Rescue'], points: 2140, online: true, distance: '3.2 km' },
    { id: 2, name: 'Priya Sharma', avatar: 'PS', city: 'Delhi', skills: ['Logistics', 'Driving'], points: 1860, online: true, distance: '5.1 km' },
    { id: 3, name: 'Rahul Singh', avatar: 'RS', city: 'Patna', skills: ['Swimming', 'First Aid'], points: 1420, online: false, distance: '12 km' },
    { id: 4, name: 'Sneha Reddy', avatar: 'SR', city: 'Hyderabad', skills: ['Communication', 'Teaching'], points: 980, online: true, distance: '8.4 km' },
  ];
  const DEMO_TEAMS = [
    { id: 1, task: 'Bihar Flood Relief', location: 'Patna', programme: 'Disaster', urgency: 'urgent', slots: 4, filled: 2, members: [{ id: 'a1', name: 'Arun M', avatar: 'AM' }, { id: 'a2', name: 'Priya S', avatar: 'PS' }] },
    { id: 2, task: 'Rajasthan Health Camp', location: 'Jodhpur', programme: 'Healthcare', urgency: 'soon', slots: 5, filled: 3, members: [{ id: 'b1', name: 'Dr. Ravi', avatar: 'DR' }] },
    { id: 3, task: 'UP Women SHG Training', location: 'Varanasi', programme: 'Women', urgency: 'flexible', slots: 6, filled: 1, members: [] },
  ];

  useEffect(() => {
    const h = () => {
      if (navRef.current) {
        if (window.scrollY > 10) navRef.current.classList.add('scrolled');
        else navRef.current.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  // Auth check on mount — backend returns { user } inside data
  useEffect(() => {
    const token = API.getToken();
    if (token) {
      API.get('/api/auth/me').then(data => {
        const user = data?.user || data;
        setLoggedIn(true);
        setUserName(user.name || '');
        setUserRole(user.role?.toLowerCase() || 'volunteer');
        setCurrentUser(user);
      }).catch(() => API.removeToken());
    }
  }, []);

  // Fetch public data — backend returns { programmes } or raw array
  useEffect(() => {
    API.get('/api/programmes').then(data => {
      const list = data?.programmes || (Array.isArray(data) ? data : []);
      setProgrammes(list.length > 0 ? list : DEMO_PROGRAMMES);
    }).catch(() => setProgrammes(DEMO_PROGRAMMES));
    setTestimonials(DEMO_TESTIMONIALS);
  }, []);

  // Fetch notifications when logged in
  useEffect(() => {
    if (loggedIn) {
      API.get('/api/notifications').then(data => {
        const list = data?.notifications || (Array.isArray(data) ? data : []);
        setNotifs(list.length > 0 ? list.map(n => ({
          id: n.id, text: n.body || n.title, time: new Date(n.createdAt).toLocaleString(),
          read: n.isRead, actions: n.type === 'team_invite' && !n.isRead,
        })) : DEMO_NOTIFS);
      }).catch(() => setNotifs(DEMO_NOTIFS));
    }
  }, [loggedIn]);

  const nav = useCallback((p, prog) => {
    if (p === page && !prog) return;
    setMobileMenu(false);
    if (prog) setDetailProg(prog);
    setPage(p);
    setPageKey(k => k + 1);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [page]);

  const showToastMsg = useCallback((msg) => {
    setToast({ msg, out: false });
    setTimeout(() => setToast(t => t ? { ...t, out: true } : null), 2800);
    setTimeout(() => setToast(null), 3100);
  }, []);

  const login = (role, name, user) => {
    setUserRole(role || 'volunteer'); setUserName(name || 'Kajal Sharma'); setCurrentUser(user || null);
    setLoggedIn(true);
    setPage('dashboard');
    setPageKey(k => k + 1);
    window.scrollTo({ top: 0, behavior: 'instant' });
    showToastMsg(`Welcome, ${(name || 'Kajal').split(' ')[0]}! \u2705`);
    // Connect socket for real-time features
    const token = API.getToken();
    if (token) try { connectSocket(token); } catch {}
    API.get('/api/notifications').then(data => {
      const list = data?.notifications || (Array.isArray(data) ? data : []);
      if (list.length > 0) setNotifs(list.map(n => ({ id: n.id, text: n.body || n.title, time: new Date(n.createdAt).toLocaleString(), read: n.isRead, actions: n.type === 'team_invite' && !n.isRead })));
      else setNotifs(DEMO_NOTIFS);
    }).catch(() => setNotifs(DEMO_NOTIFS));
  };

  const logout = () => { setLoggedIn(false); setCurrentUser(null); API.removeToken(); disconnectSocket(); nav('home'); };

  const unreadCount = notifs.filter(n => !n.read).length;
  const initials = userName ? userName.split(' ').map(w => w[0]).join('').slice(0, 2) : '??';
  const S = ({ children, d = 0 }) => <div style={{ animation: `fadeUpSubtle 0.4s ${d}ms cubic-bezier(0.22,1,0.36,1) both` }}>{children}</div>;

  /* ═══ NAVBAR ═══ */
  const Nav = () => {
    const links = loggedIn
      ? [{ l: 'Home', p: 'home' }, { l: 'Dashboard', p: 'dashboard' }, { l: 'Donate', p: 'donate' }]
      : [{ l: 'Home', p: 'home' }, { l: 'Programmes', p: 'home' }, { l: 'Impact', p: 'home' }, { l: 'About', p: 'home' }, { l: 'Donate', p: 'donate' }];
    return (
      <>
        <nav ref={navRef} className="ng-nav">
          <div className="ng-nav-logo" onClick={() => nav('home')}>
            <div className="ng-nav-logo-icon">{'\uD83D\uDE0A'}</div>
            <span className="ng-nav-logo-text">NG{'\uD83D\uDE0A'}NE</span>
          </div>
          <div className="ng-links">
            {links.map(l => <div key={l.l} className={`ng-link${page === l.p ? ' active' : ''}`} onClick={() => nav(l.p)}>{l.l}</div>)}
          </div>
          <div className="ng-right">
            <div className="ng-hamburger" onClick={() => setMobileMenu(m => !m)}><span /><span /><span /></div>
            <span className="darpan-badge" onClick={() => nav('darpan')} style={{ padding: '5px 14px', borderRadius: 99, border: '1px solid var(--gold)', fontSize: 11, fontWeight: 700, color: 'var(--gold)', whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.22s', letterSpacing: '0.04em' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.color = '#fff'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--gold)'; }}>DARPAN Verified</span>
            {loggedIn ? (
              <>
                <div style={{ position: 'relative', width: 40, height: 40, borderRadius: 12, background: 'var(--saffron-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.22s' }} onClick={() => setShowNotif(true)} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,107,53,0.15)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--saffron-lt)'}>
                  <span style={{ fontSize: 17 }}>{'\uD83D\uDD14'}</span>
                  {unreadCount > 0 && <span className="notif-dot" />}
                </div>
                <div className="ng-avatar" style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(135deg,var(--saffron),#FF8F65)', fontSize: 13, boxShadow: '0 2px 10px rgba(255,107,53,0.2)' }}>{initials}</div>
                <button className="btn-ghost" onClick={logout} style={{ fontSize: 13, padding: '7px 16px' }}>Sign out</button>
              </>
            ) : (
              <>
                <button className="btn-outline" onClick={() => nav('login')} style={{ fontSize: 13 }}>Log In</button>
                <button className="btn-saffron" onClick={() => nav('donate')} style={{ fontSize: 13 }}>Donate Now</button>
              </>
            )}
          </div>
        </nav>
        {mobileMenu && <div className="ng-mobile-menu">{links.map(l => <div key={l.l} className={`ng-link${page === l.p ? ' active' : ''}`} onClick={() => { nav(l.p); setMobileMenu(false); }}>{l.l}</div>)}</div>}
      </>
    );
  };

  /* ═══ NOTIF DRAWER ═══ */
  const NotifDrawer = () => {
    if (!showNotif) return null;
    const handleAccept = async (n) => {
      try { await API.post('/api/notifications/mark-read', { notificationIds: [n.id] }); } catch {}
      setNotifs(ns => ns.map(x => x.id === n.id ? { ...x, read: true, actions: false } : x));
      showToastMsg('Accepted! Team updated.');
    };
    const handleReadAll = async () => {
      try { await API.post('/api/notifications/mark-read', {}); } catch {}
      setNotifs(ns => ns.map(n => ({ ...n, read: true }))); showToastMsg('All marked read \u2705');
    };
    return (
      <>
        <div className="ng-overlay" onClick={() => setShowNotif(false)} />
        <div className="ng-drawer">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
            <div>
              <h3 style={{ fontWeight: 900, fontSize: 22 }}>Notifications</h3>
              <p style={{ color: 'var(--sub)', fontSize: 13, marginTop: 2 }}>{unreadCount} unread</p>
            </div>
            <button onClick={() => setShowNotif(false)} style={{ background: 'none', fontSize: 22, color: 'var(--sub)', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--saffron-lt)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>{'\u2715'}</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifs.map((n, i) => (
              <S key={n.id} d={i * 40}>
                <div style={{ padding: '16px 18px', borderRadius: 16, background: n.read ? 'var(--white)' : 'var(--saffron-lt)', border: `1px solid ${n.read ? 'var(--border)' : 'rgba(255,107,53,0.15)'}`, transition: 'all 0.2s' }}>
                  <p style={{ fontSize: 14, fontWeight: n.read ? 400 : 600, lineHeight: 1.55 }}>{n.text}</p>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{n.time}</p>
                  {n.actions && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button className="btn-saffron" style={{ padding: '7px 18px', fontSize: 12 }} onClick={() => handleAccept(n)}>Accept</button>
                      <button className="btn-outline" style={{ padding: '7px 18px', fontSize: 12 }}>Decline</button>
                    </div>
                  )}
                </div>
              </S>
            ))}
          </div>
          {notifs.length > 0 && <button className="btn-saffron full" onClick={handleReadAll} style={{ marginTop: 20, padding: '14px 0' }}>Mark all as read</button>}
        </div>
      </>
    );
  };

  /* ═══ CHAT MODAL ═══ */
  const ChatModal = () => {
    const DEMO_MSGS = [
      { sender: 'Arun Mehta', text: 'Team, we need to head to the eastern district by 6 AM tomorrow.', mine: false, time: '09:14' },
      { sender: 'Priya Sharma', text: 'Copy that. I\'ll arrange transport from the base camp.', mine: false, time: '09:16' },
      { sender: 'You', text: 'I\'ll bring the medical kit and water purification tablets.', mine: true, time: '09:18' },
      { sender: 'Rahul Singh', text: 'Great coordination everyone! Let\'s meet at the warehouse at 5:30 AM.', mine: false, time: '09:22' },
    ];
    const [msg, setMsg] = useState('');
    const [msgs, setMsgs] = useState([]);
    const [chatTab, setChatTab] = useState('chat');
    const [checklist, setChecklist] = useState([{ text: 'Set up medical station', done: true }, { text: 'Distribute relief kits', done: false }, { text: 'Report to coordinator', done: false }]);
    const ref = useRef(null);
    useEffect(() => {
      if (showChat && loggedIn) {
        // Backend: GET /api/chat/:teamId/messages
        API.get('/api/chat/1/messages').then(data => {
          const list = data?.messages || (Array.isArray(data) ? data : []);
          setMsgs(list.length > 0 ? list.map(m => ({
            sender: m.sender?.name || 'User', text: m.content, mine: m.senderId === currentUser?.id,
            time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          })) : DEMO_MSGS);
        }).catch(() => setMsgs(DEMO_MSGS));
      }
    }, [showChat]);
    useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [msgs]);
    if (!showChat) return null;
    const send = async () => {
      if (!msg.trim()) return;
      const newMsg = { sender: 'You', text: msg, mine: true, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      try { await API.post('/api/chat/1/messages', { content: msg }); } catch {}
      setMsgs(p => [...p, newMsg]);
      setMsg('');
    };
    return (
      <div className="ng-modal-bg" onClick={() => setShowChat(false)}>
        <div className="ng-modal" onClick={e => e.stopPropagation()} style={{ width: 480 }}>
          <div style={{ padding: '20px 28px', background: 'linear-gradient(135deg, var(--saffron), #FF8F65)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><h3 style={{ fontWeight: 800, fontSize: 18 }}>Team Chat</h3><p style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>Bihar Flood Relief {'\u00B7'} 4 members</p></div>
            <button onClick={() => setShowChat(false)} style={{ background: 'rgba(255,255,255,0.2)', fontSize: 16, color: '#fff', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{'\u2715'}</button>
          </div>
          <div style={{ display: 'flex', gap: 8, padding: '14px 28px', borderBottom: '1px solid var(--border)' }}>
            {['AM','PS','RS','KS'].map((a,i) => <div key={i} className="ng-avatar" style={{ width: 34, height: 34, borderRadius: 10, background: `hsl(${20+i*40}, 75%, 60%)`, fontSize: 11 }}>{a}</div>)}
          </div>
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)' }}>
            {['Chat', 'Checklist'].map(t => <button key={t} onClick={() => setChatTab(t.toLowerCase())} style={{ flex: 1, padding: '12px', fontSize: 13, fontWeight: 600, borderBottom: `2.5px solid ${chatTab === t.toLowerCase() ? 'var(--saffron)' : 'transparent'}`, color: chatTab === t.toLowerCase() ? 'var(--saffron)' : 'var(--sub)', background: 'none', transition: 'all 0.2s' }}>{t}</button>)}
          </div>
          {chatTab === 'chat' ? (
            <>
              <div ref={ref} style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '40vh', minHeight: 200 }}>
                {msgs.map((m, i) => (
                  <div key={i} style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', maxWidth: '78%', animation: `fadeUp 0.3s ${i*60}ms ease both` }}>
                    {!m.mine && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sub)', marginBottom: 4 }}>{m.sender}</div>}
                    <div style={{ padding: '11px 18px', borderRadius: m.mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: m.mine ? 'linear-gradient(135deg,var(--saffron),#FF8F65)' : '#F3F2EF', color: m.mine ? '#fff' : 'var(--text)', fontSize: 14, lineHeight: 1.55, boxShadow: m.mine ? '0 4px 12px rgba(255,107,53,0.15)' : 'none' }}>{m.text}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, textAlign: m.mine ? 'right' : 'left' }}>{m.time}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, background: 'var(--bg)' }}>
                <input className="ng-input" placeholder="Type a message..." value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} style={{ flex: 1 }} />
                <button className="btn-saffron" onClick={send} style={{ padding: '11px 24px', whiteSpace: 'nowrap' }}>Send</button>
              </div>
            </>
          ) : (
            <div style={{ padding: 28 }}>
              <h4 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Task Checklist</h4>
              {checklist.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border-lt)', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setChecklist(cl => cl.map((x, j) => j === i ? { ...x, done: !x.done } : x))}>
                  <span style={{ width: 26, height: 26, borderRadius: 8, border: `2px solid ${c.done ? 'var(--green)' : 'var(--border)'}`, background: c.done ? 'var(--green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', transition: 'all 0.3s', flexShrink: 0 }}>{c.done ? '\u2713' : ''}</span>
                  <span style={{ fontSize: 14, textDecoration: c.done ? 'line-through' : 'none', color: c.done ? 'var(--muted)' : 'var(--text)', transition: 'all 0.2s' }}>{c.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ═══════ HOME ═══════ */
  const Home = () => {
    const [counts, setCounts] = useState({ v: 0, n: 0, l: 0, s: 0 });
    const statsRef = useRef(null);
    const ran = useRef(false);
    useEffect(() => {
      const obs = new IntersectionObserver(([e]) => {
        if (e.isIntersecting && !ran.current) {
          ran.current = true;
          const tgt = { v: 15240, n: 890, l: 4200000, s: 28 };
          const dur = 2200; const st = Date.now();
          const tick = () => {
            const p = Math.min((Date.now() - st) / dur, 1);
            const ease = 1 - Math.pow(1 - p, 4);
            setCounts({ v: Math.round(tgt.v * ease), n: Math.round(tgt.n * ease), l: Math.round(tgt.l * ease), s: Math.round(tgt.s * ease) });
            if (p < 1) requestAnimationFrame(tick);
          }; tick();
        }
      }, { threshold: 0.3 });
      if (statsRef.current) obs.observe(statsRef.current);
      return () => obs.disconnect();
    }, []);

    return (
      <div className="page-enter">
        {/* HERO */}
        <section style={{ position: 'relative', minHeight: '94vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: '-5%', animation: 'kenburns 30s ease-in-out infinite' }}>
            <img src="/ngo-hero-bg.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
          </div>
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{ position: 'absolute', width: 6 + i * 4, height: 6 + i * 4, borderRadius: '50%', background: `rgba(245,166,35,${0.12 + i * 0.04})`, animation: `floatParticle ${10 + i * 3}s ease-in-out infinite`, animationDelay: `${i * 1.8}s`, left: `${8 + i * 12}%`, top: `${15 + (i % 4) * 20}%`, zIndex: 1 }} />
          ))}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(170deg, rgba(26,26,46,0.72) 0%, rgba(26,26,46,0.35) 40%, rgba(26,26,46,0.75) 100%)' }} />
          <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '80px 24px 140px', maxWidth: 740, color: '#fff' }}>
            <S d={0}><div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 22px', borderRadius: 99, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', fontSize: 13, fontWeight: 600, marginBottom: 32, backdropFilter: 'blur(12px)', letterSpacing: '0.03em' }}>{'\uD83C\uDDEE\uD83C\uDDF3'} Serving Communities Across Bharat Since 2010</div></S>
            <S d={100}><h1 className="hero-h1" style={{ fontFamily: "'Poppins',sans-serif", fontSize: 60, fontWeight: 900, lineHeight: 1.04, letterSpacing: '-0.04em', marginBottom: 24, textShadow: '0 4px 40px rgba(0,0,0,0.3)' }}>Empowering India,<br />One Community<br /><span style={{ background: 'linear-gradient(90deg, #F5A623, #FF6B35)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>at a Time</span></h1></S>
            <S d={200}><p style={{ fontSize: 18, opacity: 0.82, maxWidth: 580, margin: '0 auto 44px', lineHeight: 1.7, fontWeight: 300 }}>NG{'\uD83D\uDE0A'}NE connects passionate volunteers with grassroots NGOs, channeling resources where they matter most {'\u2014'} in the hands of real people.</p></S>
            <S d={300}>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn-saffron" onClick={() => nav('login')} style={{ padding: '17px 40px', fontSize: 16, borderRadius: 16, letterSpacing: '0.02em' }}>Join as Volunteer {'\uD83D\uDE4B'}</button>
                <button onClick={() => nav('donate')} style={{ padding: '17px 40px', fontSize: 16, borderRadius: 16, fontWeight: 700, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', color: 'var(--saffron)', border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', transition: 'all 0.25s' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 36px rgba(0,0,0,0.2)'; }} onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.12)'; }}>Donate Now {'\uD83D\uDC9B'}</button>
              </div>
            </S>
          </div>
          {/* Stats strip */}
          <div ref={statsRef} className="hero-stats" style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 48, background: 'rgba(26,26,46,0.82)', backdropFilter: 'blur(24px) saturate(1.5)', padding: '24px 64px', borderRadius: '24px 24px 0 0', zIndex: 3, flexWrap: 'wrap', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.06)', borderBottom: 'none' }}>
            {[
              { l: 'Volunteers', v: counts.v.toLocaleString() + '+', e: '\uD83D\uDE4B' },
              { l: 'NGOs', v: counts.n.toLocaleString() + '+', e: '\uD83C\uDFE2' },
              { l: 'Lives Touched', v: (counts.l / 1000000).toFixed(1) + 'M+', e: '\u2764\uFE0F' },
              { l: 'States', v: String(counts.s), e: '\uD83C\uDDEE\uD83C\uDDF3' },
            ].map(s => (
              <div key={s.l} style={{ textAlign: 'center', color: '#fff' }}>
                <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em' }}>{s.v}</div>
                <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}><span style={{ fontSize: 11 }}>{s.e}</span> {s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* TICKER */}
        <div style={{ overflow: 'hidden', background: 'linear-gradient(90deg, var(--saffron), var(--saffron-dk), var(--saffron))', padding: '13px 0' }}>
          <div style={{ display: 'flex', gap: 72, animation: 'ticker 35s linear infinite', whiteSpace: 'nowrap' }}>
            {[...TICKERS, ...TICKERS, ...TICKERS].map((t, i) => <span key={i} style={{ fontSize: 14, color: '#fff', fontWeight: 500, opacity: 0.95 }}>{t}</span>)}
          </div>
        </div>

        {/* WHY NGONE */}
        <section className="ng-page" style={{ paddingTop: 72, paddingBottom: 56 }}>
          <Reveal><div className="section-head"><h2>Why NG{'\uD83D\uDE0A'}NE?</h2><p>A platform built with purpose, powered by people who care</p><div className="accent-line" /></div></Reveal>
          <div className="why-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
            {[
              { e: '\uD83C\uDF10', t: 'Pan-India Reach', d: 'Operating across 28 states with 890+ grassroots NGO partners', c: '#3B82F6' },
              { e: '\u26A1', t: 'Rapid Deployment', d: 'Volunteers deployed within 24 hours of any disaster or community need', c: 'var(--saffron)' },
              { e: '\uD83D\uDD12', t: 'DARPAN Verified', d: 'Fully registered with NITI Aayog DARPAN \u2014 transparent, compliant', c: 'var(--gold)' },
              { e: '\uD83D\uDC9A', t: '100% Impact', d: 'Every rupee donated goes directly to communities. Zero overhead.', c: 'var(--green)' },
            ].map((f, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="ng-card ng-card-lift" style={{ textAlign: 'center', padding: '32px 22px', borderBottom: `3px solid ${f.c}`, height: '100%' }}>
                  <div style={{ width: 60, height: 60, borderRadius: 18, background: `${f.c}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, margin: '0 auto 16px' }}>{f.e}</div>
                  <h4 style={{ fontWeight: 800, fontSize: 17, marginBottom: 10 }}>{f.t}</h4>
                  <p style={{ color: 'var(--sub)', fontSize: 14, lineHeight: 1.65 }}>{f.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* PROGRAMMES */}
        <section style={{ background: 'var(--white)', borderTop: '1px solid var(--border)', padding: '72px 24px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Reveal><div className="section-head"><h2>Our Programmes</h2><p>Six pillars of transformation across rural and urban India</p><div className="accent-line" /></div></Reveal>
            <div className="grid-3x2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }}>
              {programmes.map((p, i) => (
                <Reveal key={p.id} delay={80 + i * 60}>
                  <div className="ng-card ng-card-lift" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column' }} onClick={() => nav('programme', p)}>
                    <div className="img-hover-zoom" style={{ height: 160, borderRadius: 0, flexShrink: 0, position: 'relative' }}>
                      <img src={p.img} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />
                      <div style={{ position: 'absolute', bottom: 14, left: 16 }}>
                        <span className="ng-chip" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', color: p.color, fontWeight: 700, fontSize: 12 }}>{p.emoji} {p.title}</span>
                      </div>
                    </div>
                    <div style={{ padding: '20px 22px 22px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <p style={{ color: 'var(--sub)', fontSize: 14, lineHeight: 1.65, marginBottom: 16, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>{p.desc || p.description}</p>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 16 }}>
                        {(p.tags || []).slice(0, 3).map(t => <span key={t} className="ng-chip" style={{ background: `${p.color}10`, color: p.color, fontSize: 10, padding: '3px 10px' }}>{t}</span>)}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTop: '1px solid var(--border-lt)' }}>
                        <span style={{ fontSize: 13, color: p.color, fontWeight: 700 }}>Learn More {'\u2192'}</span>
                        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{p.stat1}</span>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* IMPACT PHOTO WALL */}
        <section style={{ padding: '80px 24px', borderTop: '1px solid var(--border)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Reveal><div className="section-head"><h2>Real People. Real Change.</h2><p>Every number represents a life transformed</p><div className="accent-line" /></div></Reveal>
            <div className="impact-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(2, 210px)', gap: 14, marginBottom: 48 }}>
              {IMPACT_IMAGES.map((img, i) => (
                <Reveal key={i} className="reveal-scale" delay={i * 60} style={{ gridColumn: i < 2 ? 'span 1' : i === 2 ? 'span 2' : 'span 1', gridRow: i < 2 ? 'span 2' : 'span 1' }}>
                  <div className="img-hover-zoom" style={{ position: 'relative', cursor: 'pointer', height: '100%' }}>
                    <img src={img.src} alt={img.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(26,26,46,0.75) 0%, transparent 50%)', display: 'flex', alignItems: 'flex-end', padding: 18, opacity: 0, transition: 'opacity 0.4s cubic-bezier(0.22,1,0.36,1)' }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                      <div><span style={{ color: '#fff', fontSize: 14, fontWeight: 700, display: 'block' }}>{img.label}</span><span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>NG{'\uD83D\uDE0A'}NE Impact</span></div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
            <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
              {[
                { v: '15,240+', l: 'Volunteers Mobilised', e: '\uD83D\uDE4B' },
                { v: '4.2M+', l: 'Lives Directly Impacted', e: '\u2764\uFE0F' },
                { v: '890+', l: 'NGO Partners', e: '\uD83C\uDFE2' },
                { v: '28', l: 'States Covered', e: '\uD83C\uDDEE\uD83C\uDDF3' },
              ].map((s, i) => (
                <Reveal key={s.l} delay={i * 80}>
                  <div style={{ padding: '30px 22px', borderRadius: 20, background: 'linear-gradient(135deg, var(--saffron), #FF8F65, var(--gold))', backgroundSize: '200% 200%', animation: 'gradShift 6s ease infinite', color: '#fff', textAlign: 'center', boxShadow: '0 8px 32px rgba(255,107,53,0.2)', transition: 'transform 0.3s', cursor: 'default' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = ''}>
                    <div style={{ fontSize: 18, marginBottom: 6 }}>{s.e}</div>
                    <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 36, fontWeight: 900, letterSpacing: '-0.04em' }}>{s.v}</div>
                    <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 500, marginTop: 4 }}>{s.l}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section style={{ background: 'var(--white)', borderTop: '1px solid var(--border)', padding: '80px 24px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Reveal><div className="section-head"><h2>Voices from the Ground</h2><p>Real stories from the people we serve and the volunteers who serve</p><div className="accent-line" /></div></Reveal>
            <div className="test-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }}>
              {testimonials.map((t, i) => (
                <Reveal key={i} delay={i * 100}>
                  <div className="ng-card-gradient" style={{ paddingTop: 36, position: 'relative', height: '100%' }}>
                    <span style={{ position: 'absolute', top: 8, right: 20, fontSize: 60, background: 'linear-gradient(135deg, var(--saffron), var(--gold))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', opacity: 0.15, fontFamily: 'Georgia, serif', lineHeight: 1 }}>{'\u201C'}</span>
                    <p style={{ fontStyle: 'italic', color: 'var(--sub)', fontSize: 15, lineHeight: 1.8, marginBottom: 24, position: 'relative', zIndex: 1 }}>{'\u201C'}{t.quote}{'\u201D'}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 18, borderTop: '1px solid var(--border-lt)' }}>
                      <div className="ng-avatar" style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,var(--saffron),#FF8F65)', fontSize: 16, boxShadow: '0 4px 14px rgba(255,107,53,0.2)' }}>{t.avatar}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{t.name}</div>
                        <div style={{ fontSize: 13, color: 'var(--muted)' }}>{t.role}, {t.city}</div>
                      </div>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                        {[...Array(5)].map((_, j) => <span key={j} style={{ color: 'var(--gold)', fontSize: 13 }}>{'\u2605'}</span>)}
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section style={{ borderTop: '1px solid var(--border)', padding: '72px 24px' }}>
          <div className="grid-2" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}>
            <Reveal className="reveal-left">
              <div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
                  <span className="ng-chip" style={{ background: 'var(--saffron-lt)', color: 'var(--saffron)' }}>Est. 2010</span>
                  <span className="ng-chip" style={{ background: 'var(--green-lt)', color: 'var(--green)' }}>80G / 12A Eligible</span>
                  <span className="ng-chip" style={{ background: 'var(--gold-lt)', color: 'var(--gold)' }}>DARPAN: NG/2010/0045123</span>
                </div>
                <h2 style={{ fontWeight: 900, fontSize: 34, marginBottom: 18 }}>About NG{'\uD83D\uDE0A'}NE</h2>
                <p style={{ color: 'var(--sub)', fontSize: 15, lineHeight: 1.75, marginBottom: 14 }}>Founded in 2010, NG{'\uD83D\uDE0A'}NE was born from a simple belief: that every Indian deserves access to quality education, healthcare, and livelihood opportunities.</p>
                <p style={{ color: 'var(--sub)', fontSize: 15, lineHeight: 1.75, marginBottom: 14 }}>Today, we are a network of 15,000+ volunteers, 890+ NGO partners, and countless community leaders working across 28 states to transform India from the grassroots up.</p>
                <p style={{ color: 'var(--sub)', fontSize: 15, lineHeight: 1.75, marginBottom: 22 }}>We are registered with NITI Aayog DARPAN, eligible for CSR funding, and work in partnership with government bodies at state and national levels.</p>
                <p style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>Partners: Ministry of Rural Development {'\u00B7'} NDRF {'\u00B7'} UNICEF India {'\u00B7'} Gates Foundation</p>
              </div>
            </Reveal>
            <Reveal className="reveal-right" delay={100}>
              <div style={{ borderRadius: 24, overflow: 'hidden', aspectRatio: '4/3', boxShadow: '0 20px 60px rgba(255,107,53,0.12)' }}>
                <img src="/ngo-hero-bg.jpg" alt="About NGONE" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
              </div>
            </Reveal>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ background: '#1A1A2E', color: '#fff' }}>
          <div style={{ height: 4, background: 'linear-gradient(90deg, var(--saffron), var(--gold), var(--green), var(--saffron))', backgroundSize: '300% 100%', animation: 'gradShift 8s ease infinite' }} />
          <div style={{ padding: '60px 24px 28px' }}>
            <div className="footer-grid" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr', gap: 36, marginBottom: 44 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div className="ng-nav-logo-icon" style={{ width: 38, height: 38, borderRadius: 12 }}>{'\uD83D\uDE0A'}</div>
                  <span style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: 22, background: 'linear-gradient(135deg,var(--saffron),var(--gold))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>NG{'\uD83D\uDE0A'}NE</span>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.7, marginBottom: 22 }}>Connecting Hearts. Transforming Lives.<br />Powered by DARPAN {'\u00B7'} Built for Bharat</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  {['\uD83D\uDC26', '\uD83D\uDD35', '\uD83D\uDCD8', '\uD83D\uDCF8'].map((e, i) => (
                    <div key={i} style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.22s', fontSize: 16 }} onMouseEnter={e2 => { e2.currentTarget.style.background = 'var(--saffron)'; e2.currentTarget.style.transform = 'translateY(-3px)'; }} onMouseLeave={e2 => { e2.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e2.currentTarget.style.transform = ''; }}>{e}</div>
                  ))}
                </div>
              </div>
              <div>
                <h4 style={{ fontWeight: 700, marginBottom: 18, fontSize: 14, color: 'var(--gold)' }}>Programmes</h4>
                {programmes.map(p => <p key={p.id} style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 11, cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.45)'} onClick={() => nav('programme', p)}>{p.title}</p>)}
              </div>
              <div>
                <h4 style={{ fontWeight: 700, marginBottom: 18, fontSize: 14, color: 'var(--gold)' }}>Quick Links</h4>
                {[{ l: 'About Us', p: 'home' }, { l: 'DARPAN Registration', p: 'darpan' }, { l: 'Volunteer', p: 'login' }, { l: 'Donate', p: 'donate' }].map(lnk => <p key={lnk.l} style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 11, cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.45)'} onClick={() => nav(lnk.p)}>{lnk.l}</p>)}
              </div>
              <div>
                <h4 style={{ fontWeight: 700, marginBottom: 18, fontSize: 14, color: 'var(--gold)' }}>Contact</h4>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 11, lineHeight: 1.6 }}>{'\uD83D\uDCCD'} 42, Community Lane, CP, New Delhi 110001</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 11 }}>{'\uD83D\uDCDE'} +91 11 2345 6789</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 11 }}>{'\uD83D\uDCE7'} hello@ngone.org.in</p>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 22, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
              {'\u00A9'} 2026 NG{'\uD83D\uDE0A'}NE {'\u00B7'} NITI Aayog DARPAN Registered {'\u00B7'} Built with {'\u2764\uFE0F'} for Bharat
            </div>
          </div>
        </footer>
      </div>
    );
  };

  /* ═══════ LOGIN ═══════ */
  const Login = () => {
    const [authTab, setAuthTab] = useState('email');
    const [isSignup, setIsSignup] = useState(false);
    const [role, setRole] = useState('volunteer');
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [name, setName] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [phone, setPhone] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [countdown, setCountdown] = useState(45);
    const [showRole, setShowRole] = useState(false);
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const otpRefs = useRef([]);

    useEffect(() => { if (otpSent && countdown > 0) { const t = setTimeout(() => setCountdown(c => c - 1), 1000); return () => clearTimeout(t); } }, [otpSent, countdown]);
    const handleOtp = (val, idx) => { const nw = [...otp]; nw[idx] = val.slice(0, 1); setOtp(nw); if (val && idx < 5) otpRefs.current[idx + 1]?.focus(); };
    const handleOtpKey = (e, idx) => { if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus(); };

    const [googlePicker, setGooglePicker] = useState(false);
    const [cardNum, setCardNum] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvv, setCardCvv] = useState('');

    const googleAccounts = [
      { name: 'kajal.sharma@gmail.com', avatar: 'KS', full: 'Kajal Sharma' },
      { name: 'kajal.work@outlook.com', avatar: 'KS', full: 'Kajal Sharma' },
    ];

    const ROLE_MAP = { volunteer: 'VOLUNTEER', ngo: 'NGO_COORDINATOR', donor: 'DONOR', admin: 'ADMIN' };

    const handleAuthSuccess = (data) => {
      // Backend returns { accessToken, refreshToken, user }
      const token = data.accessToken || data.token;
      const refresh = data.refreshToken;
      const user = data.user;
      if (token) { API.setToken(token); if (refresh) API.setRefresh(refresh); }
      if (user) {
        login(user.role?.toLowerCase() || role, user.name, user);
      } else {
        // Demo mode fallback — no backend
        login(role, name || email?.split('@')[0] || 'Demo User', {
          id: 'demo-' + Date.now(), name: name || email?.split('@')[0] || 'Demo User',
          email: email || 'demo@ngone.org.in', role: role.toUpperCase(),
          points: 1280, level: 'Responder', city: 'Mumbai',
          skills: ['Medical', 'Rescue', 'Logistics'],
        });
      }
    };

    const doAuth = async () => {
      if (showRole) {
        setAuthLoading(true); setAuthError('');
        try {
          const endpoint = isSignup ? '/api/auth/register' : '/api/auth/login';
          const body = isSignup
            ? { name: name || email.split('@')[0], email: email || `user${Date.now()}@ngone.org.in`, password: pass || 'Password123!', role: ROLE_MAP[role] || 'VOLUNTEER', phone: phone || undefined }
            : { email: email || 'kajal@ngone.org.in', password: pass || 'Password123!' };
          const data = await API.post(endpoint, body);
          handleAuthSuccess(data);
        } catch (err) {
          const msg = err.message || '';
          // If backend is unreachable (502, network error, etc.) → fall to demo mode
          if (msg.includes('Bad Gateway') || msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('502') || msg.includes('ECONNREFUSED')) {
            handleAuthSuccess({});
          } else if (isSignup && msg.includes('already')) {
            try { const data = await API.post('/api/auth/login', { email, password: pass || 'Password123!' }); handleAuthSuccess(data); }
            catch { handleAuthSuccess({}); }
          } else if (msg.includes('Invalid') || msg.includes('not found') || msg.includes('Unauthorized')) {
            setAuthError(msg);
          } else {
            // Any other error → demo mode
            handleAuthSuccess({});
          }
        }
        setAuthLoading(false); return;
      }
      setShowRole(true);
    };

    const doGoogleAuth = async (acct) => {
      setGooglePicker(false); setAuthLoading(true); setAuthError('');
      try {
        let data;
        try { data = await API.post('/api/auth/login', { email: acct.name, password: 'Password123!' }); }
        catch { data = await API.post('/api/auth/register', { name: acct.full, email: acct.name, password: 'Password123!', role: 'VOLUNTEER' }); }
        handleAuthSuccess(data);
      } catch {
        // Any error → demo mode with Google account info
        handleAuthSuccess({ user: { name: acct.full, email: acct.name, role: 'VOLUNTEER', points: 1280, level: 'Responder', city: 'Mumbai', skills: ['Medical', 'Rescue'] } });
      }
      setAuthLoading(false);
    };

    const roles = [
      { k: 'volunteer', e: '\uD83D\uDE4B', l: 'Volunteer', c: 'var(--saffron)' },
      { k: 'ngo', e: '\uD83C\uDFE2', l: 'NGO Coordinator', c: 'var(--green)' },
      { k: 'donor', e: '\uD83D\uDC9B', l: 'Donor', c: 'var(--gold)' },
      { k: 'admin', e: '\uD83D\uDC51', l: 'Admin', c: '#8B5CF6' },
    ];

    return (
      <div className="page-enter login-split">
        <div className="login-left" style={{ background: 'linear-gradient(135deg, #FF6B35, #F5A623, #FF8F65)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '56px 48px' }}>
          <div style={{ position: 'absolute', top: -80, right: -80, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'absolute', bottom: -50, left: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>{'\uD83D\uDE0A'}</div>
              <span style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: 26, color: '#fff' }}>NG{'\uD83D\uDE0A'}NE</span>
            </div>
            <h2 style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 900, fontSize: 36, color: '#fff', lineHeight: 1.12, marginBottom: 18 }}>Empowering India,<br />One Community<br />at a Time</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, lineHeight: 1.7, marginBottom: 40 }}>Join 15,000+ volunteers making a real difference across 28 states of India.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[{ v: '15,240+', l: 'Volunteers' }, { v: '890+', l: 'NGO Partners' }, { v: '4.2M+', l: 'Lives Touched' }, { v: '28', l: 'States' }].map(s => (
                <div key={s.l} style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', borderRadius: 16, padding: '18px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 24, fontWeight: 900, color: '#fff' }}>{s.v}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 500, marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 36, background: 'var(--bg)' }}>
          <div style={{ maxWidth: 440, width: '100%' }}>
            <div className="ng-card" style={{ borderRadius: 28, padding: 0, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
              <div style={{ height: 4, background: 'linear-gradient(90deg, var(--saffron), var(--gold), var(--green))' }} />
              <div style={{ padding: '32px 36px 40px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>{'\uD83D\uDE0A'}</div>
                <h2 style={{ fontWeight: 900, fontSize: 26, marginBottom: 6 }}>{showRole ? 'Choose Your Role' : googlePicker ? 'Choose an Account' : 'Join the Movement'}</h2>
                <p style={{ color: 'var(--sub)', fontSize: 14, marginBottom: 28 }}>{showRole ? 'How would you like to contribute?' : googlePicker ? 'Select a Google account to continue' : 'Sign in to volunteer, donate, or manage your NGO'}</p>
                {authError && <div style={{ padding: '12px 18px', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', fontSize: 13, fontWeight: 600, marginBottom: 20, textAlign: 'left' }}>{authError}</div>}
                {googlePicker ? (
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {googleAccounts.map((acc, i) => (
                        <div key={i} onClick={() => doGoogleAuth(acc)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 16, border: '1.5px solid var(--border)', cursor: 'pointer', transition: 'all 0.22s', background: 'var(--white)' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--saffron)'; e.currentTarget.style.background = 'var(--saffron-lt)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--white)'; }}>
                          <div className="ng-avatar" style={{ width: 44, height: 44, borderRadius: 12, background: `hsl(${i * 120 + 20}, 65%, 55%)`, fontSize: 15 }}>{acc.avatar}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>{acc.full}</div>
                            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 1 }}>{acc.name}</div>
                          </div>
                          <span style={{ color: 'var(--muted)', fontSize: 16 }}>{'\u203A'}</span>
                        </div>
                      ))}
                      <div onClick={() => { setEmail(''); setName(''); setGooglePicker(false); setIsSignup(true); setAuthTab('email'); }} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 16, border: '1.5px dashed var(--border)', cursor: 'pointer', transition: 'all 0.22s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--saffron)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--saffron-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>+</div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--sub)' }}>Use another account</div>
                      </div>
                    </div>
                    <button className="btn-outline full" onClick={() => setGooglePicker(false)} style={{ marginTop: 18 }}>{'\u2190'} Back</button>
                  </div>
                ) : showRole ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 28 }}>
                      {roles.map(r => (
                        <div key={r.k} onClick={() => setRole(r.k)} style={{ padding: '22px 14px', borderRadius: 18, textAlign: 'center', cursor: 'pointer', border: `2.5px solid ${role === r.k ? r.c : 'var(--border)'}`, background: role === r.k ? `${r.c}08` : 'var(--white)', transition: 'all 0.25s', transform: role === r.k ? 'scale(1.02)' : '' }}>
                          <div style={{ fontSize: 36, marginBottom: 8 }}>{r.e}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: role === r.k ? r.c : 'var(--sub)' }}>{r.l}</div>
                        </div>
                      ))}
                    </div>
                    <button className="btn-saffron full" onClick={doAuth} disabled={authLoading} style={{ padding: '16px 0', fontSize: 16, borderRadius: 14 }}>{authLoading ? 'Authenticating...' : 'Continue \u2192'}</button>
                  </>
                ) : (
                  <>
                    <div className="ng-tabs" style={{ marginBottom: 24, background: 'var(--saffron-lt)' }}>
                      {[{ k: 'email', l: 'Email' }, { k: 'phone', l: 'Phone' }, { k: 'social', l: 'Social' }].map(t => <button key={t.k} className={`ng-tab${authTab === t.k ? ' active' : ''}`} onClick={() => setAuthTab(t.k)} style={{ flex: 1 }}>{t.l}</button>)}
                    </div>
                    {authTab === 'email' && (
                      <div style={{ textAlign: 'left' }}>
                        {isSignup && (<><label className="ng-label">Full Name</label><input className="ng-input" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} style={{ marginBottom: 18 }} /></>)}
                        <label className="ng-label">Email</label>
                        <input className="ng-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} style={{ marginBottom: 18 }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <label className="ng-label" style={{ marginBottom: 0 }}>Password</label>
                          {!isSignup && <span style={{ fontSize: 13, color: 'var(--saffron)', fontWeight: 600, cursor: 'pointer' }}>Forgot?</span>}
                        </div>
                        <div style={{ position: 'relative', marginBottom: 28 }}>
                          <input className="ng-input" type={showPass ? 'text' : 'password'} placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} style={{ paddingRight: 48 }} />
                          <button onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', fontSize: 16, color: 'var(--muted)' }}>{showPass ? '\uD83D\uDC41\uFE0F' : '\uD83D\uDC41'}</button>
                        </div>
                        <button className="btn-saffron full" onClick={doAuth} style={{ padding: '16px 0', fontSize: 16, borderRadius: 14 }}>{isSignup ? 'Create Account' : 'Sign In'}</button>
                        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 14, color: 'var(--sub)' }}>
                          {isSignup ? 'Have an account? ' : 'New here? '}
                          <span style={{ color: 'var(--saffron)', fontWeight: 700, cursor: 'pointer' }} onClick={() => setIsSignup(s => !s)}>{isSignup ? 'Sign In' : 'Create Account'}</span>
                        </p>
                        <div style={{ textAlign: 'center', marginTop: 10, padding: '10px 16px', borderRadius: 10, background: 'var(--saffron-lt)', fontSize: 12, color: 'var(--saffron)', fontWeight: 600 }}>Demo: kajal@ngone.org.in / password123</div>
                      </div>
                    )}
                    {authTab === 'phone' && (
                      <div style={{ textAlign: 'left' }}>
                        {!otpSent ? (
                          <>
                            <label className="ng-label">Phone Number</label>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
                              <div style={{ padding: '13px 14px', borderRadius: 12, border: '1.5px solid var(--border)', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>{'\uD83C\uDDEE\uD83C\uDDF3'} +91</div>
                              <input className="ng-input" placeholder="98765 43210" value={phone} onChange={e => setPhone(e.target.value)} style={{ flex: 1 }} />
                            </div>
                            <button className="btn-saffron full" onClick={() => { setOtpSent(true); setCountdown(45); }} style={{ padding: '16px 0', fontSize: 16, borderRadius: 14 }}>Send OTP</button>
                          </>
                        ) : (
                          <>
                            <p style={{ fontSize: 14, color: 'var(--sub)', marginBottom: 22, textAlign: 'center' }}>OTP sent to +91 {phone}</p>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 18 }}>
                              {otp.map((d, i) => <input key={i} ref={el => otpRefs.current[i] = el} className="otp-box" maxLength={1} value={d} onChange={e => handleOtp(e.target.value, i)} onKeyDown={e => handleOtpKey(e, i)} />)}
                            </div>
                            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--sub)', marginBottom: 28 }}>{countdown > 0 ? `Resend in 0:${String(countdown).padStart(2, '0')}` : <span style={{ color: 'var(--saffron)', fontWeight: 600, cursor: 'pointer' }} onClick={() => setCountdown(45)}>Resend OTP</span>}</p>
                            <button className="btn-saffron full" onClick={doAuth} style={{ padding: '16px 0', fontSize: 16, borderRadius: 14 }}>Verify & Continue</button>
                          </>
                        )}
                      </div>
                    )}
                    {authTab === 'social' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <button onClick={() => setGooglePicker(true)} style={{ width: '100%', padding: '15px', fontSize: 15, borderRadius: 14, fontWeight: 600, background: '#fff', color: 'var(--text)', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, transition: 'all 0.22s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = ''}><svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Continue with Google</button>
                        <button onClick={doAuth} style={{ width: '100%', padding: '15px', fontSize: 15, borderRadius: 14, fontWeight: 600, background: '#fff', color: 'var(--text)', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, transition: 'all 0.22s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = ''}><svg width="20" height="20" viewBox="0 0 24 24"><path fill="#00A4EF" d="M1 1h10v10H1z"/><path fill="#7FBA00" d="M13 1h10v10H13z"/><path fill="#FFB900" d="M1 13h10v10H1z"/><path fill="#F25022" d="M13 13h10v10H13z"/></svg> Continue with Microsoft</button>
                        <button onClick={doAuth} style={{ width: '100%', padding: '15px', fontSize: 15, borderRadius: 14, fontWeight: 600, background: '#000', color: '#fff', border: '1.5px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, transition: 'all 0.22s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = ''}><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg> Continue with Apple</button>
                      </div>
                    )}
                  </>
                )}
                <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 22, lineHeight: 1.55 }}>By continuing you agree to our Terms of Service and Privacy Policy. DARPAN-compliant data handling.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ═══════ DASHBOARD ═══════ */
  const Dashboard = () => {
    const [tab, setTab] = useState('tasks');
    const [checkedIn, setCheckedIn] = useState({});
    const [invitedVols, setInvitedVols] = useState({});
    const [teamFilter, setTeamFilter] = useState('All');
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [searchSkill, setSearchSkill] = useState('');
    const [tasks, setTasks] = useState([]);
    const [volunteers, setVolunteers] = useState([]);
    const [openTeams, setOpenTeams] = useState([]);
    const [joinedTeams, setJoinedTeams] = useState({});
    const [teamForm, setTeamForm] = useState({ task_name: '', location: '', programme: 'Disaster', skills: '', urgency: 'urgent', description: '', slots: 4 });

    useEffect(() => {
      // Fetch crises as tasks (backend: /api/crises)
      API.get('/api/crises').then(data => {
        const list = data?.crises || (Array.isArray(data) ? data : []);
        setTasks(list.length > 0 ? list.map(c => ({
          id: c.id, title: c.title, location: c.location || `${c.district || ''}, ${c.state || ''}`,
          emoji: { FLOOD: '\uD83C\uDF0A', FIRE: '\uD83D\uDD25', MEDICAL: '\uD83C\uDFE5', FOOD_SHORTAGE: '\uD83C\uDF5A', SHELTER: '\uD83C\uDFE0', EARTHQUAKE: '\uD83C\uDF0B' }[c.type] || '\u26A1',
          urgency: { EXTREME: 5, CRITICAL: 5, HIGH: 4, MODERATE: 3, LOW: 2 }[c.urgency] || 3,
          filled: c.volunteersAssigned || 0, needed: c.volunteersNeeded || 10, programme: c.type,
        })) : DEMO_TASKS);
      }).catch(() => setTasks(DEMO_TASKS));

      // Fetch nearby volunteers (backend: /api/volunteers/nearby)
      API.get('/api/volunteers/nearby?lat=19.076&lng=72.877&radius=50').then(data => {
        const list = data?.volunteers || (Array.isArray(data) ? data : []);
        setVolunteers(list.length > 0 ? list.map(v => ({
          id: v.id, name: v.user?.name || v.name, avatar: (v.user?.name || v.name || '??').split(' ').map(w => w[0]).join('').slice(0, 2),
          city: v.user?.city || 'India', skills: v.skills || [], points: v.points || 0,
          online: v.isOnline, distance: v.distance ? `${v.distance.toFixed(1)} km` : 'nearby',
        })) : DEMO_VOLUNTEERS);
      }).catch(() => setVolunteers(DEMO_VOLUNTEERS));

      // Fetch open teams (backend: /api/teams)
      API.get('/api/teams').then(data => {
        const list = data?.teams || (Array.isArray(data) ? data : []);
        setOpenTeams(list.length > 0 ? list.map(t => ({
          id: t.id, task: t.name || t.task?.title || 'Team', location: t.task?.crisis?.location || 'India',
          programme: t.task?.crisis?.type || 'Disaster', urgency: 'urgent',
          slots: t.maxSize || 4, filled: t.currentSize || 0,
          members: (t.members || []).map(m => ({ id: m.volunteer?.userId || m.id, name: m.volunteer?.user?.name || 'Member', avatar: 'M' })),
        })) : DEMO_TEAMS);
      }).catch(() => setOpenTeams(DEMO_TEAMS));

      // Refresh user data
      if (loggedIn) {
        API.get('/api/auth/me').then(data => {
          const u = data?.user || data;
          if (u?.name) { setCurrentUser(u); setUserName(u.name); }
        }).catch(() => {});
      }
    }, []);

    const handleCheckin = async (taskId) => {
      try { await API.post('/api/volunteers/check-in', { taskId, latitude: 19.076, longitude: 72.877 }); } catch {}
      setCheckedIn(p => ({ ...p, [taskId]: true }));
      try { const data = await API.get('/api/auth/me'); const u = data?.user || data; if (u?.name) { setCurrentUser(u); setUserName(u.name); } } catch {}
      showToastMsg('Checked in! +50 pts \u2B50');
    };
    const handleInvite = async (vol) => { try { await API.post(`/api/teams/${openTeams[0]?.id || '1'}/invite`, { volunteerId: vol.id }); } catch {} setInvitedVols(p => ({ ...p, [vol.id]: true })); showToastMsg(`Invited ${vol.name}! \u2705`); };
    const handleJoinTeam = async (teamId) => {
      try {
        await API.post(`/api/teams/${teamId}/join`);
      } catch {}
      setOpenTeams(ts => ts.map(t => t.id === teamId ? { ...t, filled: t.filled + 1, members: [...(t.members || []), { id: currentUser?.id, name: userName, avatar: initials }] } : t));
      setJoinedTeams(p => ({ ...p, [teamId]: true }));
      showToastMsg('Joined team! +30 pts \u2B50');
    };
    const handleCreateTeam = async () => {
      try {
        const nt = await API.post('/api/teams', { name: teamForm.task_name, taskId: 'new', maxSize: teamForm.slots });
        const newTeam = { id: nt?.id || Date.now(), task: teamForm.task_name, location: teamForm.location, programme: teamForm.programme, urgency: teamForm.urgency, slots: teamForm.slots, filled: 1, members: [{ id: currentUser?.id, name: userName, avatar: initials }] };
        setOpenTeams(ts => [newTeam, ...ts]); setJoinedTeams(p => ({ ...p, [newTeam.id]: true }));
      } catch {
        // Demo fallback
        const newTeam = { id: Date.now(), task: teamForm.task_name, location: teamForm.location, programme: teamForm.programme, urgency: teamForm.urgency, slots: teamForm.slots, filled: 1, members: [{ id: currentUser?.id, name: userName, avatar: initials }] };
        setOpenTeams(ts => [newTeam, ...ts]); setJoinedTeams(p => ({ ...p, [newTeam.id]: true }));
      }
      setShowTeamModal(false); showToastMsg('Team created! You are the leader \u2705');
      setTeamForm({ task_name: '', location: '', programme: 'Disaster', skills: '', urgency: 'urgent', description: '', slots: 4 });
    };
    const filteredVols = volunteers.filter(v => !searchSkill || (v.skills || []).some(s => s.toLowerCase().includes(searchSkill.toLowerCase())));
    const userStats = currentUser || { points: 0, level: 'Rookie' };

    return (
      <div className="ng-page">
        {/* Profile header */}
        <div>
          <div className="ng-card-gradient" style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28, flexWrap: 'wrap', padding: '28px 30px' }}>
            <div className="ng-avatar" style={{ width: 60, height: 60, borderRadius: 18, background: 'linear-gradient(135deg,var(--saffron),#FF8F65)', fontSize: 24, boxShadow: '0 6px 20px rgba(255,107,53,0.25)' }}>{initials}</div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontWeight: 900, fontSize: 24, letterSpacing: '-0.03em' }}>Welcome, {userName.split(' ')[0]}! {'\uD83D\uDC4B'}</h1>
              <p style={{ color: 'var(--sub)', fontSize: 14, marginTop: 2 }}>{currentUser?.city || 'Mumbai'} {'\u00B7'} DARPAN Vol. ID: VOL/2024/00891</p>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {(currentUser?.skills || ['Medical', 'Rescue', 'Logistics']).map(s => <span key={s} className="ng-chip" style={{ background: 'var(--saffron-lt)', color: 'var(--saffron)', fontSize: 11 }}>{s}</span>)}
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px 24px', borderRadius: 16, background: 'linear-gradient(135deg, var(--gold-lt), var(--saffron-lt))' }}>
              <div style={{ fontSize: 24 }}>{'\uD83C\uDFC5'}</div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--gold)' }}>{userStats.level}</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18, marginBottom: 32 }}>
          {[
            { l: 'Points', v: (userStats.points || 1280).toLocaleString(), e: '\u2B50', c: 'var(--gold)', bg: 'var(--gold-lt)' },
            { l: 'Tasks Done', v: String(Object.keys(checkedIn).length || 34), e: '\u2705', c: 'var(--green)', bg: 'var(--green-lt)' },
            { l: 'Team Size', v: '8', e: '\uD83D\uDC65', c: 'var(--saffron)', bg: 'var(--saffron-lt)' },
            { l: 'Badges', v: '5', e: '\uD83C\uDFC5', c: '#EF4444', bg: '#FEF2F2' },
          ].map((s, i) => (
            <div key={s.l} className="ng-stat">
              <div className="st-icon" style={{ background: s.bg }}>{s.e}</div>
              <div className="st-val" style={{ color: s.c }}>{s.v}</div>
              <div className="st-lbl">{s.l}</div>
            </div>
          ))}
        </div>

        <div className="ng-tabs">
          {[{ k: 'tasks', l: '\uD83D\uDCCD My Tasks' }, { k: 'team', l: '\uD83D\uDC65 Team Connect' }, { k: 'board', l: '\uD83D\uDCCB Open Teams' }].map(t => <button key={t.k} className={`ng-tab${tab === t.k ? ' active' : ''}`} onClick={() => setTab(t.k)}>{t.l}</button>)}
        </div>

        {/* TASKS TAB */}
        {tab === 'tasks' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
            {tasks.map((t, i) => {
              const uc = t.urgency >= 5 ? 'var(--saffron)' : t.urgency >= 3 ? 'var(--gold)' : 'var(--green)';
              const pct = Math.round((t.filled / t.needed) * 100);
              return (
                <S key={t.id} d={i * 60}>
                  <div className="ng-card ng-card-glow" style={{ borderTop: `3px solid ${uc}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                      <span className="ng-chip" style={{ background: `${uc}12`, color: uc, fontWeight: 700 }}>U{t.urgency}</span>
                      <span style={{ fontSize: 22 }}>{t.emoji}</span>
                    </div>
                    <h4 style={{ fontWeight: 800, fontSize: 17, marginBottom: 6 }}>{t.title}</h4>
                    <p style={{ color: 'var(--sub)', fontSize: 13, marginBottom: 14 }}>{'\uD83D\uDCCD'} {t.location}</p>
                    {t.filled < t.needed && (
                      <div style={{ padding: '10px 14px', borderRadius: 12, background: 'var(--gold-lt)', border: '1px solid rgba(245,166,35,0.2)', marginBottom: 14, fontSize: 13, fontWeight: 600, color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {'\u26A0\uFE0F'} {t.needed - t.filled} more volunteers needed
                      </div>
                    )}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--sub)', marginBottom: 6 }}><span>{t.filled}/{t.needed} filled</span><span>{pct}%</span></div>
                      <div className="ng-progress"><div className="ng-progress-fill" style={{ width: `${pct}%` }} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className={checkedIn[t.id] ? 'btn-green' : 'btn-saffron'} disabled={checkedIn[t.id]} onClick={() => handleCheckin(t.id)} style={{ flex: 1, padding: '11px 0', fontSize: 13 }}>
                        {checkedIn[t.id] ? '\u2713 Checked In' : 'Check In'}
                      </button>
                      <button className="btn-outline" onClick={() => setShowChat(true)} style={{ flex: 1, padding: '11px 0', fontSize: 13 }}>{'\uD83D\uDCAC'} Chat</button>
                    </div>
                  </div>
                </S>
              );
            })}
          </div>
        )}

        {/* TEAM CONNECT TAB */}
        {tab === 'team' && (
          <div>
            <S d={0}>
              <div className="ng-card" style={{ marginBottom: 22 }}>
                <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 18 }}>Team Slots {'\u2014'} Bihar Flood Relief</h3>
                <div style={{ display: 'flex', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div className="ng-avatar" style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg,var(--saffron),#FF8F65)', fontSize: 17, marginBottom: 6, boxShadow: '0 4px 14px rgba(255,107,53,0.2)' }}>{initials}</div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)' }}>{'\u2705'} You</span>
                  </div>
                  <div style={{ textAlign: 'center' }}><div style={{ width: 52, height: 52, borderRadius: 16, background: '#F1F0ED', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}><span style={{ width: 18, height: 18, border: '2.5px solid var(--saffron)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /></div><span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>{'\u23F3'} Pending</span></div>
                  {[0, 1].map(i => <div key={i} style={{ textAlign: 'center' }}><div style={{ width: 52, height: 52, borderRadius: 16, border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'var(--muted)', marginBottom: 6 }}>+</div><span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>Open</span></div>)}
                </div>
                <div className="ng-progress" style={{ height: 6, marginBottom: 8 }}><div className="ng-progress-fill" style={{ width: '25%' }} /></div>
                <p style={{ fontSize: 13, color: 'var(--sub)' }}>1 of 4 filled {'\u00B7'} 1 invite pending {'\u00B7'} 2 slots open</p>
              </div>
            </S>
            <S d={80}>
              <div className="ng-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                  <h3 style={{ fontWeight: 800, fontSize: 18 }}>Find Teammates</h3>
                  <button className="btn-saffron" onClick={() => setShowTeamModal(true)} style={{ padding: '10px 22px', fontSize: 13 }}>{'\u2795'} Request Team</button>
                </div>
                <input className="ng-input" placeholder={'\uD83D\uDD0D Search by skill, city...'} value={searchSkill} onChange={e => setSearchSkill(e.target.value)} style={{ marginBottom: 20 }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                  {filteredVols.map((v, i) => (
                    <S key={v.id} d={i * 40}>
                      <div className="ng-card ng-card-glow" style={{ padding: 18 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                          <div style={{ position: 'relative' }}>
                            <div className="ng-avatar" style={{ width: 44, height: 44, borderRadius: 13, background: `hsl(${v.id * 40}, 65%, 58%)`, fontSize: 15 }}>{v.avatar}</div>
                            <span style={{ position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderRadius: '50%', border: '2px solid #fff', background: v.online ? 'var(--green)' : '#CBD5E1' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{v.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{v.city} {'\u00B7'} {v.distance}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--gold)' }}>{v.points}</div>
                            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>pts</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 5, marginBottom: 14, flexWrap: 'wrap' }}>
                          {v.skills.map(s => <span key={s} className="ng-chip" style={{ background: 'var(--saffron-lt)', color: 'var(--saffron)', fontSize: 10 }}>{s}</span>)}
                        </div>
                        <button className={invitedVols[v.id] ? 'btn-green' : 'btn-saffron'} disabled={invitedVols[v.id]} onClick={() => handleInvite(v)} style={{ width: '100%', padding: '10px 0', fontSize: 13 }}>
                          {invitedVols[v.id] ? '\u2713 Invited' : 'Invite to Team'}
                        </button>
                      </div>
                    </S>
                  ))}
                </div>
              </div>
            </S>
            {showTeamModal && (
              <div className="ng-modal-bg" onClick={() => setShowTeamModal(false)}>
                <div className="ng-modal" onClick={e => e.stopPropagation()} style={{ width: 520, padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '22px 32px', background: 'linear-gradient(135deg, var(--saffron), #FF8F65)', color: '#fff' }}>
                    <h3 style={{ fontWeight: 900, fontSize: 22 }}>Create a New Team</h3>
                    <p style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>You will be added as team leader automatically</p>
                  </div>
                  <div style={{ padding: '28px 32px 36px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
                      <div><label className="ng-label">Task Name *</label><input className="ng-input" placeholder="e.g. Bihar Flood Relief" value={teamForm.task_name} onChange={e => setTeamForm(f => ({...f, task_name: e.target.value}))} /></div>
                      <div><label className="ng-label">Location</label><input className="ng-input" placeholder="e.g. Patna" value={teamForm.location} onChange={e => setTeamForm(f => ({...f, location: e.target.value}))} /></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 18 }}>
                      <div><label className="ng-label">Programme</label><select className="ng-input" value={teamForm.programme} onChange={e => setTeamForm(f => ({...f, programme: e.target.value}))}><option>Disaster</option><option>Healthcare</option><option>Education</option><option>Women</option><option>Livelihood</option><option>General</option></select></div>
                      <div><label className="ng-label">Urgency</label><select className="ng-input" value={teamForm.urgency} onChange={e => setTeamForm(f => ({...f, urgency: e.target.value}))}><option value="urgent">Urgent</option><option value="soon">Soon</option><option value="flexible">Flexible</option></select></div>
                      <div><label className="ng-label">Team Size</label><input className="ng-input" type="number" min="2" max="12" value={teamForm.slots} onChange={e => setTeamForm(f => ({...f, slots: parseInt(e.target.value) || 4}))} /></div>
                    </div>
                    <label className="ng-label">Skills Needed</label>
                    <input className="ng-input" placeholder="e.g. Medical, Rescue, Logistics" value={teamForm.skills} onChange={e => setTeamForm(f => ({...f, skills: e.target.value}))} style={{ marginBottom: 18 }} />
                    <label className="ng-label">Description</label>
                    <textarea className="ng-input" rows={3} placeholder="Describe what this team will do..." value={teamForm.description} onChange={e => setTeamForm(f => ({...f, description: e.target.value}))} style={{ marginBottom: 24, resize: 'vertical' }} />
                    <div style={{ padding: '14px 18px', borderRadius: 14, background: 'var(--saffron-lt)', border: '1px solid rgba(255,107,53,0.1)', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 18 }}>{'\uD83D\uDCA1'}</span>
                      <p style={{ fontSize: 13, color: 'var(--saffron)', fontWeight: 500 }}>After creating, you can invite volunteers from the Team Connect tab or they can join from Open Teams.</p>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button className="btn-outline" onClick={() => setShowTeamModal(false)} style={{ flex: 1, padding: '14px 0' }}>Cancel</button>
                      <button className="btn-saffron" onClick={handleCreateTeam} disabled={!teamForm.task_name} style={{ flex: 2, padding: '14px 0', fontSize: 15 }}>{'\u2795'} Create Team</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* OPEN TEAMS TAB */}
        {tab === 'board' && (
          <div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
              {['All', 'Disaster', 'Healthcare', 'Education', 'Women', 'Livelihood'].map(f => (
                <button key={f} onClick={() => setTeamFilter(f)} className={teamFilter === f ? 'btn-saffron' : 'btn-ghost'} style={{ padding: '9px 20px', fontSize: 13, borderRadius: 99 }}>{f}</button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {openTeams.filter(t => teamFilter === 'All' || t.programme === teamFilter).map((t, i) => {
                const uc = { urgent: { c: 'var(--saffron)', l: 'Urgent', bg: 'var(--saffron-lt)' }, soon: { c: 'var(--gold)', l: 'Soon', bg: 'var(--gold-lt)' }, flexible: { c: 'var(--green)', l: 'Flexible', bg: 'var(--green-lt)' } }[t.urgency] || { c: 'var(--sub)', l: t.urgency, bg: '#f5f5f5' };
                const pct = Math.round((t.filled / (t.slots || 4)) * 100);
                const isMember = joinedTeams[t.id] || (t.members || []).some(m => m.id === currentUser?.id);
                const isFull = t.filled >= (t.slots || 4);
                return (
                  <S key={t.id} d={i * 50}>
                    <div className="ng-card ng-card-glow" style={{ borderLeft: `4px solid ${uc.c}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginBottom: (t.members || []).length > 0 ? 14 : 0 }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>{t.task}</div>
                          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 3 }}>{'\uD83D\uDCCD'} {t.location} {'\u00B7'} {t.programme}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span className="ng-chip" style={{ background: uc.bg, color: uc.c }}>{uc.l}</span>
                          <div style={{ width: 80 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--sub)', marginBottom: 4, textAlign: 'right' }}>{t.filled}/{t.slots || 4}</div>
                            <div className="ng-progress" style={{ height: 6 }}><div className="ng-progress-fill" style={{ width: `${pct}%` }} /></div>
                          </div>
                        </div>
                        <button className={isMember ? 'btn-green' : isFull ? 'btn-outline' : 'btn-saffron'} disabled={isMember || isFull} onClick={() => handleJoinTeam(t.id)} style={{ padding: '10px 24px', fontSize: 13 }}>{isMember ? '\u2713 Joined' : isFull ? 'Full' : 'Join Team'}</button>
                      </div>
                      {/* Team members list */}
                      {(t.members || []).length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 14, borderTop: '1px solid var(--border-lt)', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginRight: 4 }}>{'\uD83D\uDC65'} Members:</span>
                          {(t.members || []).map((m, mi) => (
                            <div key={mi} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px 4px 4px', borderRadius: 99, background: m.id === currentUser?.id ? 'var(--saffron-lt)' : 'var(--bg)', border: `1px solid ${m.id === currentUser?.id ? 'var(--saffron)' : 'var(--border)'}` }}>
                              <div className="ng-avatar" style={{ width: 22, height: 22, borderRadius: 7, background: `hsl(${(mi+1)*55}, 60%, 55%)`, fontSize: 9 }}>{m.avatar || m.name?.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
                              <span style={{ fontSize: 12, fontWeight: 600, color: m.id === currentUser?.id ? 'var(--saffron)' : 'var(--text)' }}>{m.id === currentUser?.id ? 'You' : m.name}</span>
                            </div>
                          ))}
                          {t.filled < (t.slots || 4) && <span style={{ fontSize: 11, color: 'var(--muted)' }}>+{(t.slots || 4) - t.filled} open</span>}
                        </div>
                      )}
                    </div>
                  </S>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ═══════ PROGRAMME DETAIL ═══════ */
  const ProgDetail = () => {
    const p = detailProg || programmes[0] || { id: 'education', emoji: '\uD83D\uDCDA', title: 'Education for All', color: '#3B82F6', desc: '', tags: [], stat1: '', stat2: '', img: '' };
    return (
      <div className="page-enter">
        <div style={{ background: `linear-gradient(135deg, ${p.color}15, ${p.color}05)`, padding: '52px 24px 36px', borderBottom: `4px solid ${p.color}` }}>
          <div className="ng-page" style={{ padding: 0 }}>
            <p style={{ fontSize: 13, color: 'var(--sub)', marginBottom: 18 }}><span style={{ cursor: 'pointer' }} onClick={() => nav('home')}>Home</span> {'\u203A'} Programmes {'\u203A'} <strong>{p.title}</strong></p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18 }}>
              <div style={{ width: 72, height: 72, borderRadius: 20, background: `${p.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, boxShadow: `0 8px 24px ${p.color}20` }}>{p.emoji}</div>
              <h1 style={{ fontWeight: 900, fontSize: 34, letterSpacing: '-0.03em' }}>{p.title}</h1>
            </div>
            <p style={{ color: 'var(--sub)', fontSize: 16, maxWidth: 640, lineHeight: 1.7 }}>{p.desc || p.description}</p>
          </div>
        </div>
        <div className="ng-page">
          <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18, marginBottom: 48 }}>
            {[{ l: 'Beneficiaries', v: p.stat1 }, { l: 'Reach', v: p.stat2 }, { l: 'Volunteers', v: '1,200+' }, { l: 'Districts', v: '140+' }].map((s, i) => (
              <div key={s.l} className="ng-stat" style={{ animationDelay: `${i * 60}ms`, borderBottom: `3px solid ${p.color}` }}>
                <div className="st-val" style={{ color: p.color, fontSize: 26 }}>{s.v}</div>
                <div className="st-lbl">{s.l}</div>
              </div>
            ))}
          </div>
          <Reveal><h2 style={{ fontWeight: 900, fontSize: 26, marginBottom: 22 }}>Our Approach</h2></Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginBottom: 48 }} className="grid-2">
            {[{ e: '\uD83D\uDCCB', t: 'Assess Needs', d: 'Community surveys and data to understand local requirements' }, { e: '\uD83E\uDD1D', t: 'Deploy Teams', d: 'Match skilled volunteers with community needs' }, { e: '\uD83D\uDCCA', t: 'Measure Impact', d: 'Track outcomes, collect feedback, iterate' }].map((s, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="ng-card" style={{ textAlign: 'center', height: '100%' }}>
                  <div style={{ fontSize: 40, marginBottom: 14 }}>{s.e}</div>
                  <h4 style={{ fontWeight: 800, marginBottom: 10 }}>{s.t}</h4>
                  <p style={{ color: 'var(--sub)', fontSize: 14, lineHeight: 1.6 }}>{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <div className="ng-card-gradient" style={{ padding: 36, textAlign: 'center' }}>
              <h3 style={{ fontWeight: 900, fontSize: 24, marginBottom: 10 }}>Volunteer for {p.title}</h3>
              <p style={{ color: 'var(--sub)', fontSize: 14, marginBottom: 6 }}>Skills needed: {(p.tags || []).join(', ')}</p>
              <p style={{ color: 'var(--sub)', fontSize: 14, marginBottom: 24 }}>4-8 hours/week {'\u00B7'} 45 volunteer slots available</p>
              <button className="btn-saffron" onClick={() => nav(loggedIn ? 'dashboard' : 'login')} style={{ padding: '15px 44px', fontSize: 16 }}>Join Now {'\u2192'}</button>
            </div>
          </Reveal>
        </div>
      </div>
    );
  };

  /* ═══════ DARPAN ═══════ */
  const DarpanPage = () => (
    <div className="page-enter ng-page">
      <S d={0}><h1 style={{ fontWeight: 900, fontSize: 34, marginBottom: 10 }}>NGO DARPAN Registration</h1></S>
      <S d={60}><p style={{ color: 'var(--sub)', fontSize: 16, marginBottom: 44, maxWidth: 620, lineHeight: 1.7 }}>DARPAN is the NITI Aayog portal for NGO registration. We help grassroots organisations navigate the process seamlessly.</p></S>
      <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18, marginBottom: 48 }}>
        {[{ n: '1', t: 'Create Account', d: 'Register on ngodarpan.gov.in with basic org details', e: '\uD83D\uDCDD' }, { n: '2', t: 'Upload Documents', d: 'PAN, registration certificate, bank details', e: '\uD83D\uDCC4' }, { n: '3', t: 'Review & Submit', d: 'Verify all details and submit for approval', e: '\u2705' }, { n: '4', t: 'Receive Unique ID', d: 'Get your unique DARPAN ID for CSR eligibility', e: '\uD83C\uDFC6' }].map((s, i) => (
          <Reveal key={i} delay={i * 80}>
            <div className="ng-card" style={{ textAlign: 'center', borderTop: '4px solid var(--saffron)', height: '100%' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>{s.e}</div>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--saffron)', color: '#fff', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>{s.n}</div>
              <h4 style={{ fontWeight: 800, marginBottom: 8 }}>{s.t}</h4>
              <p style={{ color: 'var(--sub)', fontSize: 13, lineHeight: 1.55 }}>{s.d}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal><div style={{ textAlign: 'center' }}><button className="btn-saffron" onClick={() => window.open('https://ngodarpan.gov.in', '_blank')} style={{ padding: '17px 44px', fontSize: 16 }}>Register Your NGO on DARPAN {'\u2192'}</button></div></Reveal>
    </div>
  );

  /* ═══════ DONATE ═══════ */
  const Donate = () => {
    const [amt, setAmt] = useState(500);
    const [pay, setPay] = useState('upi');
    const [monthly, setMonthly] = useState(false);
    const [donating, setDonating] = useState(false);
    const [donated, setDonated] = useState(false);
    const [upiId, setUpiId] = useState('');
    const [cardNum, setCardNum] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [cardName, setCardName] = useState('');
    const [bankAcc, setBankAcc] = useState('');
    const [bankIfsc, setBankIfsc] = useState('');
    const [walletType, setWalletType] = useState('paytm');
    const [walletPhone, setWalletPhone] = useState('');
    const impacts = { 100: '5 students get notebooks for a month', 500: '1 month school kit for a child', 1000: '1 family gets emergency food for a week', 5000: 'Fund a health camp for 50 villagers' };
    const handleDonate = async () => {
      setDonating(true);
      try {
        if (loggedIn) {
          // Backend: POST /api/donations/create-order
          await API.post('/api/donations/create-order', {
            ngoId: 'ngone-main',
            amount: amt,
            type: monthly ? 'MONTHLY' : 'ONE_TIME',
            message: `Donation via ${pay.toUpperCase()}`,
          });
        } else {
          // Simulate processing for non-logged-in users
          await new Promise(r => setTimeout(r, 1500));
        }
      } catch {
        // Demo fallback — still show success
        await new Promise(r => setTimeout(r, 1200));
      }
      setDonating(false); setDonated(true);
      showToastMsg('Thank you for your donation! \uD83D\uDC9A');
      // Refresh user after donation
      if (loggedIn) try { const data = await API.get('/api/auth/me'); const u = data?.user || data; if (u?.name) setCurrentUser(u); } catch {}
    };

    if (donated) return (
      <div className="page-enter ng-page" style={{ textAlign: 'center', paddingTop: 80, paddingBottom: 80 }}>
        <div style={{ animation: 'bounceIn 0.6s ease both' }}>
          <div style={{ fontSize: 80, marginBottom: 24 }}>{'\uD83C\uDF89'}</div>
          <h1 style={{ fontWeight: 900, fontSize: 36, marginBottom: 12 }}>Thank You!</h1>
          <p style={{ fontSize: 18, color: 'var(--sub)', marginBottom: 8 }}>Your donation of <strong style={{ color: 'var(--saffron)' }}>{'\u20B9'}{amt.toLocaleString()}</strong> has been received.</p>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 36 }}>80G Tax receipt will be sent to your email within 24 hours.</p>
          <div className="ng-card" style={{ display: 'inline-block', padding: '24px 40px', marginBottom: 36, textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 40, marginBottom: 10 }}><span style={{ color: 'var(--sub)' }}>Amount</span><strong>{'\u20B9'}{amt.toLocaleString()}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 40, marginBottom: 10 }}><span style={{ color: 'var(--sub)' }}>Method</span><strong>{pay.toUpperCase()}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 40, marginBottom: 10 }}><span style={{ color: 'var(--sub)' }}>Type</span><strong>{monthly ? 'Monthly' : 'One-time'}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 40 }}><span style={{ color: 'var(--sub)' }}>Transaction ID</span><strong>TXN{Date.now().toString().slice(-8)}</strong></div>
          </div>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
            <button className="btn-saffron" onClick={() => setDonated(false)} style={{ padding: '15px 36px', fontSize: 16 }}>Donate Again</button>
            <button className="btn-outline" onClick={() => nav('home')} style={{ padding: '15px 36px', fontSize: 16 }}>Back Home</button>
          </div>
        </div>
      </div>
    );

    return (
      <div className="page-enter ng-page">
        <S d={0}><div style={{ textAlign: 'center', marginBottom: 44 }}><h1 style={{ fontWeight: 900, fontSize: 34, marginBottom: 10 }}>Your {'\u20B9'}500 can change a life</h1><p style={{ color: 'var(--sub)', fontSize: 16, maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>100% of your donation goes directly to communities. Tax deduction under Section 80G.</p></div></S>
        <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 28 }}>
          <S d={0}>
            <div className="ng-card" style={{ padding: 32 }}>
              <label className="ng-label" style={{ fontSize: 15, marginBottom: 14 }}>Select Amount</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
                {[100, 500, 1000, 5000].map(a => (
                  <button key={a} onClick={() => setAmt(a)} style={{ padding: '16px 28px', borderRadius: 14, fontWeight: 800, fontSize: 20, fontFamily: "'Poppins',sans-serif", border: `2.5px solid ${amt === a ? 'var(--saffron)' : 'var(--border)'}`, background: amt === a ? 'var(--saffron-lt)' : 'var(--white)', color: amt === a ? 'var(--saffron)' : 'var(--text)', cursor: 'pointer', transition: 'all 0.25s', transform: amt === a ? 'scale(1.05)' : '' }}>{'\u20B9'}{a.toLocaleString()}</button>
                ))}
                <input className="ng-input" type="number" placeholder="Custom" style={{ width: 130 }} onChange={e => setAmt(+e.target.value || 0)} />
              </div>
              <div style={{ padding: 18, borderRadius: 16, background: 'linear-gradient(135deg, var(--saffron-lt), var(--gold-lt))', border: '1px solid rgba(255,107,53,0.1)', marginBottom: 24 }}>
                <p style={{ fontSize: 15, color: 'var(--saffron)', fontWeight: 600 }}>{'\uD83D\uDCA1'} {'\u20B9'}{amt.toLocaleString()} = {impacts[amt] || `Impact equivalent to ${Math.round(amt / 100)} school kits`}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderRadius: 16, background: 'var(--gold-lt)', border: '1px solid rgba(245,166,35,0.1)', marginBottom: 28 }}>
                <div><div style={{ fontWeight: 700, fontSize: 15 }}>{'\uD83D\uDD04'} Monthly Giving</div><div style={{ fontSize: 13, color: 'var(--sub)', marginTop: 2 }}>Join 3,200 monthly donors</div></div>
                <div className="ng-toggle" onClick={() => setMonthly(m => !m)} style={{ background: monthly ? 'var(--saffron)' : '#CBD5E1' }}><div className="ng-toggle-thumb" style={{ left: monthly ? 24 : 2 }} /></div>
              </div>
              <label className="ng-label">Payment Method</label>
              <div style={{ display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
                {[{ k: 'upi', l: '\uD83D\uDCF1 UPI' }, { k: 'card', l: '\uD83D\uDCB3 Card' }, { k: 'bank', l: '\uD83C\uDFE6 Bank' }, { k: 'wallet', l: '\uD83D\uDCB0 Wallet' }].map(m => (
                  <button key={m.k} onClick={() => setPay(m.k)} style={{ flex: 1, padding: '14px 0', borderRadius: 14, fontWeight: 600, fontSize: 14, border: `2px solid ${pay === m.k ? 'var(--saffron)' : 'var(--border)'}`, background: pay === m.k ? 'var(--saffron-lt)' : 'var(--white)', color: pay === m.k ? 'var(--saffron)' : 'var(--sub)', cursor: 'pointer', transition: 'all 0.22s' }}>{m.l}</button>
                ))}
              </div>

              {/* Payment detail forms */}
              <div style={{ padding: '20px 22px', borderRadius: 16, background: 'var(--bg)', border: '1px solid var(--border)', marginBottom: 24, animation: 'fadeUp 0.25s ease both' }} key={pay}>
                {pay === 'upi' && (
                  <div>
                    <label className="ng-label">UPI ID</label>
                    <input className="ng-input" placeholder="yourname@upi" value={upiId} onChange={e => setUpiId(e.target.value)} style={{ marginBottom: 12 }} />
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {['Google Pay', 'PhonePe', 'Paytm', 'BHIM'].map(app => (
                        <span key={app} className="ng-chip" style={{ background: 'var(--white)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: 12, padding: '6px 14px' }} onClick={() => setUpiId(`user@${app.toLowerCase().replace(' ', '')}`)}>{app}</span>
                      ))}
                    </div>
                  </div>
                )}
                {pay === 'card' && (
                  <div>
                    <label className="ng-label">Card Number</label>
                    <input className="ng-input" placeholder="4111 1111 1111 1111" value={cardNum} onChange={e => setCardNum(e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim())} maxLength={19} style={{ marginBottom: 14, fontFamily: 'monospace', letterSpacing: '0.1em' }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                      <div><label className="ng-label">Expiry</label><input className="ng-input" placeholder="MM/YY" value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} maxLength={5} /></div>
                      <div><label className="ng-label">CVV</label><input className="ng-input" type="password" placeholder="***" value={cardCvv} onChange={e => setCardCvv(e.target.value)} maxLength={3} /></div>
                      <div><label className="ng-label">Name</label><input className="ng-input" placeholder="Name on card" value={cardName} onChange={e => setCardName(e.target.value)} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      {['Visa', 'Mastercard', 'RuPay'].map(c => <span key={c} style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', padding: '4px 10px', borderRadius: 6, background: 'var(--white)', border: '1px solid var(--border)' }}>{c}</span>)}
                    </div>
                  </div>
                )}
                {pay === 'bank' && (
                  <div>
                    <label className="ng-label">Account Number</label>
                    <input className="ng-input" placeholder="Enter account number" value={bankAcc} onChange={e => setBankAcc(e.target.value)} style={{ marginBottom: 14 }} />
                    <label className="ng-label">IFSC Code</label>
                    <input className="ng-input" placeholder="e.g. SBIN0001234" value={bankIfsc} onChange={e => setBankIfsc(e.target.value.toUpperCase())} style={{ marginBottom: 14 }} />
                    <div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--white)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--sub)' }}>{'\uD83C\uDFE6'} Net Banking: SBI, HDFC, ICICI, Axis, PNB, BOB supported</div>
                  </div>
                )}
                {pay === 'wallet' && (
                  <div>
                    <label className="ng-label">Select Wallet</label>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                      {[{ k: 'paytm', l: 'Paytm' }, { k: 'phonepe', l: 'PhonePe' }, { k: 'amazonpay', l: 'Amazon Pay' }, { k: 'mobikwik', l: 'MobiKwik' }].map(w => (
                        <button key={w.k} onClick={() => setWalletType(w.k)} style={{ flex: 1, padding: '12px 4px', borderRadius: 12, fontWeight: 600, fontSize: 12, border: `2px solid ${walletType === w.k ? 'var(--saffron)' : 'var(--border)'}`, background: walletType === w.k ? 'var(--saffron-lt)' : 'var(--white)', color: walletType === w.k ? 'var(--saffron)' : 'var(--sub)', cursor: 'pointer', transition: 'all 0.2s' }}>{w.l}</button>
                      ))}
                    </div>
                    <label className="ng-label">Registered Mobile</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ padding: '13px 14px', borderRadius: 12, border: '1.5px solid var(--border)', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>+91</div>
                      <input className="ng-input" placeholder="98765 43210" value={walletPhone} onChange={e => setWalletPhone(e.target.value)} style={{ flex: 1 }} />
                    </div>
                  </div>
                )}
              </div>

              <button className="btn-saffron full" onClick={handleDonate} disabled={donating} style={{ padding: '17px 0', fontSize: 17, borderRadius: 16, position: 'relative', overflow: 'hidden' }}>
                {donating ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <span style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                    Processing via {pay.toUpperCase()}...
                  </span>
                ) : `Donate \u20B9${amt.toLocaleString()} Now \u2192`}
              </button>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 18, fontSize: 12, color: 'var(--muted)' }}>
                <span>{'\uD83D\uDD12'} SSL Secured</span><span>{'\u2705'} 80G Tax Exempt</span><span>{'\uD83C\uDFC5'} DARPAN Verified</span>
              </div>
            </div>
          </S>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <S d={80}>
              <div className="ng-card" style={{ background: 'linear-gradient(135deg, var(--saffron), #FF8F65)', color: '#fff', border: 'none', padding: 28 }}>
                <h3 style={{ fontWeight: 900, fontSize: 20, marginBottom: 20 }}>Your Impact {'\uD83C\uDF0D'}</h3>
                {[{ l: 'Lives Touched', v: '4.2M+', e: '\uD83D\uDC65' }, { l: 'Villages Reached', v: '12,000+', e: '\uD83C\uDFE1' }, { l: 'States', v: '28', e: '\uD83C\uDDEE\uD83C\uDDF3' }].map(s => (
                  <div key={s.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                    <span style={{ opacity: 0.85, display: 'flex', alignItems: 'center', gap: 8 }}>{s.e} {s.l}</span>
                    <span style={{ fontWeight: 900, fontSize: 16 }}>{s.v}</span>
                  </div>
                ))}
              </div>
            </S>
            <S d={160}>
              <div className="ng-card" style={{ background: 'var(--green-lt)', border: '1px solid var(--green)', padding: 24 }}>
                <h4 style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: 'var(--green)' }}>{'\u2705'} 80G Tax Benefit</h4>
                <p style={{ color: 'var(--sub)', fontSize: 14, lineHeight: 1.6 }}>All donations are eligible for tax deduction under Section 80G. Receipt sent instantly via email.</p>
              </div>
            </S>
            {loggedIn && currentUser && (
              <S d={240}>
                <div className="ng-card" style={{ padding: 24 }}>
                  <h4 style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>{'\uD83D\uDC64'} Donating as</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="ng-avatar" style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,var(--saffron),#FF8F65)', fontSize: 14 }}>{initials}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{userName}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{currentUser.email}</div>
                    </div>
                  </div>
                </div>
              </S>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ═══════ RENDER ═══════ */
  const pages = { home: Home, login: Login, dashboard: Dashboard, programme: ProgDetail, darpan: DarpanPage, donate: Donate };
  const Page = pages[page] || Home;

  return (
    <>
      <Nav />
      <div key={pageKey} className="page-transition">
        <Page />
      </div>
      <NotifDrawer />
      <ChatModal />
      {toast && <div className={`ng-toast${toast.out ? ' out' : ''}`}>{toast.msg}</div>}
    </>
  );
}
