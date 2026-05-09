import { NavLink, useNavigate } from "react-router-dom";

const LEFT_TABS = [
  { to: "/",     icon: "🏛️", label: "Inicio" },
  { to: "/feed", icon: "📰", label: "Feed"   },
];

const RIGHT_TABS = [
  { to: "/collections", icon: "🏆", label: "Logros"  },
  { to: "/profile",     icon: "👤", label: "Perfil"  },
];

export function BottomNav() {
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-canvas-white border-t border-whisper-gray safe-area-bottom">
      <ul className="flex items-end">
        {LEFT_TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${
                  isActive ? "text-pinterest-red" : "text-ash-gray"
                }`
              }
            >
              <span className="text-xl leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
            </NavLink>
          </li>
        ))}

        {/* Botón escanear central */}
        <li className="flex-1 flex justify-center">
          <button
            onClick={() => navigate("/scan")}
            className="-mt-5 w-16 h-16 rounded-full bg-pinterest-red shadow-lg flex items-center justify-center text-canvas-white text-3xl active:scale-95 transition-transform border-4 border-canvas-white"
            aria-label="Escanear QR"
          >
            ⬛
          </button>
        </li>

        {RIGHT_TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${
                  isActive ? "text-pinterest-red" : "text-ash-gray"
                }`
              }
            >
              <span className="text-xl leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
