import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import QrScanner from "qr-scanner";

const AR_PATH_RE = /\/ar\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

export function ScanPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    if (!videoRef.current) return;

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        const text = result.data;
        const match = text.match(AR_PATH_RE);
        if (match) {
          scanner.stop();
          setScanning(false);
          navigate(`/ar/${match[1]}`);
        }
      },
      {
        preferredCamera: "environment",
        highlightScanRegion: true,
        highlightCodeOutline: true,
      },
    );

    scannerRef.current = scanner;
    scanner.start().catch(() => setError("No se pudo acceder a la cámara. Comprueba los permisos."));

    return () => { scanner.stop(); scanner.destroy(); };
  }, [navigate]);

  return (
    <main className="fixed inset-0 bg-jet-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 z-10">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full bg-jet-black/60 backdrop-blur w-10 h-10 flex items-center justify-center text-canvas-white text-xl"
        >
          ←
        </button>
        <span className="text-canvas-white text-body font-medium">Escanear QR</span>
        <div className="w-10" />
      </div>

      {/* Cámara */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
        />

        {/* Marco visual */}
        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 relative">
              {/* Esquinas */}
              <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-pinterest-red rounded-tl-lg" />
              <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-pinterest-red rounded-tr-lg" />
              <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-pinterest-red rounded-bl-lg" />
              <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-pinterest-red rounded-br-lg" />
            </div>
          </div>
        )}

        {/* Overlay oscuro con agujero */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 280px 280px at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 70%)"
          }}
        />
      </div>

      {/* Instrucción */}
      <div className="p-6 text-center">
        {error ? (
          <p className="text-red-400 text-body">{error}</p>
        ) : (
          <p className="text-canvas-white/70 text-body">
            Apunta al código QR del monumento
          </p>
        )}
      </div>
    </main>
  );
}
