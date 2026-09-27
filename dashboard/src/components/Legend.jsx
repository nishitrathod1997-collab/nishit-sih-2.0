import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Car,
  Siren,
  TrafficCone,
  CircleDot,
  TrendingUp,
  AlarmClock,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

/* ── Sub-components ──────────────────────────────────────── */

function Section({ title }) {
  return (
    <div className="legend-divider" role="separator">
      <span
        style={{
          display: 'inline-block',
          marginTop: '-9px',
          background: 'var(--clr-surface)',
          padding: '0 6px',
          fontSize: '0.6rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--clr-text-muted)',
        }}
      >
        {title}
      </span>
    </div>
  );
}

function CarRow({ swatch, label, desc, pulse }) {
  return (
    <div className="legend-row">
      <span
        className="legend-swatch"
        style={{
          background: swatch,
          boxShadow: pulse ? `0 0 6px ${swatch}` : undefined,
        }}
        aria-hidden="true"
      />
      <div>
        <span className="legend-term">{label}</span>
        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--clr-text-muted)', marginTop: 1 }}>
          {desc}
        </span>
      </div>
    </div>
  );
}

function SignalRow({ dot, label, desc, pulse }) {
  return (
    <div className="legend-row">
      <span
        className="legend-dot"
        style={{
          background: dot,
          boxShadow: pulse ? `0 0 8px ${dot}` : undefined,
          animation: pulse ? 'pulse-glow 1.8s ease-in-out infinite' : undefined,
        }}
        aria-hidden="true"
      />
      <div>
        <span className="legend-term" style={{ minWidth: 'unset' }}>{label}</span>
        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--clr-text-muted)', marginTop: 1 }}>
          {desc}
        </span>
      </div>
    </div>
  );
}

function TermRow({ icon: Icon, term, def }) {
  return (
    <div className="legend-row">
      <Icon size={13} color="var(--clr-text-muted)" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
      <div>
        <span className="legend-term">{term}</span>
        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--clr-text-muted)', marginTop: 1 }}>
          {def}
        </span>
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────── */

const Legend = ({ defaultOpen = false, position = 'floating' }) => {
  const [open, setOpen] = useState(defaultOpen);
  const { lang } = useLanguage();

  const carTypes = [
    {
      swatch: '#3b82f6',          // blue-500
      label: lang === 'HI' ? 'मानक वाहन' : 'Standard vehicle',
      desc: lang === 'HI' ? 'कतार में सामान्य कार या मोटरबाइक।' : 'Regular car or motorbike in the queue.',
    },
    {
      swatch: '#ef4444',          // red-500
      label: lang === 'HI' ? 'आपातकालीन वाहन' : 'Emergency vehicle',
      desc: lang === 'HI' ? 'एम्बुलेंस / दमकल — अपनी लेन के लिए प्राथमिकता ओवरराइड ट्रिगर करता है।' : 'Ambulance / fire truck — triggers priority override for its lane.',
      pulse: true,
    },
  ];

  const signalStates = [
    {
      dot: '#22c55e',             // green-500
      label: lang === 'HI' ? 'हरा — सक्रिय लेन' : 'GREEN — Active lane',
      desc: lang === 'HI' ? 'इस दिशा के वाहनों को आगे बढ़ने की अनुमति है।' : 'Vehicles in this direction are cleared to move.',
    },
    {
      dot: '#ef4444',             // red-500
      label: lang === 'HI' ? 'लाल — रोकी गई लेन' : 'RED — Held lane',
      desc: lang === 'HI' ? 'वाहनों को प्रतीक्षा करनी होगी; इस दिशा को सिग्नल नहीं मिला है।' : 'Vehicles must wait; signal not granted to this direction.',
    },
    {
      dot: '#f59e0b',             // amber-500
      label: lang === 'HI' ? 'पीला — आपातकालीन' : 'YELLOW — Emergency',
      desc: lang === 'HI' ? 'आपातकालीन वाहन का पता चला; सावधानी के लिए बत्ती पीली चमकती है।' : 'Emergency vehicle detected; light flashes amber for caution.',
      pulse: true,
    },
  ];

  const terms = [
    {
      icon: Layers,
      term: lang === 'HI' ? 'कतार (Queue)' : 'Queue',
      def: lang === 'HI' ? 'लेन प्रवेश द्वार पर अभी प्रतीक्षा कर रहे वाहनों की संख्या।' : 'Number of vehicles waiting at a lane entrance right now.',
    },
    {
      icon: TrendingUp,
      term: lang === 'HI' ? 'थ्रूपुट (Throughput)' : 'Throughput',
      def: lang === 'HI' ? 'प्रति मिनट चौराहे से निकलने वाले वाहन।' : 'Vehicles cleared through the intersection per minute.',
    },
    {
      icon: AlarmClock,
      term: lang === 'HI' ? 'औसत प्रतीक्षा समय' : 'Avg Wait Time',
      def: lang === 'HI' ? 'सिग्नल हरा होने से पहले किसी वाहन द्वारा प्रतीक्षा करने का औसत समय।' : 'Mean time a vehicle spends waiting before the signal turns green.',
    },
    {
      icon: TrafficCone,
      term: lang === 'HI' ? 'सिग्नल अवधि' : 'Signal Duration',
      def: lang === 'HI' ? 'वर्तमान ग्रीन चरण कितने समय (सेकंड) तक रहता है — AI द्वारा गतिशील रूप से निर्धारित।' : 'How long (seconds) the current green phase lasts — set adaptively by the AI.',
    },
    {
      icon: CircleDot,
      term: lang === 'HI' ? 'प्राथमिकता ओवरराइड' : 'Priority Override',
      def: lang === 'HI' ? 'सामान्य चक्र की उपेक्षा करते हुए AI या ऑपरेटर एक लेन को हरा करता है।' : 'AI or operator forces one lane green, ignoring the normal rotation.',
    },
  ];

  const panelContent = (
    <div className="legend-panel" style={{ minWidth: 260, maxWidth: 320 }}>
      {/* ── Car colours ── */}
      <h4>{lang === 'HI' ? 'वाहन के रंग' : 'Vehicle colours'}</h4>
      {carTypes.map((c) => (
        <CarRow key={c.label} {...c} />
      ))}

      {/* ── Signal states ── */}
      <div className="legend-divider" />
      <h4>{lang === 'HI' ? 'सिग्नल स्थितियां' : 'Signal states'}</h4>
      {signalStates.map((s) => (
        <SignalRow key={s.label} {...s} />
      ))}

      {/* ── Terms ── */}
      <div className="legend-divider" />
      <h4>{lang === 'HI' ? 'प्रमुख शब्दावली' : 'Key terms'}</h4>
      {terms.map((t) => (
        <TermRow key={t.term} {...t} />
      ))}

      {/* ── Source note ── */}
      <div
        style={{
          marginTop: 12,
          padding: '8px 10px',
          background: 'rgba(59,130,246,0.08)',
          border: '1px solid rgba(59,130,246,0.18)',
          borderRadius: 8,
          display: 'flex',
          gap: 6,
          alignItems: 'flex-start',
        }}
      >
        <Info size={12} color="var(--clr-primary)" style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: '0.68rem', color: 'var(--clr-text-muted)', lineHeight: 1.4 }}>
          {lang === 'HI'
            ? 'सिग्नल का समय वास्तविक समय की कतार की लंबाई के आधार पर AI द्वारा गतिशील रूप से निर्धारित किया जाता है। मैन्युअल ओवरराइड लॉग किए जाते हैं और 60 सेकंड के बाद स्वतः समाप्त हो जाते हैं।'
            : 'Signal timing is set dynamically by the AI based on real-time queue lengths. Manual overrides are logged and auto-expire after 60 s.'}
        </span>
      </div>
    </div>
  );

  /* ── Inline layout (Nishit can drop this directly into a grid) ── */
  if (position === 'inline') {
    return panelContent;
  }

  /* ── Floating toggle (default) ── */
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 8,
      }}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            key="legend-body"
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{ transformOrigin: 'bottom right' }}
          >
            {panelContent}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button
        id="legend-toggle-btn"
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-expanded={open}
        aria-label={open ? (lang === 'HI' ? 'संकेत विवरण बंद करें' : 'Close legend') : (lang === 'HI' ? 'संकेत विवरण खोलें' : 'Open legend')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 14px',
          borderRadius: 99,
          border: '1px solid var(--clr-border)',
          background: 'var(--clr-surface)',
          color: 'var(--clr-text-secondary)',
          fontSize: '0.75rem',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
          letterSpacing: '0.02em',
          transition: 'background var(--t-fast), color var(--t-fast)',
        }}
      >
        <Info size={14} aria-hidden="true" />
        {lang === 'HI' ? 'संकेत विवरण' : 'Legend'}
        {open ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
      </motion.button>
    </div>
  );
};

export default Legend;
