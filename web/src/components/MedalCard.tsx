import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  imageUrl: string;
  name: string;
  description?: string | null;
  tier: string;
  earnedAt?: string | null;
  size?: number;
  hideInfo?: boolean;
}

const TIER_GLOW: Record<string, string> = {
  bronze: "rgba(180,100,30,0.6)",
  silver: "rgba(180,180,200,0.6)",
  gold:   "rgba(255,195,0,0.7)",
  diamond:"rgba(100,180,255,0.7)",
};

const GYRO_PERMISSION_KEY = "gyro_permission";
const GYRO_PERMISSION_EVENT = "gyro-permission-change";

export function MedalCard({ imageUrl, name, description, tier, earnedAt, size = 260, hideInfo = false }: Props) {
  const { t, i18n } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);
  const rafRef  = useRef<number>(0);
  const gyroCleanupRef = useRef<(() => void) | null>(null);
  const target  = useRef({ rx: 0, ry: 0 });
  const current = useRef({ rx: 0, ry: 0 });
  const isDragging = useRef(false);

  const [rx, setRx] = useState(0);
  const [ry, setRy] = useState(0);
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const [gyroPermission, setGyroPermission] = useState(() =>
    typeof window === "undefined" ? null : localStorage.getItem(GYRO_PERMISSION_KEY),
  );

  const tick = useCallback(() => {
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    current.current.rx = lerp(current.current.rx, target.current.rx, 0.08);
    current.current.ry = lerp(current.current.ry, target.current.ry, 0.08);
    setRx(current.current.rx);
    setRy(current.current.ry);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  const attachGyro = useCallback(() => {
    if (gyroCleanupRef.current) return;
    const handler = (e: DeviceOrientationEvent) => {
      if (isDragging.current) return;
      const gamma = Math.max(-30, Math.min(30, e.gamma ?? 0));
      const beta  = Math.max(-30, Math.min(30, (e.beta ?? 45) - 45));
      target.current.ry = gamma * 0.47;
      target.current.rx = beta  * 0.38;
    };
    window.addEventListener("deviceorientation", handler);
    gyroCleanupRef.current = () => {
      window.removeEventListener("deviceorientation", handler);
      gyroCleanupRef.current = null;
      setGyroEnabled(false);
    };
    setGyroEnabled(true);
  }, []);

  useEffect(() => {
    if (typeof DeviceOrientationEvent === "undefined") return;
    const isIOS = typeof (DeviceOrientationEvent as any).requestPermission === "function";
    if (isIOS) {
      if (gyroPermission === "granted") attachGyro();
    } else {
      attachGyro();
    }
  }, [attachGyro, gyroPermission]);

  useEffect(() => {
    const syncGyroPermission = () => {
      setGyroPermission(localStorage.getItem(GYRO_PERMISSION_KEY));
    };
    window.addEventListener(GYRO_PERMISSION_EVENT, syncGyroPermission);
    window.addEventListener("storage", syncGyroPermission);
    return () => {
      window.removeEventListener(GYRO_PERMISSION_EVENT, syncGyroPermission);
      window.removeEventListener("storage", syncGyroPermission);
      gyroCleanupRef.current?.();
    };
  }, []);

  const requestGyroFromGesture = async () => {
    if (typeof DeviceOrientationEvent === "undefined") return;
    if (typeof (DeviceOrientationEvent as any).requestPermission !== "function") return;
    // Siempre llamar requestPermission() en iOS — en nueva sesión es necesario
    // aunque localStorage ya diga "granted", porque Safari requiere la llamada
    // por gesto de usuario para que los eventos deviceorientation empiecen a disparar.
    try {
      const res = await (DeviceOrientationEvent as any).requestPermission();
      localStorage.setItem(GYRO_PERMISSION_KEY, res === "granted" ? "granted" : "denied");
    } catch {
      localStorage.setItem(GYRO_PERMISSION_KEY, "denied");
    }
    window.dispatchEvent(new Event(GYRO_PERMISSION_EVENT));
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!cardRef.current) return;
    isDragging.current = true;
    const rect = cardRef.current.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width  / 2)) / (rect.width  / 2);
    const dy = (e.clientY - (rect.top  + rect.height / 2)) / (rect.height / 2);
    target.current.ry =  dx * 14;
    target.current.rx = -dy * 14;
  };

  const handlePointerLeave = () => {
    isDragging.current = false;
    if (!gyroEnabled) {
      target.current.rx = 0;
      target.current.ry = 0;
    }
  };

  const intensity  = Math.min(1, Math.sqrt(rx * rx + ry * ry) / 14);
  const glareX     = 50 + ry * 3;
  const glareY     = 50 - rx * 3;
  const sweepAngle = 130 + ry * 2 + rx * 1;
  const glowColor  = TIER_GLOW[tier] ?? TIER_GLOW.gold;

  return (
    <div className="flex flex-col items-center gap-5 select-none">
      {/*
        Estructura correcta para evitar el halo blanco y el artefacto cuadrado:
        - Wrapper: tamaño fijo, position relative
        - Aura: div absoluto detrás, sin clip → el glow del tier
        - Perspectiva: wrapper de perspectiva sin clip ni overflow
        - Coin: clip-path:circle(50%) en el elemento rotado → corte circular limpio
                sin overflow:hidden (que rompe 3D) ni isolation (que sangra en blanco)
        - Efectos: sin mix-blend-mode → gradientes semitransparentes normales
      */}
      {/* filter en el wrapper (no en el clip-path) → iOS Safari sigue los píxeles
          visibles de la moneda y crea sombra circular correcta */}
      <div style={{
        position: "relative", width: size, height: size,
        filter: `drop-shadow(0 ${4 + intensity * 3}px ${8 + intensity * 4}px rgba(0,0,0,0.22)) drop-shadow(0 0 ${3 + intensity * 8}px ${glowColor})`,
      }}>

        {/* Perspectiva → coin rotada y clipada */}
        <div style={{ perspective: "900px", perspectiveOrigin: "50% 50%", width: "100%", height: "100%" }}>
          <div
            ref={cardRef}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              void requestGyroFromGesture();
            }}
            style={{
              width:  "100%",
              height: "100%",
              transform: `rotateX(${rx}deg) rotateY(${ry}deg)`,
              cursor: "grab",
              position: "relative",
              userSelect: "none",
              touchAction: "none",
            }}
          >
            {/* Recorte circular en hijo (no en el elemento 3D) → evita artefacto
                rectangular en iOS Safari cuando scale() desborda un clipPath en
                el mismo elemento que tiene la perspectiva/rotación. */}
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", position: "relative" }}>
            {/* Imagen base */}
            <img
              src={imageUrl}
              alt={name}
              draggable={false}
              style={{
                width: "100%",
                height: "100%",
                display: "block",
                objectFit: "cover",
                transform: "scale(1.38)",
                transformOrigin: "50% 40%",
              }}
            />

            {/* Barrido metálico direccional (sin blend mode) */}
            <div
              style={{
                position: "absolute", inset: 0,
                background: `linear-gradient(${sweepAngle}deg,
                  rgba(0,0,0,0.12) 0%,
                  rgba(0,0,0,0.03) 28%,
                  rgba(255,210,60,${0.09 + intensity * 0.13}) 50%,
                  rgba(0,0,0,0.03) 72%,
                  rgba(0,0,0,0.10) 100%
                )`,
                pointerEvents: "none",
              }}
            />

            {/* Glare especular concentrado (sin blend mode) */}
            <div
              style={{
                position: "absolute", inset: 0,
                background: `radial-gradient(ellipse 30% 20% at ${glareX}% ${glareY}%,
                  rgba(255,255,230,${0.55 + intensity * 0.32}) 0%,
                  rgba(255,218,90,${0.22 + intensity * 0.18}) 42%,
                  transparent 72%
                )`,
                pointerEvents: "none",
              }}
            />

            {/* Rim light (inset box-shadow) — ilusión de canto metálico */}
            <div
              style={{
                position: "absolute", inset: 0,
                boxShadow: [
                  `inset ${-ry * 0.9}px ${rx * 0.9}px ${3 + intensity * 8}px rgba(255,210,60,${0.4 + intensity * 0.45})`,
                  `inset ${ry * 0.45}px ${-rx * 0.45}px ${5 + intensity * 9}px rgba(0,0,0,${0.25 + intensity * 0.3})`,
                ].join(", "),
                pointerEvents: "none",
              }}
            />
            </div>
          </div>
        </div>
      </div>

      {!hideInfo && (
        <div className="text-center px-4">
          <h3 className="text-subheading font-bold text-jet-black leading-tight">{name}</h3>
          {description && <p className="text-body-sm text-ash-gray mt-1">{description}</p>}
          {earnedAt && (
            <p className="text-body-sm text-amber-700 font-medium mt-2">
              {t("medal.earned_on", { date: new Date(earnedAt).toLocaleDateString(i18n.language, { day: "numeric", month: "long", year: "numeric" }) })}
            </p>
          )}
        </div>
      )}

    </div>
  );
}


// ─── Modal ─────────────────────────────────────────────────────────────────────

interface ModalProps {
  imageUrl: string;
  name: string;
  description?: string | null;
  tier: string;
  earnedAt?: string | null;
  onClose: () => void;
  backgroundUrl?: string;
  location?: string;
  collectionName?: string;
  collectionProgress?: number;
  collectionTotal?: number;
}

export function MedalModal({
  imageUrl, name, description, tier, earnedAt, onClose,
  backgroundUrl, location, collectionName, collectionProgress, collectionTotal,
}: ModalProps) {
  const { t, i18n } = useTranslation();
  const progressPct = collectionTotal ? ((collectionProgress ?? 0) / collectionTotal) * 100 : 0;
  const earnedFormatted = earnedAt
    ? new Date(earnedAt).toLocaleDateString(i18n.language, { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden">
      {/* Fondo: foto del monumento muy difuminada y muy brillante → efecto crema cálida */}
      <div
        className="fixed inset-0"
        style={{
          backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : undefined,
          backgroundColor: backgroundUrl ? undefined : "#F5F2EE",
          backgroundSize: "cover",
          backgroundPosition: "center 30%",
          filter: "blur(55px) brightness(2.1) saturate(0.12)",
          transform: "scale(1.25)",
        }}
      />
      {/* Capa blanca sólida — evita que se cuele el contenido de atrás */}
      <div className="fixed inset-0 bg-[#F5F2EE]/88" />

      {/* Contenido */}
      <div className="relative z-10 min-h-full flex flex-col items-center px-5 pt-12 pb-8">

        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 size-8 flex items-center justify-center"
          aria-label={t("common.close")}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 2l12 12M14 2L2 14" stroke="#211922" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Moneda 3D */}
        <div className="mb-3 mt-2">
          <MedalCard imageUrl={imageUrl} name={name} description={description} tier={tier} size={290} hideInfo />
        </div>

        {/* Separador rojo */}
        <div className="w-7 h-[3px] rounded-full bg-pinterest-red mb-5 mt-1" />

        {/* Nombre */}
        <h1 className="text-[1.75rem] font-black text-jet-black text-center leading-tight mb-1 px-2">{name}</h1>

        {/* Ubicación */}
        {location && <p className="text-body text-ash-gray mb-4">{location}</p>}

        {/* Badge de rareza — ámbar sobre crema */}
        <div className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-1.5 mb-5">
          <svg width="12" height="13" viewBox="0 0 12 13" fill="none">
            <path d="M6 1L1 3.2V6.8C1 9.4 3.2 11.7 6 12.4C8.8 11.7 11 9.4 11 6.8V3.2L6 1Z" fill="#92400E"/>
          </svg>
          <span className="text-body-sm font-semibold text-amber-800">{t(`medal.rarity.${tier}`, { defaultValue: t("medal.rarity.fallback") })}</span>
        </div>

        {/* Fecha */}
        {earnedFormatted && (
          <div className="flex items-center gap-2 text-graphite mb-5">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <rect x="1" y="2.5" width="13" height="11.5" rx="2" stroke="#666" strokeWidth="1.3" fill="none"/>
              <path d="M5 1V4M10 1V4M1 6h13" stroke="#666" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <span className="text-body-sm text-graphite">{t("medal.earned_on", { date: earnedFormatted })}</span>
          </div>
        )}

        {/* Tarjeta de colección */}
        {collectionName && collectionTotal != null && (
          <div className="w-full rounded-2xl bg-canvas-white border border-whisper-gray p-4 mb-5">
            <div className="flex items-center gap-3">
              {/* Icono */}
              <div className="size-12 rounded-full bg-[#F5F2EE] flex items-center justify-center shrink-0">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M11 3L5 7v12h4v-5h4v5h4V7L11 3z" stroke="#9E9E9E" strokeWidth="1.4" fill="none" strokeLinejoin="round"/>
                  <path d="M9 14v-3h4v3" stroke="#9E9E9E" strokeWidth="1.3" fill="none"/>
                </svg>
              </div>
              {/* Título + barra */}
              <div className="flex-1 min-w-0">
                <p className="text-body font-bold text-jet-black leading-snug mb-2">{collectionName}</p>
                <div className="w-full h-1.5 rounded-full bg-whisper-gray overflow-hidden">
                  <div
                    className="h-full rounded-full bg-pinterest-red transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
              {/* Contador */}
              <div className="text-right shrink-0 ml-1">
                <p className="text-[1.6rem] font-black text-pinterest-red leading-none">{collectionProgress}</p>
                <p className="text-body-sm text-ash-gray leading-tight">/ {collectionTotal}</p>
                <p className="text-[10px] text-ash-gray leading-tight mt-0.5 whitespace-pre-line">{t("medal.monuments_discovered")}</p>
              </div>
            </div>
          </div>
        )}

        {/* Pista girar */}
        <div className="flex flex-col items-center gap-1 mb-8 mt-1">
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
            <path d="M12 8V6C12 5 13 4 14 4C15 4 16 5 16 6V11M14 4C14 3 15 2 16 2C17 2 18 3 18 4V11M16 3C16 2 17 1.5 18 1.5C19 1.5 20 2.5 20 3.5V11M18 4C18 3 19 2.5 20 2.5C21 2.5 22 3.5 22 5V17C22 20.3 19.3 23 16 23H14C11.2 23 9 20.8 9 18V14C9 13 10 12 11 12H11.5C11.8 12 12 12.2 12 12.5V14" stroke="#9E9E9E" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M4 13h3M23 13h3" stroke="#9E9E9E" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M5.5 11l-1.5 2 1.5 2M24.5 11l1.5 2-1.5 2" stroke="#9E9E9E" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p className="text-body font-semibold text-graphite text-center mt-1">{t("medal.rotate_title")}</p>
          <p className="text-body-sm text-ash-gray text-center">{t("medal.rotate_hint")}</p>
        </div>

        <div className="flex-1" />

        {/* Botón volver */}
        <button
          onClick={onClose}
          className="w-full rounded-full bg-pinterest-red text-canvas-white py-4 text-body font-semibold active:scale-[0.98] transition-transform shadow-sm"
        >
          {t("nav.back")}
        </button>
      </div>
    </div>
  );
}


// ─── Celebración al ganar una medalla ──────────────────────────────────────────

interface CelebrationProps {
  imageUrl: string;
  name: string;
  description?: string | null;
  tier: string;
  earnedAt?: string | null;
  onClose: () => void;
}

const PARTICLE_COUNT = 18;

export function MedalCelebration({ imageUrl, name, description, tier, earnedAt, onClose }: CelebrationProps) {
  const { t } = useTranslation();
  const particles = useMemo(
    () => Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 1.5 + Math.random() * 2,
      opacity: 0.4 + Math.random() * 0.6,
    })),
    [],
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-jet-black/90 backdrop-blur-lg px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute size-1 rounded-full bg-amber-400 animate-ping"
            style={{
              left: `${p.left}%`,
              top:  `${p.top}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              opacity: p.opacity,
            }}
          />
        ))}
      </div>

      <div className="relative flex flex-col items-center gap-4 w-full max-w-xs">
        <div className="rounded-full bg-amber-500/20 border border-amber-400/40 px-4 py-1.5 mb-2">
          <p className="text-body-sm font-semibold text-amber-300 tracking-wide uppercase">{t("medal.new_medal")}</p>
        </div>

        <MedalCard
          imageUrl={imageUrl}
          name={name}
          description={description}
          tier={tier}
          earnedAt={earnedAt}
          size={260}
        />

        <button
          onClick={onClose}
          className="mt-2 w-full rounded-full bg-pinterest-red text-canvas-white py-4 text-body font-semibold active:scale-[0.98] transition-transform"
        >
          {t("medal.great")}
        </button>
      </div>
    </div>
  );
}
