import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getMonument, checkMonumentWithin, validateVisit, getNewlyEarnedMedals, type Monument, type EarnedMedal } from "../lib/supabase";
import { MedalCelebration } from "../components/MedalCelebration";
import { currentLocale } from "../lib/i18n";

type GpsStatus = "loading" | "checking" | "close" | "far" | "denied" | "error";

export function ARPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { monumentId } = useParams<{ monumentId: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [monument, setMonument] = useState<Monument | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("loading");
  const [experienceStarted, setExperienceStarted] = useState(false);
  const [experienceEnded, setExperienceEnded] = useState(false);
  const [earnedMedals, setEarnedMedals] = useState<EarnedMedal[]>([]);

  useEffect(() => {
    document.documentElement.classList.add("theme-ar");
    return () => document.documentElement.classList.remove("theme-ar");
  }, []);

  useEffect(() => {
    if (!monumentId) {
      setGpsStatus("error");
      return;
    }

    const cleanId = monumentId.replace(/[^0-9a-fA-F-]/g, "");
    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
    if (!isValidUuid) {
      setGpsStatus("error");
      return;
    }

    (async () => {
      const m = await getMonument(cleanId, currentLocale());
      if (!m) {
        setGpsStatus("error");
        return;
      }
      setMonument(m);
      setGpsStatus("checking");

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const within = await checkMonumentWithin(cleanId, pos.coords.latitude, pos.coords.longitude);
            setGpsStatus(within ? "close" : "far");
          } catch {
            setGpsStatus("error");
          }
        },
        (err) => {
          setGpsStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
        },
        { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 },
      );
    })();
  }, [monumentId]);

  const startExperience = () => {
    setExperienceStarted(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await validateVisit(monument!.id, pos.coords.latitude, pos.coords.longitude, false);
          // Esperar un momento para que los triggers de BBDD ejecuten
          await new Promise((r) => setTimeout(r, 1500));
          const medals = await getNewlyEarnedMedals(monument!.id);
          if (medals.length) setEarnedMedals(medals);
        } catch (err) {
          console.error(err);
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 60_000 },
    );
  };

  useEffect(() => {
    if (!experienceStarted) return;
    const video = videoRef.current;
    const audio = audioRef.current;
    if (video) {
      video.muted = true;
      void video.play().catch(() => {});
    }
    if (audio) void audio.play().catch(() => {});
  }, [experienceStarted]);

  const closeExperience = () => {
    videoRef.current?.pause();
    audioRef.current?.pause();
    navigate("/");
  };

  const restartExperience = () => {
    setExperienceEnded(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      void videoRef.current.play().catch(() => {});
    }
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      void audioRef.current.play().catch(() => {});
    }
  };

  const onMediaEnded = () => {
    videoRef.current?.pause();
    audioRef.current?.pause();
    // Si hay medallas pendientes de mostrar, la celebración las muestra primero.
    // Si no, va directo al overlay de fin.
    if (!earnedMedals.length) setExperienceEnded(true);
  };

  return (
    <main className="relative h-full w-full bg-jet-black flex flex-col">
      {/* Barra superior */}
      <div className="flex justify-between items-center gap-3 p-4">
        <div className="rounded-2xl bg-jet-black/60 backdrop-blur px-3 py-2 text-body font-medium text-canvas-white">
          {monument?.name ?? t("ar.loading")}
        </div>
        <button
          onClick={closeExperience}
          aria-label={t("common.close")}
          className="rounded-full bg-jet-black/60 backdrop-blur w-10 h-10 flex items-center justify-center text-canvas-white text-xl"
        >
          ×
        </button>
      </div>

      {/* Área principal */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">

        {/* Estados pre-experiencia */}
        {!experienceStarted && (
          <>
            {(gpsStatus === "loading" || gpsStatus === "checking") && (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full border-4 border-pinterest-red border-t-transparent animate-spin" />
                <p className="text-body text-ash-gray">
                  {gpsStatus === "loading" ? t("ar.loading") : t("ar.gps_checking")}
                </p>
              </div>
            )}

            {gpsStatus === "close" && !monument?.video_url && (
              <p className="text-body text-ash-gray text-center">{t("ar.no_content")}</p>
            )}

            {gpsStatus === "close" && monument?.video_url && (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="rounded-full bg-green-500/20 p-4">
                  <span className="text-4xl">📍</span>
                </div>
                <p className="text-body text-canvas-white font-medium">{t("ar.gps_close")}</p>
                <button
                  onClick={startExperience}
                  className="rounded-3xl bg-pinterest-red text-canvas-white px-10 py-4 text-subheading font-bold shadow-2xl active:scale-95 transition-transform"
                >
                  {t("ar.start_experience")}
                </button>
              </div>
            )}

            {gpsStatus === "far" && (
              <div className="rounded-2xl bg-jet-black/80 border border-ash-gray/20 px-6 py-6 text-center max-w-xs flex flex-col items-center gap-3">
                <span className="text-4xl">🗺️</span>
                <p className="text-body text-canvas-white">{t("ar.gps_far")}</p>
                <p className="text-body-sm text-ash-gray">{monument?.name}</p>
              </div>
            )}

            {gpsStatus === "denied" && (
              <div className="rounded-2xl bg-jet-black/80 border border-ash-gray/20 px-6 py-6 text-center max-w-xs flex flex-col items-center gap-3">
                <span className="text-4xl">🔒</span>
                <p className="text-body text-canvas-white">{t("ar.gps_denied")}</p>
              </div>
            )}

            {gpsStatus === "error" && (
              <div className="rounded-2xl bg-jet-black/80 border border-ash-gray/20 px-6 py-6 text-center max-w-xs flex flex-col items-center gap-3">
                <span className="text-4xl">⚠️</span>
                <p className="text-body text-canvas-white">{t("ar.error")}</p>
              </div>
            )}
          </>
        )}

        {/* Reproducción de vídeo */}
        {experienceStarted && monument?.video_url && (
          <video
            ref={videoRef}
            src={monument.video_url}
            playsInline
            muted
            onEnded={onMediaEnded}
            className="w-full max-w-3xl rounded-3xl shadow-2xl"
          />
        )}
      </div>

      {/* Audio narrado */}
      {experienceStarted && monument?.audio_url && (
        <audio ref={audioRef} src={monument.audio_url} onEnded={onMediaEnded} />
      )}

      {/* Celebración de medalla */}
      {earnedMedals.length > 0 && (
        <MedalCelebration
          medals={earnedMedals}
          onClose={() => { setEarnedMedals([]); setExperienceEnded(true); }}
        />
      )}

      {/* Overlay fin de experiencia */}
      {experienceEnded && !earnedMedals.length && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-jet-black/80 backdrop-blur-sm">
          <div className="rounded-3xl bg-canvas-white text-graphite p-6 max-w-sm w-full mx-4 text-center">
            <h2 className="text-subheading font-bold mb-2">{t("ar.experience_ended")}</h2>
            <p className="text-body text-ash-gray mb-6">{monument?.name}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={restartExperience}
                className="rounded-2xl bg-whisper-gray text-jet-black px-4 py-2 text-body font-medium"
              >
                ↻
              </button>
              <button
                onClick={closeExperience}
                className="rounded-2xl bg-pinterest-red text-canvas-white px-4 py-2 text-body font-medium"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
