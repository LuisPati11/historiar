import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  checkMonumentWithin,
  getMonument,
  type Monument,
} from "../lib/api/monuments";
import {
  completeVisitVerification,
  startVisitVerification,
  type VisitVerificationAttempt,
} from "../lib/api/visits";
import { getNewlyEarnedMedals, type EarnedMedal } from "../lib/api/achievements";
import { MedalCelebration } from "../components/MedalCelebration";
import { currentLocale } from "../lib/i18n";
import { useModalAccessibility } from "../hooks/useModalAccessibility";
import { isUuid } from "../lib/visitVerification";

type GpsStatus = "loading" | "checking" | "close" | "far" | "denied" | "error";
type TrackingStatus = "idle" | "starting" | "searching" | "found" | "error";

function getCurrentPosition(maximumAge = 0): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge,
      timeout: 15_000,
    });
  });
}

export function ARPage() {
  const { monumentId } = useParams<{ monumentId: string }>();
  return <ARExperience key={monumentId} monumentId={monumentId} />;
}

function ARExperience({ monumentId }: { monumentId?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mountedRef = useRef(false);
  const arContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mindarCleanupRef = useRef<(() => Promise<void>) | null>(null);
  const scannerActiveRef = useRef(false);
  const verificationAttemptRef = useRef<Promise<VisitVerificationAttempt | null> | null>(null);
  const targetHandledRef = useRef(false);
  const pendingMedalsRef = useRef<EarnedMedal[]>([]);
  const mediaEndedRef = useRef(false);

  const [monument, setMonument] = useState<Monument | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("loading");
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>("idle");
  const [experienceStarted, setExperienceStarted] = useState(false);
  const [experienceEnded, setExperienceEnded] = useState(false);
  const [visitSaveFailed, setVisitSaveFailed] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [earnedMedals, setEarnedMedals] = useState<EarnedMedal[]>([]);

  const stopScanner = useCallback(async () => {
    scannerActiveRef.current = false;
    const cleanup = mindarCleanupRef.current;
    mindarCleanupRef.current = null;
    if (cleanup) await cleanup();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    document.documentElement.classList.add("theme-ar");
    return () => {
      mountedRef.current = false;
      document.documentElement.classList.remove("theme-ar");
      void stopScanner();
    };
  }, [stopScanner]);

  useEffect(() => {
    if (!monumentId) {
      setGpsStatus("error");
      return;
    }

    if (!isUuid(monumentId)) {
      setGpsStatus("error");
      return;
    }

    let cancelled = false;
    void (async () => {
      setMonument(null);
      setGpsStatus("loading");
      const gpsPromise = getCurrentPosition(30_000).then(
        (position) => ({ position, error: null }),
        (error: GeolocationPositionError) => ({ position: null, error }),
      );

      let loadedMonument: Monument | null;
      try {
        loadedMonument = await getMonument(monumentId, currentLocale());
      } catch {
        if (!cancelled) setGpsStatus("error");
        return;
      }
      if (cancelled) return;
      if (!loadedMonument) {
        setGpsStatus("error");
        return;
      }
      setMonument(loadedMonument);
      setGpsStatus("checking");

      const gpsResult = await gpsPromise;
      if (cancelled) return;
      if (gpsResult.error || !gpsResult.position) {
        setGpsStatus(gpsResult.error?.code === gpsResult.error?.PERMISSION_DENIED ? "denied" : "error");
        return;
      }

      try {
        const within = await checkMonumentWithin(
          monumentId,
          gpsResult.position.coords.latitude,
          gpsResult.position.coords.longitude,
        );
        if (!cancelled) setGpsStatus(within ? "close" : "far");
      } catch {
        if (!cancelled) setGpsStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [monumentId]);

  const handleTargetFound = useCallback(async () => {
    if (!mountedRef.current || !scannerActiveRef.current || !monument || targetHandledRef.current) return;
    targetHandledRef.current = true;
    setTrackingStatus("found");

    try {
      const attempt = await verificationAttemptRef.current;
      if (!attempt || !mountedRef.current) return;
      const position = await getCurrentPosition();
      if (!mountedRef.current) return;
      await completeVisitVerification(
        attempt.attempt_id,
        monument.id,
        position.coords.latitude,
        position.coords.longitude,
      );
    } catch (error) {
      console.error("Visit verification failed", error);
      if (mountedRef.current) setVisitSaveFailed(true);
      return;
    }
    try {
      const medals = await getNewlyEarnedMedals();
      if (!mountedRef.current || !medals.length) return;
      if (mediaEndedRef.current) setEarnedMedals(medals);
      else pendingMedalsRef.current = medals;
    } catch (error) {
      console.error("Could not load earned medals", error);
    }
  }, [monument]);

  const startScanner = async () => {
    if (scannerActiveRef.current || !monument || !monument.mind_target_url || !arContainerRef.current) return;
    scannerActiveRef.current = true;
    setTrackingStatus("starting");
    setVisitSaveFailed(false);
    targetHandledRef.current = false;

    try {
      const position = await getCurrentPosition();
      if (!scannerActiveRef.current || !mountedRef.current) return;
      verificationAttemptRef.current = startVisitVerification(
        monument.id,
        position.coords.latitude,
        position.coords.longitude,
      ).catch((error) => {
        console.error("Could not create visit verification attempt", error);
        if (mountedRef.current) setVisitSaveFailed(true);
        return null;
      });

      const { startMindAR } = await import("../ar/mindar");
      if (!scannerActiveRef.current || !mountedRef.current || !arContainerRef.current) return;
      const cleanup = await startMindAR({
        container: arContainerRef.current,
        targetImageUrl: monument.mind_target_url,
        onTargetFound: () => void handleTargetFound(),
        onTargetLost: () => {
          if (mountedRef.current && scannerActiveRef.current && !targetHandledRef.current) setTrackingStatus("searching");
        },
      });
      if (!scannerActiveRef.current || !mountedRef.current) {
        await cleanup();
        return;
      }
      mindarCleanupRef.current = cleanup;
      if (!targetHandledRef.current) setTrackingStatus("searching");
    } catch (error) {
      console.error("MindAR failed to start", error);
      if (mountedRef.current) setTrackingStatus("error");
      await stopScanner();
    }
  };

  const handleMediaFailure = () => {
    if (!mountedRef.current) return;
    videoRef.current?.pause();
    audioRef.current?.pause();
    setMediaFailed(true);
  };

  const playExperience = () => {
    setExperienceStarted(true);
    setMediaFailed(false);
    void stopScanner();
    if (videoRef.current) {
      videoRef.current.muted = monument?.audio_url != null;
      void videoRef.current.play().catch(handleMediaFailure);
    }
    if (audioRef.current) void audioRef.current.play().catch(handleMediaFailure);
  };

  const closeExperience = () => {
    videoRef.current?.pause();
    audioRef.current?.pause();
    void stopScanner();
    navigate("/");
  };
  const endDialogCloseRef = useModalAccessibility(
    closeExperience,
    experienceEnded && earnedMedals.length === 0,
  );

  const restartExperience = () => {
    setExperienceEnded(false);
    mediaEndedRef.current = false;
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    playExperience();
  };

  const onMediaEnded = () => {
    mediaEndedRef.current = true;
    videoRef.current?.pause();
    audioRef.current?.pause();
    if (pendingMedalsRef.current.length) {
      setEarnedMedals(pendingMedalsRef.current);
      pendingMedalsRef.current = [];
    } else {
      setExperienceEnded(true);
    }
  };

  const hasArContent = Boolean(monument?.video_url && monument?.mind_target_url);
  const scannerVisible = trackingStatus !== "idle" && !experienceStarted;

  return (
    <main className="relative h-full w-full overflow-hidden bg-jet-black flex flex-col">
      <div ref={arContainerRef} className={`absolute inset-0 ${scannerVisible ? "block" : "hidden"}`} />

      <div className="relative z-20 flex justify-between items-center gap-3 p-4">
        <div className="rounded-2xl bg-jet-black/60 backdrop-blur px-3 py-2 text-body font-medium text-canvas-white">
          {monument?.name ?? t("ar.loading")}
        </div>
        <button
          type="button"
          onClick={closeExperience}
          aria-label={t("common.close")}
          className="rounded-full bg-jet-black/60 backdrop-blur size-10 flex items-center justify-center text-canvas-white text-xl"
        >
          ×
        </button>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 gap-6" aria-live="polite">
        {!experienceStarted && trackingStatus === "idle" && (
          <>
            {(gpsStatus === "loading" || gpsStatus === "checking") && (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="size-12 rounded-full border-4 border-pinterest-red border-t-transparent animate-spin" />
                <p className="text-body text-canvas-white/70">
                  {gpsStatus === "loading" ? t("ar.loading") : t("ar.gps_checking")}
                </p>
              </div>
            )}

            {gpsStatus === "close" && !hasArContent && (
              <p className="text-body text-ash-gray text-center">{t("ar.no_content")}</p>
            )}

            {gpsStatus === "close" && hasArContent && (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="rounded-full bg-green-500/20 p-4"><span className="text-4xl">📍</span></div>
                <p className="text-body text-canvas-white font-medium">{t("ar.gps_close")}</p>
                <button
                  type="button"
                  onClick={() => void startScanner()}
                  className="rounded-3xl bg-pinterest-red text-canvas-white px-10 py-4 text-subheading font-bold shadow-2xl active:scale-95 transition-transform"
                >
                  {t("ar.start_scanner")}
                </button>
              </div>
            )}

            {gpsStatus === "far" && <StatusCard icon="🗺️" text={t("ar.gps_far")} detail={monument?.name} />}
            {gpsStatus === "denied" && <StatusCard icon="🔒" text={t("ar.gps_denied")} />}
            {gpsStatus === "error" && <StatusCard icon="⚠️" text={t("ar.error")} />}
          </>
        )}

        {!experienceStarted && (trackingStatus === "starting" || trackingStatus === "searching") && (
          <div className="rounded-2xl bg-jet-black/70 backdrop-blur px-5 py-4 text-center">
            <p className="text-body font-medium text-canvas-white">
              {trackingStatus === "starting" ? t("ar.camera_starting") : t("ar.point_at_monument")}
            </p>
          </div>
        )}

        {!experienceStarted && trackingStatus === "found" && (
          <div className="rounded-3xl bg-jet-black/75 backdrop-blur p-6 text-center flex flex-col items-center gap-4">
            <span className="text-4xl">✓</span>
            <p className="text-body font-medium text-canvas-white">{t("ar.target_found")}</p>
            <button
              type="button"
              onClick={playExperience}
              className="rounded-3xl bg-pinterest-red text-canvas-white px-10 py-4 text-subheading font-bold"
            >
              {t("ar.start_experience")}
            </button>
          </div>
        )}

        {!experienceStarted && trackingStatus === "error" && <StatusCard icon="⚠️" text={t("ar.camera_error")} />}

        {visitSaveFailed && (
          <p className="rounded-xl bg-jet-black/70 px-4 py-2 text-body-sm text-canvas-white">
            {t("ar.visit_not_saved")}
          </p>
        )}

        {experienceStarted && mediaFailed && (
          <div role="alert" className="rounded-2xl bg-jet-black/80 p-4 text-center text-canvas-white">
            <p className="text-body">{t("ar.media_error")}</p>
            <button type="button" onClick={restartExperience} className="mt-3 rounded-2xl bg-pinterest-red px-5 py-2 text-body font-semibold">
              {t("common.retry")}
            </button>
          </div>
        )}

        {monument?.video_url && (
          <video
            ref={videoRef}
            src={monument.video_url}
            playsInline
            muted
            preload="metadata"
            onEnded={onMediaEnded}
            onError={handleMediaFailure}
            className="w-full max-w-3xl rounded-3xl shadow-2xl aspect-video bg-black"
            style={experienceStarted
              ? undefined
              : { position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
          />
        )}
      </div>

      {monument?.audio_url && <audio ref={audioRef} src={monument.audio_url} preload="metadata" onError={handleMediaFailure} />}

      {earnedMedals.length > 0 && (
        <MedalCelebration
          medals={earnedMedals}
          onClose={() => { setEarnedMedals([]); setExperienceEnded(true); }}
        />
      )}

      {experienceEnded && earnedMedals.length === 0 && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-jet-black/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="experience-ended-title">
          <div className="rounded-3xl bg-canvas-white text-graphite p-6 max-w-sm w-full mx-4 text-center">
            <h2 id="experience-ended-title" className="text-subheading font-bold mb-2">{t("ar.experience_ended")}</h2>
            <p className="text-body text-ash-gray mb-6">{monument?.name}</p>
            <div className="flex gap-3 justify-center">
              <button type="button" onClick={restartExperience} aria-label={t("ar.restart")} className="rounded-2xl bg-whisper-gray text-jet-black px-4 py-2 text-body font-medium">↻</button>
              <button ref={endDialogCloseRef} type="button" onClick={closeExperience} className="rounded-2xl bg-pinterest-red text-canvas-white px-4 py-2 text-body font-medium">OK</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function StatusCard({ icon, text, detail }: { icon: string; text: string; detail?: string }) {
  return (
    <div className="rounded-2xl bg-jet-black/80 border border-ash-gray/20 px-6 py-6 text-center max-w-xs flex flex-col items-center gap-3">
      <span className="text-4xl" aria-hidden="true">{icon}</span>
      <p className="text-body text-canvas-white">{text}</p>
      {detail && <p className="text-body-sm text-ash-gray">{detail}</p>}
    </div>
  );
}
