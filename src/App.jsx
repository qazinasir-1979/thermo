import React, { useState, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { COMPONENTS, calculateMixtureProperties } from './thermo';

// --- Sub-Components ---

const SidebarItem = ({ icon, label, active = false, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-5 py-4 rounded-[22px] transition-all duration-500 group relative overflow-hidden ${
      active 
        ? 'bg-primary text-white shadow-2xl shadow-primary/40 scale-[1.03] translate-x-2' 
        : 'text-slate-500 hover:text-primary hover:bg-primary/5 hover:translate-x-1'
    }`}
  >
    {active && <div className="absolute left-0 top-0 w-1 h-full bg-white/30 rounded-full" />}
    <span className={`material-symbols-outlined text-[22px] transition-transform duration-500 ${active ? 'rotate-[360deg]' : 'group-hover:rotate-12'}`}>{icon}</span>
    <span className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all ${active ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>{label}</span>
  </button>
);

const StatCard = ({ label, value, unit, colorClass, delay = 0 }) => (
  <div 
    className={`glass-card p-7 bg-white rounded-3xl border-t-4 ${colorClass} animate-fade-in`}
    style={{ animationDelay: `${delay}ms` }}
  >
    <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-3 block">{label}</span>
    <div className="flex items-baseline gap-2">
      <div className={`text-4xl font-black tracking-tighter ${colorClass.replace('border-t-', 'text-')}`}>{value}</div>
      {unit && <div className="text-[10px] font-black text-on-surface-variant uppercase">{unit}</div>}
    </div>
  </div>
);

// --- Main App ---

const App = () => {
  // Navigation State
  const [activeModule, setActiveModule] = useState('pure');
  const [pUnit, setPUnit] = useState('bara');
  const [tUnit, setTUnit] = useState('K');
  const [dUnit, setDUnit] = useState('kg/m³');
  
  // Thermodynamic State
  const [component, setComponent] = useState('methane');
  const [temperature, setTemperature] = useState(288.15); 
  const [maxPressure, setMaxPressure] = useState(350.0);
  const [eos, setEos] = useState('srk');
  
  // Natural Gas Composition State
  const [composition, setComposition] = useState({
    methane: 0.858,
    ethane: 0.07,
    propane: 0.034,
    CO2: 0.026,
    nitrogen: 0.012
  });

  const totalFraction = useMemo(() => Object.values(composition).reduce((a, b) => a + b, 0), [composition]);

  const normalizeComposition = () => {
    const sum = Object.values(composition).reduce((a, b) => a + b, 0);
    if (sum === 0) return;
    const normalized = {};
    Object.keys(composition).forEach(k => {
      normalized[k] = parseFloat((composition[k] / sum).toFixed(5));
    });
    setComposition({...normalized}); 
  };

  // Unit Conversion Helpers
  const convertP = (v) => {
    if (pUnit === 'psia') return v * 14.5038;
    if (pUnit === 'kPa') return v * 100;
    if (pUnit === 'MPa') return v / 10;
    return v;
  };
  const convertT = (v) => {
    if (tUnit === '°C') return v - 273.15;
    if (tUnit === '°F') return (v - 273.15) * 9/5 + 32;
    return v;
  };
  const convertD = (v) => dUnit === 'lb/ft³' ? v * 0.062428 : v;

  const toKelvin = (v) => {
    if (tUnit === '°C') return v + 273.15;
    if (tUnit === '°F') return (v - 32) * 5/9 + 273.15;
    return v;
  };
  const toBara = (v) => {
    if (pUnit === 'psia') return v / 14.5038;
    if (pUnit === 'kPa') return v / 100;
    if (pUnit === 'MPa') return v * 10;
    return v;
  };

  // Derived Simulation Data
  const data = useMemo(() => {
    const list = [];
    const maxBara = toBara(maxPressure);
    const tempK = toKelvin(temperature);
    const activeComposition = activeModule === 'natural-gas' ? composition : { [component]: 1.0 };
    for (let p = 0.1; p <= maxBara; p += maxBara / 40) {
      const res = calculateMixtureProperties(p, tempK, activeComposition, eos);
      list.push({
        pressure: parseFloat(convertP(p).toFixed(1)),
        real: parseFloat(convertD(res.density).toFixed(2)),
        ideal: parseFloat(convertD(res.idealDensity).toFixed(2)),
        z: parseFloat(res.z.toFixed(4))
      });
    }
    return list;
  }, [component, temperature, maxPressure, eos, activeModule, composition, pUnit, tUnit, dUnit]);

  const current = data[data.length - 1] || {};

  return (
    <div className="flex min-h-screen bg-surface">
      <header className="bg-white border-b border-outline-variant flex justify-between items-center px-8 h-16 fixed top-0 w-full z-[100]">
        <div className="flex items-center gap-10">
          <span className="text-xl font-black tracking-tight text-primary uppercase font-display italic">ThermoLab</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="https://qazinasir.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-all group">
            <span className="material-symbols-outlined text-[18px] group-hover:rotate-12 transition-transform">public</span>
            Website
          </a>
          <a href="mailto:contact@qazinasir.com" className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-lg shadow-black/10">
            <span className="material-symbols-outlined text-[18px]">mail</span>
            Contact Me
          </a>
        </div>
      </header>

      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-outline-variant/30 fixed top-16 h-[calc(100vh-4rem)] z-40">
        <nav className="flex-1 px-4 mt-10 space-y-6">
          <div className="space-y-2">
            <SidebarItem icon="science" label="Pure Components" active={activeModule === 'pure'} onClick={() => setActiveModule('pure')} />
            <SidebarItem icon="gas_meter" label="Mixed Gas" active={activeModule === 'natural-gas'} onClick={() => setActiveModule('natural-gas')} />
          </div>
          
          <div className="pt-6 border-t border-outline-variant/30 space-y-6">
            <div className="px-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Unit Controls</label>
              <div className="space-y-4">
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pressure</span>
                  <div className="grid grid-cols-4 bg-slate-100 p-1.5 rounded-2xl">
                    {['bara', 'psia', 'kPa', 'MPa'].map(u => (
                      <button key={u} onClick={() => setPUnit(u)} className={`py-2 text-[10px] font-black uppercase rounded-xl transition-all ${pUnit === u ? 'bg-white shadow-md text-primary scale-105' : 'text-slate-400 hover:text-slate-600'}`}>{u}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Temperature</span>
                  <div className="grid grid-cols-3 bg-slate-100 p-1.5 rounded-2xl">
                    {['K', '°C', '°F'].map(u => (
                      <button key={u} onClick={() => setTUnit(u)} className={`py-2 text-[10px] font-black uppercase rounded-xl transition-all ${tUnit === u ? 'bg-white shadow-md text-primary scale-105' : 'text-slate-400 hover:text-slate-600'}`}>{u}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Density</span>
                  <div className="grid grid-cols-2 bg-slate-100 p-1.5 rounded-2xl">
                    {['kg/m³', 'lb/ft³'].map(u => (
                      <button key={u} onClick={() => setDUnit(u)} className={`py-2 text-[10px] font-black uppercase rounded-xl transition-all ${dUnit === u ? 'bg-white shadow-md text-primary scale-105' : 'text-slate-400 hover:text-slate-600'}`}>{u}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </aside>

      <main className="lg:pl-72 pt-16 min-h-screen flex-1 p-10">
        <div className="max-w-[1600px] mx-auto space-y-12 mt-20">
          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-12 lg:col-span-4 space-y-8 animate-fade-in">
              <section className="glass-card p-8 bg-white rounded-[32px] shadow-xl shadow-black/5">
                <div className="space-y-8">
                  {activeModule === 'natural-gas' ? (
                    <div className="space-y-5 p-6 bg-slate-50 rounded-[24px] border border-slate-200 transition-all hover:bg-white hover:shadow-xl hover:shadow-black/5">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-primary">biotech</span>
                          <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Mixture Composition</label>
                        </div>
                        <button onClick={normalizeComposition} className="bg-primary text-white py-1.5 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all">Normalize</button>
                      </div>
                      <div className="space-y-4">
                        {Object.keys(composition).map(k => (
                          <div key={k} className="flex justify-between items-center group">
                            <span className="text-[11px] font-black capitalize text-slate-500 group-hover:text-primary transition-colors">{k}</span>
                            <div className="flex items-center gap-2">
                                <input 
                                  type="number" 
                                  step="0.001" 
                                  value={composition[k]} 
                                  onChange={e => setComposition({...composition, [k]: parseFloat(e.target.value) || 0})} 
                                  className="w-24 text-right font-mono-data text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                                />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase opacity-40 tracking-widest">Total Fraction</span>
                        <span className={`text-xs font-black px-2 py-1 rounded-lg ${Math.abs(totalFraction - 1) > 0.001 ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-600'}`}>
                          {totalFraction.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Target Fluid</label>
                      <select value={component} onChange={e => setComponent(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold shadow-sm outline-none focus:border-primary transition-all">
                        {Object.keys(COMPONENTS).map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Temp ({tUnit})</label>
                      <input type="number" value={convertT(temperature).toFixed(2)} onChange={e => setTemperature(toKelvin(parseFloat(e.target.value) || 0))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold shadow-sm outline-none focus:border-primary transition-all font-mono-data" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Max P ({pUnit})</label>
                      <input type="number" value={convertP(maxPressure).toFixed(2)} onChange={e => setMaxPressure(toBara(parseFloat(e.target.value) || 0))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold shadow-sm outline-none focus:border-primary transition-all font-mono-data" />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-200 space-y-4">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] block">Equation Model</label>
                    <select 
                      value={eos} 
                      onChange={(e) => setEos(e.target.value)}
                      className="w-full bg-white border-2 border-black rounded-xl px-4 py-3 text-sm font-bold transition-all outline-none focus:border-primary"
                    >
                      <optgroup label="Standard Models">
                        <option value="srk">SRK</option>
                        <option value="pr">PR</option>
                        <option value="rk">RK Classic</option>
                        <option value="pr78">PR-1978</option>
                      </optgroup>
                      <optgroup label="Advanced Models">
                        <option value="pr-mc">Mathias-Copeman</option>
                        <option value="pr-tc">Twu-Coon</option>
                      </optgroup>
                      <optgroup label="Molecular-Based">
                        <option value="pc-saft">PC-SAFT</option>
                        <option value="cpa-srk">CPA-SRK</option>
                      </optgroup>
                    </select>
                  </div>
                </div>
              </section>
            </div>

            <div className="col-span-12 lg:col-span-8 space-y-10 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <StatCard label="Real Density" value={current.real} unit={dUnit} colorClass="border-t-primary" delay={300} />
                <StatCard label="Z-Factor" value={current.z} colorClass="border-t-emerald-600" delay={400} />
                <StatCard label="Ideal Reference" value={current.ideal} unit={dUnit} colorClass="border-t-amber-600" delay={500} />
              </div>

              <div className="glass-card p-10 bg-white rounded-[40px] shadow-2xl shadow-black/5">
                <div className="grid grid-cols-1 gap-16">
                  {/* Density Chart */}
                  <div className="h-[350px] w-full group">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 group-hover:text-primary transition-colors">Density Characterization</h3>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data}>
                        <defs>
                          <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/><stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="pressure" stroke="#000000" fontSize={11} tickLine={true} axisLine={true} label={{ value: `Pressure (${pUnit})`, position: 'insideBottom', offset: -10, fill: '#000000', fontSize: 12, fontWeight: 800 }} />
                        <YAxis stroke="#000000" fontSize={11} tickLine={true} axisLine={true} label={{ value: `Density (${dUnit})`, angle: -90, position: 'insideLeft', offset: 15, fill: '#000000', fontSize: 12, fontWeight: 800 }} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '2px solid #000', borderRadius: '12px', color: '#000' }} />
                        <Area type="monotone" dataKey="real" stroke="var(--primary)" fill="url(#colorReal)" strokeWidth={4} />
                        <Area type="monotone" dataKey="ideal" stroke="#000000" fill="transparent" strokeDasharray="8 8" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Z-Factor Chart */}
                  <div className="h-[350px] w-full group">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 group-hover:text-emerald-600 transition-colors">Compressibility (Z) Factor</h3>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="pressure" stroke="#000000" fontSize={11} tickLine={true} axisLine={true} label={{ value: `Pressure (${pUnit})`, position: 'insideBottom', offset: -10, fill: '#000000', fontSize: 12, fontWeight: 800 }} />
                        <YAxis stroke="#000000" fontSize={11} tickLine={true} axisLine={true} domain={['auto', 'auto']} label={{ value: 'Z-Factor', angle: -90, position: 'insideLeft', offset: 15, fill: '#000000', fontSize: 12, fontWeight: 800 }} />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '2px solid #000', borderRadius: '12px', color: '#000' }} />
                        <Line type="monotone" dataKey="z" stroke="#059669" strokeWidth={4} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
