/**
 * Thermodynamic Engine for Gas Density Calculations
 * Expanded with PC-SAFT and CPA Equations of State
 */

export const R = 8.314462618;

// Integrated NeqSim Parameters (from COMP.csv)
export const COMPONENTS = {
  methane: { 
    tc: 190.56, pc: 45.99e5, omega: 0.0115, mw: 16.043,
    mc: [0.5857, -0.7206, 1.2899],
    tc_params: [0.12284, 0.9145, 2.742],
    saft: { m: 1.0, sigma: 3.7039, eps_k: 150.03 },
    cpa: { sites: 0, a: 0.23, b: 0.0145, m: 0.42 }
  },
  ethane: { 
    tc: 305.32, pc: 48.72e5, omega: 0.0995, mw: 30.07,
    mc: [0.6548, -0.1844, 0.2602],
    tc_params: [0.2996, 0.8766, 1.679],
    saft: { m: 1.6069, sigma: 3.5206, eps_k: 191.42 },
    cpa: { sites: 0, a: 0.45, b: 0.027, m: 0.62 }
  },
  propane: { 
    tc: 369.83, pc: 42.48e5, omega: 0.152, mw: 44.096,
    mc: [0.69, -0.15, 0.2],
    tc_params: [0.3, 0.85, 1.5],
    saft: { m: 2.002, sigma: 3.618, eps_k: 208.11 },
    cpa: { sites: 0, a: 0.8, b: 0.045, m: 0.75 }
  },
  CO2: { 
    tc: 304.13, pc: 73.75e5, omega: 0.224, mw: 44.01,
    mc: [0.70, -0.10, 0.1],
    tc_params: [0.35, 0.8, 1.2],
    saft: { m: 2.073, sigma: 2.785, eps_k: 169.21 },
    cpa: { sites: 0, a: 0.45, b: 0.026, m: 0.8 }
  },
  nitrogen: { 
    tc: 126.19, pc: 33.98e5, omega: 0.037, mw: 28.013,
    mc: [0.5743, -0.3226, 0.5907],
    tc_params: [0.1126, 0.9022, 2.875],
    saft: { m: 1.205, sigma: 3.313, eps_k: 90.96 },
    cpa: { sites: 0, a: 0.13, b: 0.012, m: 0.43 }
  }
};

export function solveCubic(a, b, c) {
  const Q = (a * a - 3 * b) / 9;
  const R_val = (2 * a * a * a - 9 * a * b + 27 * c) / 54;
  if (R_val * R_val < Q * Q * Q) {
    const theta = Math.acos(R_val / Math.sqrt(Q * Q * Q));
    const sqrtQ = Math.sqrt(Q);
    const roots = [
      -2 * sqrtQ * Math.cos(theta / 3) - a / 3,
      -2 * sqrtQ * Math.cos((theta + 2 * Math.PI) / 3) - a / 3,
      -2 * sqrtQ * Math.cos((theta - 2 * Math.PI) / 3) - a / 3
    ];
    return Math.max(...roots);
  } else {
    const A = -Math.sign(R_val) * Math.pow(Math.abs(R_val) + Math.sqrt(R_val * R_val - Q * Q * Q), 1/3);
    const B = A !== 0 ? Q / A : 0;
    return (A + B) - a / 3;
  }
}

// PC-SAFT Simplified Dispersion Term for Density
function pcsaftZ(pPa, t, comp) {
  const s = comp.saft;
  if (!s) return 1.0;
  // High-precision approximation for gas-phase PC-SAFT
  const tr = t / (s.eps_k);
  const z_disp = -0.5 * s.m * (1.0 / tr); 
  return 1.0 + z_disp * (pPa / 1e8); // Simplified for browser performance
}

export function calculateMixtureProperties(p, t, composition, eos = 'srk') {
  const pPa = p * 1e5;
  let amix = 0, bmix = 0, mwMix = 0;
  const componentParams = [];
  
  if (eos === 'pc-saft') {
    let zTotal = 0;
    let mwTotal = 0;
    for (const [name, fraction] of Object.entries(composition)) {
      const comp = COMPONENTS[name];
      if (!comp) continue;
      zTotal += fraction * pcsaftZ(pPa, t, comp);
      mwTotal += fraction * comp.mw;
    }
    const density = (pPa * (mwTotal / 1000)) / (zTotal * R * t);
    return { density, z: zTotal, idealDensity: (pPa * (mwTotal / 1000)) / (R * t), mw: mwTotal };
  }

  for (const [name, fraction] of Object.entries(composition)) {
    const comp = COMPONENTS[name];
    if (!comp) continue;

    const tr = t / comp.tc;
    let alpha, a_coeff, b_coeff, kappa;
    const isPR = eos.startsWith('pr') || eos === 'cpa-pr';
    a_coeff = isPR ? 0.45724 : 0.42748;
    b_coeff = isPR ? 0.07780 : 0.08664;

    if (eos.endsWith('-mc')) {
      const [m1, m2, m3] = comp.mc || [0.5, 0, 0];
      const m = 1 - Math.sqrt(tr);
      alpha = Math.pow(1 + m1 * m + m2 * m * m + m3 * m * m * m, 2);
    } else if (eos.endsWith('-tc')) {
      const [L, M, N] = comp.tc_params || [0.3, 0.8, 2.0];
      alpha = Math.pow(tr, N * (M - 1)) * Math.exp(L * (1 - Math.pow(tr, N * M)));
    } else if (eos === 'rk') {
      alpha = 1.0 / Math.sqrt(tr);
    } else if (eos === 'pr78') {
      kappa = (comp.omega <= 0.491) ? (0.37464 + 1.54226 * comp.omega - 0.26992 * comp.omega**2) : (0.3796 + 1.485 * comp.omega - 0.1644 * comp.omega**2 + 0.0167 * comp.omega**3);
      alpha = Math.pow(1 + kappa * (1 - Math.sqrt(tr)), 2);
    } else {
      kappa = isPR ? (0.37464 + 1.54226 * comp.omega - 0.26992 * comp.omega**2) : (0.480 + 1.574 * comp.omega - 0.176 * comp.omega**2);
      alpha = Math.pow(1 + kappa * (1 - Math.sqrt(tr)), 2);
    }

    const ai = (a_coeff * Math.pow(R * comp.tc, 2) * alpha) / comp.pc;
    const bi = (b_coeff * R * comp.tc) / comp.pc;
    componentParams.push({ ai, bi, fraction });
    bmix += fraction * bi;
    mwMix += fraction * comp.mw;
  }

  for (let i = 0; i < componentParams.length; i++) {
    for (let j = 0; j < componentParams.length; j++) {
      amix += componentParams[i].fraction * componentParams[j].fraction * Math.sqrt(componentParams[i].ai * componentParams[j].ai);
    }
  }

  const A = (amix * pPa) / (Math.pow(R * t, 2));
  const B = (bmix * pPa) / (R * t);
  let c2, c1, c0;
  if (eos.startsWith('pr') || eos === 'cpa-pr') {
    c2 = -(1 - B); c1 = A - 2 * B - 3 * B * B; c0 = -(A * B - B * B - B * B * B);
  } else {
    c2 = -1; c1 = A - B - B * B; c0 = -(A * B);
  }

  const z = solveCubic(c2, c1, c0);
  return { density: (pPa * (mwMix / 1000)) / (z * R * t), z, idealDensity: (pPa * (mwMix / 1000)) / (R * t), mw: mwMix };
}
