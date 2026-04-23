import { useRef, useEffect } from 'react';

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

/* ═══ ACTIVE DONATION DRIVES SECTION ═══ */
export function ActiveDrivesSection({ onNav }) {
  const drives = [
    { emoji: '🍱', type: 'Food Drive', badge: 'LIVE', badgeColor: '#16A34A', badgeBg: '#DCFCE7', org: 'Relief First Foundation', city: 'New Delhi', dist: '2.1 km', available: '450 packets available', timing: 'Today 9am – 6pm' },
    { emoji: '👕', type: 'Clothing Drive', badge: 'LIVE', badgeColor: '#16A34A', badgeBg: '#DCFCE7', org: 'Mahila Shakti NGO', city: 'Mumbai', dist: '0.8 km', available: '320 items available', timing: 'Today 10am – 4pm' },
    { emoji: '🍱👕', type: 'Food + Clothing', badge: 'UPCOMING', badgeColor: '#CA8A04', badgeBg: '#FEF9C3', org: 'Arogya Seva Society', city: 'Chennai', dist: '3.4 km', available: '200 items available', timing: 'Tomorrow 8am – 2pm' },
  ];

  return (
    <section style={{ background: 'var(--white)', borderTop: '1px solid var(--border)', padding: '72px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Reveal>
          <div className="section-head">
            <h2>🍱 Active Donation Drives Near You</h2>
            <p>Food and clothing drives happening right now across India</p>
            <div className="accent-line" />
          </div>
        </Reveal>
        <div className="grid-3x2" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }}>
          {drives.map((d, i) => (
            <Reveal key={i} delay={80 + i * 80}>
              <div className="ng-card ng-card-lift" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: 28 }}>{d.emoji}</span>
                  <span style={{ padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: d.badgeBg, color: d.badgeColor }}>{d.badge}</span>
                </div>
                <h4 style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{d.type}</h4>
                <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--sub)', marginBottom: 8 }}>{d.org}</p>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>📍 {d.city} · {d.dist}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--saffron)', marginBottom: 4 }}>{d.available}</p>
                <p style={{ fontSize: 12, color: 'var(--sub)', marginBottom: 16 }}>🕐 {d.timing}</p>
                <div style={{ marginTop: 'auto' }}>
                  <button className="btn-saffron" onClick={() => onNav?.('login')} style={{ width: '100%', padding: '11px 0', fontSize: 13 }}>View Details</button>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={400}>
          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--saffron)', cursor: 'pointer' }} onClick={() => onNav?.('login')}>
              View All Drives Near You →
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ═══ NEED HELP SECTION ═══ */
export function NeedHelpSection({ onNav }) {
  const columns = [
    {
      emoji: '🍱', title: 'Food Support',
      text: 'Emergency food packets, cooked meals, and dry rations available within 5km of your location',
      btn: 'Find Food Near Me →', btnColor: '#EA580C', btnBg: '#FFF7ED', btnBorder: '#FB923C',
    },
    {
      emoji: '👕', title: 'Clothing Help',
      text: 'Free clothing for men, women, children, and elderly — collected from verified donation drives near you',
      btn: 'Find Clothing Near Me →', btnColor: '#2563EB', btnBg: '#EFF6FF', btnBorder: '#60A5FA',
    },
    {
      emoji: '🆘', title: 'Emergency Help',
      text: 'Life-threatening situation? Our rapid response team reaches you within 60 minutes anywhere in India',
      btn: 'Get Emergency Help →', btnColor: '#DC2626', btnBg: '#FEF2F2', btnBorder: '#F87171', pulse: true,
    },
  ];

  return (
    <section style={{ borderTop: '1px solid var(--border)', padding: '72px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Reveal>
          <div className="section-head">
            <h2>🙏 Need Help? We're Here</h2>
            <p>Immediate assistance available across 28 Indian states</p>
            <div className="accent-line" />
          </div>
        </Reveal>
        <div className="help-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }}>
          {columns.map((c, i) => (
            <Reveal key={i} delay={80 + i * 100}>
              <div className="ng-card ng-card-lift" style={{ textAlign: 'center', padding: '36px 24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>{c.emoji}</div>
                <h4 style={{ fontWeight: 800, fontSize: 20, marginBottom: 12 }}>{c.title}</h4>
                <p style={{ color: 'var(--sub)', fontSize: 14, lineHeight: 1.7, marginBottom: 24, flex: 1 }}>{c.text}</p>
                <button
                  onClick={() => onNav?.('login')}
                  style={{
                    width: '100%', padding: '14px 0', borderRadius: 14, fontWeight: 700, fontSize: 15,
                    background: c.btnBg, color: c.btnColor, border: `2px solid ${c.btnBorder}`,
                    cursor: 'pointer', transition: 'all 0.25s',
                    animation: c.pulse ? 'pulseEmergency 2s infinite' : 'none',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = c.btnColor; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = c.btnBg; e.currentTarget.style.color = c.btnColor; e.currentTarget.style.transform = ''; }}
                >
                  {c.btn}
                </button>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
