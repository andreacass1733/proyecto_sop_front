import React, { useState, useEffect, useRef } from "react";

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  sub: string;
  accentColor: string;
  accentBg: string;
  delay?: number;
}

interface ConfidenceBarProps {
  value: number;
  color: string;
}

interface AnalysisResult {
  label: string;
  confidence: number;
  date: string;
}

// ── Icons ──────────────────────────────────────────────────────────────
const IconBrain = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3a6.75 6.75 0 016.518 8.473A5.25 5.25 0 1112 21a5.25 5.25 0 01-5.25-5.25c0-.98.268-1.898.737-2.683A6.75 6.75 0 019.75 3z"/>
  </svg>
);

const IconShield = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
  </svg>
);

const IconDatabase = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7c0-1.657 3.582-3 8-3s8 1.343 8 3M4 7v5c0 1.657 3.582 3 8 3s8-1.343 8-3V7M4 12v5c0 1.657 3.582 3 8 3s8-1.343 8-3v-5"/>
  </svg>
);

const IconScan = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9V5a2 2 0 012-2h4M3 15v4a2 2 0 002 2h4m10-16h-4a2 2 0 00-2 2v0M21 15v4a2 2 0 01-2 2h-4M9 12h6"/>
  </svg>
);

const IconUpload = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
  </svg>
);

const IconInfo = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
  </svg>
);

const IconActivity = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2"/>
  </svg>
);

const IconMoon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>
);

const IconSun = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="5"/><path strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </svg>
);

// ── useCounter ─────────────────────────────────────────────────────────
function useCounter(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setValue(target); clearInterval(timer); }
      else setValue(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

// ── StatCard ───────────────────────────────────────────────────────────
function StatCard({ icon, title, value, sub, accentColor, accentBg, delay = 0 }: StatCardProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(18px)',
        transition: `opacity 0.5s ${delay}ms, transform 0.5s ${delay}ms`,
      }}
      className="stat-card"
    >
      <div className="stat-card-header">
        <span className="stat-label">{title}</span>
        <div className="stat-icon-wrap" style={{ backgroundColor: accentBg, color: accentColor }}>
          {icon}
        </div>
      </div>
      <div className="stat-value" style={{ color: accentColor }}>{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

// ── TrainingChart ──────────────────────────────────────────────────────
function TrainingChart({ dark }: { dark: boolean }) {
  const acc =  [0.52,0.61,0.67,0.71,0.74,0.76,0.78,0.79,0.80,0.81,0.82,0.82,0.82,0.82,0.82];
  const loss = [0.69,0.62,0.57,0.52,0.48,0.45,0.43,0.41,0.40,0.39,0.38,0.38,0.37,0.37,0.37];
  const W = 340, H = 140, pad = { t: 16, r: 16, b: 28, l: 36 };
  const gW = W - pad.l - pad.r, gH = H - pad.t - pad.b;
  const xStep = gW / (acc.length - 1);
  const gridColor = dark ? '#334155' : '#E2E8F0';
  const textColor = dark ? '#64748B' : '#94A3B8';
  const pink = dark ? '#F472B6' : '#EC4899';
  const purple = '#818cf8';

  const toPath = (vals: number[], minV: number, maxV: number) =>
    vals.map((v, i) => {
      const x = pad.l + i * xStep;
      const y = pad.t + gH - ((v - minV) / (maxV - minV)) * gH;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxHeight: 155 }}>
      {[0,0.25,0.5,0.75,1].map((t, i) => (
        <line key={i} x1={pad.l} y1={pad.t+gH*(1-t)} x2={pad.l+gW} y2={pad.t+gH*(1-t)} stroke={gridColor} strokeWidth={1}/>
      ))}
      <path d={toPath(acc, 0, 1)} fill="none" stroke={pink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"/>
      <path d={toPath(loss, 0, 1)} fill="none" stroke={purple} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 3"/>
      {acc.map((v, i) => (
        <circle key={i} cx={pad.l+i*xStep} cy={pad.t+gH-v*gH} r={2.8} fill={pink}/>
      ))}
      {[1,5,10,15].map(ep => (
        <text key={ep} x={pad.l+(ep-1)*xStep} y={H-6} textAnchor="middle" fontSize={9} fill={textColor}>E{ep}</text>
      ))}
      <circle cx={pad.l+4} cy={10} r={4} fill={pink}/>
      <text x={pad.l+12} y={13} fontSize={8} fill={pink}>Accuracy</text>
      <line x1={pad.l+65} y1={10} x2={pad.l+78} y2={10} stroke={purple} strokeWidth={2} strokeDasharray="3 2"/>
      <text x={pad.l+82} y={13} fontSize={8} fill={purple}>Loss</text>
    </svg>
  );
}

// ── ConfidenceBar ──────────────────────────────────────────────────────
function ConfidenceBar({ value, color }: ConfidenceBarProps) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(value), 400); return () => clearTimeout(t); }, [value]);
  return (
    <div className="conf-bar-bg">
      <div className="conf-bar-fill" style={{ width: `${w}%`, backgroundColor: color }}/>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────
const Dashboard = () => {
  const [dark, setDark] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult>({
    label: 'SOP Detectado',
    confidence: 87,
    date: '01 Jun 2026 · 14:32',
  });

  const accCount = useCounter(82, 1400);
  const imgCount = useCounter(3096, 1600);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
    const now = new Date();
    setAnalysisResult({
      label: 'SOP Detectado',
      confidence: 87,
      date: now.toLocaleString('es-BO', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }),
    });
  };

  // ── Paleta dinámica ────────────────────────────────────────────────
  const p = dark ? {
    bg:        '#0F172A',
    card:      '#1E293B',
    border:    '#334155',
    textMain:  '#F8FAFC',
    textSub:   '#CBD5E1',
    textMuted: '#64748B',
    pink:      '#F472B6',
    pinkStr:   '#EC4899',
    pinkGlow:  '#F9A8D4',
    success:   '#34D399',
    warn:      '#FACC15',
    danger:    '#FB7185',
    info:      '#60A5FA',
  } : {
    bg:        '#F8FAFC',
    card:      '#FFFFFF',
    border:    '#E2E8F0',
    textMain:  '#0F172A',
    textSub:   '#475569',
    textMuted: '#94A3B8',
    pink:      '#EC4899',
    pinkStr:   '#DB2777',
    pinkGlow:  '#FBCFE8',
    success:   '#22C55E',
    warn:      '#FACC15',
    danger:    '#EF4444',
    info:      '#3B82F6',
  };

  const css = `
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
    .wrap{min-height:100vh;background:${p.bg};color:${p.textMain};transition:background .3s,color .3s;}
    .topbar{background:${p.card};border-bottom:1px solid ${p.border};padding:12px 24px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:10;backdrop-filter:blur(8px);}
    .logo{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,${p.pink},#8b5cf6);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
    .logo svg{color:#fff;}
    .brand{font-size:16px;font-weight:700;color:${p.textMain};}
    .badge-active{display:flex;align-items:center;gap:6px;background:${dark?'#052e16':'#f0fdf4'};color:${p.success};font-size:12px;font-weight:600;padding:4px 12px;border-radius:99px;border:1px solid ${dark?'#166534':'#bbf7d0'};}
    .dot-pulse{width:7px;height:7px;background:${p.success};border-radius:50%;animation:pulse 1.5s infinite;}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    .version{font-size:11px;color:${p.textMuted};margin-left:4px;}
    .toggle-btn{margin-left:auto;background:${p.card};border:1px solid ${p.border};color:${p.textSub};border-radius:8px;padding:6px 10px;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:13px;transition:all .2s;}
    .toggle-btn:hover{border-color:${p.pink};color:${p.pink};}

    .content{padding:28px 20px;max-width:960px;margin:0 auto;}
    .page-title{font-size:24px;font-weight:800;color:${p.textMain};line-height:1.3;margin-bottom:6px;}
    .page-title .pink{color:${p.pink};}
    .page-sub{font-size:13px;color:${p.textSub};line-height:1.7;max-width:520px;margin-bottom:24px;}

    .stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;margin-bottom:20px;}
    .stat-card{background:${p.card};border:1px solid ${p.border};border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:10px;transition:box-shadow .2s,transform .2s;}
    .stat-card:hover{box-shadow:0 4px 24px ${dark?'rgba(244,114,182,.12)':'rgba(236,72,153,.1)'};transform:translateY(-2px);}
    .stat-card-header{display:flex;justify-content:space-between;align-items:center;}
    .stat-label{font-size:11px;font-weight:600;color:${p.textMuted};text-transform:uppercase;letter-spacing:.06em;}
    .stat-icon-wrap{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
    .stat-value{font-size:24px;font-weight:800;}
    .stat-sub{font-size:11px;color:${p.textMuted};}

    .main-grid{display:grid;grid-template-columns:1fr 2fr;gap:14px;margin-bottom:14px;}
    @media(max-width:600px){.main-grid{grid-template-columns:1fr;}}
    .card{background:${p.card};border:1px solid ${p.border};border-radius:16px;padding:22px;transition:box-shadow .2s;}
    .card:hover{box-shadow:0 2px 20px ${dark?'rgba(0,0,0,.3)':'rgba(0,0,0,.06)'};}

    .action-card{display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center;}
    .action-icon-wrap{width:64px;height:64px;border-radius:16px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:linear-gradient(135deg,${dark?'#1e1b4b':'#fce7f3'},${dark?'#312e81':'#ede9fe'});}
    .action-icon-wrap img{width:100%;height:100%;object-fit:cover;}
    .action-title{font-size:16px;font-weight:700;color:${p.textMain};}
    .action-sub{font-size:12px;color:${p.textMuted};line-height:1.6;margin-top:2px;}
    .action-filename{font-size:12px;color:${p.success};font-weight:600;}
    .btn-primary{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,${p.pink},#8b5cf6);color:#fff;font-size:14px;font-weight:700;padding:12px 20px;border-radius:12px;border:none;cursor:pointer;transition:opacity .2s,transform .15s;box-shadow:0 4px 14px ${dark?'rgba(244,114,182,.25)':'rgba(236,72,153,.25)'};}
    .btn-primary:hover{opacity:.88;transform:scale(1.02);}
    .btn-primary:active{transform:scale(.97);}
    .action-hint{font-size:11px;color:${p.textMuted};}

    .chart-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;}
    .chart-title{font-size:14px;font-weight:700;color:${p.textMain};}
    .chart-sub{font-size:11px;color:${p.textMuted};margin-top:2px;}
    .chart-badge{display:flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:4px 10px;border-radius:99px;background:${dark?'#1e1030':'#fdf2f8'};color:${p.pink};}
    .chart-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px;}
    .chart-stat{background:${dark?'#0F172A':'#F8FAFC'};border:1px solid ${p.border};border-radius:10px;padding:10px;text-align:center;}
    .chart-stat-val{font-size:17px;font-weight:800;}
    .chart-stat-lbl{font-size:10px;color:${p.textMuted};margin-top:2px;}

    .bottom-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:24px;}
    @media(max-width:600px){.bottom-grid{grid-template-columns:1fr;}}
    .section-title{font-size:14px;font-weight:700;color:${p.textMain};margin-bottom:2px;}
    .section-sub{font-size:11px;color:${p.textMuted};margin-bottom:16px;}

    .conf-row{margin-bottom:14px;}
    .conf-label-row{display:flex;justify-content:space-between;font-size:13px;font-weight:600;margin-bottom:6px;}
    .conf-bar-bg{height:8px;background:${dark?'#334155':'#F1F5F9'};border-radius:99px;overflow:hidden;}
    .conf-bar-fill{height:100%;border-radius:99px;transition:width 1s ease;}
    .alert-note{display:flex;align-items:flex-start;gap:8px;padding:10px 12px;border-radius:10px;background:${dark?'rgba(251,113,133,.1)':'#fdf2f8'};border:1px solid ${dark?'rgba(251,113,133,.2)':'#fce7f3'};margin-top:14px;}
    .alert-dot{width:7px;height:7px;border-radius:50%;background:${p.danger};flex-shrink:0;margin-top:4px;}
    .alert-text{font-size:12px;color:${dark?'#fda4af':'#be185d'};line-height:1.5;}

    .info-icon{width:28px;height:28px;border-radius:8px;background:${dark?'#2e1065':'#ede9fe'};color:${dark?'#c4b5fd':'#7c3aed'};display:flex;align-items:center;justify-content:center;flex-shrink:0;}
    .info-head{display:flex;align-items:center;gap:8px;margin-bottom:10px;}
    .info-text{font-size:13px;color:${p.textSub};line-height:1.7;}
    .info-text strong{color:${p.textMain};}
    .info-text .pink{color:${p.pink};}
    .info-text .purple{color:#8b5cf6;}

    .steps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:16px;}
    .step-card{background:${dark?'#0F172A':'#F8FAFC'};border:1px solid ${p.border};border-radius:10px;padding:10px 8px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:4px;}
    .step-icon{font-size:20px;}
    .step-label{font-size:11px;font-weight:600;color:${p.textMain};}
    .step-num{font-size:10px;color:${p.textMuted};}

    .divider{height:1px;background:${p.border};margin:4px 0 14px;}
    .tag{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:3px 8px;border-radius:6px;}
    .tag-sop{background:${dark?'rgba(251,113,133,.15)':'#fef2f2'};color:${p.danger};border:1px solid ${dark?'rgba(251,113,133,.3)':'#fecaca'};}
    .tag-normal{background:${dark?'rgba(52,211,153,.1)':'#f0fdf4'};color:${p.success};border:1px solid ${dark?'rgba(52,211,153,.25)':'#bbf7d0'};}

    .footer{text-align:center;font-size:11px;color:${p.textMuted};padding-bottom:8px;line-height:1.8;}
    .footer a{color:${p.pink};text-decoration:none;}
  `;

  return (
    <>
      <style>{css}</style>
      <div className="wrap">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,.dcm,application/dicom"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Topbar */}
        <div className="topbar">
          <div className="logo">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
            </svg>
          </div>
          <span className="brand">SOP AI System</span>
          <div className="badge-active">
            <span className="dot-pulse"/>
            Sistema activo
          </div>
          <span className="version">EfficientNetB0 · v1.0</span>
          <button className="toggle-btn" onClick={() => setDark(!dark)}>
            {dark ? <IconSun size={16}/> : <IconMoon size={16}/>}
            {dark ? 'Claro' : 'Oscuro'}
          </button>
        </div>

        <div className="content">
          {/* Título */}
          <h1 className="page-title">
            Sistema de detección de <span className="pink">SOP</span> con inteligencia artificial
          </h1>
          <p className="page-sub">
            Analiza ecografías ováricas mediante redes neuronales convolucionales y clasifica los resultados en{' '}
            <strong>Normal</strong> o <strong>SOP</strong> con alta precisión diagnóstica.
          </p>

          {/* Stats */}
          <div className="stats-grid">
            <StatCard
              icon={<IconShield size={20}/>}
              title="Estado del modelo"
              value="Activo"
              sub="EfficientNetB0 · Listo"
              accentColor={p.success}
              accentBg={dark ? 'rgba(52,211,153,.12)' : '#f0fdf4'}
              delay={0}
            />
            <StatCard
              icon={<IconBrain size={20}/>}
              title="Precisión"
              value={`${accCount}%`}
              sub="Validación · 15 épocas"
              accentColor={p.pink}
              accentBg={dark ? 'rgba(244,114,182,.12)' : '#fdf2f8'}
              delay={100}
            />
            <StatCard
              icon={<IconDatabase size={20}/>}
              title="Dataset"
              value={`${imgCount.toLocaleString()}`}
              sub="Imágenes · Normal + SOP"
              accentColor={dark ? '#a78bfa' : '#8b5cf6'}
              accentBg={dark ? 'rgba(167,139,250,.12)' : '#f5f3ff'}
              delay={200}
            />
            <StatCard
              icon={<IconScan size={20}/>}
              title="Último análisis"
              value="SOP"
              sub={`Confianza 87% · ${analysisResult.date}`}
              accentColor={p.warn}
              accentBg={dark ? 'rgba(250,204,21,.1)' : '#fefce8'}
              delay={300}
            />
          </div>

          {/* Main grid */}
          <div className="main-grid">

            {/* Action card */}
            <div className="card action-card">
              <div className="action-icon-wrap">
                {previewUrl ? (
                  <img src={previewUrl} alt="preview"/>
                ) : (
                  <svg width="32" height="32" style={{ color: p.pink }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                )}
              </div>
              <div>
                <div className="action-title">Diagnóstico IA</div>
                {selectedFile ? (
                  <div className="action-filename">✓ {selectedFile.name}</div>
                ) : (
                  <div className="action-sub">Sube una ecografía ovárica y obtén un resultado en segundos</div>
                )}
              </div>

              {/* Tags de resultado */}
              {selectedFile && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <span className="tag tag-sop">SOP 87%</span>
                  <span className="tag tag-normal">Normal 13%</span>
                </div>
              )}

              <button className="btn-primary" onClick={() => fileInputRef.current?.click()}>
                <IconUpload size={18}/>
                {selectedFile ? 'Cambiar ecografía' : 'Analizar ecografía'}
              </button>
              <span className="action-hint">Formatos: JPG, PNG, DICOM</span>
            </div>

            {/* Training chart */}
            <div className="card">
              <div className="chart-header">
                <div>
                  <div className="chart-title">Rendimiento del entrenamiento</div>
                  <div className="chart-sub">Accuracy &amp; Loss · EfficientNetB0 · 15 épocas</div>
                </div>
                <div className="chart-badge">
                  <IconActivity size={13}/>
                  82% final
                </div>
              </div>
              <TrainingChart dark={dark}/>
              <div className="chart-stats">
                <div className="chart-stat">
                  <div className="chart-stat-val" style={{ color: p.pink }}>82%</div>
                  <div className="chart-stat-lbl">Accuracy final</div>
                </div>
                <div className="chart-stat">
                  <div className="chart-stat-val" style={{ color: dark ? '#a78bfa' : '#8b5cf6' }}>0.37</div>
                  <div className="chart-stat-lbl">Loss final</div>
                </div>
                <div className="chart-stat">
                  <div className="chart-stat-val" style={{ color: p.success }}>15</div>
                  <div className="chart-stat-lbl">Épocas</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom grid */}
          <div className="bottom-grid">

            {/* Resultado detallado */}
            <div className="card">
              <div className="section-title">Último resultado detallado</div>
              <div className="section-sub">{analysisResult.date}</div>
              <div className="conf-row">
                <div className="conf-label-row">
                  <span style={{ color: p.danger }}>🔴 SOP detectado</span>
                  <span style={{ color: p.danger }}>87%</span>
                </div>
                <ConfidenceBar value={87} color={p.danger}/>
              </div>
              <div className="conf-row">
                <div className="conf-label-row">
                  <span style={{ color: p.success }}>🟢 Normal</span>
                  <span style={{ color: p.success }}>13%</span>
                </div>
                <ConfidenceBar value={13} color={p.success}/>
              </div>
              <div className="divider"/>
              <div className="alert-note">
                <span className="alert-dot"/>
                <span className="alert-text">
                  Resultado indicativo. Se recomienda evaluación clínica con especialista en ginecología.
                </span>
              </div>
            </div>

            {/* ¿Cómo funciona? */}
            <div className="card">
              <div className="info-head">
                <div className="info-icon"><IconInfo size={16}/></div>
                <span className="section-title" style={{ marginBottom: 0 }}>¿Cómo funciona?</span>
              </div>
              <p className="info-text">
                Utiliza <strong>redes neuronales convolucionales</strong> basadas en{' '}
                <span className="purple"><strong>EfficientNetB0</strong></span> para clasificar ecografías ováricas en{' '}
                <strong>Normal</strong> o <span className="pink"><strong>SOP</strong></span>.
                Entrenado con <strong>3,096 imágenes</strong> clínicas, alcanza un{' '}
                <span className="pink"><strong>82% de precisión</strong></span> en validación.
              </p>
              <div className="steps-grid">
                <div className="step-card">
                  <span className="step-icon">📤</span>
                  <span className="step-label">Subir imagen</span>
                  <span className="step-num">Paso 01</span>
                </div>
                <div className="step-card">
                  <span className="step-icon">🧠</span>
                  <span className="step-label">Análisis IA</span>
                  <span className="step-num">Paso 02</span>
                </div>
                <div className="step-card">
                  <span className="step-icon">📋</span>
                  <span className="step-label">Resultado</span>
                  <span className="step-num">Paso 03</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="footer">
            SOP AI System · Powered by <strong>EfficientNetB0</strong> Deep Learning · v1.0<br/>
            Solo para fines de apoyo diagnóstico — no reemplaza criterio médico profesional.
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;