import { useState } from 'react';

const S = ({ children, d = 0 }) => <div style={{ animation: `fadeUpSubtle 0.4s ${d}ms cubic-bezier(0.22,1,0.36,1) both` }}>{children}</div>;

const DEMO_FOOD_DRIVES = [
  { id: 1, org: 'Relief First Foundation', address: 'Sector 14 Community Centre', dist: '1.2 km', available: 450, collected: 180, total: 450, items: 'Rice bags, Dal, Oil, Biscuits, Baby formula', timing: 'Today: 9:00 AM – 6:00 PM', phone: '+91 98765 43210', status: 'live', type: 'food' },
  { id: 2, org: 'Annapurna Kitchen', address: 'Near Railway Station', dist: '1.8 km', available: 200, collected: 120, total: 200, items: 'Cooked meals, Chapati, Rice, Dal', timing: 'Today: 12:00 PM – 3:00 PM', phone: '+91 43210 98765', status: 'live', type: 'food' },
  { id: 3, org: 'Roti Foundation', address: 'CP Metro Station Exit', dist: '3.1 km', available: 500, collected: 480, total: 500, items: 'Food packets, Water bottles, Biscuits', timing: 'Today: 8:00 AM – 6:00 PM', phone: '+91 21098 76543', status: 'urgent', type: 'food' },
  { id: 4, org: 'Seva Bharti', address: 'Community Hall, Sector 22', dist: '5.4 km', available: 300, collected: 0, total: 300, items: 'Dry rations, Baby food, Diabetic meals', timing: 'Tomorrow: 9:00 AM – 5:00 PM', phone: '+91 11223 34455', status: 'upcoming', type: 'food' },
];

const DEMO_CLOTHING_DRIVES = [
  { id: 5, org: 'Mahila Shakti NGO', address: 'Gandhi Nagar Relief Camp', dist: '0.8 km', available: 320, collected: 290, total: 320, items: "Men's shirts, Women's sarees, Children's uniforms, Blankets, Winter jackets", timing: 'Today: 10:00 AM – 4:00 PM', phone: '+91 87654 32109', status: 'urgent', type: 'clothing', forWhom: ['Men', 'Women', 'Children'], sizes: 'S M L XL XXL' },
  { id: 6, org: 'Kapda Bank', address: 'Sector 22 Market', dist: '2.3 km', available: 500, collected: 200, total: 500, items: 'School uniforms, Warm jackets, Blankets, Footwear', timing: 'Today: 10:00 AM – 5:00 PM', phone: '+91 32109 87654', status: 'live', type: 'clothing', forWhom: ['Children', 'Elderly'], sizes: 'All sizes' },
  { id: 7, org: 'Vastra Daan NGO', address: 'Old Delhi Gate', dist: '4.2 km', available: 150, collected: 50, total: 150, items: 'Winter wear, Blankets, Shawls', timing: 'Today: 9:00 AM – 4:00 PM', phone: '+91 10987 65432', status: 'live', type: 'clothing', forWhom: ['Men', 'Women', 'Elderly'], sizes: 'M L XL' },
];

const BADGE = { live: { label: '🟢 LIVE', cls: 'live' }, upcoming: { label: '🟡 UPCOMING', cls: 'upcoming' }, urgent: { label: '🔴 URGENT', cls: 'urgent' }, closed: { label: '⚫ CLOSED', cls: 'closed' } };

export default function NearbyDonations({ userRole, showToastMsg, userName }) {
  const [radius, setRadius] = useState(10);
  const [viewMode, setViewMode] = useState('list');
  const [foodFilter, setFoodFilter] = useState('all');
  const [clothingFilter, setClothingFilter] = useState('all');
  const [showDriveForm, setShowDriveForm] = useState(false);
  const [driveForm, setDriveForm] = useState({ title: '', type: 'food', org: '', address: '', items: [{ name: '', qty: '' }], phone: '', notes: '' });
  const [volunteered, setVolunteered] = useState({});

  const handleVolunteer = (driveId) => {
    setVolunteered(v => ({ ...v, [driveId]: true }));
    showToastMsg?.(`Signed up to volunteer! You'll receive timing details soon ✅`);
  };

  const handlePostDrive = () => {
    setShowDriveForm(false);
    setDriveForm({ title: '', type: 'food', org: '', address: '', items: [{ name: '', qty: '' }], phone: '', notes: '' });
    showToastMsg?.('Donation drive posted! Volunteers nearby will be notified 🎉');
  };

  const DonationCard = ({ d }) => {
    const badge = BADGE[d.status] || BADGE.live;
    const pct = Math.round((d.collected / d.total) * 100);
    const isVol = volunteered[d.id];
    return (
      <div className="donation-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontWeight: 800, fontSize: 14 }}>{d.type === 'food' ? '🍱' : '👕'} {d.type === 'food' ? 'FOOD' : 'CLOTHING'} DRIVE</span>
          <span className={`drive-badge ${badge.cls}`}>{badge.label}</span>
        </div>
        <h4 style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>{d.org}</h4>
        <p style={{ fontSize: 13, color: 'var(--sub)', marginBottom: 2 }}>📍 {d.address}</p>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>{d.dist} from you</p>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Available: {d.available} {d.type === 'food' ? 'food packets' : 'clothing items'}</div>
          <div className="ng-progress" style={{ marginBottom: 4 }}>
            <div className="ng-progress-fill" style={{ width: `${pct}%`, background: pct > 80 ? '#EF4444' : pct > 50 ? 'var(--gold)' : 'var(--green)' }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.collected}/{d.total} {d.type === 'food' ? 'collected' : 'distributed'}</div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--sub)', marginBottom: 6 }}><strong>Items:</strong> {d.items}</p>
        {d.forWhom && <p style={{ fontSize: 12, color: 'var(--sub)', marginBottom: 4 }}>For: {d.forWhom.map(w => ({ Men: '👔', Women: '👗', Children: '👶', Elderly: '🧓' }[w] || '') + ' ' + w).join(' ')}</p>}
        {d.sizes && <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Sizes: {d.sizes}</p>}
        <p style={{ fontSize: 12, color: 'var(--sub)', marginBottom: 4 }}>🕐 {d.timing}</p>
        <p style={{ fontSize: 12, color: 'var(--sub)', marginBottom: 14 }}>📞 {d.phone}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-outline" style={{ flex: 1, padding: '10px', fontSize: 12 }}>🗺️ Directions</button>
          <button className={isVol ? 'btn-green' : 'btn-saffron'} disabled={isVol} onClick={() => handleVolunteer(d.id)} style={{ flex: 1, padding: '10px', fontSize: 12 }}>
            {isVol ? '✓ Signed Up' : userRole === 'volunteer' ? '🙋 Volunteer Here' : '📦 Volunteer Here'}
          </button>
        </div>
      </div>
    );
  };

  const MapView = () => {
    const allDrives = [...DEMO_FOOD_DRIVES, ...DEMO_CLOTHING_DRIVES];
    return (
      <div className="map-grid" style={{ minHeight: 400, padding: 20 }}>
        {[20,40,60,80].map(p => <div key={`h${p}`} style={{ position:'absolute', left:0, right:0, top:`${p}%`, height:1, background:'rgba(45,134,83,0.08)' }} />)}
        {[20,40,60,80].map(p => <div key={`v${p}`} style={{ position:'absolute', top:0, bottom:0, left:`${p}%`, width:1, background:'rgba(45,134,83,0.08)' }} />)}
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:14, height:14, borderRadius:'50%', background:'#3B82F6', border:'3px solid #fff', boxShadow:'0 0 0 6px rgba(59,130,246,0.2)', zIndex:5 }} />
        {allDrives.map((d, i) => {
          const top = 15 + (i * 12) % 70;
          const left = 10 + (i * 17) % 80;
          return (
            <div key={d.id} className={`map-pin${d.status === 'live' ? ' live' : ''}`}
              style={{ top: `${top}%`, left: `${left}%`, background: d.type === 'food' ? '#FB923C' : '#60A5FA', color: d.type === 'food' ? '#FB923C' : '#60A5FA' }}>
              {d.type === 'food' ? '🍱' : '👕'}
            </div>
          );
        })}
        <div style={{ position:'absolute', bottom:16, left:16, display:'flex', gap:12, background:'rgba(255,255,255,0.9)', padding:'10px 16px', borderRadius:12, backdropFilter:'blur(8px)' }}>
          <span style={{ fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10, height:10, borderRadius:'50%', background:'#FB923C' }} /> Food</span>
          <span style={{ fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10, height:10, borderRadius:'50%', background:'#60A5FA' }} /> Clothing</span>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* HEADER */}
      <S d={0}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontWeight: 900, fontSize: 22, marginBottom: 4 }}>Nearby Food & Clothing Donations</h2>
            <p style={{ color: 'var(--sub)', fontSize: 14 }}>Active donation drives and collection points near you</p>
          </div>
          {(userRole === 'ngo' || userRole === 'volunteer') && (
            <button className="btn-saffron" onClick={() => setShowDriveForm(true)} style={{ padding: '12px 24px', fontSize: 14 }}>+ Post Donation Drive</button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <span className="ng-chip" style={{ background: 'var(--saffron-lt)', color: 'var(--saffron)' }}>📍 New Delhi, Delhi — <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Change</span></span>
          <div style={{ display: 'flex', gap: 4 }}>
            {[5, 10, 25, 50].map(r => (
              <button key={r} onClick={() => setRadius(r)} className={radius === r ? 'btn-saffron' : 'btn-ghost'} style={{ padding: '6px 14px', fontSize: 12, borderRadius: 99 }}>{r}km</button>
            ))}
          </div>
        </div>
        {/* View toggle */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#F1F0ED', borderRadius: 12, padding: 4, width: 'fit-content' }}>
          <button onClick={() => setViewMode('list')} style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: viewMode === 'list' ? 'var(--white)' : 'transparent', color: viewMode === 'list' ? 'var(--saffron)' : 'var(--sub)', boxShadow: viewMode === 'list' ? 'var(--shadow-sm)' : 'none', border: 'none', cursor: 'pointer' }}>📋 List View</button>
          <button onClick={() => setViewMode('map')} style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: viewMode === 'map' ? 'var(--white)' : 'transparent', color: viewMode === 'map' ? 'var(--saffron)' : 'var(--sub)', boxShadow: viewMode === 'map' ? 'var(--shadow-sm)' : 'none', border: 'none', cursor: 'pointer' }}>🗺️ Map View</button>
        </div>
      </S>

      {viewMode === 'map' ? <S d={100}><MapView /></S> : (<>
        {/* FOOD DONATIONS */}
        <S d={100}>
          <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>🍱 Food Donations Near You</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>{DEMO_FOOD_DRIVES.length} active food donation drives within {radius}km</p>
          <div className="filter-pills">
            {['all', 'Cooked Meals', 'Dry Rations', 'Baby Food', 'Diabetic', 'Vegetarian'].map(f => (
              <button key={f} className={`filter-pill${foodFilter === f ? ' active' : ''}`} onClick={() => setFoodFilter(f)}>{f === 'all' ? 'All Food' : f}</button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16, marginBottom: 40 }}>
            {DEMO_FOOD_DRIVES.map((d, i) => <S key={d.id} d={i * 60}><DonationCard d={d} /></S>)}
          </div>
        </S>

        {/* CLOTHING DONATIONS */}
        <S d={200}>
          <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>👕 Clothing Donations Near You</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>{DEMO_CLOTHING_DRIVES.length} active clothing drives within {radius}km</p>
          <div className="filter-pills">
            {['all', 'Men', 'Women', 'Children', 'Elderly', 'Blankets', 'Winter', 'Footwear'].map(f => (
              <button key={f} className={`filter-pill${clothingFilter === f ? ' active' : ''}`} onClick={() => setClothingFilter(f)}>{f === 'all' ? 'All Clothing' : f}</button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16, marginBottom: 40 }}>
            {DEMO_CLOTHING_DRIVES.map((d, i) => <S key={d.id} d={i * 60}><DonationCard d={d} /></S>)}
          </div>
        </S>
      </>)}

      {/* POST DRIVE MODAL */}
      {showDriveForm && (
        <div className="ng-modal-bg" onClick={() => setShowDriveForm(false)}>
          <div className="ng-modal" onClick={e => e.stopPropagation()} style={{ width: 560, maxHeight: '85vh', overflow: 'auto' }}>
            <div style={{ padding: '22px 28px', background: 'linear-gradient(135deg, var(--saffron), #FF8F65)', color: '#fff' }}>
              <h3 style={{ fontWeight: 900, fontSize: 20 }}>📢 Post a Donation Drive</h3>
              <p style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>Create a new food or clothing donation drive</p>
            </div>
            <div style={{ padding: '24px 28px 32px' }}>
              <label className="ng-label">Drive Title *</label>
              <input className="ng-input" placeholder="e.g., Weekly Food Distribution Drive" value={driveForm.title} onChange={e => setDriveForm(f => ({...f, title: e.target.value}))} style={{ marginBottom: 16 }} />
              <label className="ng-label">Type</label>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                {[{k:'food',l:'🍱 Food'},{k:'clothing',l:'👕 Clothing'},{k:'both',l:'🍱👕 Both'}].map(t => (
                  <button key={t.k} onClick={() => setDriveForm(f => ({...f, type: t.k}))} className={driveForm.type === t.k ? 'btn-saffron' : 'btn-outline'} style={{ flex: 1, padding: '10px', fontSize: 13 }}>{t.l}</button>
                ))}
              </div>
              <label className="ng-label">Organization Name</label>
              <input className="ng-input" placeholder="Your organization" style={{ marginBottom: 16 }} />
              <label className="ng-label">Location / Address *</label>
              <input className="ng-input" placeholder="Full address" value={driveForm.address} onChange={e => setDriveForm(f => ({...f, address: e.target.value}))} style={{ marginBottom: 16 }} />
              <label className="ng-label">Items Available</label>
              {driveForm.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input className="ng-input" placeholder="Item name" value={item.name} onChange={e => { const ni = [...driveForm.items]; ni[i].name = e.target.value; setDriveForm(f => ({...f, items: ni})); }} style={{ flex: 2 }} />
                  <input className="ng-input" placeholder="Qty" type="number" value={item.qty} onChange={e => { const ni = [...driveForm.items]; ni[i].qty = e.target.value; setDriveForm(f => ({...f, items: ni})); }} style={{ flex: 1 }} />
                </div>
              ))}
              <button className="btn-ghost" onClick={() => setDriveForm(f => ({...f, items: [...f.items, {name:'', qty:''}]}))} style={{ marginBottom: 16, fontSize: 13 }}>+ Add more items</button>
              <label className="ng-label">Contact Number</label>
              <input className="ng-input" placeholder="+91 98765 43210" style={{ marginBottom: 16 }} />
              <label className="ng-label">Special Instructions</label>
              <textarea className="ng-input" rows={2} placeholder="Any special instructions..." style={{ marginBottom: 24, resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn-outline" onClick={() => setShowDriveForm(false)} style={{ flex: 1, padding: '14px' }}>Cancel</button>
                <button className="btn-saffron" onClick={handlePostDrive} disabled={!driveForm.title} style={{ flex: 2, padding: '14px', fontSize: 15 }}>📢 Post Drive</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
