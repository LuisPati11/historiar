import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <main className="min-h-full flex items-center justify-center bg-canvas-white px-6 text-center">
      <div>
        <p className="text-display font-black text-pinterest-red">404</p>
        <h1 className="mt-2 text-heading font-bold text-jet-black">{t("common.not_found")}</h1>
        <button type="button" onClick={() => navigate("/", { replace: true })} className="mt-6 rounded-full bg-pinterest-red px-6 py-3 text-body font-semibold text-canvas-white">
          {t("common.back_home")}
        </button>
      </div>
    </main>
  );
}
