import { useState, useEffect, useRef } from 'react';

/* ═══ DEMO DATA ═══ */
const DEMO_RESOURCES = [
  { id: 1, type: 'food', org: 'Relief First Foundation', address: 'Sector 14 Community Centre', dist: '1.2 km', available: '450 food packets', timing: '9am – 5pm daily', phone: '+91 98765 43210', emoji: '🍱', live: true, lat: 25, left: 15 },
  { id: 2, type: 'clothing', org: 'Mahila Shakti NGO', address: 'Gandhi Nagar Relief Camp', dist: '0.8 km', available: '320 clothing items', timing: '10am – 4pm', phone: '+91 87654 32109', emoji: '👕', live: true, lat: 45, left: 55 },
  { id: 3, type: 'medical', org: 'Arogya Seva Society', address: 'District Hospital, Block C', dist: '3.4 km', available: 'Free medical checkup', timing: '8am – 2pm', phone: '+91 76543 21098', emoji: '💊', live: false, lat: 65, left: 30 },
  { id: 4, type: 'water', org: 'Jal Seva Foundation', address: 'Municipal Park', dist: '2.1 km', available: '1000L clean water', timing: '6am – 8pm', phone: '+91 65432 10987', emoji: '💧', live: true, lat: 35, left: 75 },
  { id: 5, type: 'shelter', org: 'Ashray Trust', address: 'Community Hall, Ring Road', dist: '4.5 km', available: '50 beds + blankets', timing: '24/7', phone: '+91 54321 09876', emoji: '🏠', live: false, lat: 75, left: 45 },
  { id: 6, type: 'food', org: 'Annapurna Kitchen', address: 'Near Railway Station', dist: '1.8 km', available: '200 cooked meals', timing: '12pm – 3pm', phone: '+91 43210 98765', emoji: '🍱', live: true, lat: 55, left: 85 },
];

const DEMO_REQUESTS = [
  { id: 1, type: 'food', title: 'Food & Meals', status: 'assigned', ngo: 'Relief First Foundation', date: 'Apr 25, 2026', emoji: '🍱' },
  { id: 2, type: 'clothing', title: 'Clothing & Essentials', status: 'submitted', ngo: null, date: null, emoji: '👕' },
];

const DEMO_POINTS = [
  { id: 1, emoji: '🍱', org: 'Annapurna Kitchen', address: 'Near Railway Station, Delhi', dist: '1.8 km', items: '200 cooked meals available', timing: '12pm – 3pm daily', phone: '+91 43210 98765' },
  { id: 2, emoji: '👕', org: 'Kapda Bank', address: 'Sector 22 Market', dist: '2.3 km', items: 'Men/Women/Children clothes', timing: '10am – 5pm', phone: '+91 32109 87654' },
  { id: 3, emoji: '🍱', org: 'Roti Foundation', address: 'CP Metro Station', dist: '3.1 km', items: '500 food packets', timing: '8am – 6pm', phone: '+91 21098 76543' },
  { id: 4, emoji: '👕', org: 'Vastra Daan NGO', address: 'Old Delhi Gate', dist: '4.2 km', items: 'Winter wear + blankets', timing: '9am – 4pm', phone: '+91 10987 65432' },
];

const NEED_CATEGORIES = [
  { key: 'food', emoji: '🍱', label: 'Food & Meals', sub: 'Emergency food packets, cooked meals, ration kits, dry food supplies', bg: '#FFF7ED', border: '#FB923C', color: '#EA580C' },
  { key: 'clothing', emoji: '👕', label: 'Clothing & Essentials', sub: 'Clothes for men, women, children, blankets, warm wear, footwear', bg: '#EFF6FF', border: '#60A5FA', color: '#2563EB' },
  { key: 'shelter', emoji: '🏠', label: 'Shelter & Housing', sub: 'Emergency shelter, temporary housing, tents, displacement support', bg: '#ECFDF5', border: '#34D399', color: '#059669' },
  { key: 'medical', emoji: '💊', label: 'Medical Help', sub: 'Medicines, first aid, doctor visit, hospital support, mental health', bg: '#FEF2F2', border: '#F87171', color: '#DC2626' },
  { key: 'water', emoji: '💧', label: 'Clean Water', sub: 'Drinking water, water purifiers, sanitation supplies', bg: '#ECFEFF', border: '#22D3EE', color: '#0891B2' },
  { key: 'emergency', emoji: '🆘', label: 'Emergency Help', sub: 'Immediate life-threatening situation, disaster response, urgent rescue', bg: '#FEF2F2', border: '#EF4444', color: '#DC2626', isEmergency: true },
];

const STATUS_MAP = {
  submitted: { label: 'Submitted', color: '#CA8A04', bg: '#FEF9C3', dot: '🟡' },
  assigned: { label: 'NGO Assigned', color: '#2563EB', bg: '#DBEAFE', dot: '🔵' },
  progress: { label: 'In Progress', color: '#EA580C', bg: '#FFF7ED', dot: '🟠' },
  fulfilled: { label: 'Fulfilled', color: '#16A34A', bg: '#DCFCE7', dot: '🟢' },
};

const S = ({ children, d = 0 }) => <div style={{ animation: `fadeUpSubtle 0.4s ${d}ms cubic-bezier(0.22,1,0.36,1) both` }}>{children}</div>;

export default function BeneficiaryDashboard({ userName, showToastMsg, setShowChat }) {
  const [location, setLocation] = useState('📍 Detecting your location...');
  const [activeForm, setActiveForm] = useState(null);
  const [requests, setRequests] = useState(DEMO_REQUESTS);
  const [mapFilter, setMapFilter] = useState('all');
  const [selectedPin, setSelectedPin] = useState(null);
  const [showStrip, setShowStrip] = useState(true);

  // Form states
  const [formData, setFormData] = useState({});

  useEffect(() => {
    setTimeout(() => setLocation('📍 New Delhi, Delhi'), 1500);
  }, []);

  const submitRequest = (type) => {
    const newReq = { id: Date.now(), type, title: NEED_CATEGORIES.find(c => c.key === type)?.label || type, status: 'submitted', ngo: null, date: null, emoji: NEED_CATEGORIES.find(c => c.key === type)?.emoji || '📋' };
    setRequests(r => [newReq, ...r]);
    setActiveForm(null);
    setFormData({});
    showToastMsg?.('Request submitted! We\'ll connect you with nearby NGOs ✅');
  };

  const filteredResources = mapFilter === 'all' ? DEMO_RESOURCES : DEMO_RESOURCES.filter(r => r.type === mapFilter);

  /* ═══ REQUEST FORM MODAL ═══ */
  const RequestFormModal = () => {
    if (!activeForm) return null;
    const cat = NEED_CATEGORIES.find(c => c.key === activeForm);
    return (
      <div className="ng-modal-bg" onClick={() => setActiveForm(null)}>
        <div className="ng-modal" onClick={e => e.stopPropagation()} style={{ width: 520, maxHeight: '85vh', overflow: 'auto' }}>
          <div style={{ padding: '22px 28px', background: `linear-gradient(135deg, ${cat.color}, ${cat.border})`, color: '#fff' }}>
            <h3 style={{ fontWeight: 900, fontSize: 20 }}>{cat.emoji} {cat.label} Request</h3>
            <p style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>Fill in your details — we'll find help near you</p>
          </div>
          <div style={{ padding: '24px 28px 32px' }}>
            <label className="ng-label">Full Name</label>
            <input className="ng-input" value={userName || ''} readOnly style={{ marginBottom: 16, background: '#f9f9f6' }} />

            {activeForm === 'food' && (<>
              <label className="ng-label">Number of people in family</label>
              <select className="ng-input" style={{ marginBottom: 16 }} onChange={e => setFormData(f => ({...f, people: e.target.value}))}>
                {Array.from({length: 20}, (_, i) => <option key={i+1} value={i+1}>{i+1} {i === 0 ? 'person' : 'people'}</option>)}
              </select>
              <label className="ng-label">Type of food needed</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {['Cooked meals', 'Dry rations', 'Baby food', 'Diabetic diet', 'Vegetarian', 'Non-vegetarian'].map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1.5px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                    <input type="checkbox" /> {t}
                  </label>
                ))}
              </div>
              <label className="ng-label">How urgent?</label>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                {['Today', 'This Week', 'This Month'].map(u => (
                  <button key={u} onClick={() => setFormData(f => ({...f, urgency: u}))} className={formData.urgency === u ? 'btn-saffron' : 'btn-outline'} style={{ flex: 1, padding: '10px 0', fontSize: 13 }}>{u}</button>
                ))}
              </div>
            </>)}

            {activeForm === 'clothing' && (<>
              <label className="ng-label">Number of people</label>
              <select className="ng-input" style={{ marginBottom: 16 }} onChange={e => setFormData(f => ({...f, people: e.target.value}))}>
                {Array.from({length: 20}, (_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
              </select>
              <label className="ng-label">For whom</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {['Men', 'Women', 'Children', 'Elderly'].map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1.5px solid var(--border)', cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" /> {t}
                  </label>
                ))}
              </div>
              <label className="ng-label">Size preferences</label>
              <input className="ng-input" placeholder="e.g., M, L, XL or age groups" style={{ marginBottom: 16 }} />
            </>)}

            {activeForm === 'medical' && (<>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 16 }}>
                <div><label className="ng-label">Patient name</label><input className="ng-input" placeholder="Patient name" /></div>
                <div><label className="ng-label">Age</label><input className="ng-input" type="number" placeholder="Age" /></div>
              </div>
              <label className="ng-label">Type of help needed</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {['Medicines', 'Doctor visit', 'Hospital support', 'Mental health', 'Disability support'].map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1.5px solid var(--border)', cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" /> {t}
                  </label>
                ))}
              </div>
              <label className="ng-label">Describe condition briefly</label>
              <textarea className="ng-input" rows={3} placeholder="Brief description..." style={{ marginBottom: 16, resize: 'vertical' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 14, background: '#FEF2F2', border: '1px solid #FCA5A5', marginBottom: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#DC2626' }}>🚨 Is this an emergency?</span>
                <div className="ng-toggle" onClick={() => setFormData(f => ({...f, isEmergency: !f.isEmergency}))} style={{ background: formData.isEmergency ? '#DC2626' : '#CBD5E1' }}>
                  <div className="ng-toggle-thumb" style={{ left: formData.isEmergency ? 24 : 2 }} />
                </div>
              </div>
            </>)}

            {activeForm === 'shelter' && (<>
              <label className="ng-label">Family size</label>
              <select className="ng-input" style={{ marginBottom: 16 }}>
                {Array.from({length: 20}, (_, i) => <option key={i+1}>{i+1}</option>)}
              </select>
              <label className="ng-label">Current situation</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {['Flood displaced', 'Fire displaced', 'Eviction', 'No permanent home', 'Other'].map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1.5px solid var(--border)', cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" /> {t}
                  </label>
                ))}
              </div>
              <label className="ng-label">Duration needed</label>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                {['Temporary (days)', 'Long-term (months)'].map(d => (
                  <button key={d} onClick={() => setFormData(f => ({...f, duration: d}))} className={formData.duration === d ? 'btn-saffron' : 'btn-outline'} style={{ flex: 1, padding: '10px', fontSize: 13 }}>{d}</button>
                ))}
              </div>
            </>)}

            <label className="ng-label">Your Location</label>
            <input className="ng-input" defaultValue="New Delhi, Delhi" style={{ marginBottom: 16 }} />

            <label className="ng-label">Additional notes</label>
            <textarea className="ng-input" rows={2} placeholder="Anything else we should know..." style={{ marginBottom: 24, resize: 'vertical' }} />

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-outline" onClick={() => setActiveForm(null)} style={{ flex: 1, padding: '14px' }}>Cancel</button>
              <button className="btn-saffron" onClick={() => submitRequest(activeForm)} style={{ flex: 2, padding: '14px', fontSize: 15 }}>Submit {cat.label} Request</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="ng-page" style={{ paddingBottom: showStrip ? 72 : 36 }}>
      {/* HEADER */}
      <S d={0}>
        <div className="ng-card-gradient" style={{ padding: '28px 30px', marginBottom: 28 }}>
          <h1 style={{ fontWeight: 900, fontSize: 24, marginBottom: 4 }}>How can we help you today, {(userName || 'Friend').split(' ')[0]}? 🙏</h1>
          <p style={{ color: 'var(--sub)', fontSize: 14, marginBottom: 12 }}>Tell us what you need — we'll connect you with nearby NGOs and resources</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 99, background: 'var(--saffron-lt)', fontSize: 13, fontWeight: 600, color: 'var(--saffron)' }}>
            {location}
            <span style={{ color: 'var(--saffron)', cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}>Change</span>
          </div>
        </div>
      </S>

      {/* SECTION 1 — WHAT DO YOU NEED */}
      <S d={100}>
        <h2 style={{ fontWeight: 900, fontSize: 22, marginBottom: 6 }}>What Do You Need?</h2>
        <p style={{ color: 'var(--sub)', fontSize: 14, marginBottom: 22 }}>Select a category to submit your request</p>
        <div className="need-grid" style={{ marginBottom: 40 }}>
          {NEED_CATEGORIES.map((cat, i) => (
            <div key={cat.key} className={`need-card${cat.isEmergency ? ' emergency' : ''}`}
              style={{ background: cat.bg, borderColor: cat.border, animation: `fadeUp 0.4s ${100 + i * 60}ms cubic-bezier(0.22,1,0.36,1) both` }}
              onClick={() => setActiveForm(cat.key)}>
              <div className="nc-icon">{cat.emoji}</div>
              <div className="nc-label" style={{ color: cat.color }}>{cat.label}</div>
              <div className="nc-sub">{cat.sub}</div>
            </div>
          ))}
        </div>
      </S>

      {/* SECTION 2 — NEARBY MAP */}
      <S d={200}>
        <h2 style={{ fontWeight: 900, fontSize: 22, marginBottom: 6 }}>📍 Resources Available Near You</h2>
        <p style={{ color: 'var(--sub)', fontSize: 14, marginBottom: 16 }}>Click any pin to see what's available and how to collect it</p>
        <div className="filter-pills">
          {[{ k: 'all', l: 'All' }, { k: 'food', l: '🍱 Food' }, { k: 'clothing', l: '👕 Clothing' }, { k: 'medical', l: '💊 Medical' }, { k: 'water', l: '💧 Water' }, { k: 'shelter', l: '🏠 Shelter' }].map(f => (
            <button key={f.k} className={`filter-pill${mapFilter === f.k ? ' active' : ''}`} onClick={() => { setMapFilter(f.k); setSelectedPin(null); }}>{f.l}</button>
          ))}
        </div>
        <div className="map-grid" style={{ marginBottom: 40, padding: 20 }}>
          {/* Grid lines */}
          {[20,40,60,80].map(p => <div key={`h${p}`} style={{ position:'absolute', left:0, right:0, top:`${p}%`, height:1, background:'rgba(45,134,83,0.08)' }} />)}
          {[20,40,60,80].map(p => <div key={`v${p}`} style={{ position:'absolute', top:0, bottom:0, left:`${p}%`, width:1, background:'rgba(45,134,83,0.08)' }} />)}
          {/* Road lines */}
          <div style={{ position:'absolute', top:'50%', left:0, right:0, height:3, background:'rgba(200,200,180,0.4)' }} />
          <div style={{ position:'absolute', left:'50%', top:0, bottom:0, width:3, background:'rgba(200,200,180,0.4)' }} />
          {/* User pin */}
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:16, height:16, borderRadius:'50%', background:'#3B82F6', border:'3px solid #fff', boxShadow:'0 0 0 6px rgba(59,130,246,0.2)', zIndex:5 }} />
          <div style={{ position:'absolute', top:'calc(50% + 14px)', left:'50%', transform:'translateX(-50%)', fontSize:10, fontWeight:700, color:'#3B82F6', whiteSpace:'nowrap', zIndex:5 }}>You</div>
          {/* Resource pins */}
          {filteredResources.map(r => (
            <div key={r.id} className={`map-pin${r.live ? ' live' : ''}`}
              style={{ top: `${r.lat}%`, left: `${r.left}%`, background: { food:'#FB923C', clothing:'#60A5FA', medical:'#F87171', water:'#22D3EE', shelter:'#34D399' }[r.type], color: { food:'#FB923C', clothing:'#60A5FA', medical:'#F87171', water:'#22D3EE', shelter:'#34D399' }[r.type] }}
              onClick={() => setSelectedPin(selectedPin === r.id ? null : r.id)}>
              {r.emoji}
            </div>
          ))}
          {/* Popup */}
          {selectedPin && (() => {
            const r = DEMO_RESOURCES.find(x => x.id === selectedPin);
            if (!r) return null;
            return (
              <div className="map-popup" style={{ top: `calc(${r.lat}% - 10px)`, left: `calc(${r.left}% + 44px)` }}>
                <h4 style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>{r.org}</h4>
                <p style={{ fontSize: 12, color: 'var(--sub)', marginBottom: 4 }}>📍 {r.address}</p>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{r.dist} away</p>
                <div style={{ padding: '8px 12px', borderRadius: 10, background: 'var(--saffron-lt)', fontSize: 13, fontWeight: 600, color: 'var(--saffron)', marginBottom: 8 }}>{r.available}</div>
                <p style={{ fontSize: 12, color: 'var(--sub)', marginBottom: 4 }}>🕐 {r.timing}</p>
                <p style={{ fontSize: 12, color: 'var(--sub)', marginBottom: 12 }}>📞 {r.phone}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-saffron" style={{ flex: 1, padding: '8px', fontSize: 12 }}>Get Directions</button>
                  <button className="btn-outline" style={{ flex: 1, padding: '8px', fontSize: 12 }} onClick={() => { setActiveForm(r.type); setSelectedPin(null); }}>Request</button>
                </div>
              </div>
            );
          })()}
        </div>
      </S>

      {/* SECTION 3 — MY REQUESTS */}
      <S d={300}>
        <h2 style={{ fontWeight: 900, fontSize: 22, marginBottom: 6 }}>📋 My Active Requests</h2>
        <p style={{ color: 'var(--sub)', fontSize: 14, marginBottom: 22 }}>Track the status of your help requests</p>
        {requests.length === 0 ? (
          <div className="ng-card" style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <p style={{ color: 'var(--sub)', fontSize: 15 }}>You haven't made any requests yet.<br />Tell us what you need above 👆</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginBottom: 40 }}>
            {requests.map((r, i) => {
              const st = STATUS_MAP[r.status] || STATUS_MAP.submitted;
              return (
                <div key={r.id} className="req-card" style={{ animation: `fadeUp 0.3s ${i * 60}ms ease both` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 800 }}>{r.emoji} {r.title}</span>
                    <span className="status-pill" style={{ background: st.bg, color: st.color }}>{st.dot} {st.label}</span>
                  </div>
                  {r.ngo && <p style={{ fontSize: 13, color: 'var(--sub)', marginBottom: 4 }}>🏢 {r.ngo}</p>}
                  {r.date && <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Expected: {r.date}</p>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className="btn-ghost" style={{ flex: 1, padding: '9px', fontSize: 12 }} onClick={() => { setRequests(rs => rs.filter(x => x.id !== r.id)); showToastMsg?.('Request cancelled'); }}>Cancel Request</button>
                    {r.ngo && <button className="btn-saffron" style={{ flex: 1, padding: '9px', fontSize: 12 }} onClick={() => setShowChat?.(true)}>Contact NGO</button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </S>

      {/* SECTION 4 — NEARBY DONATION POINTS */}
      <S d={400}>
        <h2 style={{ fontWeight: 900, fontSize: 22, marginBottom: 6 }}>🗺️ Nearby Donation Points</h2>
        <p style={{ color: 'var(--sub)', fontSize: 14, marginBottom: 22 }}>Walk-in points where you can collect food, clothing and supplies right now</p>
        <div className="scroll-row" style={{ marginBottom: 40 }}>
          {DEMO_POINTS.map((p, i) => (
            <div key={p.id} className="ng-card" style={{ animation: `fadeUp 0.3s ${i * 60}ms ease both` }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>{p.emoji}</div>
              <h4 style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{p.org}</h4>
              <p style={{ fontSize: 12, color: 'var(--sub)', marginBottom: 2 }}>📍 {p.address}</p>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{p.dist} away</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--saffron)', marginBottom: 4 }}>{p.items}</p>
              <p style={{ fontSize: 12, color: 'var(--sub)', marginBottom: 14 }}>🕐 {p.timing}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-saffron" style={{ flex: 1, padding: '9px', fontSize: 12 }}>Get Directions</button>
                <button className="btn-green" style={{ flex: 1, padding: '9px', fontSize: 12 }}>📞 Call</button>
              </div>
            </div>
          ))}
        </div>
      </S>

      {/* SECTION 5 — EMERGENCY STRIP */}
      {showStrip && (
        <div className="emergency-strip">
          <span>🆘 Emergency? Call: <strong>1800-XXX-XXXX</strong> (Toll Free)</span>
          <button onClick={() => setShowChat?.(true)}>💬 Chat Now</button>
          <button onClick={() => setShowStrip(false)} style={{ padding: '4px 10px', fontSize: 16, background: 'rgba(255,255,255,0.1)' }}>✕</button>
        </div>
      )}

      {/* REQUEST FORM MODAL */}
      <RequestFormModal />
    </div>
  );
}
