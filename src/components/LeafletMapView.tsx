import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { CivicReport } from '../types/civic';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../lib/civicLogic';

interface LeafletMapViewProps {
  reports: CivicReport[];
  center?: [number, number];
  zoom?: number;
  heightClass?: string;
  showHeatmap?: boolean;
  clusterNearby?: boolean;
  selectableLocation?: { lat: number; lng: number } | null;
  onSelectLocation?: (lat: number, lng: number) => void;
  onMarkerNavigate?: (reportId: string) => void;
}

export function LeafletMapView({
  reports,
  center = [12.965, 77.605],
  zoom = 12,
  heightClass = 'h-[540px]',
  showHeatmap = false,
  clusterNearby = true,
  selectableLocation = null,
  onSelectLocation,
  onMarkerNavigate,
}: LeafletMapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<L.LayerGroup | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    layerGroupRef.current = L.layerGroup().addTo(map);
    heatLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    if (onSelectLocation) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onSelectLocation(
          Math.round(e.latlng.lat * 1000000) / 1000000,
          Math.round(e.latlng.lng * 1000000) / 1000000
        );
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
      heatLayerRef.current = null;
      pickerMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-center when explicit center changes (e.g. "My Location" button)
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, zoom, { animate: true });
    }
  }, [center, zoom]);

  // Render markers and optional clusters + heatmap circles
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = layerGroupRef.current;
    const heatLayer = heatLayerRef.current;
    if (!map || !markersLayer || !heatLayer) return;

    markersLayer.clearLayers();
    heatLayer.clearLayers();

    // Heatmap density layer for unresolved issues
    if (showHeatmap) {
      reports
        .filter((r) => r.status !== 'Closed')
        .forEach((r) => {
          const radius = 220 + r.priority_score * 3.5;
          L.circle([r.latitude, r.longitude], {
            radius,
            stroke: false,
            fillColor: r.priority_score >= 70 ? '#DC2626' : '#F59E0B',
            fillOpacity: 0.28,
          }).addTo(heatLayer);
        });
    }

    // Simple spatial grid clustering when enabled and >1 reports share a tight grid cell
    const gridBuckets = new Map<string, CivicReport[]>();
    for (const r of reports) {
      const key = clusterNearby
        ? `${r.latitude.toFixed(3)}:${r.longitude.toFixed(3)}`
        : r.id;
      const bucket = gridBuckets.get(key) || [];
      bucket.push(r);
      gridBuckets.set(key, bucket);
    }

    gridBuckets.forEach((bucket) => {
      if (bucket.length > 1 && clusterNearby) {
        const avgLat = bucket.reduce((acc, r) => acc + r.latitude, 0) / bucket.length;
        const avgLng = bucket.reduce((acc, r) => acc + r.longitude, 0) / bucket.length;
        const clusterIcon = L.divIcon({
          className: 'jc-cluster-icon',
          html: `<div style="width:36px;height:36px;border-radius:9999px;background:#14213D;color:#fff;border:3px solid #38BDF8;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;box-shadow:0 4px 10px rgba(0,0,0,0.25);">${bucket.length}</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });
        const m = L.marker([avgLat, avgLng], { icon: clusterIcon }).addTo(markersLayer);
        const listHtml = bucket
          .slice(0, 5)
          .map(
            (item) =>
              `<div style="margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid #e2e8f0;">
                <strong style="font-size:12px;color:#14213D;">${escapeHtml(item.title)}</strong><br/>
                <span style="font-size:11px;color:#64748b;">${escapeHtml(item.status)} · Priority ${item.priority_score}/100</span>
              </div>`
          )
          .join('');
        m.bindPopup(
          `<div style="min-width:220px;"><div style="font-weight:700;font-size:13px;margin-bottom:8px;color:#14213D;">${bucket.length} Nearby Civic Reports</div>${listHtml}</div>`
        );
        return;
      }

      const r = bucket[0];
      const catColor = CATEGORY_COLORS[r.category] || '#14213D';
      const isClosed = r.status === 'Closed';
      const isAwaiting = r.status === 'Resolved - Awaiting Verification';
      const borderColor = isClosed ? '#10B981' : isAwaiting ? '#38BDF8' : '#FFFFFF';

      const markerIcon = L.divIcon({
        className: 'jc-pin-icon',
        html: `<div style="width:26px;height:26px;border-radius:9999px;background:${catColor};border:3px solid ${borderColor};box-shadow:0 3px 8px rgba(15,23,42,0.35);display:flex;align-items:center;justify-content:center;">
          <span style="width:7px;height:7px;border-radius:9999px;background:#fff;opacity:${isClosed ? '0.65' : '1'};"></span>
        </div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([r.latitude, r.longitude], { icon: markerIcon }).addTo(markersLayer);

      const popupEl = document.createElement('div');
      popupEl.style.width = '240px';
      popupEl.innerHTML = `
        <img src="${escapeHtml(r.image_url)}" alt="${escapeHtml(r.title)}" style="width:100%;height:110px;object-fit:cover;border-radius:8px;margin-bottom:8px;" />
        <div style="font-size:11px;color:#64748b;margin-bottom:2px;">${escapeHtml(
          CATEGORY_LABELS[r.category]
        )} · ${escapeHtml(r.locality)}</div>
        <div style="font-weight:700;font-size:13px;color:#14213D;margin-bottom:6px;line-height:1.3;">${escapeHtml(
          r.title
        )}</div>
        <div style="font-size:11px;color:#334155;margin-bottom:4px;"><strong>Status:</strong> ${escapeHtml(
          r.status
        )}</div>
        <div style="font-size:11px;color:#334155;margin-bottom:8px;"><strong>Priority:</strong> ${escapeHtml(
          r.priority_label
        )} (${r.priority_score}/100) · <strong>Upvotes:</strong> ${r.upvote_count}</div>
        <div style="font-size:10px;color:#64748b;margin-bottom:8px;">Reported ${new Date(
          r.created_at
        ).toLocaleDateString()}</div>
      `;

      if (onMarkerNavigate) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = 'View Full Report';
        btn.style.cssText =
          'width:100%;padding:7px 10px;border-radius:6px;background:#14213D;color:#fff;font-size:12px;font-weight:600;border:none;cursor:pointer;';
        btn.onclick = () => onMarkerNavigate(r.id);
        popupEl.appendChild(btn);
      }

      marker.bindPopup(popupEl);
    });
  }, [reports, showHeatmap, clusterNearby, onMarkerNavigate]);

  // Selectable draggable pin for Reporting Form
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (pickerMarkerRef.current) {
      pickerMarkerRef.current.remove();
      pickerMarkerRef.current = null;
    }

    if (selectableLocation) {
      const pinIcon = L.divIcon({
        className: 'jc-picker-pin',
        html: `<div style="width:32px;height:32px;border-radius:9999px;background:#10B981;border:4px solid #14213D;box-shadow:0 4px 12px rgba(0,0,0,0.35);"></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const picker = L.marker([selectableLocation.lat, selectableLocation.lng], {
        draggable: Boolean(onSelectLocation),
        icon: pinIcon,
      }).addTo(map);

      if (onSelectLocation) {
        picker.on('dragend', () => {
          const pos = picker.getLatLng();
          onSelectLocation(
            Math.round(pos.lat * 1000000) / 1000000,
            Math.round(pos.lng * 1000000) / 1000000
          );
        });
      }
      pickerMarkerRef.current = picker;
    }
  }, [selectableLocation, onSelectLocation]);

  return (
    <div
      ref={containerRef}
      data-testid="leaflet-map"
      className={`w-full ${heightClass} rounded-xl border border-slate-200 overflow-hidden bg-slate-100`}
    />
  );
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
