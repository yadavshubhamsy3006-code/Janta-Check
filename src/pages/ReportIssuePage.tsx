import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Cpu,
  Crosshair,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  ThumbsUp,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  WifiOff,
  X,
} from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { ResilientImage, StatusIndicator } from '../components/CivicBadges';
import { LeafletMapView } from '../components/LeafletMapView';
import { useI18n } from '../context/I18nContext';
import { api } from '../lib/api';
import {
  clearOfflineDraft,
  loadOfflineDraft,
  saveOfflineDraft,
} from '../lib/offlineDrafts';
import type {
  AIAnalysisResult,
  CivicReport,
  ComplaintAssistantSuggestion,
  DuplicateMatch,
  IssueCategory,
  IssueSeverity,
} from '../types/civic';

const SAMPLE_TEST_PHOTOS: Array<{ label: string; path: string }> = [
  { label: 'Sample Pothole', path: '/src/assets/images/issue_pothole_sample_1795516922335.jpg' },
  { label: 'Sample Garbage', path: '/src/assets/images/issue_garbage_sample_1795516923005.jpg' },
  { label: 'Sample Streetlight', path: '/src/assets/images/issue_streetlight_sample_1795516922319.jpg' },
  { label: 'Sample Water Leak', path: '/src/assets/images/issue_water_leak_sample_1795516923271.jpg' },
];

export function ReportIssuePage() {
  const { language, t } = useI18n();

  const [step, setStep] = useState<number>(1);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [draftRecovered, setDraftRecovered] = useState(false);

  const [imageUrl, setImageUrl] = useState('');
  const [offlineDataUrl, setOfflineDataUrl] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [analyzingAI, setAnalyzingAI] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [aiError, setAiError] = useState('');
  const [autoFilledByAI, setAutoFilledByAI] = useState(false);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IssueCategory>('pothole');
  const [severity, setSeverity] = useState<IssueSeverity>('medium');
  const [latitude, setLatitude] = useState<number>(12.9784);
  const [longitude, setLongitude] = useState<number>(77.6408);
  const [locality, setLocality] = useState('Indiranagar Demo Sector');
  const [reportedAt, setReportedAt] = useState(() => new Date().toISOString().slice(0, 16));

  const [assisting, setAssisting] = useState(false);
  const [assistantSuggestion, setAssistantSuggestion] = useState<ComplaintAssistantSuggestion | null>(null);
  const [assistantError, setAssistantError] = useState('');

  const [speaking, setSpeaking] = useState(false);
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const [locationSearch, setLocationSearch] = useState('');
  const [searchResults, setSearchResults] = useState<
    Array<{ lat: number; lng: number; display_name: string }>
  >([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.9784, 77.6408]);

  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [duplicateRadius, setDuplicateRadius] = useState(50);
  const [duplicateChecked, setDuplicateChecked] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitFailedOffline, setSubmitFailedOffline] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<CivicReport | null>(null);
  const [error, setError] = useState('');

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const stopSpeech = useCallback(() => {
    if (speechSupported) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, [speechSupported]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      stopCameraStream();
      stopSpeech();
    };
  }, [stopCameraStream, stopSpeech]);

  // Recover offline draft on mount if user had unsent data
  useEffect(() => {
    let mounted = true;
    (async () => {
      const draft = await loadOfflineDraft();
      if (mounted && draft && (draft.title || draft.description || draft.imageUrl || draft.imageDataUrl)) {
        setStep(draft.step || 1);
        setTitle(draft.title || '');
        setDescription(draft.description || '');
        setCategory(draft.category || 'pothole');
        setSeverity(draft.severity || 'medium');
        setLatitude(draft.latitude || 12.9784);
        setLongitude(draft.longitude || 77.6408);
        setLocality(draft.locality || 'Indiranagar Demo Sector');
        if (draft.reportedAt) setReportedAt(draft.reportedAt);
        if (draft.imageUrl) setImageUrl(draft.imageUrl);
        if (draft.imageDataUrl) setOfflineDataUrl(draft.imageDataUrl);
        if (draft.aiResult) setAiResult(draft.aiResult);
        setSubmitFailedOffline(Boolean(draft.pendingOfflineSubmit));
        setDraftRecovered(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Auto-save draft to IndexedDB whenever form changes
  useEffect(() => {
    if (submittedReport) return;
    if (!title && !description && !imageUrl && !offlineDataUrl) return;
    const timer = window.setTimeout(() => {
      saveOfflineDraft({
        step,
        title,
        description,
        category,
        severity,
        latitude,
        longitude,
        locality,
        reportedAt,
        imageUrl,
        imageDataUrl: offlineDataUrl || undefined,
        aiResult,
        pendingOfflineSubmit: submitFailedOffline,
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [
    step,
    title,
    description,
    category,
    severity,
    latitude,
    longitude,
    locality,
    reportedAt,
    imageUrl,
    offlineDataUrl,
    aiResult,
    submitFailedOffline,
    submittedReport,
  ]);

  const applyAIResult = (analysis: AIAnalysisResult) => {
    setAiResult(analysis);
    if (!analysis.unclear) {
      setCategory(analysis.category);
      setSeverity(analysis.severity);
      setTitle((prev) => {
        if (!prev.trim() || autoFilledByAI) {
          return analysis.suggested_title || `${t.categories[analysis.category]} Reported`;
        }
        return prev;
      });
      setDescription((prev) => {
        if (!prev.trim() || autoFilledByAI) {
          return analysis.description;
        }
        return prev;
      });
      setAutoFilledByAI(true);
    }
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });

  const processSelectedFile = async (file: File) => {
    setError('');
    setAiError('');
    setAiResult(null);

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type.toLowerCase())) {
      setError('Unsupported file format. Please upload a JPG, JPEG, PNG, or WEBP photograph.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image exceeds 5 MB limit. Please compress or choose a smaller photograph.');
      return;
    }

    const previewDataUrl = await readFileAsDataUrl(file);
    setOfflineDataUrl(previewDataUrl);
    setPendingFile(file);

    if (!navigator.onLine) {
      setUploadProgress(100);
      setAiError(t.report.offlineNotice);
      return;
    }

    try {
      setUploadProgress(35);
      const uploaded = await api.uploadImage(file);
      setUploadProgress(100);
      setImageUrl(uploaded.imageUrl);
      setPendingFile(null);

      setStep(2);
      setAnalyzingAI(true);
      try {
        const aiRes = await api.analyzeImage(file);
        applyAIResult(aiRes.analysis);
      } catch (aiErr: unknown) {
        setAiError(
          aiErr instanceof Error
            ? aiErr.message
            : 'AI classification unavailable. Please choose the category manually.'
        );
      } finally {
        setAnalyzingAI(false);
      }
    } catch (upErr: unknown) {
      setUploadProgress(0);
      setError(upErr instanceof Error ? upErr.message : 'Image upload failed.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processSelectedFile(file);
  };

  const handleRemovePhoto = () => {
    setImageUrl('');
    setOfflineDataUrl('');
    setPendingFile(null);
    setAiResult(null);
    setAiError('');
    setUploadProgress(0);
  };

  const handleOpenLiveCamera = async () => {
    setCameraError('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      mobileCameraInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setCameraError('Live webcam preview unavailable here — opening native camera/photo picker.');
      mobileCameraInputRef.current?.click();
    }
  };

  const handleCaptureCameraFrame = async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    stopCameraStream();
    setCameraOpen(false);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9)
    );
    if (!blob) return;
    const capturedFile = new File([blob], `civic-capture-${Date.now()}.jpg`, {
      type: 'image/jpeg',
    });
    await processSelectedFile(capturedFile);
  };

  const handleUseSamplePhoto = async (samplePath: string) => {
    setError('');
    setAiError('');
    setAiResult(null);
    setOfflineDataUrl('');
    setPendingFile(null);
    setUploadProgress(100);
    setImageUrl(samplePath);
    setStep(2);

    if (!navigator.onLine) {
      setAiError(t.report.offlineNotice);
      return;
    }

    setAnalyzingAI(true);
    try {
      const aiRes = await api.analyzeImage(samplePath);
      applyAIResult(aiRes.analysis);
    } catch (aiErr: unknown) {
      setAiError(
        aiErr instanceof Error
          ? aiErr.message
          : 'AI classification unavailable. Please select the category manually.'
      );
    } finally {
      setAnalyzingAI(false);
    }
  };

  const handleSelectCoordinates = useCallback(async (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    if (!navigator.onLine) return;
    try {
      const geo = await api.reverseGeocode(lat, lng);
      if (geo.locality) setLocality(geo.locality);
    } catch {
      // Keep editable locality
    }
  }, []);

  const handleBrowserGeolocation = () => {
    if (!navigator.geolocation) {
      setError('Browser geolocation is not supported on this device.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Math.round(pos.coords.latitude * 1000000) / 1000000;
        const lng = Math.round(pos.coords.longitude * 1000000) / 1000000;
        setMapCenter([lat, lng]);
        handleSelectCoordinates(lat, lng);
      },
      () => {
        setError('Unable to retrieve device location. Please click the map to pin manually.');
      }
    );
  };

  const handleLocationSearch = async () => {
    if (locationSearch.trim().length < 2) return;
    setError('');
    try {
      const res = await api.searchLocation(locationSearch.trim());
      setSearchResults(res.results);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Location search failed.');
    }
  };

  const handleComplaintAssistant = async () => {
    setAssistantError('');
    setAssistantSuggestion(null);
    if (!navigator.onLine) {
      setAssistantError('Smart Complaint Assistant requires an internet connection.');
      return;
    }
    setAssisting(true);
    try {
      const res = await api.assistComplaint({
        title,
        description,
        category,
        locality,
        language,
      });
      setAssistantSuggestion(res.suggestion);
    } catch (err: unknown) {
      setAssistantError(
        err instanceof Error ? err.message : 'Complaint Assistant unavailable right now.'
      );
    } finally {
      setAssisting(false);
    }
  };

  const handleVoiceInstructions = () => {
    if (!speechSupported) return;
    if (speaking) {
      stopSpeech();
      return;
    }
    const stepPrompts: Record<number, string> = {
      1: 'Step 1: Click a photo with your camera or upload a clear photo of the civic problem.',
      2: 'Step 2: Review the AI problem detection category and severity, or adjust them manually.',
      3: 'Step 3: Confirm the issue location on the map or use Detect My Location.',
      4: 'Step 4: Write or polish the title and description. You can use Smart Complaint Assistant for help.',
      5: 'Step 5: Check nearby duplicate reports so you can support an existing complaint or continue.',
      6: 'Step 6: Review your final summary and click Submit Civic Report.',
    };
    const utter = new SpeechSynthesisUtterance(stepPrompts[step] || stepPrompts[1]);
    utter.lang = language === 'hi' ? 'hi-IN' : language === 'kn' ? 'kn-IN' : 'en-IN';
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  };

  const runDuplicateCheck = async () => {
    setError('');
    if (!navigator.onLine) {
      setDuplicates([]);
      setDuplicateChecked(true);
      setStep(5);
      return;
    }
    setCheckingDuplicates(true);
    try {
      const dupRes = await api.checkDuplicates({
        latitude,
        longitude,
        category,
        title,
        description,
      });
      setDuplicates(dupRes.duplicates);
      setDuplicateRadius(dupRes.radiusMeters);
      setDuplicateChecked(true);
      setStep(5);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to check nearby duplicates.');
    } finally {
      setCheckingDuplicates(false);
    }
  };

  const submitFinalReport = async (relatedDuplicateId?: string) => {
    setError('');
    if (!navigator.onLine) {
      setSubmitFailedOffline(true);
      setError(t.report.offlineNotice);
      return;
    }

    setSubmitting(true);
    setSubmitFailedOffline(false);
    try {
      let finalImageUrl = imageUrl;
      if (!finalImageUrl && pendingFile) {
        const uploaded = await api.uploadImage(pendingFile);
        finalImageUrl = uploaded.imageUrl;
        setImageUrl(finalImageUrl);
        setPendingFile(null);
      }

      if (!finalImageUrl) {
        setError('Please upload or capture an evidence photograph before submitting.');
        setSubmitting(false);
        return;
      }

      const res = await api.createReport({
        title,
        description,
        category,
        severity,
        latitude,
        longitude,
        locality,
        image_url: finalImageUrl,
        ai_category: aiResult?.category,
        ai_severity: aiResult?.severity,
        ai_confidence: aiResult?.confidence,
        ai_description: aiResult?.description,
        ai_reason: aiResult?.reason,
        related_duplicate_id: relatedDuplicateId,
      });
      await clearOfflineDraft();
      setSubmittedReport(res.report);
    } catch (err: unknown) {
      setSubmitFailedOffline(true);
      setError(
        err instanceof Error
          ? err.message
          : 'Submission failed. Your draft remains safely saved locally — retry when ready.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSupportExisting = async (match: DuplicateMatch) => {
    setSubmitting(true);
    setError('');
    try {
      const res = await api.supportDuplicate(match.report.id, {
        distance_meters: match.distance_meters,
        similarity_score: match.similarity_score,
      });
      await clearOfflineDraft();
      setSubmittedReport(res.report);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to support existing report.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDiscardDraft = async () => {
    await clearOfflineDraft();
    setDraftRecovered(false);
    setSubmitFailedOffline(false);
    setTitle('');
    setDescription('');
    setImageUrl('');
    setOfflineDataUrl('');
    setPendingFile(null);
    setAiResult(null);
    setStep(1);
  };

  const stepLabels = [
    t.report.step1,
    t.report.step2,
    t.report.step3,
    t.report.step4,
    t.report.step5,
    t.report.step6,
  ];

  const activePhotoSrc = imageUrl || offlineDataUrl;

  if (submittedReport) {
    return (
      <DashboardLayout title={t.report.successTitle} subtitle={submittedReport.locality}>
        <div
          data-testid="report-success-card"
          className="max-w-2xl mx-auto bg-white border border-emerald-200 rounded-2xl p-8 space-y-6"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-7 h-7 text-[#10B981] shrink-0" />
            <div className="space-y-1">
              <h2 className="font-display text-xl font-bold text-[#14213D]">
                {t.report.successTitle}
              </h2>
              <p className="text-sm text-slate-600">
                {t.report.trackingId}:{' '}
                <strong className="font-mono text-[#14213D]">{submittedReport.id}</strong>
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block">Category</span>
              <span className="font-semibold text-[#14213D]">
                {t.categories[submittedReport.category]}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Priority Score</span>
              <span className="font-mono font-bold text-[#14213D] tabular-nums">
                {submittedReport.priority_label} ({submittedReport.priority_score}/100)
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Current Status</span>
              <StatusIndicator status={submittedReport.status} />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to={`/report/${submittedReport.id}`}
              className="px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#14213D] hover:bg-[#1e3159]"
            >
              Open Full Report Dossier
            </Link>
            <Link
              to="/dashboard"
              className="px-4 py-2.5 rounded-lg text-xs font-semibold border border-slate-300 text-[#14213D] hover:bg-slate-50"
            >
              Return to Dashboard
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubmittedReport(null);
                handleDiscardDraft();
              }}
              className="px-4 py-2.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Submit Another Issue
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t.report.pageTitle} subtitle={t.report.pageSubtitle}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Connection Status & Draft Recovery Banners */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {!isOnline ? (
            <div className="flex-1 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2 font-medium">
              <WifiOff className="w-4 h-4 shrink-0" />
              <span>{t.report.offlineNotice}</span>
            </div>
          ) : (
            <div className="text-xs text-slate-500">{t.report.onlineReady}</div>
          )}

          {speechSupported && (
            <button
              type="button"
              onClick={handleVoiceInstructions}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-[#14213D] hover:bg-slate-50"
            >
              {speaking ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-red-600" />
                  <span>{t.report.stopVoice}</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>{t.report.voiceGuide}</span>
                </>
              )}
            </button>
          )}
        </div>

        {draftRecovered && (
          <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 flex flex-wrap items-center justify-between gap-3">
            <span>{t.report.draftRecovered}</span>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="px-3 py-1 rounded-md bg-white border border-sky-300 font-semibold text-sky-900 hover:bg-sky-100"
            >
              {t.report.discardDraft}
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
            {submitFailedOffline && isOnline && (
              <button
                type="button"
                onClick={() => submitFinalReport()}
                className="px-3 py-1.5 rounded-lg bg-red-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t.report.retrySubmit}</span>
              </button>
            )}
          </div>
        )}

        {/* 6-Step Progress Bar */}
        <nav aria-label="Reporting progress" className="bg-white border border-slate-200 rounded-xl p-4">
          <ol className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {stepLabels.map((label, idx) => {
              const num = idx + 1;
              const active = step === num;
              const done = step > num;
              return (
                <li key={label}>
                  <button
                    type="button"
                    onClick={() => setStep(num)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
                      active
                        ? 'bg-[#14213D] text-white border-[#14213D]'
                        : done
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block text-[10px] font-mono opacity-80">Step 0{num}</span>
                    <span className="block text-xs font-semibold truncate">{label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* STEP 1: Photo Capture & Upload */}
        {step === 1 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-[#14213D]">
                1. Click or Upload Damage Photograph
              </h2>
              <span className="text-xs text-slate-500">JPG, JPEG, PNG, WEBP · Max 5 MB</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleOpenLiveCamera}
                className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-[#14213D] hover:bg-[#1e3159] text-white text-sm font-semibold transition-colors"
              >
                <Camera className="w-4 h-4" />
                <span>Click Photo (Camera)</span>
              </button>

              <label
                htmlFor="issue-photo-input"
                className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border border-slate-300 hover:border-[#10B981] bg-slate-50 hover:bg-emerald-50/40 text-[#14213D] text-sm font-semibold cursor-pointer transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Image File</span>
              </label>
            </div>

            <input
              ref={mobileCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="sr-only"
              aria-label="Capture photo with camera"
            />
            <input
              id="issue-photo-input"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileChange}
              className="sr-only"
            />

            {cameraError && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {cameraError}
              </p>
            )}

            {cameraOpen && (
              <div className="rounded-xl border border-slate-300 overflow-hidden bg-slate-900 space-y-2 p-3">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full max-h-72 rounded-lg object-cover bg-black"
                />
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      stopCameraStream();
                      setCameraOpen(false);
                    }}
                    className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-200 hover:bg-white/10 inline-flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCaptureCameraFrame}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#10B981] text-white inline-flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Capture &amp; Detect Issue</span>
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-500">
                Or test automatic AI problem detection with an inspection photograph:
              </p>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_TEST_PHOTOS.map((sample) => (
                  <button
                    key={sample.path}
                    type="button"
                    onClick={() => handleUseSamplePhoto(sample.path)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      imageUrl === sample.path
                        ? 'bg-[#14213D] text-white border-[#14213D]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Camera className="w-3 h-3 inline mr-1.5" />
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#10B981] transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}

            {activePhotoSrc && (
              <div className="space-y-3">
                <div className="rounded-xl overflow-hidden border border-slate-200 max-h-72 bg-slate-100">
                  <ResilientImage
                    src={activePhotoSrc}
                    alt="Uploaded civic issue preview"
                    className="w-full h-72 object-cover"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.report.removePhoto}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14213D] text-white text-xs font-semibold"
                  >
                    <span>{t.report.nextStep}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: AI Problem Detection & Manual Override */}
        {step === 2 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <h2 className="font-display text-lg font-bold text-[#14213D]">
              2. AI Problem Analysis &amp; Category Confirmation
            </h2>

            {activePhotoSrc && (
              <ResilientImage
                src={activePhotoSrc}
                alt="Issue photograph under AI review"
                className="w-full max-h-56 object-cover rounded-xl border border-slate-200"
              />
            )}

            {analyzingAI && (
              <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 flex items-center gap-3 text-sm text-sky-900">
                <div className="w-4 h-4 border-2 border-sky-700 border-t-transparent rounded-full animate-spin shrink-0" />
                <span>
                  Running AI Problem Detection (identifying pothole, garbage, streetlight, water leakage, drainage, or other infrastructure issue)...
                </span>
              </div>
            )}

            {aiError && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-semibold">AI Detection Status: Manual Selection Ready</p>
                <p>{aiError}</p>
              </div>
            )}

            {aiResult && (
              <div
                data-testid="ai-analysis-card"
                className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#14213D]">
                    <Cpu className="w-4 h-4 text-[#10B981]" />
                    <span>
                      AI Detection:{' '}
                      {aiResult.unclear
                        ? 'Unclear Image — Please Verify Manually'
                        : t.categories[aiResult.category]}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-800">
                    {aiResult.unclear ? 'Manual Selection Needed' : 'Suggested Below'}
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Detected Problem: </span>
                    <span className="font-semibold text-[#14213D]">
                      {t.categories[aiResult.category]}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Suggested Severity: </span>
                    <span className="font-semibold text-[#14213D] capitalize">
                      {aiResult.severity}
                    </span>
                    {aiResult.confidence !== undefined && (
                      <span className="text-slate-600 font-mono tabular-nums">
                        {' '}
                        · {Math.round(aiResult.confidence * 100)}% confidence
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-700">
                  <span className="font-semibold">AI Observation:</span> {aiResult.description}
                </p>
                <p className="text-xs text-slate-600">
                  <span className="font-semibold">Detection Reason:</span> {aiResult.reason}
                </p>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
              <div>
                <label htmlFor="report-category" className="block text-sm font-medium text-slate-700 mb-1">
                  Issue Category (Editable)
                </label>
                <select
                  id="report-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as IssueCategory)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  {(Object.keys(t.categories) as IssueCategory[]).map((cat) => (
                    <option key={cat} value={cat}>
                      {t.categories[cat]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="report-severity" className="block text-sm font-medium text-slate-700 mb-1">
                  Observed Severity (Editable)
                </label>
                <select
                  id="report-severity"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as IssueSeverity)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t.report.prevStep}</span>
              </button>
              <button
                type="button"
                disabled={analyzingAI}
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14213D] text-white text-xs font-semibold disabled:opacity-50"
              >
                <span>{analyzingAI ? 'Analyzing Photo...' : t.report.nextStep}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Location Confirmation */}
        {step === 3 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-[#14213D]">
                3. Confirm Location &amp; Map Pin
              </h2>
              <button
                type="button"
                onClick={handleBrowserGeolocation}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#14213D] bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Detect My Location</span>
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                placeholder="Search locality via OpenStreetMap..."
                aria-label="Search locality"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs"
              />
              <button
                type="button"
                onClick={handleLocationSearch}
                className="px-3 py-2 rounded-lg bg-[#14213D] text-white text-xs font-semibold inline-flex items-center gap-1"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Find</span>
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 max-h-36 overflow-y-auto">
                {searchResults.map((res, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setMapCenter([res.lat, res.lng]);
                      handleSelectCoordinates(res.lat, res.lng);
                      setSearchResults([]);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    {res.display_name}
                  </button>
                ))}
              </div>
            )}

            <LeafletMapView
              reports={[]}
              center={mapCenter}
              zoom={15}
              heightClass="h-64"
              selectableLocation={{ lat: latitude, lng: longitude }}
              onSelectLocation={handleSelectCoordinates}
            />
            <p className="text-[11px] text-slate-500">
              Click anywhere on the map or drag the green pin to refine the exact spot.
            </p>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="report-locality" className="block text-xs font-medium text-slate-700 mb-1">
                  Locality / Ward Name
                </label>
                <input
                  id="report-locality"
                  type="text"
                  required
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label htmlFor="report-lat" className="block text-xs font-medium text-slate-700 mb-1">
                  Latitude
                </label>
                <input
                  id="report-lat"
                  type="number"
                  step="any"
                  required
                  value={latitude}
                  onChange={(e) => setLatitude(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="report-lng" className="block text-xs font-medium text-slate-700 mb-1">
                  Longitude
                </label>
                <input
                  id="report-lng"
                  type="number"
                  step="any"
                  required
                  value={longitude}
                  onChange={(e) => setLongitude(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono tabular-nums"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t.report.prevStep}</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14213D] text-white text-xs font-semibold"
              >
                <span>{t.report.nextStep}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Complaint Details + Smart Complaint Assistant */}
        {step === 4 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-[#14213D]">
                4. Complaint Details &amp; Smart Complaint Assistant
              </h2>
              <button
                type="button"
                disabled={assisting}
                onClick={handleComplaintAssistant}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-sky-50 border border-sky-200 text-[#14213D] hover:bg-sky-100 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>{assisting ? 'Improving Draft...' : t.report.assistButton}</span>
              </button>
            </div>

            {assistantError && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                {assistantError}
              </div>
            )}

            {assistantSuggestion && (
              <div
                data-testid="complaint-assistant-card"
                className="p-4 rounded-xl bg-sky-50/70 border border-sky-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#14213D]">
                    Smart Complaint Assistant Suggestion (Requires Your Approval)
                  </p>
                </div>
                <div className="space-y-1 text-xs">
                  <p className="text-slate-500 font-medium">Suggested Headline:</p>
                  <p className="font-semibold text-[#14213D]">
                    {assistantSuggestion.improved_title}
                  </p>
                  <p className="text-slate-500 font-medium pt-1">Refined Description:</p>
                  <p className="text-slate-700 leading-relaxed">
                    {assistantSuggestion.improved_description}
                  </p>
                  {assistantSuggestion.suggested_additions.length > 0 && (
                    <div className="pt-1">
                      <p className="text-slate-500 font-medium">Optional details you may add:</p>
                      <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                        {assistantSuggestion.suggested_additions.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTitle(assistantSuggestion.improved_title);
                      setDescription(assistantSuggestion.improved_description);
                      setAssistantSuggestion(null);
                    }}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#10B981] text-white"
                  >
                    {t.report.applySuggestion}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssistantSuggestion(null)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-slate-300 bg-white text-slate-700"
                  >
                    {t.report.dismissSuggestion}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="report-title" className="block text-sm font-medium text-slate-700 mb-1">
                Issue Title
              </label>
              <input
                id="report-title"
                type="text"
                required
                minLength={5}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setAutoFilledByAI(false);
                }}
                placeholder="Auto-filled from photo or enter title (e.g., Deep pothole near metro gate)"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label htmlFor="report-description" className="block text-sm font-medium text-slate-700 mb-1">
                Detailed Description
              </label>
              <textarea
                id="report-description"
                rows={4}
                required
                minLength={10}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setAutoFilledByAI(false);
                }}
                placeholder="Describe exact landmark, safety risk, and duration of the issue..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div className="max-w-xs">
              <label htmlFor="report-datetime" className="block text-sm font-medium text-slate-700 mb-1">
                Observed Date &amp; Time
              </label>
              <input
                id="report-datetime"
                type="datetime-local"
                value={reportedAt}
                onChange={(e) => setReportedAt(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t.report.prevStep}</span>
              </button>
              <button
                type="button"
                disabled={checkingDuplicates}
                onClick={() => {
                  if (title.trim().length < 5 || description.trim().length < 10) {
                    setError('Enter a clear title (min 5 chars) and description (min 10 chars) before continuing.');
                    return;
                  }
                  runDuplicateCheck();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14213D] text-white text-xs font-semibold disabled:opacity-50"
              >
                <span>{checkingDuplicates ? 'Checking Duplicates...' : 'Check Duplicates & Continue'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Duplicate Detection 2.0 */}
        {step === 5 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="space-y-1">
              <h2 className="font-display text-lg font-bold text-[#14213D]">
                5. Duplicate Detection Check
              </h2>
              <p className="text-xs text-slate-600">
                Checked unresolved reports within {duplicateRadius} metres and matching category/keywords. Duplicate reports are never auto-merged without your choice.
              </p>
            </div>

            {!duplicateChecked ? (
              <button
                type="button"
                onClick={runDuplicateCheck}
                className="px-4 py-2 rounded-lg bg-[#14213D] text-white text-xs font-semibold"
              >
                Run Nearby Duplicate Check
              </button>
            ) : duplicates.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>No matching active duplicate reports found nearby. Ready for final confirmation.</span>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-amber-800">
                  Similar unresolved issue(s) already exist nearby — support an existing report (+5 Civic Points) or continue with a separate report:
                </p>
                {duplicates.map((match) => (
                  <div
                    key={match.report.id}
                    className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4"
                  >
                    <ResilientImage
                      src={match.report.image_url}
                      alt={match.report.title}
                      className="w-full sm:w-28 h-24 rounded-lg object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <p className="text-xs text-slate-500">
                        <span className="font-mono">{match.report.id}</span> ·{' '}
                        {t.categories[match.report.category]} ·{' '}
                        <span className="font-mono tabular-nums">{match.distance_meters}m away</span>
                      </p>
                      <p className="text-sm font-bold text-[#14213D]">{match.report.title}</p>
                      <div className="flex flex-wrap items-center gap-3">
                        <StatusIndicator status={match.report.status} />
                        <span className="text-xs text-slate-600 tabular-nums">
                          {match.report.upvote_count} supporters
                        </span>
                      </div>
                      <div className="pt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleSupportExisting(match)}
                          className="px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-[#10B981] hover:bg-[#059669] inline-flex items-center gap-1.5"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>Support Existing Report</span>
                        </button>
                        <Link
                          to={`/report/${match.report.id}`}
                          className="px-3 py-2 rounded-lg text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50"
                        >
                          Inspect Report
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t.report.prevStep}</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(6)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14213D] text-white text-xs font-semibold"
              >
                <span>Proceed to Final Review</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: Final Review & Submission */}
        {step === 6 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <h2 className="font-display text-lg font-bold text-[#14213D]">
              6. Final Confirmation Summary
            </h2>

            <div className="grid md:grid-cols-12 gap-5 items-start">
              <div className="md:col-span-5">
                {activePhotoSrc ? (
                  <ResilientImage
                    src={activePhotoSrc}
                    alt={title || 'Submitted issue evidence'}
                    className="w-full h-56 object-cover rounded-xl border border-slate-200"
                  />
                ) : (
                  <div className="h-56 rounded-xl border border-dashed border-red-300 bg-red-50 flex items-center justify-center text-xs text-red-700 p-4 text-center">
                    No photograph attached yet — return to Step 1 to add an image.
                  </div>
                )}
              </div>

              <div className="md:col-span-7 space-y-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Issue Title</p>
                  <p className="font-display font-bold text-[#14213D]">{title || '(Not set)'}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-500">Category</p>
                    <p className="font-semibold text-[#14213D]">{t.categories[category]}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Severity</p>
                    <p className="font-semibold text-[#14213D] capitalize">{severity}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Locality / Ward</p>
                    <p className="font-semibold text-[#14213D]">{locality}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Coordinates</p>
                    <p className="font-mono text-[#14213D] tabular-nums">
                      {latitude.toFixed(5)}, {longitude.toFixed(5)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Description</p>
                  <p className="text-xs text-slate-700 leading-relaxed">{description || '(Not set)'}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(5)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t.report.prevStep}</span>
              </button>

              <button
                type="button"
                disabled={submitting || (!imageUrl && !pendingFile)}
                onClick={() => submitFinalReport(duplicates[0]?.report.id)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 transition-colors"
              >
                <MapPin className="w-4 h-4" />
                <span>
                  {submitting ? 'Submitting Civic Report...' : t.report.submitReport}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
