import { AnimatePresence, motion } from 'framer-motion';
import {
  Siren,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Navigation,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

/* ── helpers ────────────────────────────────────────────────── */

const VEHICLE_COLORS = {
  Ambulance:    { bg: 'rgba(239,68,68,0.12)',  border: '#ef4444', text: '#fca5a5' },
  'Fire Truck': { bg: 'rgba(249,115,22,0.12)', border: '#f97316', text: '#fdba74' },
  Police:       { bg: 'rgba(59,130,246,0.12)', border: '#3b82f6', text: '#93c5fd' },
};
const DEFAULT_COLOR = { bg: 'rgba(239,68,68,0.12)', border: '#ef4444', text: '#fca5a5' };

/* ══════════════════════════════════════════════════════════════
   STANDBY STATE — compact monitoring pill
   ══════════════════════════════════════════════════════════════ */
function StandbyBadge({ lang }) {
  return (
    <div
      id="emergency-alert-standby"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
      style={{
        background: 'rgba(100,116,139,0.12)',
        border: '1px solid rgba(100,116,139,0.25)',
        color: '#94a3b8',
      }}
      role="status"
      aria-label={lang === 'HI' ? 'आपातकालीन प्रणाली निगरानी' : 'Emergency system monitoring'}
    >
      <CheckCircle2 size={12} aria-hidden="true" />
      {lang === 'HI' ? 'आपातकालीन प्रणाली: निगरानी सक्रिय' : 'Emergency System: Monitoring'}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ACTIVE OVERRIDE BANNER
   ══════════════════════════════════════════════════════════════ */
function ActiveBanner({ lane, vehicleType, eta, lang }) {
  const colors  = VEHICLE_COLORS[vehicleType] ?? DEFAULT_COLOR;

  const directionLabels = {
    N: lang === 'HI' ? 'उत्तर' : 'North',
    S: lang === 'HI' ? 'दक्षिण' : 'South',
    E: lang === 'HI' ? 'पूर्व' : 'East',
    W: lang === 'HI' ? 'पश्चिम' : 'West',
  };
  const dirFull = directionLabels[lane] ?? lane;

  const vehicleTypeLabel = lang === 'HI' 
    ? (vehicleType === 'Ambulance' ? 'एम्बुलेंस' : vehicleType === 'Fire Truck' ? 'दमकल वाहन' : vehicleType === 'Police' ? 'पुलिस' : vehicleType)
    : vehicleType;

  return (
    <motion.div
      id="emergency-alert-active"
      key="emergency-active"
      initial={{ opacity: 0, y: -16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0,   scale: 1 }}
      exit={{    opacity: 0, y: -12,  scale: 0.97 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="emergency-strobe-active rounded-xl overflow-hidden"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      style={{ background: colors.bg }}
    >
      {/* ── top label bar ── */}
      <div
        className="flex items-center justify-between px-4 py-2 text-xs font-bold uppercase tracking-widest"
        style={{
          background: 'rgba(0,0,0,0.30)',
          borderBottom: `1px solid ${colors.border}44`,
          color: colors.text,
          letterSpacing: '0.12em',
        }}
      >
        <div className="flex items-center gap-2">
          {/* Beacon icon — strobe animation */}
          <span className="beacon-flash" aria-hidden="true">
            <Siren size={14} color={colors.text} />
          </span>
          {lang === 'HI' ? 'प्राथमिकता ओवरराइड सक्रिय' : 'Priority Override Active'}
        </div>
        <span style={{ color: '#64748b', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
          {lang === 'HI' ? 'AI प्रबंधित' : 'AI managed'}
        </span>
      </div>

      {/* ── main body ── */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-3">

        {/* Vehicle type */}
        <div className="flex items-center gap-2">
          <span className="beacon-flash" aria-hidden="true">
            <Siren size={20} color={colors.text} />
          </span>
          <div>
            <div className="text-xs font-medium" style={{ color: '#64748b' }}>
              {lang === 'HI' ? 'वाहन' : 'Vehicle'}
            </div>
            <div className="text-sm font-bold" style={{ color: colors.text }}>
              {vehicleTypeLabel}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 32, background: `${colors.border}33` }} aria-hidden="true" />

        {/* Affected lane */}
        <div className="flex items-center gap-2">
          <Navigation size={16} color={colors.text} aria-hidden="true" />
          <div>
            <div className="text-xs font-medium" style={{ color: '#64748b' }}>
              {lang === 'HI' ? 'प्राथमिकता लेन' : 'Priority Lane'}
            </div>
            <div className="text-sm font-bold" style={{ color: colors.text }}>
              {dirFull} ({lane})
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 32, background: `${colors.border}33` }} aria-hidden="true" />

        {/* ETA badge */}
        <div className="flex items-center gap-2">
          <Clock size={16} color={colors.text} aria-hidden="true" />
          <div>
            <div className="text-xs font-medium" style={{ color: '#64748b' }}>ETA</div>
            <div
              className="text-sm font-extrabold px-2 py-0.5 rounded"
              style={{
                background: `${colors.border}22`,
                border: `1px solid ${colors.border}55`,
                color: colors.text,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {eta}
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Warning badge — right-aligned */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{
            background: 'rgba(239,68,68,0.18)',
            border: '1px solid rgba(239,68,68,0.35)',
            color: '#fca5a5',
          }}
        >
          <ShieldAlert size={12} aria-hidden="true" />
          {lang === 'HI' ? 'अन्य सभी लेन रोकी गईं' : 'All other lanes HELD'}
        </div>
      </div>

      {/* ── auto-disable notice ── */}
      <div
        className="px-4 py-2 text-xs"
        style={{
          background: 'rgba(0,0,0,0.20)',
          borderTop: `1px solid ${colors.border}22`,
          color: '#475569',
        }}
      >
        {lang === 'HI' 
          ? 'ओवरराइड 60s बाद स्वतः निष्क्रिय · मुंबई ट्रैफिक पुलिस को सूचित किया गया'
          : 'Override auto-disables after 60 s · Mumbai Traffic Police notified'}
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN EXPORT
   ══════════════════════════════════════════════════════════════ */

const EmergencyAlert = ({
  active      = false,
  lane        = 'N',
  vehicleType = 'Ambulance',
  eta         = '~8s',
}) => {
  const { lang } = useLanguage();

  return (
    <AnimatePresence mode="wait">
      {active ? (
        <ActiveBanner
          key="active"
          lane={lane}
          vehicleType={vehicleType}
          eta={eta}
          lang={lang}
        />
      ) : (
        <motion.div
          key="standby"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{    opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <StandbyBadge lang={lang} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EmergencyAlert;
