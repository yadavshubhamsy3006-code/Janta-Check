import React, { useEffect, useState } from 'react';
import { Building2, ExternalLink, Info } from 'lucide-react';
import { PublicNavbar } from '../components/PublicNavbar';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type { InfrastructureProject } from '../types/civic';

export function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<InfrastructureProject[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.getProjects();
        if (mounted) {
          setProjects(res.projects);
          setNote(res.note);
        }
      } catch {
        // Ignore transient failure
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const content = (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#38BDF8] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#14213D]">
              Configurable Open Data &amp; Verified Project Directory
            </p>
            <p className="text-xs text-slate-600">
              {note ||
                'Projects shown here are either administrator-verified records or clearly labelled demonstration placeholders. Official government APIs are never fabricated.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <a
            href="https://pgportal.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-300 text-[#14213D] hover:bg-slate-50"
          >
            <span>CPGRAMS Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href="https://swachhata.mohua.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-300 text-[#14213D] hover:bg-slate-50"
          >
            <span>Swachhata MoHUA</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-5">
          {[1, 2].map((i) => (
            <div key={i} className="h-56 rounded-xl bg-slate-200/70 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Building2 className="w-4 h-4 text-[#14213D]" />
                    <span>{proj.department}</span>
                  </div>
                  {proj.is_demo && (
                    <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                      Demonstration Record
                    </span>
                  )}
                </div>

                <h2 className="font-display text-lg font-bold text-[#14213D]">{proj.name}</h2>
                <p className="text-xs text-slate-500">
                  Locality: <strong className="text-slate-700">{proj.locality}</strong> · Status:{' '}
                  <strong className="text-[#10B981]">{proj.status}</strong>
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">{proj.description}</p>
              </div>

              <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Estimated Cost</span>
                  <span className="font-semibold text-[#14213D]">
                    {proj.estimated_cost || 'Not disclosed'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Timeline</span>
                  <span className="font-mono text-[#14213D]">
                    {proj.start_date || 'TBD'} → {proj.expected_completion_date || 'TBD'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Official Source</span>
                  <span className="font-medium text-slate-700">{proj.official_source}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Last Updated</span>
                  <span className="font-mono text-slate-700">
                    {new Date(proj.last_updated).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (user) {
    return (
      <DashboardLayout
        title="Know Your Development"
        subtitle="Public infrastructure project registry, verified sources, and official grievance links"
      >
        {content}
      </DashboardLayout>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PublicNavbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#14213D]">
            Know Your Development
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Transparent public works tracking powered by verified publications and administrator-curated disclosures.
          </p>
        </div>
        {content}
      </div>
    </div>
  );
}
