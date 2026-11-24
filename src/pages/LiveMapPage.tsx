import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Crosshair,
  Flame,
  Layers,
  List,
  Map as MapIcon,
  RotateCcw,
  Search,
  ThumbsUp,
} from 'lucide-react';
import { PublicNavbar } from '../components/PublicNavbar';
import { DashboardLayout } from '../components/DashboardLayout';
import { LeafletMapView } from '../components/LeafletMapView';
import {
  EscalationIndicator,
  PriorityIndicator,
  ResilientImage,
  StatusIndicator,
} from '../components/CivicBadges';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { api } from '../lib/api';
import { ALL_REPORT_STATUSES, CATEGORY_COLORS } from '../lib/civicLogic';
import type { CivicReport, IssueCategory } from '../types/civic';

export function LiveMapPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [reports, setReports] = useState<CivicReport[]>([]);
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [localitySearch, setLocalitySearch] = useState('');

  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [clusterNearby, setClusterNearby] = useState(true);
  const [center, setCenter] = useState<[number, number]>([12.965, 77.605]);
  const [zoom, setZoom] = useState(12);
  const [geoError, setGeoError] = useState('');

  const [nearbyActive, setNearbyActive] = useState(false);
  const [nearbyReports, setNearbyReports] = useState<CivicReport[]>([]);
  const [nearbyDistances, setNearbyDistances] = useState<Record<string, number>>({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.getReports({
          category,
          status,
          priority,
          locality: localitySearch || undefined,
          limit: 100,
        });
        if (mounted) setReports(res.reports);
      } catch {
        // Ignore transient filter error
      }
    })();
    return () => {
      mounted = false;
    };
  }, [category, status, priority, localitySearch]);

  const handleClearFilters = () => {
    setCategory('all');
    setStatus('all');
    setPriority('all');
    setLocalitySearch('');
  };

  const handleLocateMe = () => {
    setGeoError('');
    if (!navigator.geolocation) {
      setGeoError('Browser geolocation is unavailable.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCenter([lat, lng]);
        setZoom(14);
        try {
          const nearRes = await api.getReports({ lat, lng, radiusMeters: 5000 });
          setNearbyReports(nearRes.reports);
          setNearbyDistances(nearRes.distances || {});
          setNearbyActive(true);
        } catch {
          // Ignore nearby lookup error
        }
      },
      () => {
        setGeoError('Location permission denied. Adjust map zoom or search by locality.');
      }
    );
  };

  const handleDisableNearby = () => {
    setNearbyActive(false);
    setNearbyReports([]);
    setNearbyDistances({});
  };

  const handleQuickUpvote = async (reportId: string) => {
    if (!user) {
      setGeoError('Sign in to upvote nearby unresolved reports.');
      return;
    }
    try {
      const res = await api.toggleVote(reportId);
      setNearbyReports((prev) => prev.map((r) => (r.id === reportId ? res.report : r)));
      setReports((prev) => prev.map((r) => (r.id === reportId ? res.report : r)));
    } catch (err: unknown) {
      setGeoError(err instanceof Error ? err.message : 'Unable to vote.');
    }
  };

  const hasActiveFilters =
    category !== 'all' || status !== 'all' || priority !== 'all' || localitySearch.trim() !== '';

  const mapWorkspace = (
    <div className="space-y-4">
      {/* Controls Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={localitySearch}
            onChange={(e) => setLocalitySearch(e.target.value)}
            placeholder="Filter by locality..."
            aria-label="Filter map by locality"
            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
          />
        </div>

        <select
          aria-label="Filter map category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
        >
          <option value="all">All Categories</option>
          {(Object.keys(t.categories) as IssueCategory[]).map((cat) => (
            <option key={cat} value={cat}>
              {t.categories[cat]}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter map status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
        >
          <option value="all">All Statuses</option>
          {ALL_REPORT_STATUSES.map((st) => (
            <option key={st} value={st}>
              {t.statuses[st] || st}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter map priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
        >
          <option value="all">All Priorities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 inline-flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.map.clearFilters}</span>
          </button>
        )}

        <div className="inline-flex rounded-lg border border-slate-300 bg-slate-50 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`px-2.5 py-1 rounded-md font-semibold inline-flex items-center gap-1 ${
              viewMode === 'map' ? 'bg-[#14213D] text-white' : 'text-slate-700'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>{t.map.mapView}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-2.5 py-1 rounded-md font-semibold inline-flex items-center gap-1 ${
              viewMode === 'list' ? 'bg-[#14213D] text-white' : 'text-slate-700'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>{t.map.listView}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setClusterNearby((v) => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border inline-flex items-center gap-1.5 ${
            clusterNearby
              ? 'bg-[#14213D] text-white border-[#14213D]'
              : 'bg-white text-slate-700 border-slate-300'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Clustering</span>
        </button>

        <button
          type="button"
          onClick={() => setShowHeatmap((v) => !v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border inline-flex items-center gap-1.5 ${
            showHeatmap
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-white text-slate-700 border-slate-300'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Heatmap</span>
        </button>

        <button
          type="button"
          onClick={nearbyActive ? handleDisableNearby : handleLocateMe}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-900 hover:bg-emerald-100 inline-flex items-center gap-1.5"
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>{nearbyActive ? t.map.disableNearby : t.map.enableNearby}</span>
        </button>
      </div>

      {geoError && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {geoError}
        </p>
      )}

      {/* Nearby Unresolved Issues Panel (Permission-Based) */}
      {nearbyActive && (
        <div className="bg-white border border-emerald-200 rounded-xl p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-sm font-bold text-[#14213D]">
                {t.map.nearbyTitle} (within 5 km)
              </h2>
              <p className="text-xs text-slate-500">
                Location is checked once on demand and never tracked continuously.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDisableNearby}
              className="text-xs font-medium text-slate-600 hover:text-red-600"
            >
              {t.map.disableNearby}
            </button>
          </div>

          {nearbyReports.length === 0 ? (
            <p className="text-xs text-slate-500">No unresolved complaints found within 5 km.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {nearbyReports.slice(0, 6).map((nr) => {
                const dist = nearbyDistances[nr.id];
                return (
                  <div
                    key={nr.id}
                    className="border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between space-y-2"
                  >
                    <div className="space-y-1">
                      <p className="text-[11px] font-mono text-slate-500">
                        {nr.id} ·{' '}
                        {dist !== undefined
                          ? dist < 1000
                            ? `${Math.round(dist)}m away`
                            : `${(dist / 1000).toFixed(1)}km away`
                          : nr.locality}
                      </p>
                      <Link
                        to={`/report/${nr.id}`}
                        className="text-xs font-bold text-[#14213D] hover:text-[#10B981] line-clamp-2 block"
                      >
                        {nr.title}
                      </Link>
                      <StatusIndicator status={nr.status} />
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <PriorityIndicator label={nr.priority_label} score={nr.priority_score} />
                      <button
                        type="button"
                        onClick={() => handleQuickUpvote(nr.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span className="tabular-nums">{nr.upvote_count}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {viewMode === 'map' ? (
        <LeafletMapView
          reports={reports}
          center={center}
          zoom={zoom}
          heightClass="h-[68vh] min-h-[480px]"
          showHeatmap={showHeatmap}
          clusterNearby={clusterNearby}
          onMarkerNavigate={(id) => navigate(`/report/${id}`)}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.length === 0 ? (
            <div className="col-span-full bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
              <p className="text-sm font-semibold text-[#14213D]">
                No reports match the selected filters.
              </p>
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#14213D] text-white"
              >
                {t.map.clearFilters}
              </button>
            </div>
          ) : (
            reports.map((report) => (
              <Link
                key={report.id}
                to={`/report/${report.id}`}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 flex flex-col"
              >
                <div className="aspect-[4/3] bg-slate-100">
                  <ResilientImage
                    src={report.image_url}
                    alt={report.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between space-y-2.5">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">
                      <span className="font-mono">{report.id}</span> · {t.categories[report.category]}{' '}
                      · {report.locality}
                    </p>
                    <h3 className="font-display font-bold text-sm text-[#14213D] line-clamp-2">
                      {report.title}
                    </h3>
                  </div>
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <StatusIndicator status={report.status} />
                      <EscalationIndicator escalation={report.escalation} />
                    </div>
                    <PriorityIndicator label={report.priority_label} score={report.priority_score} />
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Map Legend + Privacy Notice */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          {(Object.keys(t.categories) as IssueCategory[]).map((cat) => (
            <span key={cat} className="inline-flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{ backgroundColor: CATEGORY_COLORS[cat] }}
              />
              <span>{t.categories[cat]}</span>
            </span>
          ))}
        </div>
        <span>
          Showing <strong className="tabular-nums">{reports.length}</strong> public locations · No personal contact details exposed.
        </span>
      </div>
    </div>
  );

  if (user) {
    return (
      <DashboardLayout
        title="Interactive Live Civic Map"
        subtitle="OpenStreetMap spatial view, list toggle, nearby issue awareness, and hotspot heatmap"
      >
        {mapWorkspace}
      </DashboardLayout>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PublicNavbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#14213D]">
            Interactive Live Civic Map
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Explore publicly reported infrastructure issues, hotspot density, and resolution status.
          </p>
        </div>
        {mapWorkspace}
      </div>
    </div>
  );
}
