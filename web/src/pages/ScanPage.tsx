import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import QrScanner from "qr-scanner";

const AR_PATH_RE = /\/ar\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

export function ScanPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [started, setStarted] = useState(false);

  const startScanner = async () => {
    if (!videoRef.current || started) return;
    setStarted(true);
    setError(null);

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        const match = result.data.match(AR_PATH_RE);
        if (match) {
          scanner.stop();
          setScanning(false);
          navigate(`/ar/${match[1]}`);
        }
      },
      { preferredCamera: "environment", highlightScanRegion: true, highlightCodeOutline: true },
    );

    scannerRef.current = scanner;
    try {
      await scanner.start();
      setScanning(true);
    } catch {
      setError(t("scan.camera_error"));
      setStarted(false);
    }
  };

  useEffect(() => {
    // Arrancar automáticamente solo si el permiso ya está concedido
    navigator.permissions?.query({ name: "camera" as PermissionName })
      .then(p => { if (p.state === "granted") startScanner(); })
      .catch(() => {});

    return () => { scannerRef.current?.stop(); scannerRef.current?.destroy(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="fixed inset-0 bg-jet-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 z-10">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full bg-jet-black/60 backdrop-blur w-10 h-10 flex items-center justify-center"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9l5 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span className="text-canvas-white text-body font-medium">{t("scan.title")}</span>
        <div className="w-10" />
      </div>

      {/* Cámara */}
      <div className="flex-1 relative overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />

        {/* Marco QR */}
        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 relative">
              <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-pinterest-red rounded-tl-lg" />
              <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-pinterest-red rounded-tr-lg" />
              <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-pinterest-red rounded-bl-lg" />
              <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-pinterest-red rounded-br-lg" />
            </div>
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 280px 280px at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 70%)" }}
        />

        {/* Botón iniciar cámara (solo si no ha arrancado) */}
        {!scanning && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
            <button
              onClick={startScanner}
              disabled={started}
              className="w-20 h-20 rounded-full bg-canvas-white/15 border-2 border-canvas-white/40 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
            >
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <path d="M14 10l12 8-12 8V10z" fill="white"/>
              </svg>
            </button>
            <p className="text-canvas-white/70 text-body text-center px-8">
              {started ? t("scan.activating") : t("scan.tap_to_activate")}
            </p>
          </div>
        )}
      </div>

      {/* Instrucción / error */}
      <div className="p-6 text-center">
        {error ? (
          <div className="flex flex-col gap-3 items-center">
            <p className="text-red-400 text-body">{error}</p>
            <button onClick={() => { setStarted(false); setError(null); startScanner(); }}
              className="text-canvas-white/70 text-body-sm underline">
              {t("scan.retry")}
            </button>
          </div>
        ) : scanning ? (
          <p className="text-canvas-white/70 text-body">{t("scan.point_at_qr")}</p>
        ) : null}
      </div>
    </main>
  );
}
