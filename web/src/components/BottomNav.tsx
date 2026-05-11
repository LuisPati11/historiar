import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function IconHome({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M2 10L11 2l9 8v9a1 1 0 01-1 1H14v-5h-4v5H4a1 1 0 01-1-1V10z"
        stroke={active ? "#C0392B" : "#9E9E9E"} strokeWidth="1.6" fill="none" strokeLinejoin="round"/>
    </svg>
  );
}

function IconFeed({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="3" width="16" height="16" rx="2" stroke={active ? "#C0392B" : "#9E9E9E"} strokeWidth="1.6" fill="none"/>
      <line x1="7" y1="8" x2="15" y2="8" stroke={active ? "#C0392B" : "#9E9E9E"} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="7" y1="11" x2="15" y2="11" stroke={active ? "#C0392B" : "#9E9E9E"} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="7" y1="14" x2="12" y2="14" stroke={active ? "#C0392B" : "#9E9E9E"} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconTrophy({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M7 3h8v7a4 4 0 01-8 0V3z" stroke={active ? "#C0392B" : "#9E9E9E"} strokeWidth="1.6" fill="none" strokeLinejoin="round"/>
      <path d="M7 6H4a2 2 0 002 2h1M15 6h3a2 2 0 01-2 2h-1" stroke={active ? "#C0392B" : "#9E9E9E"} strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="11" y1="14" x2="11" y2="18" stroke={active ? "#C0392B" : "#9E9E9E"} strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="7" y1="19" x2="15" y2="19" stroke={active ? "#C0392B" : "#9E9E9E"} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function IconUser({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="8" r="3.5" stroke={active ? "#C0392B" : "#9E9E9E"} strokeWidth="1.6" fill="none"/>
      <path d="M4 19c0-3.866 3.134-7 7-7h.5c3.866 0 7 3.134 7 7" stroke={active ? "#C0392B" : "#9E9E9E"} strokeWidth="1.6" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

function IconQR() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <rect x="2" y="2" width="9" height="9" rx="1.5" stroke="white" strokeWidth="1.8"/>
      <rect x="15" y="2" width="9" height="9" rx="1.5" stroke="white" strokeWidth="1.8"/>
      <rect x="2" y="15" width="9" height="9" rx="1.5" stroke="white" strokeWidth="1.8"/>
      <rect x="4.5" y="4.5" width="4" height="4" fill="white" rx="0.5"/>
      <rect x="17.5" y="4.5" width="4" height="4" fill="white" rx="0.5"/>
      <rect x="4.5" y="17.5" width="4" height="4" fill="white" rx="0.5"/>
      <rect x="15" y="15" width="3.5" height="3.5" fill="white" rx="0.5"/>
      <rect x="19.5" y="15" width="3.5" height="3.5" fill="white" rx="0.5"/>
      <rect x="15" y="19.5" width="3.5" height="3.5" fill="white" rx="0.5"/>
      <rect x="19.5" y="19.5" width="3.5" height="3.5" fill="white" rx="0.5"/>
    </svg>
  );
}

export function BottomNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-canvas-white border-t border-whisper-gray safe-area-bottom">
      <ul className="flex items-end max-w-lg mx-auto">

        <li className="flex-1">
          <NavLink to="/" end className={({ isActive }) =>
            `flex flex-col items-center justify-center py-3 gap-1 transition-colors ${isActive ? "text-pinterest-red" : "text-ash-gray"}`
          }>
            {({ isActive }) => (<><IconHome active={isActive}/><span className={`text-[11px] font-medium ${isActive ? "text-pinterest-red" : "text-ash-gray"}`}>{t("nav.home")}</span></>)}
          </NavLink>
        </li>

        <li className="flex-1">
          <NavLink to="/feed" className={({ isActive }) =>
            `flex flex-col items-center justify-center py-3 gap-1 transition-colors ${isActive ? "text-pinterest-red" : "text-ash-gray"}`
          }>
            {({ isActive }) => (<><IconFeed active={isActive}/><span className={`text-[11px] font-medium ${isActive ? "text-pinterest-red" : "text-ash-gray"}`}>Feed</span></>)}
          </NavLink>
        </li>

        {/* Botón QR central */}
        <li className="flex-1 flex justify-center pb-1">
          <button
            onClick={() => navigate("/scan")}
            className="-mt-6 w-14 h-14 rounded-full bg-pinterest-red shadow-lg flex items-center justify-center active:scale-95 transition-transform border-4 border-canvas-white"
            aria-label={t("scan.title")}
          >
            <IconQR />
          </button>
        </li>

        <li className="flex-1">
          <NavLink to="/collections" className={({ isActive }) =>
            `flex flex-col items-center justify-center py-3 gap-1 transition-colors ${isActive ? "text-pinterest-red" : "text-ash-gray"}`
          }>
            {({ isActive }) => (<><IconTrophy active={isActive}/><span className={`text-[11px] font-medium ${isActive ? "text-pinterest-red" : "text-ash-gray"}`}>{t("nav.achievements")}</span></>)}
          </NavLink>
        </li>

        <li className="flex-1">
          <NavLink to="/profile" className={({ isActive }) =>
            `flex flex-col items-center justify-center py-3 gap-1 transition-colors ${isActive ? "text-pinterest-red" : "text-ash-gray"}`
          }>
            {({ isActive }) => (<><IconUser active={isActive}/><span className={`text-[11px] font-medium ${isActive ? "text-pinterest-red" : "text-ash-gray"}`}>{t("nav.profile")}</span></>)}
          </NavLink>
        </li>

      </ul>
    </nav>
  );
}
