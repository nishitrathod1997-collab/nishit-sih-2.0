import { 
  Landmark, 
  MapPin, 
  Sparkles, 
  Building2, 
  Atom, 
  Server, 
  Target, 
  Eye, 
  Clock, 
  ShieldCheck, 
  Languages, 
  Video, 
  Users, 
  Zap, 
  Leaf, 
  Award,
  CheckCircle2
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const About = () => {
  const { lang } = useLanguage();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      <div className="bg-white shadow-xs border border-slate-200 rounded-2xl p-6 sm:p-8 md:p-10">
        
        {/* Main Header Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="flex items-start space-x-3.5">
            <div className="h-14 w-auto rounded-xl bg-white p-1 flex items-center justify-center border border-slate-200 shadow-xs shrink-0">
              <img src="/marg_drishti_logo.jpg" alt="MARG-DRISHTI Logo" className="h-full w-auto object-contain" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-[#0A1F44] tracking-tight">
                  {lang === 'HI' ? 'मार्ग-दृष्टि (MARG-DRISHTI)' : 'MARG-DRISHTI'}
                </h1>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-1">
                {lang === 'HI' 
                  ? 'सड़क परिवहन एवं राजमार्ग मंत्रालय (MoRTH) • स्मार्ट इंडिया हैकाथॉन (SIH) • एकीकृत कमान एवं नियंत्रण केंद्र (ICCC)' 
                  : 'Ministry of Road Transport & Highways (MoRTH) • Smart India Hackathon (SIH) • Integrated Command & Control Center (ICCC)'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-col items-end gap-1.5 shrink-0">
            <span className="text-[10px] font-extrabold px-2.5 py-1 bg-amber-50 text-amber-800 rounded-md border border-amber-300/80 uppercase tracking-wider flex items-center gap-1">
              <Award size={12} className="text-amber-600" />
              {lang === 'HI' ? 'SIH हैकाथॉन प्रोजेक्ट' : 'SIH Hackathon Project'}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-[#003366] rounded-md border border-blue-200">
              IRC:106:1990 & GIGW 3.0
            </span>
          </div>
        </div>

        <div className="space-y-8 mt-6">
          
          {/* Executive Overview */}
          <div>
            <h2 className="text-base font-extrabold text-[#0A1F44] mb-2.5 flex items-center space-x-2">
              <MapPin size={17} className="text-[#003366]" />
              <span>{lang === 'HI' ? 'कार्यकारी अवलोकन' : 'Executive Overview'}</span>
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              {lang === 'HI' ? (
                <>
                  <strong>राष्ट्रीय शहरी यातायात नियंत्रण प्रणाली (N-UTCS)</strong> भारतीय सड़क कांग्रेस (<strong>IRC:106</strong>) मानकों और भारतीय सरकारी वेबसाइट दिशानिर्देशों (<strong>GIGW 3.0</strong>) के तहत निर्मित अगली पीढ़ी का AI-संचालित बुद्धिमान यातायात अनुकूलन प्लेटफॉर्म है।
                  मुंबई BKC ज़ोन जैसे उच्च-घनत्व वाले महानगरीय कॉरिडोर के लिए विकसित, यह प्रणाली कंप्यूटर विज़न आधारित <strong>सच्ची PCU (यात्री कार इकाई) मांग गणना</strong>, 
                  चार-दिशा पहुंच मार्ग ज़ोन मैपिंग (North, South, East, West), <strong>पैदल यात्री क्रॉसवाक सुरक्षा निगरानी</strong>, 
                  सिग्नल चरण-समकालिक डायनेमिक काउंटडाउन, आपातकालीन ग्रीन कॉरिडोर (EVP), तथा पूर्ण <strong>द्विभाषी (हिन्दी / English)</strong> टेलीमेट्री का उपयोग करके शहरी ट्रैफिक जाम को समाप्त करती है।
                </>
              ) : (
                <>
                  The <strong>National Urban Traffic Control System (N-UTCS)</strong> is an enterprise-grade, AI-powered intelligent traffic management platform engineered under Indian Roads Congress (<strong>IRC:106</strong>) standards and Guidelines for Indian Government Websites (<strong>GIGW 3.0</strong>).
                  Engineered for high-density metropolitan intersections like the Mumbai BKC Zone, it leverages real-time optical <strong>True PCU (Passenger Car Unit) demand weighting</strong>,
                  four-way spatial approach zone mapping (North, South, East, West), <strong>pedestrian crosswalk safety monitoring</strong>,
                  phase-synchronized dynamic countdown timing, emergency green wave corridors (EVP), and seamless <strong>bilingual (English / हिन्दी)</strong> telemetry to eliminate urban gridlock.
                </>
              )}
            </p>
          </div>

          {/* Key Capabilities Grid (8 Updated Items) */}
          <div>
            <h2 className="text-base font-extrabold text-[#0A1F44] mb-3 flex items-center space-x-2">
              <Sparkles size={17} className="text-[#F5A623]" />
              <span>{lang === 'HI' ? 'प्रमुख क्षमताएं व आधुनिक विशेषताएं' : 'Key Capabilities & Latest Innovations'}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                {
                  icon: Zap,
                  iconBg: 'bg-blue-100 text-blue-700',
                  title: lang === 'HI' ? 'सच्चा IRC:106 PCU आधारित डायनेमिक ग्रीन समय' : 'True IRC:106 PCU-Weighted Dynamic Green Timing',
                  desc: lang === 'HI' 
                    ? 'कच्चे वाहन गिनती के स्थान पर मानक भार: कार 1.0, दोपहिया 0.5, बस/ट्रक 2.5 PCU। सूत्र: 10s बेस + (PCU × 1.0s) [10s–60s सीमा]।' 
                    : 'Replaces raw vehicle counts with Indian Roads Congress weights: Car 1.0, Bike 0.5, Bus/Truck 2.5 PCU. Formula: 10s Base + (PCU × 1.0s) [10s–60s clamp].'
                },
                {
                  icon: Eye,
                  iconBg: 'bg-purple-100 text-purple-700',
                  title: lang === 'HI' ? 'ऑप्टिकल मल्टी-ज़ोन विज़न AI ग्रिड' : 'Optical Multi-Zone Vision AI Grid',
                  desc: lang === 'HI' 
                    ? 'North, South, East और West पहुंच मार्गों के लिए पॉलीगॉन ज़ोन मैपिंग और बॉटम-सेंटर रोड एंकर बिंदुओं से सटीक लेन कतार पहचान।' 
                    : 'Spatial polygon approach zones for North, South, East, and West with bottom-center road contact anchors for pinpoint queue isolation.'
                },
                {
                  icon: Users,
                  iconBg: 'bg-cyan-100 text-cyan-700',
                  title: lang === 'HI' ? 'पैदल यात्री एवं क्रॉसवाक सुरक्षा निगरानी' : 'Pedestrian & Crosswalk Safety Monitoring',
                  desc: lang === 'HI' 
                    ? 'क्रॉसवाक पर पैदल यात्रियों (ह्यूमन डिटेक्शन #1469) की विशेष स्यान हाइलाइटिंग से ट्रैकिंग कर बहु-मोडल शहरी सुरक्षा सुनिश्चित करना।' 
                    : 'Active optical detection and cyan-coded tracking of pedestrians crossing intersections to ensure vulnerable road user safety.'
                },
                {
                  icon: Clock,
                  iconBg: 'bg-emerald-100 text-emerald-700',
                  title: lang === 'HI' ? 'सिंक्रनाइज़्ड डायनेमिक काउंटडाउन टाइमर' : 'Synchronized Dynamic Phase Countdown',
                  desc: lang === 'HI' 
                    ? 'स्थिर 45s टाइमर के बजाय आवंटित ग्रीन अवधि से सीधे काउंटडाउन; लगभग 56% चक्र विलंब समाप्त।' 
                    : 'Active countdowns synchronize directly from allocated green duration rather than rigid background timers, eliminating ~56% cycle delay.'
                },
                {
                  icon: Languages,
                  iconBg: 'bg-indigo-100 text-indigo-700',
                  title: lang === 'HI' ? 'पूर्ण द्विभाषी इंटरफ़ेस (GIGW 3.0)' : 'Full Bilingual Localization (GIGW 3.0)',
                  desc: lang === 'HI' 
                    ? 'Noto Sans Devanagari टाइपोग्राफी, फ़ॉन्ट स्केलिंग और ऑडियो अलर्ट के साथ हिन्दी व अंग्रेज़ी में एक-क्लिक निर्बाध स्विचिंग।' 
                    : 'Instant one-click bilingual switching between English and Hindi with Noto Sans Devanagari typography, font scaling, and audio status cues.'
                },
                {
                  icon: ShieldCheck,
                  iconBg: 'bg-rose-100 text-rose-700',
                  title: lang === 'HI' ? 'आपातकालीन वाहन प्राथमिकता (EVP)' : 'Emergency Vehicle Priority (EVP)',
                  desc: lang === 'HI' 
                    ? 'एम्बुलेंस और दमकल वाहनों के लिए स्वचालित ग्रीन कॉरिडोर प्री-एम्पशन और तात्कालिक लेन क्लीयरेंस।' 
                    : 'Automated green corridor pre-emption and instant queue clearing for ambulances and emergency response vehicles.'
                },
                {
                  icon: Video,
                  iconBg: 'bg-amber-100 text-amber-700',
                  title: lang === 'HI' ? 'इंटरैक्टिव वीडियो स्क्रबर व ऑडिट रीप्ले' : 'Interactive Video Timeline & Scrubbing',
                  desc: lang === 'HI' 
                    ? 'घटना विश्लेषण, फ़्रेम-दर-फ़्रेम सत्यापन और 0.5x से 4x गति पर ऑप्टिकल कतार ऑडिट हेतु द्विदिशीय टाइमलाइन।' 
                    : 'Bidirectional timeline scrubbing, frame-by-frame stepping, and 0.5x–4x playback speed control for post-incident audits.'
                },
                {
                  icon: Leaf,
                  iconBg: 'bg-teal-100 text-teal-700',
                  title: lang === 'HI' ? 'इको, ईंधन व कार्बन उत्सर्जन टेलीमेट्री' : 'Eco, Fuel & Carbon Footprint Telemetry',
                  desc: lang === 'HI' 
                    ? 'निष्क्रिय खड़े वाहनों के ईंधन अपव्यय, CO₂ उत्सर्जन कमी और यात्रियों की आर्थिक बचत (₹1,200+/घंटा) की लाइव गणना।' 
                    : 'Continuous calculation of idling fuel wastage, CO₂ emissions reduction, and commuter economic savings (₹1,200+/hr).'
                }
              ].map((feat, idx) => {
                const IconComponent = feat.icon;
                return (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-slate-300 transition-all">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg ${feat.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <IconComponent size={16} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-xs sm:text-sm mb-1 leading-snug">
                          {feat.title}
                        </h3>
                        <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                          {feat.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Technical Architecture (3 Clean Columns) */}
          <div>
            <h2 className="text-base font-extrabold text-[#0A1F44] mb-3 flex items-center space-x-2">
              <Building2 size={17} className="text-[#003366]" />
              <span>{lang === 'HI' ? 'तकनीकी वास्तुकला' : 'Technical Architecture'}</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Column 1: Frontend */}
              <div className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 mb-3 text-xs sm:text-sm flex items-center space-x-2">
                    <Atom size={16} className="text-[#003366]" />
                    <span>{lang === 'HI' ? 'फ्रंटएंड डैशबोर्ड' : 'Frontend Dashboard'}</span>
                  </h3>
                  <ul className="text-[11px] sm:text-xs text-slate-600 space-y-2.5">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#003366] mt-1.5 shrink-0" />
                      <span><strong>React 19 + Vite:</strong> {lang === 'HI' ? 'अल्ट्रा-फास्ट रेंडरिंग इंजन व स्टेट सिंक' : 'Ultra-fast rendering engine & reactive state sync'}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#003366] mt-1.5 shrink-0" />
                      <span><strong>Tailwind CSS 4:</strong> {lang === 'HI' ? 'GIGW-अनुरूप सुलभ, आधुनिक कंपोनेंट स्टाइलिंग' : 'GIGW-compliant accessible, modern styling'}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#003366] mt-1.5 shrink-0" />
                      <span><strong>Canvas 2D Engine:</strong> {lang === 'HI' ? 'उच्च-आवृत्ति डिटेक्शन बॉक्स व एंकर ओवरले' : 'High-frequency bounding box & anchor overlay'}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#003366] mt-1.5 shrink-0" />
                      <span><strong>Recharts & Motion:</strong> {lang === 'HI' ? 'रीयल-टाइम कतार एनालिटिक्स व वाहन एनिमेशन' : 'Live queue analytics & vehicle animation physics'}</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Column 2: Vision & AI */}
              <div className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 mb-3 text-xs sm:text-sm flex items-center space-x-2">
                    <Eye size={16} className="text-purple-700" />
                    <span>{lang === 'HI' ? 'विज़न AI व डिटेक्शन' : 'Vision AI & Detection'}</span>
                  </h3>
                  <ul className="text-[11px] sm:text-xs text-slate-600 space-y-2.5">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-700 mt-1.5 shrink-0" />
                      <span><strong>YOLOv8 Multi-Class:</strong> {lang === 'HI' ? 'कार, बाइक, बस, ट्रक व पैदल यात्री पहचान' : 'Cars, bikes, buses, trucks & pedestrian tracking'}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-700 mt-1.5 shrink-0" />
                      <span><strong>Spatial ROI Zones:</strong> {lang === 'HI' ? '4-तरफा पहुंच मार्ग पॉलीगॉन ज़ोन मैपिंग' : '4-way polygon approach partitioning (N, S, E, W)'}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-700 mt-1.5 shrink-0" />
                      <span><strong>ByteTrack IDs:</strong> {lang === 'HI' ? 'स्थिर ट्रैक ID ट्रैकिंग व आगमन घटना रिकॉर्डिंग' : 'Persistent vehicle track IDs & trajectory logging'}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-700 mt-1.5 shrink-0" />
                      <span><strong>Optical Timeline Sync:</strong> {lang === 'HI' ? 'वीडियो समय-कोड के साथ मिलीसेकंड सिंक' : 'Sub-second optical synchronization with video feed'}</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Column 3: Backend & Optimization */}
              <div className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 mb-3 text-xs sm:text-sm flex items-center space-x-2">
                    <Server size={16} className="text-[#F5A623]" />
                    <span>{lang === 'HI' ? 'बैकएंड व AI शेड्यूलिंग' : 'Backend & AI Scheduling'}</span>
                  </h3>
                  <ul className="text-[11px] sm:text-xs text-slate-600 space-y-2.5">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] mt-1.5 shrink-0" />
                      <span><strong>Node.js Express / REST:</strong> {lang === 'HI' ? 'उच्च-थ्रूपुट टेलीमेट्री व एनालिटिक्स गेटवे' : 'High-throughput telemetry & analytics gateway'}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] mt-1.5 shrink-0" />
                      <span><strong>IRC:106 PCU Engine:</strong> {lang === 'HI' ? 'भारित मांग अनुसार डायनेमिक ग्रीन समय गणना' : 'Real-time PCU demand calculation & clamping'}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] mt-1.5 shrink-0" />
                      <span><strong>Signal Optimizer:</strong> {lang === 'HI' ? 'नियतात्मक बीजगणितीय देरी-न्यूनीकरण हेयुरिस्टिक' : 'Deterministic algebraic delay-minimization heuristic'}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] mt-1.5 shrink-0" />
                      <span><strong>Eco Emissions Module:</strong> {lang === 'HI' ? 'CO₂ उत्सर्जन कटौती व ईंधन बचत अनुमान' : 'Live CO₂ emissions and commuter fuel valuation'}</span>
                    </li>
                  </ul>
                </div>
              </div>

            </div>
          </div>

          {/* Performance Benchmarks (4 Metric Cards) */}
          <div>
            <h2 className="text-base font-extrabold text-[#0A1F44] mb-3 flex items-center space-x-2">
              <Target size={17} className="text-[#003366]" />
              <span>{lang === 'HI' ? 'प्रणाली बेंचमार्क व प्रभाव (मुंबई BKC कॉरिडोर)' : 'System Benchmarks & Impact (Mumbai BKC Corridor)'}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              
              <div className="text-center p-4 bg-[#0A1F44]/5 border border-[#0F2C59]/20 rounded-xl">
                <div className="text-2xl sm:text-3xl font-black text-[#0F2C59] font-mono">30–35s</div>
                <div className="text-xs font-bold text-[#0A1F44] mt-1">
                  {lang === 'HI' ? 'लक्षित प्रतीक्षा समय' : 'Target Wait Time'}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {lang === 'HI' ? 'पारंपरिक 45s बेसलाइन की तुलना में' : 'vs 45s static timer baseline'}
                </div>
              </div>

              <div className="text-center p-4 bg-emerald-50/80 border border-emerald-300 rounded-xl">
                <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">56%</div>
                <div className="text-xs font-bold text-emerald-950 mt-1">
                  {lang === 'HI' ? 'चक्र विलंब में कमी' : 'Cycle Delay Eliminated'}
                </div>
                <div className="text-[11px] text-emerald-700 mt-0.5">
                  {lang === 'HI' ? 'अनुकूली PCU ग्रीन समय के साथ' : 'with adaptive PCU demand phases'}
                </div>
              </div>

              <div className="text-center p-4 bg-blue-50/80 border border-blue-300 rounded-xl">
                <div className="text-2xl sm:text-3xl font-black text-blue-700 font-mono">~28%</div>
                <div className="text-xs font-bold text-blue-950 mt-1">
                  {lang === 'HI' ? 'जंक्शन थ्रूपुट वृद्धि' : 'Throughput Increase'}
                </div>
                <div className="text-[11px] text-blue-700 mt-0.5">
                  {lang === 'HI' ? 'प्रति मिनट अधिक वाहन निकासी' : 'Higher vehicles cleared/min'}
                </div>
              </div>

              <div className="text-center p-4 bg-amber-50/80 border border-amber-300 rounded-xl">
                <div className="text-2xl sm:text-3xl font-black text-amber-700 font-mono">₹1,200+</div>
                <div className="text-xs font-bold text-amber-950 mt-1">
                  {lang === 'HI' ? 'आर्थिक बचत / घंटा' : 'Economic Savings / Hr'}
                </div>
                <div className="text-[11px] text-amber-700 mt-0.5">
                  {lang === 'HI' ? 'बचा ईंधन + यात्रियों का समय' : 'Fuel saved + Commuter time'}
                </div>
              </div>

            </div>
          </div>

          {/* Compliance & Standards Footer Banner */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2.5 text-xs">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span className="font-semibold text-slate-700">
              {lang === 'HI' 
                ? 'अनुपालन: IRC:106-1990 (शहरी क्षमता मानक) • GIGW 3.0 (भारत सरकार वेबसाइट दिशानिर्देश)' 
                : 'Compliance: IRC:106-1990 (Urban Road Capacity) • GIGW 3.0 (Govt. Website Guidelines)'}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default About;
