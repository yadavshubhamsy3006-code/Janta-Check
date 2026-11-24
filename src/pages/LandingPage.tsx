import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Award,
  Building2,
  Camera,
  CheckCircle2,
  Cpu,
  Droplets,
  Layers,
  Lightbulb,
  MapPin,
  ShieldCheck,
  Trash2,
  Trophy,
  Users,
  Wrench,
} from 'lucide-react';
import { PublicNavbar } from '../components/PublicNavbar';
import { PriorityIndicator, ResilientImage, StatusIndicator } from '../components/CivicBadges';
import { LeafletMapView } from '../components/LeafletMapView';
import { useI18n } from '../context/I18nContext';
import { api, type AnalyticsResponse } from '../lib/api';
import type { CivicReport, IssueCategory, UserProfile } from '../types/civic';

const HERO_IMAGE = '/src/assets/images/hero_smart_city_1795516922199.jpg';

const CATEGORY_ICONS: Record<IssueCategory, React.ReactNode> = {
  pothole: <Wrench className="w-5 h-5 text-red-600" />,
  garbage: <Trash2 className="w-5 h-5 text-amber-600" />,
  streetlight: <Lightbulb className="w-5 h-5 text-sky-600" />,
  water_leakage: <Droplets className="w-5 h-5 text-blue-600" />,
  drainage: <Layers className="w-5 h-5 text-violet-600" />,
  other: <Building2 className="w-5 h-5 text-slate-600" />,
};

function AnimatedStatNumber({ value, loading }: { value: number; loading: boolean }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (loading) return;
    let rafId = 0;
    const start = performance.now();
    const duration = 450;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(value * progress));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value, loading]);

  if (loading) return <>—</>;
  return <>{display}</>;
}

export function LandingPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [reports, setReports] = useState<CivicReport[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [champions, setChampions] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [repRes, anaRes, lbRes] = await Promise.all([
          api.getReports({ limit: 8 }),
          api.getAnalytics(),
          api.getLeaderboard(),
        ]);
        if (mounted) {
          setReports(repRes.reports);
          setAnalytics(anaRes);
          setChampions(lbRes.leaderboard.slice(0, 3));
        }
      } catch {
        // Handled cleanly via empty state
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const steps = [
    {
      num: '01.',
      title: 'Snap & Geotag',
      body: 'Upload or capture a photograph of the infrastructure defect and confirm coordinates on OpenStreetMap.',
      icon: Camera,
    },
    {
      num: '02.',
      title: 'AI Vision & Writing Aid',
      body: 'Server-side Gemini vision identifies issue category and severity, with a multilingual assistant to polish details.',
      icon: Cpu,
    },
    {
      num: '03.',
      title: 'Duplicate & Priority Check',
      body: 'Nearby complaints within 50 metres are surfaced before submission so citizens can reinforce existing reports.',
      icon: MapPin,
    },
    {
      num: '04.',
      title: 'Track & Verify Fix',
      body: 'Compare before-and-after repair evidence and confirm resolution on-site before complaints are closed.',
      icon: CheckCircle2,
    },
  ];

  const categoryKeys: IssueCategory[] = [
    'pothole',
    'garbage',
    'streetlight',
    'water_leakage',
    'drainage',
    'other',
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
        <div className="grid lg:grid-cols-12 gap-10 items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="lg:col-span-6 flex flex-col justify-center space-y-6"
          >
            <p className="text-xs font-semibold tracking-wide text-[#10B981]">
              {t.hero.tagline}
            </p>
            <h1
              className="font-display font-extrabold tracking-tight text-[#14213D] leading-[1.08]"
              style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)', textWrap: 'balance' }}
            >
              {t.hero.heading}
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              {t.hero.subtitle}
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/report"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white bg-[#14213D] hover:bg-[#1e3159] transition-colors whitespace-nowrap"
              >
                <span>{t.hero.primaryCta}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/map"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-[#14213D] bg-white border border-slate-300 hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                <MapPin className="w-4 h-4 text-[#10B981]" />
                <span>{t.hero.secondaryCta}</span>
              </Link>
            </div>
          </motion.div>

          <div className="lg:col-span-6">
            <div className="relative h-full min-h-[320px] rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
              <ResilientImage
                src={HERO_IMAGE}
                alt="Smart city urban avenue with clean roads, solar lighting, and civic infrastructure"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#14213D]/95 via-[#14213D]/55 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 text-white flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-[#38BDF8]">
                    Smart Infrastructure Monitoring
                  </p>
                  <p className="font-display text-lg font-bold">
                    AI Issue Triage · Spatial Duplicate Detection · Open Verification
                  </p>
                </div>
                <Link
                  to="/map"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white/95 text-[#14213D] hover:bg-white transition-colors whitespace-nowrap shrink-0"
                >
                  <span>{t.hero.openMap}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Animated Live Statistics Strip */}
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500">
              {t.landing.totalReports} {analytics?.isDemoDataset ? '(Demo Dataset)' : ''}
            </p>
            <p className="mt-2 font-display text-3xl font-bold text-[#14213D] tabular-nums">
              <AnimatedStatNumber value={analytics?.summary.total ?? 0} loading={loading} />
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500">{t.landing.pendingReview}</p>
            <p className="mt-2 font-display text-3xl font-bold text-amber-600 tabular-nums">
              <AnimatedStatNumber value={analytics?.summary.pending ?? 0} loading={loading} />
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500">{t.landing.inProgress}</p>
            <p className="mt-2 font-display text-3xl font-bold text-sky-600 tabular-nums">
              <AnimatedStatNumber value={analytics?.summary.inProgress ?? 0} loading={loading} />
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500">{t.landing.resolvedVerified}</p>
            <p className="mt-2 font-display text-3xl font-bold text-[#10B981] tabular-nums">
              {loading ? (
                '—'
              ) : (
                <>
                  <AnimatedStatNumber value={analytics?.summary.resolved ?? 0} loading={loading} />{' '}
                  <span className="text-lg font-semibold text-slate-500">
                    ({analytics?.summary.resolutionRate ?? 0}%)
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* 1. How Janta Check Works */}
      <section id="how-it-works" className="border-t border-slate-200 bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#14213D]">
              {t.landing.howItWorksTitle}
            </h2>
            <p className="mt-2 text-slate-600">{t.landing.howItWorksSub}</p>
          </div>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-6 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-[#10B981]">{step.num}</span>
                    <Icon className="w-5 h-5 text-[#14213D]" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-[#14213D]">{step.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{step.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2. Civic Issue Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#14213D]">
              {t.landing.categoriesTitle}
            </h2>
            <p className="mt-2 text-slate-600">{t.landing.categoriesSub}</p>
          </div>
          <Link
            to="/explore"
            className="text-sm font-semibold text-[#14213D] hover:text-[#10B981] inline-flex items-center gap-1 whitespace-nowrap"
          >
            <span>{t.landing.browseAll}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryKeys.map((cat) => (
            <Link
              key={cat}
              to={`/explore?category=${cat}`}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 flex items-center gap-4 transition-colors"
            >
              <div className="w-11 h-11 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                {CATEGORY_ICONS[cat]}
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-bold text-[#14213D] truncate">
                  {t.categories[cat]}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{t.landing.browseAll}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Interactive Live Map Preview */}
      <section className="border-t border-slate-200 bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#14213D]">
                {t.landing.liveMapPreviewTitle}
              </h2>
              <p className="mt-2 text-slate-600">{t.landing.liveMapPreviewSub}</p>
            </div>
            <Link
              to="/map"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#14213D] hover:bg-[#1e3159] whitespace-nowrap"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{t.hero.openMap}</span>
            </Link>
          </div>

          <LeafletMapView
            reports={reports}
            center={[12.965, 77.605]}
            zoom={12}
            heightClass="h-[360px]"
            clusterNearby
            onMarkerNavigate={(id) => navigate(`/report/${id}`)}
          />
        </div>
      </section>

      {/* 4. Latest Reported Issues */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#14213D]">
              {t.landing.latestTitle}
            </h2>
            <p className="mt-2 text-slate-600">
              {analytics?.isDemoDataset
                ? 'Displaying clearly labelled demonstration records for platform evaluation.'
                : 'Recent verified submissions ordered by decision-support priority.'}
            </p>
          </div>
          <Link
            to="/analytics"
            className="text-sm font-semibold text-[#14213D] hover:text-[#10B981] inline-flex items-center gap-1 whitespace-nowrap"
          >
            <span>View Public Analytics</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {reports.slice(0, 4).map((report) => (
            <Link
              key={report.id}
              to={`/report/${report.id}`}
              className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors flex flex-col"
            >
              <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                <ResilientImage
                  src={report.image_url}
                  alt={report.title}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                />
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <p className="text-xs text-slate-500 truncate">
                    {t.categories[report.category]} · {report.locality}
                  </p>
                  <h3 className="font-display font-bold text-sm text-[#14213D] line-clamp-2">
                    {report.title}
                  </h3>
                </div>
                <div className="pt-2 border-t border-slate-200 space-y-1.5">
                  <StatusIndicator status={report.status} />
                  <div className="flex items-center justify-between">
                    <PriorityIndicator
                      label={report.priority_label}
                      score={report.priority_score}
                    />
                    <span className="text-xs text-slate-500 tabular-nums">
                      {report.upvote_count} votes
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. Community Impact & Civic Champions + AI & Know Your Development */}
      <section className="border-t border-slate-200 bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-6 space-y-3">
              <Cpu className="w-6 h-6 text-[#14213D]" />
              <h3 className="font-display text-lg font-bold text-[#14213D]">
                Responsible AI Assistance
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Server-side Gemini vision analyzes uploaded photographs to suggest category, severity,
                and a plain-language summary, while the multilingual Complaint Assistant helps polish
                descriptions without inventing details.
              </p>
            </div>
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-6 space-y-3">
              <Users className="w-6 h-6 text-[#10B981]" />
              <h3 className="font-display text-lg font-bold text-[#14213D]">
                Community Verification &amp; Points
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Citizens upvote urgent hazards, reinforce nearby duplicate reports, and confirm
                before-and-after repairs before complaints close—earning transparent Civic Points.
              </p>
            </div>
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-6 space-y-3">
              <ShieldCheck className="w-6 h-6 text-[#38BDF8]" />
              <h3 className="font-display text-lg font-bold text-[#14213D]">
                Know Your Development
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Inspect public infrastructure projects with verified source attribution, expected
                timelines, and direct links to official portals such as CPGRAMS and Swachhata.
              </p>
              <Link
                to="/projects"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#14213D] hover:text-[#10B981]"
              >
                <span>Explore Public Projects</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {champions.length > 0 && (
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-xl font-bold text-[#14213D] flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    <span>{t.landing.civicChampionsTitle}</span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">{t.landing.civicChampionsSub}</p>
                </div>
                <Link
                  to="/login"
                  className="text-xs font-semibold text-[#14213D] hover:text-[#10B981]"
                >
                  Join Civic Leaderboard →
                </Link>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                {champions.map((champ, idx) => (
                  <div
                    key={champ.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-slate-500">#{idx + 1} · {champ.locality}</p>
                      <p className="font-display font-bold text-sm text-[#14213D] truncate">
                        {champ.full_name}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        <Award className="w-3 h-3 inline mr-1 text-[#10B981]" />
                        {champ.badges.length} badges earned
                      </p>
                    </div>
                    <span className="font-mono text-sm font-bold text-[#10B981] tabular-nums shrink-0">
                      {champ.civic_points} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 6. SDG 9 & SDG 11 Commitment */}
      <section id="about-us" className="bg-[#14213D] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-3">
              <p className="text-xs font-semibold text-[#38BDF8]">UN Sustainable Development Goals</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold">
                Aligned with SDG 9 &amp; SDG 11
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Designed for academic civic innovation and real-world municipal readiness, Janta Check
                bridges residents, field engineers, and public administrators through open spatial
                accountability.
              </p>
            </div>
            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-5">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-2">
                <p className="font-mono text-xs font-semibold text-[#38BDF8]">SDG 09</p>
                <h3 className="font-display text-lg font-bold">
                  Industry, Innovation &amp; Infrastructure
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Applies multimodal AI triage, geospatial deduplication, and priority decision
                  support to keep resilient local infrastructure maintained.
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-2">
                <p className="font-mono text-xs font-semibold text-[#10B981]">SDG 11</p>
                <h3 className="font-display text-lg font-bold">
                  Sustainable Cities &amp; Communities
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Empowers participatory urban governance where every neighborhood issue is mapped,
                  tracked, and verified by citizens before closure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="font-display font-bold text-[#14213D]">Janta Check</p>
            <p className="text-xs text-slate-500 mt-1">
              AI-Powered Civic Engagement &amp; Smart Infrastructure Monitoring · Your Voice. Your City. Your Change.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-slate-600">
            <Link to="/explore" className="hover:text-[#14213D]">
              {t.nav.explore}
            </Link>
            <Link to="/map" className="hover:text-[#14213D]">
              {t.nav.liveMap}
            </Link>
            <Link to="/analytics" className="hover:text-[#14213D]">
              {t.nav.analytics}
            </Link>
            <Link to="/projects" className="hover:text-[#14213D]">
              Know Your Development
            </Link>
            <Link to="/login" className="hover:text-[#14213D]">
              {t.nav.login}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
