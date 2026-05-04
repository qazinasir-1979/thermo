import React, { useState, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
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
    {active && <div className="absolute left-0 top-0 w-1.5 h-full bg-white/30 rounded-full" />}
    <span className={`material-symbols-outlined text-[22px] transition-transform duration-500 ${active ? 'rotate-[360deg]' : 'group-hover:rotate-12'}`}>{icon}</span>
    <span className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all ${active ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>{label}</span>
  </button>
);

const StatCard = ({ label, value, unit, colorClass, icon, delay = 0 }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    className={`glass-card p-8 rounded-[32px] border-t-4 ${colorClass} relative overflow-hidden group`}
  >
    <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
        <span className="material-symbols-outlined text-[120px]">{icon}</span>
    </div>
    <div className="flex items-center gap-3 mb-6">
        <span className={`material-symbols-outlined text-[20px] ${colorClass.replace('border-t-', 'text-')}`}>{icon}</span>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</span>
    </div>
    <div className="flex items-baseline gap-2">
      <div className={`text-5xl font-black tracking-tighter font-mono-data ${colorClass.replace('border-t-', 'text-')}`}>{value}</div>
      {unit && <div className="text-[11px] font-black text-slate-400 uppercase">{unit}</div>}
    </div>
  </motion.div>
);

// --- Main App ---

const App = () => {
  const [activeModule, setActiveModule] = useState('pure');
  const [pUnit, setPUnit] = useState('bara');
  const [tUnit, setTUnit] = useState('K');
  const [dUnit, setDUnit] = useState('kg/m³');
  
  const [component, setComponent] = useState('methane');
  const [temperature, setTemperature] = useState(288.15); 
  const [maxPressure, setMaxPressure] = useState(350.0);
  const [eos, setEos] = useState('srk');
  
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
    <div className="flex min-h-screen bg-[#fdfbff]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 flex justify-between items-center px-10 h-20 fixed top-0 w-full z-[100]">
        <div className="flex items-center gap-12">
          <span className="text-2xl font-black tracking-tighter text-primary uppercase font-display italic">ThermoLab</span>
          <div className="hidden md:flex items-center gap-3 px-4 py-1.5 bg-slate-100 rounded-full">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">System Ready</span>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <a href="https://qazinasir.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-all group">
            <span className="material-symbols-outlined text-[18px] group-hover:rotate-12 transition-transform">public</span>
            Portfolio
          </a>
          <a href="mailto:contact@qazinasir.com" className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-[18px] text-[11px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-black/10">
            <span className="material-symbols-outlined text-[18px]">contact_mail</span>
            Contact
          </a>
        </div>
      </header>

      {/* Navigation */}
      <aside className="hidden lg:flex flex-col w-80 bg-white border-r border-slate-200 fixed top-20 h-[calc(100vh-5rem)] z-40 p-6">
        <nav className="flex-1 space-y-10">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] px-2">Analysis Engine</label>
            <div className="space-y-2">
                <SidebarItem icon="analytics" label="Pure Component" active={activeModule === 'pure'} onClick={() => setActiveModule('pure')} />
                <SidebarItem icon="hub" label="Mixed Gas" active={activeModule === 'natural-gas'} onClick={() => setActiveModule('natural-gas')} />
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-100 space-y-8">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] px-2">Unit Configuration</label>
              <div className="space-y-6 px-2">
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
        </nav>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-80 pt-20 min-h-screen flex-1 p-12 overflow-x-hidden">
        <div className="max-w-[1400px] mx-auto mt-16 space-y-16">
          
          {/* Hero Header */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex justify-between items-end border-b border-slate-200 pb-12 overflow-visible"
          >
            <div>
              <h1 className="text-5xl font-black tracking-tighter text-slate-900 uppercase font-display mb-6 leading-none">
                {activeModule === 'pure' ? 'Pure Components' : 'Mixed Gas'}
              </h1>
              <div className="flex items-center gap-4">
                <div className="px-3 py-1 bg-primary/5 border border-primary/10 rounded-full">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">Active Model: {eos.toUpperCase()}</span>
                </div>
                <p className="text-slate-400 text-sm font-medium italic">
                  Simulating <span className="text-slate-900 font-bold not-italic">{activeModule === 'pure' ? component.toUpperCase() : 'GAS MIXTURE'}</span> phase behavior
                </p>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-12 gap-12">
            {/* Control Panel */}
            <div className="col-span-12 lg:col-span-4 space-y-10">
              <motion.section 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-10 rounded-[40px] shadow-2xl"
              >
                <div className="space-y-10">
                  <AnimatePresence mode="wait">
                    {activeModule === 'natural-gas' ? (
                      <motion.div 
                        key="mixed"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6 p-8 bg-slate-50 rounded-[32px] border border-slate-200 shadow-inner"
                      >
                        <div className="flex justify-between items-center mb-2">
                           <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Gas Composition</span>
                           <button onClick={normalizeComposition} className="btn-primary py-1.5 px-4 text-[9px] rounded-full">Normalize</button>
                        </div>
                        <div className="space-y-4">
                          {Object.keys(composition).map(k => (
                            <div key={k} className="flex justify-between items-center group">
                              <span className="text-[11px] font-black capitalize text-slate-500 group-hover:text-primary transition-colors">{k}</span>
                              <input 
                                type="number" 
                                value={composition[k]} 
                                onChange={e => setComposition({...composition, [k]: parseFloat(e.target.value) || 0})} 
                                className="w-24 text-right font-mono-data text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-primary shadow-sm"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="pt-6 border-t border-slate-200 flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase opacity-40">Mole Fraction Sum</span>
                          <span className={`text-xs font-black px-3 py-1.5 rounded-full ${Math.abs(totalFraction - 1) > 0.001 ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'}`}>
                            {totalFraction.toFixed(4)}
                          </span>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="pure"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-4"
                      >
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] px-2">Target Fluid</label>
                        <select value={component} onChange={e => setComponent(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-5 text-sm font-black shadow-inner outline-none focus:border-primary transition-all appearance-none cursor-pointer">
                          {Object.keys(COMPONENTS).map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                        </select>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] px-2">Temp ({tUnit})</label>
                      <input type="number" value={convertT(temperature).toFixed(2)} onChange={e => setTemperature(toKelvin(parseFloat(e.target.value) || 0))} className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-5 text-sm font-black shadow-inner outline-none focus:border-primary font-mono-data" />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] px-2">Max P ({pUnit})</label>
                      <input type="number" value={convertP(maxPressure).toFixed(2)} onChange={e => setMaxPressure(toBara(parseFloat(e.target.value) || 0))} className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-5 text-sm font-black shadow-inner outline-none focus:border-primary font-mono-data" />
                    </div>
                  </div>

                  <div className="pt-10 border-t border-slate-100 space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] px-2">Thermodynamic Model</label>
                    <select value={eos} onChange={e => setEos(e.target.value)} className="w-full bg-slate-900 text-white rounded-3xl px-6 py-5 text-sm font-black shadow-2xl outline-none hover:bg-primary transition-all cursor-pointer">
                        <optgroup label="Cubic Models" className="bg-white text-slate-900">
                          <option value="srk">SRK Standard</option>
                          <option value="pr">PR Standard</option>
                          <option value="rk">RK Classic</option>
                        </optgroup>
                        <optgroup label="Molecular/Association" className="bg-white text-slate-900">
                          <option value="pc-saft">PC-SAFT (High Precision)</option>
                          <option value="cpa-srk">CPA (Polar Mixing)</option>
                        </optgroup>
                        <optgroup label="Advanced Alpha" className="bg-white text-slate-900">
                          <option value="pr-mc">PR Mathias-Copeman</option>
                          <option value="pr-tc">PR Twu-Coon</option>
                        </optgroup>
                    </select>
                  </div>
                </div>
              </motion.section>
            </div>

            {/* Results Canvas */}
            <div className="col-span-12 lg:col-span-8 space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <StatCard label="Real Density" value={current.real} unit={dUnit} colorClass="border-t-primary" icon="compress" delay={0.2} />
                <StatCard label="Z-Factor" value={current.z} colorClass="border-t-emerald-500" icon="straighten" delay={0.3} />
                <StatCard label="Ideal Density" value={current.ideal} unit={dUnit} colorClass="border-t-amber-500" icon="bubble_chart" delay={0.4} />
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="glass-card p-12 rounded-[48px] shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
                
                <div className="grid grid-cols-1 gap-20 relative z-10">
                  <div className="h-[400px] w-full">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Density Profile Characterization</h3>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-primary rounded-full" />
                                <span className="text-[10px] font-black uppercase text-slate-500">Real Fluid</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 border-2 border-slate-900 rounded-full" />
                                <span className="text-[10px] font-black uppercase text-slate-500">Ideal Reference</span>
                            </div>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data}>
                        <defs>
                          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="pressure" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} label={{ value: `Pressure (${pUnit})`, position: 'insideBottom', offset: -15, fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} label={{ value: `Density (${dUnit})`, angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                        <Tooltip cursor={{ stroke: 'var(--primary)', strokeWidth: 1 }} contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: 'none', borderRadius: '24px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', color: '#000', fontSize: '12px', fontWeight: '800', padding: '16px' }} />
                        <Area type="monotone" dataKey="real" stroke="var(--primary)" strokeWidth={5} fill="url(#chartGradient)" />
                        <Area type="monotone" dataKey="ideal" stroke="#1b1b1f" strokeWidth={2} strokeDasharray="10 10" fill="transparent" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="h-[300px] w-full pt-12 border-t border-slate-100">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-10">Compressibility Factor (Z)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="pressure" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                        <Tooltip cursor={{ stroke: '#059669', strokeWidth: 1 }} contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: 'none', borderRadius: '24px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', padding: '16px' }} />
                        <Line type="monotone" dataKey="z" stroke="#059669" strokeWidth={5} dot={false} animationDuration={2000} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
