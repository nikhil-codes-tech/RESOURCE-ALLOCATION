import { useState } from 'react';

const S = ({ children, d = 0 }) => <div style={{ animation: `fadeUpSubtle 0.4s ${d}ms cubic-bezier(0.22,1,0.36,1) both` }}>{children}</div>;

const DEMO_RESOURCES = [
  { id:1, name:'Food Packets', cat:'Food', emoji:'🍱', avail:450, total:600, loc:'Warehouse A, Delhi', exp:'Dec 2025' },
  { id:2, name:'Winter Jackets', cat:'Clothing', emoji:'👕', avail:45, total:200, loc:'Store B, Delhi', exp:null },
  { id:3, name:'Water Tanks', cat:'Water', emoji:'💧', avail:12, total:50, loc:'Depot C', exp:null },
  { id:4, name:'First Aid Kits', cat:'Medical', emoji:'💊', avail:80, total:100, loc:'Warehouse A', exp:'Mar 2026' },
  { id:5, name:'Rice Bags', cat:'Food', emoji:'🍚', avail:340, total:500, loc:'Warehouse A', exp:'Dec 2025' },
  { id:6, name:'Dal Packets', cat:'Food', emoji:'🥣', avail:89, total:300, loc:'Warehouse B', exp:'Nov 2025' },
  { id:7, name:'Cooking Oil', cat:'Food', emoji:'🫗', avail:120, total:200, loc:'Warehouse A', exp:'Feb 2026' },
  { id:8, name:'Biscuits', cat:'Food', emoji:'🍪', avail:600, total:800, loc:'Warehouse B', exp:'Jan 2026' },
  { id:9, name:'Baby Formula', cat:'Food', emoji:'🍼', avail:15, total:100, loc:'Warehouse A', exp:'Oct 2025' },
  { id:10, name:"Men's Shirts", cat:'Clothing', emoji:'👔', avail:180, total:250, loc:'Store B', exp:null, sizes:{M:60,L:80,XL:40} },
  { id:11, name:'Blankets', cat:'Clothing', emoji:'🧣', avail:23, total:150, loc:'Store B', exp:null },
  { id:12, name:"Children's Uniforms", cat:'Clothing', emoji:'👶', avail:200, total:300, loc:'Store C', exp:null },
  { id:13, name:'Tents', cat:'Shelter', emoji:'⛺', avail:8, total:30, loc:'Depot C', exp:null },
  { id:14, name:'Generators', cat:'Equipment', emoji:'🔧', avail:3, total:5, loc:'Depot C', exp:null },
];

const DEMO_BEN_REQUESTS = [
  { id:1, type:'food', emoji:'🍱', title:'FOOD REQUEST', name:'Ramesh Kumar', family:5, dist:'2.1 km', location:'Sector 7, Delhi', needs:'Dry rations for 1 week', time:'2 hours ago', urgency:'urgent' },
  { id:2, type:'clothing', emoji:'👕', title:'CLOTHING REQUEST', name:'Sunita Devi', family:3, dist:'3.4 km', location:'Old Town', needs:"Children's clothes (age 5-10), 2 blankets, warm wear", time:'5 hours ago', urgency:'normal' },
  { id:3, type:'medical', emoji:'💊', title:'MEDICAL REQUEST', name:'Ahmed Khan', family:1, dist:'1.5 km', location:'Sector 12, Delhi', needs:'Medicines for diabetes + blood pressure', time:'1 hour ago', urgency:'urgent' },
  { id:4, type:'food', emoji:'🍱', title:'FOOD REQUEST', name:'Lakshmi Bai', family:8, dist:'4.8 km', location:'Gandhi Nagar', needs:'Cooked meals for 8 people, baby food', time:'3 hours ago', urgency:'normal' },
];

const DEMO_DRIVES = [
  { id:1, name:'Weekly Food Distribution', type:'Food', loc:'Sector 14 Community Centre', timing:'Every Sat 9am-6pm', collected:180, target:450, volunteers:8, served:120, status:'Active' },
  { id:2, name:'Winter Clothing Drive', type:'Clothing', loc:'Gandhi Nagar Camp', timing:'Mon-Fri 10am-4pm', collected:290, target:320, volunteers:5, served:250, status:'Active' },
  { id:3, name:'Emergency Food Relief', type:'Both', loc:'Old Town Relief Camp', timing:'Apr 28, 8am-2pm', collected:0, target:500, volunteers:0, served:0, status:'Upcoming' },
];

function getStatus(avail, total) {
  if (avail === 0) return { label: 'Depleted', color: '#94A3B8', bg: '#F1F0ED', dot: '⚫' };
  const pct = (avail / total) * 100;
  if (pct < 30) return { label: 'Critical', color: '#DC2626', bg: '#FEE2E2', dot: '🔴' };
  if (pct < 60) return { label: 'Low', color: '#CA8A04', bg: '#FEF9C3', dot: '🟡' };
  return { label: 'Good', color: '#16A34A', bg: '#DCFCE7', dot: '🟢' };
}

export default function NgoResources({ showToastMsg }) {
  const [resTab, setResTab] = useState('all');
  const [reqFilter, setReqFilter] = useState('all');
  const [assignedReqs, setAssignedReqs] = useState({});
  const [showAddRes, setShowAddRes] = useState(false);

  const filteredRes = resTab === 'all' ? DEMO_RESOURCES : DEMO_RESOURCES.filter(r => r.cat.toLowerCase() === resTab);
  const filteredReqs = reqFilter === 'all' ? DEMO_BEN_REQUESTS : DEMO_BEN_REQUESTS.filter(r => reqFilter === 'urgent' ? r.urgency === 'urgent' : r.type === reqFilter);

  const criticalCount = DEMO_RESOURCES.filter(r => (r.avail / r.total) < 0.3).length;
  const deployedToday = 47;
  const incomingDonations = 3;

  const handleAssign = (reqId) => {
    setAssignedReqs(a => ({ ...a, [reqId]: true }));
    showToastMsg?.('Resource assigned! Beneficiary will be notified via SMS ✅');
  };

  return (
    <div>
      {/* ═══ RESOURCE SUMMARY CARDS ═══ */}
      <S d={0}>
        <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { l: 'Total Resources', v: DEMO_RESOURCES.length, e: '📦', c: 'var(--saffron)', bg: 'var(--saffron-lt)' },
            { l: 'Critically Low', v: criticalCount, e: '⚠️', c: '#DC2626', bg: '#FEE2E2' },
            { l: 'Deployed Today', v: deployedToday, e: '🚀', c: '#0D9488', bg: '#CCFBF1' },
            { l: 'Incoming Donations', v: incomingDonations, e: '📥', c: 'var(--gold)', bg: 'var(--gold-lt)' },
          ].map((s, i) => (
            <div key={s.l} className="ng-stat" style={{ animation: `fadeUp 0.3s ${i * 60}ms ease both` }}>
              <div className="st-icon" style={{ background: s.bg }}>{s.e}</div>
              <div className="st-val" style={{ color: s.c }}>{s.v}</div>
              <div className="st-lbl">{s.l}</div>
            </div>
          ))}
        </div>
      </S>

      {/* ═══ AVAILABLE RESOURCES PANEL ═══ */}
      <S d={100}>
        <div className="ng-card" style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontWeight: 900, fontSize: 20 }}>📦 Available Resources</h3>
              <p style={{ color: 'var(--sub)', fontSize: 13, marginTop: 2 }}>Real-time inventory across all your centres</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-saffron" onClick={() => setShowAddRes(true)} style={{ padding: '10px 20px', fontSize: 13 }}>+ Add Resource</button>
            </div>
          </div>

          {/* Category tabs */}
          <div className="ng-tabs" style={{ marginBottom: 20 }}>
            {[{k:'all',l:'All'},{k:'food',l:'🍱 Food'},{k:'clothing',l:'👕 Clothing'},{k:'medical',l:'💊 Medical'},{k:'water',l:'💧 Water'},{k:'shelter',l:'⛺ Shelter'},{k:'equipment',l:'🔧 Equipment'}].map(t => (
              <button key={t.k} className={`ng-tab${resTab === t.k ? ' active' : ''}`} onClick={() => setResTab(t.k)}>{t.l}</button>
            ))}
          </div>

          {/* Resource cards for Food/Clothing special views */}
          {(resTab === 'food' || resTab === 'clothing') ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
              {filteredRes.map((r, i) => {
                const st = getStatus(r.avail, r.total);
                const pct = Math.round((r.avail / r.total) * 100);
                return (
                  <div key={r.id} className="inv-card" style={{ animation: `fadeUp 0.3s ${i * 40}ms ease both` }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{r.emoji}</div>
                    <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{r.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--sub)', marginBottom: 8 }}>{r.avail} / {r.total} units {pct < 30 ? '⚠️' : ''}</div>
                    <div className="ng-progress" style={{ marginBottom: 4 }}>
                      <div className="ng-progress-fill" style={{ width: `${pct}%`, background: st.color }} />
                    </div>
                    <div style={{ fontSize: 11, color: st.color, fontWeight: 700, marginBottom: 6 }}>{pct}%</div>
                    {r.exp && <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Exp: {r.exp}</div>}
                    {r.sizes && <div style={{ fontSize: 11, color: 'var(--sub)', marginBottom: 4 }}>Sizes: {Object.entries(r.sizes).map(([k,v]) => `${k}(${v})`).join(' ')}</div>}
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>📍 {r.loc}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {pct >= 30 ? <button className="btn-saffron" style={{ flex:1, padding:'7px', fontSize:11 }}>Dispatch</button> : <button className="btn-outline" style={{ flex:1, padding:'7px', fontSize:11, color:'#DC2626', borderColor:'#FCA5A5' }}>Request More</button>}
                      <button className="btn-ghost" style={{ padding:'7px 10px', fontSize:11 }}>Edit</button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table view for All and other tabs */
            <div style={{ overflowX: 'auto' }}>
              <table className="res-table">
                <thead><tr><th>Resource</th><th>Category</th><th>Available</th><th>Total</th><th>Location</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {filteredRes.map((r, i) => {
                    const st = getStatus(r.avail, r.total);
                    const pct = Math.round((r.avail / r.total) * 100);
                    return (
                      <tr key={r.id} style={{ animation: `fadeUp 0.25s ${i * 30}ms ease both` }}>
                        <td style={{ fontWeight: 700 }}>{r.emoji} {r.name}</td>
                        <td><span className="ng-chip" style={{ background: `${st.color}15`, color: st.color, fontSize: 11 }}>{r.cat}</span></td>
                        <td style={{ fontWeight: 700 }}>{r.avail}</td>
                        <td style={{ color: 'var(--muted)' }}>{r.total}</td>
                        <td style={{ fontSize: 13, color: 'var(--sub)' }}>{r.loc}</td>
                        <td><span className="status-pill" style={{ background: st.bg, color: st.color }}>{st.dot} {st.label}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {pct >= 30 ? <button className="btn-saffron" style={{ padding:'6px 14px', fontSize:11 }}>Dispatch</button> : <button className="btn-outline" style={{ padding:'6px 14px', fontSize:11, color:'#DC2626' }}>Request More</button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </S>

      {/* ═══ BENEFICIARY REQUESTS ═══ */}
      <S d={200}>
        <div className="ng-card" style={{ marginBottom: 32 }}>
          <h3 style={{ fontWeight: 900, fontSize: 20, marginBottom: 4 }}>📋 Incoming Requests from People in Need</h3>
          <p style={{ color: 'var(--sub)', fontSize: 13, marginBottom: 20 }}>People nearby who need food, clothing or other resources</p>
          <div className="filter-pills" style={{ marginBottom: 16 }}>
            {['all', 'food', 'clothing', 'medical', 'urgent'].map(f => (
              <button key={f} className={`filter-pill${reqFilter === f ? ' active' : ''}`} onClick={() => setReqFilter(f)}>{f === 'all' ? 'All' : f === 'urgent' ? '🔴 Urgent' : f.charAt(0).toUpperCase() + f.slice(1)}</button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 14 }}>
            {filteredReqs.map((r, i) => (
              <div key={r.id} className="req-card" style={{ borderLeft: `4px solid ${r.urgency === 'urgent' ? '#DC2626' : 'var(--border)'}`, animation: `fadeUp 0.3s ${i * 50}ms ease both` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: 14 }}>{r.emoji} {r.title}</span>
                  <span className={`drive-badge ${r.urgency === 'urgent' ? 'urgent' : 'upcoming'}`}>{r.urgency === 'urgent' ? 'URGENT' : 'NORMAL'}</span>
                </div>
                <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{r.name} · Family of {r.family}</p>
                <p style={{ fontSize: 12, color: 'var(--sub)', marginBottom: 4 }}>📍 {r.location} · {r.dist} away</p>
                <p style={{ fontSize: 13, color: 'var(--sub)', marginBottom: 4 }}>Needs: {r.needs}</p>
                <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14 }}>Submitted: {r.time}</p>
                {assignedReqs[r.id] ? (
                  <div style={{ padding: '10px 16px', borderRadius: 12, background: '#DCFCE7', color: '#16A34A', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>✅ Resource Assigned — Beneficiary Notified</div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-saffron" onClick={() => handleAssign(r.id)} style={{ flex: 2, padding: '10px', fontSize: 12 }}>✅ Assign Resource</button>
                    <button className="btn-green" style={{ padding: '10px 14px', fontSize: 12 }}>📞 Call</button>
                    <button className="btn-ghost" style={{ padding: '10px 14px', fontSize: 12 }}>❌</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </S>

      {/* ═══ DONATION DRIVE MANAGEMENT ═══ */}
      <S d={300}>
        <div className="ng-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontWeight: 900, fontSize: 20 }}>📢 My Active Donation Drives</h3>
              <p style={{ color: 'var(--sub)', fontSize: 13, marginTop: 2 }}>Manage all your donation drives</p>
            </div>
            <button className="btn-saffron" style={{ padding: '10px 20px', fontSize: 13 }}>+ Create New Drive</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {DEMO_DRIVES.map((d, i) => {
              const pct = d.target > 0 ? Math.round((d.collected / d.target) * 100) : 0;
              return (
                <div key={d.id} className="req-card" style={{ animation: `fadeUp 0.3s ${i * 50}ms ease both` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{d.name}</span>
                      <span className="ng-chip" style={{ marginLeft: 8, background: d.type === 'Food' ? '#FFF7ED' : d.type === 'Clothing' ? '#EFF6FF' : '#F0FDF4', color: d.type === 'Food' ? '#EA580C' : d.type === 'Clothing' ? '#2563EB' : '#16A34A', fontSize: 10 }}>{d.type}</span>
                    </div>
                    <span className={`drive-badge ${d.status === 'Active' ? 'live' : d.status === 'Upcoming' ? 'upcoming' : 'closed'}`}>{d.status}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--sub)', marginBottom: 8 }}>📍 {d.loc} · 🕐 {d.timing}</p>
                  <div style={{ display: 'flex', gap: 24, marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--sub)' }}>👥 {d.volunteers} volunteers</span>
                    <span style={{ fontSize: 12, color: 'var(--sub)' }}>🙏 {d.served} served</span>
                  </div>
                  <div className="ng-progress" style={{ marginBottom: 4 }}>
                    <div className="ng-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}><span>{d.collected}/{d.target} collected</span><span>{pct}%</span></div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-outline" style={{ padding: '8px 16px', fontSize: 12 }}>Edit</button>
                    <button className="btn-outline" style={{ padding: '8px 16px', fontSize: 12 }}>Share</button>
                    <button className="btn-ghost" style={{ padding: '8px 16px', fontSize: 12, color: '#DC2626' }}>End Drive</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </S>

      {/* Add Resource Modal */}
      {showAddRes && (
        <div className="ng-modal-bg" onClick={() => setShowAddRes(false)}>
          <div className="ng-modal" onClick={e => e.stopPropagation()} style={{ width: 480 }}>
            <div style={{ padding: '22px 28px', background: 'linear-gradient(135deg, var(--saffron), #FF8F65)', color: '#fff' }}>
              <h3 style={{ fontWeight: 900, fontSize: 20 }}>📦 Add New Resource</h3>
            </div>
            <div style={{ padding: '24px 28px 32px' }}>
              <label className="ng-label">Resource Name</label>
              <input className="ng-input" placeholder="e.g., Rice Bags" style={{ marginBottom: 16 }} />
              <label className="ng-label">Category</label>
              <select className="ng-input" style={{ marginBottom: 16 }}>
                <option>Food</option><option>Clothing</option><option>Medical</option><option>Water</option><option>Shelter</option><option>Equipment</option>
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div><label className="ng-label">Available Qty</label><input className="ng-input" type="number" placeholder="0" /></div>
                <div><label className="ng-label">Total Capacity</label><input className="ng-input" type="number" placeholder="0" /></div>
              </div>
              <label className="ng-label">Location</label>
              <input className="ng-input" placeholder="Warehouse / Store name" style={{ marginBottom: 24 }} />
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn-outline" onClick={() => setShowAddRes(false)} style={{ flex: 1 }}>Cancel</button>
                <button className="btn-saffron" onClick={() => { setShowAddRes(false); showToastMsg?.('Resource added ✅'); }} style={{ flex: 2 }}>Add Resource</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
