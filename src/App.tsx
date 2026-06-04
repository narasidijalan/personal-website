import { useState, useEffect, useRef } from 'react';
import {
  Sun, Moon, Menu, X, Github, Linkedin, Mail, MessageCircle,
  MapPin, Calendar, ArrowRight, Briefcase, GraduationCap, Award,
  User, ChevronDown, Loader2, AlertCircle
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Experience {
  company: string;
  role: string;
  period: string;
  achievements: string[];
}

interface Skill {
  name: string;
  level: string;
  years: number;
}

interface EducationItem {
  jenis: string;
  jurusan: string;
  instansi: string;
  tahunMulai: string;
  tahunAkhir: string;
  deskripsi: string;
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      currentRow.push(cell.trim());
      cell = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      currentRow.push(cell.trim());
      if (currentRow.some(c => c.length > 0)) rows.push(currentRow);
      currentRow = [];
      cell = '';
      if (ch === '\r' && text[i + 1] === '\n') i++;
    } else {
      cell += ch;
    }
  }
  currentRow.push(cell.trim());
  if (currentRow.some(c => c.length > 0)) rows.push(currentRow);

  return rows;
}

function parseExperienceCSV(csv: string): Experience[] {
  const rows = parseCSV(csv);
  if (rows.length < 2) return [];

  return rows.slice(1).map(row => {
    const desc = (row[4] || '').trim();
    const achievements = desc
      .split(/\n{2,}/)
      .map(s => s.replace(/\n/g, ' ').trim())
      .filter(Boolean)
      .map(s => (s.endsWith('.') ? s : s + '.'));

    return {
      company: row[0] || '',
      role: row[1] || '',
      period: `${row[2] || ''} – ${row[3] || ''}`,
      achievements,
    };
  });
}

function parseSkillCSV(csv: string): Skill[] {
  const rows = parseCSV(csv);
  if (rows.length < 2) return [];

  return rows.slice(1).map(row => ({
    name: row[0] || '',
    level: row[1] || '',
    years: parseInt(row[2] || '0', 10),
  }));
}

function parseEducationCSV(csv: string): EducationItem[] {
  const rows = parseCSV(csv);
  if (rows.length < 2) return [];

  return rows.slice(1).map(row => ({
    jenis: row[0] || '',
    jurusan: row[1] || '',
    instansi: row[2] || '',
    tahunMulai: row[3] || '',
    tahunAkhir: row[4] || '',
    deskripsi: row[5] || '',
  }));
}

// ─── Data URLs ───────────────────────────────────────────────────────────────

const EXP_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vS4aX09mtmA80OArmrCncFwxAd3uFucB9yLoDbGjm-NfqxTi76YGqs1JQN5aI4Wl2DiECybcSw9Ozqj/pub?gid=0&single=true&output=csv';

const SKILL_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vS4aX09mtmA80OArmrCncFwxAd3uFucB9yLoDbGjm-NfqxTi76YGqs1JQN5aI4Wl2DiECybcSw9Ozqj/pub?gid=500471126&single=true&output=csv';

const EDU_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vS4aX09mtmA80OArmrCncFwxAd3uFucB9yLoDbGjm-NfqxTi76YGqs1JQN5aI4Wl2DiECybcSw9Ozqj/pub?gid=643928211&single=true&output=csv';

// ─── Nav ─────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { href: '#home', label: 'Home' },
  { href: '#bio', label: 'Bio' },
  { href: '#pengalaman', label: 'Pengalaman' },
  { href: '#pendidikan', label: 'Pendidikan' },
  { href: '#kontak', label: 'Kontak' },
];

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  return [dark, setDark] as const;
}

function useReveal() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const children = el.querySelectorAll('.reveal, .reveal-left');
          children.forEach((child, i) => {
            setTimeout(() => child.classList.add('visible'), i * 80);
          });
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

function useFetchCSV<T>(url: string, parser: (csv: string) => T[]) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchCSV() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (!cancelled) {
          setData(parser(text));
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Gagal memuat data');
          setLoading(false);
        }
      }
    }

    fetchCSV();
    return () => { cancelled = true; };
  }, [url, parser]);

  return { data, loading, error };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function skillLevelColor(level: string): string {
  const l = level.toLowerCase();
  if (l === 'expert') return 'bg-green-500 text-white';
  if (l === 'advanced') return 'bg-blue-500 text-white';
  if (l === 'certified') return 'bg-amber-500 text-white';
  if (l === 'intermediate') return 'bg-gray-500 text-white';
  return 'bg-gray-400 text-white';
}

// ─── Components ──────────────────────────────────────────────────────────────

function Navbar({ dark, toggleDark }: { dark: boolean; toggleDark: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);

      const sections = NAV_LINKS.map(l => l.href.replace('#', ''));
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el && window.scrollY >= el.offsetTop - 80) {
          setActiveSection(sections[i]);
          break;
        }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMenuOpen(false);
    const id = href.replace('#', '');
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-700/60 shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button onClick={() => handleNavClick('#home')} className="flex items-center gap-2 group">
          <span className="w-9 h-9 bg-green-500 text-white text-sm font-bold rounded-xl flex items-center justify-center group-hover:bg-green-600 transition-colors duration-200">
            IA
          </span>
          <span className="font-semibold text-gray-900 dark:text-white hidden sm:block text-sm">
            Indrawan Al-Mutawakkil
          </span>
        </button>

        <div className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map(link => (
            <button
              key={link.href}
              onClick={() => handleNavClick(link.href)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeSection === link.href.replace('#', '')
                  ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleDark}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      <div
        className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          menuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-700/60 px-4 py-3 space-y-1">
          {NAV_LINKS.map(link => (
            <button
              key={link.href}
              onClick={() => handleNavClick(link.href)}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeSection === link.href.replace('#', '')
                  ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <section
      id="home"
      className="min-h-screen flex items-center justify-center relative bg-white dark:bg-[#0B0F19] pt-16 overflow-hidden"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-green-500/5 dark:bg-green-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-blue-500/5 dark:bg-blue-500/8 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div className="order-2 lg:order-1 text-center lg:text-left">
          <div className="animate-fade-in-up">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400 text-xs font-medium rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Tersedia untuk peluang baru
            </span>
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight mb-4 animate-fade-in-up"
            style={{ animationDelay: '0.1s' }}
          >
            Indrawan
            <span className="block text-green-500">Al-Mutawakkil</span>
          </h1>

          <p
            className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 font-medium mb-3 animate-fade-in-up"
            style={{ animationDelay: '0.2s' }}
          >
            Kepala Gudang Logistik
          </p>

          <p
            className="text-gray-500 dark:text-gray-400 leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0 animate-fade-in-up"
            style={{ animationDelay: '0.3s' }}
          >
            Sinkronisasi arus barang dan optimalisasi ruang gudang. 8+ tahun pengalaman mengelola logistik skala besar dengan fokus pada akurasi data, efisiensi waktu, dan kepemimpinan tim yang solid.
          </p>

          <div
            className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start animate-fade-in-up"
            style={{ animationDelay: '0.4s' }}
          >
            <a
              href="https://wa.me/6281234567890?text=Halo%20Indrawan%2C%20saya%20tertarik%20untuk%20berdiskusi%20tentang%20peluang%20kerja%20sama."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:-translate-y-0.5"
            >
              <MessageCircle size={18} />
              Hubungi Saya
            </a>
            <button
              onClick={() => document.getElementById('pengalaman')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5"
            >
              Lihat Pengalaman
              <ArrowRight size={18} />
            </button>
          </div>

          <div
            className="flex items-center gap-6 mt-10 justify-center lg:justify-start animate-fade-in-up"
            style={{ animationDelay: '0.5s' }}
          >
            {[
              { label: 'Tahun Exp.', value: '8+' },
              { label: 'Gudang Dikelola', value: '5+' },
              { label: 'Tim Dipimpin', value: '30+' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="order-1 lg:order-2 flex justify-center lg:justify-end animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl blur-2xl opacity-20 scale-110" />
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 rounded-2xl overflow-hidden border-2 border-gray-200/80 dark:border-gray-700/80 shadow-2xl">
              {!imgLoaded && (
                <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse" />
              )}
              <img
                src="https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Indrawan Al-Mutawakkil"
                className={`w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImgLoaded(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>

            <div className="absolute -bottom-4 -left-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Open to Work</span>
              </div>
            </div>

            <div className="absolute -top-4 -right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 shadow-lg">
              <div className="flex items-center gap-2">
                <MapPin size={12} className="text-green-500" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Jakarta, ID</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-gray-400 dark:text-gray-600 animate-bounce">
        <span className="text-xs">Scroll</span>
        <ChevronDown size={16} />
      </div>
    </section>
  );
}

function BioSection({ skills, skillsLoading, skillsError }: {
  skills: Skill[];
  skillsLoading: boolean;
  skillsError: string | null;
}) {
  const ref = useReveal();

  return (
    <section
      id="bio"
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 bg-gray-50 dark:bg-[#0d1117]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <div className="reveal">
              <span className="text-green-500 text-sm font-semibold uppercase tracking-widest">Tentang Saya</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mt-2 mb-6 leading-tight">
                Mengelola dengan presisi,<br />
                <span className="text-green-500">memimpin dengan tanggung jawab</span>
              </h2>
            </div>

            <div className="reveal space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed">
              <p>
                Saya adalah seorang <span className="font-semibold text-gray-800 dark:text-gray-200">Kepala Gudang Logistik</span> dengan
                lebih dari 8 tahun pengalaman mengelola operasional gudang skala besar di sektor logistik dan distribusi.
                Passion saya terletak pada sinkronisasi arus barang yang akurat dan efisiensi tata kelola ruang penyimpanan.
              </p>
              <p>
                Saya percaya bahwa gudang yang well-organized adalah fondasi dari rantai pasok yang tangguh.
                Saya terbiasa bekerja dari perencanaan kapasitas hingga eksekusi operasional — dari merancang sistem inventaris,
                mengelola Warehouse Management System, hingga memimpin tim lapangan dengan standar K3 yang ketat.
              </p>
              <p>
                Di luar operasional, saya aktif mengikuti pelatihan sertifikasi profesional, memperbarui standar SOP,
                dan berbagi pengalaman manajemen gudang melalui komunitas logistik.
              </p>
            </div>
          </div>

          <div className="reveal grid grid-cols-2 gap-4">
            {[
              { icon: Briefcase, label: 'Spesialisasi', value: 'Warehouse Management' },
              { icon: Briefcase, label: 'Tipe Kerja', value: 'On-site / Hybrid' },
              { icon: MapPin, label: 'Lokasi', value: 'Jakarta, Indonesia' },
              { icon: User, label: 'Bahasa', value: 'Indonesia, English' },
            ].map(item => (
              <div
                key={item.label}
                className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 rounded-2xl p-5 hover:border-green-300 dark:hover:border-green-500/30 transition-all duration-300"
              >
                <item.icon size={20} className="text-green-500 mb-3" />
                <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">{item.label}</div>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{item.value}</div>
              </div>
            ))}

            {/* Dynamic Skills Section */}
            <div className="col-span-2 bg-gray-200 dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700/60 rounded-2xl p-5">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-3">Core Skills</div>
              {skillsLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500">
                  <Loader2 size={14} className="animate-spin" />
                  Memuat data...
                </div>
              ) : skillsError ? (
                <div className="flex items-center gap-2 text-sm text-red-500">
                  <AlertCircle size={14} />
                  Gagal memuat skill
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skills.map(skill => (
                    <span
                      key={skill.name}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium ${skillLevelColor(skill.level)}`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {skill.name}
                        <span className="opacity-70 text-[10px]">{skill.years}th</span>
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ExperienceSection({ experiences, loading, error }: {
  experiences: Experience[];
  loading: boolean;
  error: string | null;
}) {
  const ref = useReveal();

  return (
    <section
      id="pengalaman"
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 bg-white dark:bg-[#0B0F19]"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16 reveal">
          <span className="text-green-500 text-sm font-semibold uppercase tracking-widest">Karir</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mt-2">
            Pengalaman Profesional
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-400 dark:text-gray-600">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Memuat data...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-red-400">
            <AlertCircle size={24} />
            <span className="text-sm">Gagal memuat data pengalaman: {error}</span>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-4 sm:left-8 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-800" />

            <div className="space-y-8">
              {experiences.map((exp, i) => (
                <div key={i} className="reveal relative pl-14 sm:pl-20">
                  <div className="absolute left-2.5 sm:left-6 top-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-[#0B0F19] shadow-md z-10" />

                  <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 rounded-2xl p-6 hover:border-green-300 dark:hover:border-green-500/30 transition-all duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">{exp.role}</h3>
                        <p className="text-green-600 dark:text-green-400 font-semibold text-sm">{exp.company}</p>
                      </div>
                      <div className="flex flex-col sm:items-end gap-1">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-gray-700/60 px-3 py-1 rounded-full">
                          <Calendar size={11} />
                          {exp.period}
                        </span>
                      </div>
                    </div>

                    <ul className="space-y-2">
                      {exp.achievements.map((ach, j) => (
                        <li key={j} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0" />
                          {ach}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function EducationSection({ education, loading, error }: {
  education: EducationItem[];
  loading: boolean;
  error: string | null;
}) {
  const ref = useReveal();

  return (
    <section
      id="pendidikan"
      ref={ref as React.RefObject<HTMLElement>}
      className="py-24 bg-gray-50 dark:bg-[#0d1117]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16 reveal">
          <span className="text-green-500 text-sm font-semibold uppercase tracking-widest">Latar Belakang</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mt-2">
            Pendidikan & Sertifikasi
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-400 dark:text-gray-600">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Memuat data...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-red-400">
            <AlertCircle size={24} />
            <span className="text-sm">Gagal memuat data pendidikan: {error}</span>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5">
            {education.map((edu, i) => {
              const isEducation = edu.jenis.toLowerCase() === 'education';
              const Icon = isEducation ? GraduationCap : Award;
              const period = edu.tahunMulai === edu.tahunAkhir
                ? edu.tahunMulai
                : `${edu.tahunMulai} – ${edu.tahunAkhir}`;

              return (
                <div
                  key={i}
                  className="reveal bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 rounded-2xl p-6 hover:border-green-300 dark:hover:border-green-500/30 transition-all duration-300 group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-50 dark:bg-green-500/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-green-500 transition-colors duration-300">
                      <Icon size={20} className="text-green-500 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-snug">{edu.jurusan}</h3>
                        <span className="text-xs text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-700/60 px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0">
                          {period}
                        </span>
                      </div>
                      <p className="text-green-600 dark:text-green-400 text-xs font-semibold mb-2">{edu.instansi}</p>
                      {edu.deskripsi && (
                        <p className="text-gray-500 dark:text-gray-500 text-xs leading-relaxed">{edu.deskripsi}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function ContactSection() {
  return (
    <section id="kontak" className="py-24 bg-white dark:bg-[#0B0F19]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <span className="text-green-500 text-sm font-semibold uppercase tracking-widest">Hubungi</span>
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mt-2 mb-4">
          Mari Berkolaborasi
        </h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto leading-relaxed mb-12">
          Saya terbuka untuk peluang kerja sama, diskusi profesional, konsultasi operasional gudang, atau sekadar berbagi pengalaman.
          Jangan ragu untuk menghubungi saya melalui salah satu kanal berikut.
        </p>

        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {[
            { icon: Github, label: 'GitHub', handle: '@indrawan', href: 'https://github.com', bg: 'bg-gray-900 hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700', text: 'text-white' },
            { icon: Linkedin, label: 'LinkedIn', handle: 'Indrawan Al-Mutawakkil', href: 'https://linkedin.com', bg: 'bg-blue-600 hover:bg-blue-700', text: 'text-white' },
            { icon: Mail, label: 'Email', handle: 'indrawan@example.com', href: 'mailto:indrawan@example.com', bg: 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700', text: 'text-gray-800 dark:text-gray-200' },
          ].map(social => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-3 px-5 py-3 rounded-xl font-medium text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${social.bg} ${social.text}`}
            >
              <social.icon size={18} />
              <span>
                <span className="block text-xs opacity-70 leading-none mb-0.5">{social.label}</span>
                <span className="block leading-none">{social.handle}</span>
              </span>
            </a>
          ))}
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 rounded-3xl p-8 sm:p-12">
          <div className="w-16 h-16 bg-green-50 dark:bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <MessageCircle size={28} className="text-green-500" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Chat via WhatsApp</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 max-w-sm mx-auto">
            Cara paling cepat untuk memulai diskusi. Pesan sudah disiapkan — tinggal kirim!
          </p>
          <a
            href="https://wa.me/6281234567890?text=Halo%20Indrawan%2C%20saya%20tertarik%20untuk%20berdiskusi%20tentang%20peluang%20kerja%20sama%20dan%20ingin%20mengenal%20lebih%20lanjut%20mengenai%20pengalaman%20Anda."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl transition-all duration-200 shadow-xl shadow-green-500/30 hover:shadow-green-500/50 hover:-translate-y-1 text-sm"
          >
            <MessageCircle size={20} />
            Mulai Percakapan di WhatsApp
            <ArrowRight size={18} />
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-8 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0B0F19]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 bg-green-500 text-white text-xs font-bold rounded-lg flex items-center justify-center">IA</span>
          <span className="text-sm text-gray-500 dark:text-gray-500">Indrawan Al-Mutawakkil</span>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-600">
          {new Date().getFullYear()} — Dirancang & dibangun dengan presisi
        </p>
        <div className="flex items-center gap-3">
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200">
            <Github size={16} />
          </a>
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600 transition-colors duration-200">
            <Linkedin size={16} />
          </a>
          <a href="mailto:indrawan@example.com" className="text-gray-400 hover:text-green-500 transition-colors duration-200">
            <Mail size={16} />
          </a>
        </div>
      </div>
    </footer>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [dark, setDark] = useDarkMode();

  const { data: experiences, loading: expLoading, error: expError } = useFetchCSV<Experience>(
    EXP_URL,
    parseExperienceCSV
  );

  const { data: skills, loading: skillsLoading, error: skillsError } = useFetchCSV<Skill>(
    SKILL_URL,
    parseSkillCSV
  );

  const { data: education, loading: eduLoading, error: eduError } = useFetchCSV<EducationItem>(
    EDU_URL,
    parseEducationCSV
  );

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0F19] text-gray-900 dark:text-white transition-colors duration-300">
      <Navbar dark={dark} toggleDark={() => setDark(d => !d)} />
      <main>
        <HeroSection />
        <BioSection skills={skills} skillsLoading={skillsLoading} skillsError={skillsError} />
        <ExperienceSection experiences={experiences} loading={expLoading} error={expError} />
        <EducationSection education={education} loading={eduLoading} error={eduError} />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
