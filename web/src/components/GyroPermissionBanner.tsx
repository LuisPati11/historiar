import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getOrientationPermissionRequest,
  getStoredGyroPermission,
  storeGyroPermission,
} from "../lib/deviceOrientation";

export function GyroPermissionBanner() {
  const { t } = useTranslation();
  const [show, setShow] = useState(
    () => getOrientationPermissionRequest() !== null && !getStoredGyroPermission(),
  );

  if (!show) return null;

  const handleActivate = async () => {
    try {
      const requestPermission = getOrientationPermissionRequest();
      const res = requestPermission ? await requestPermission() : "denied";
      storeGyroPermission(res === "granted" ? "granted" : "denied");
    } catch {
      storeGyroPermission("denied");
    }
    setShow(false);
  };

  const handleDismiss = () => {
    storeGyroPermission("denied");
    setShow(false);
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 rounded-2xl bg-canvas-white border border-whisper-gray shadow-lg px-4 py-3 flex items-center gap-3">
      <div className="size-10 rounded-full bg-[#F5F2EE] flex items-center justify-center shrink-0">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M3.5 10C3.5 6.41 6.41 3.5 10 3.5M10 3.5L8 1.5M10 3.5L8 5.5" stroke="#9E9E9E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16.5 10C16.5 13.59 13.59 16.5 10 16.5M10 16.5L12 18.5M10 16.5L12 14.5" stroke="#9E9E9E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="10" cy="10" r="2.5" stroke="#9E9E9E" strokeWidth="1.3" fill="none"/>
        </svg>
      </div>
      <p className="text-body-sm text-graphite flex-1 leading-snug">
        {t("gyro.prompt")}
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={handleDismiss} className="text-body-sm text-ash-gray font-medium px-2 py-1.5">
          {t("gyro.dismiss")}
        </button>
        <button
          onClick={handleActivate}
          className="rounded-2xl bg-pinterest-red text-canvas-white px-3 py-1.5 text-body-sm font-semibold active:scale-[0.98] transition-transform"
        >
          {t("gyro.activate")}
        </button>
      </div>
    </div>
  );
}
