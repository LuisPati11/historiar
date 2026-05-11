import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { GyroPermissionBanner } from "./components/GyroPermissionBanner";
import { HomePage } from "./pages/HomePage";
import { ARPage } from "./pages/ARPage";
import { AuthPage } from "./pages/AuthPage";
import { ProfilePage } from "./pages/ProfilePage";
import { FeedPage } from "./pages/FeedPage";
import { SearchPage } from "./pages/SearchPage";
import { ScanPage } from "./pages/ScanPage";
import { UserProfilePage } from "./pages/UserProfilePage";
import { CollectionsPage } from "./pages/CollectionsPage";
import { MonumentDetailPage } from "./pages/MonumentDetailPage";
import "./lib/i18n";
import "./index.css";

// StrictMode desactivado: MindAR (si se reactiva) toma control exclusivo
// de cámara + WebGLRenderer y el doble-mount deja dos instancias en negro.
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <GyroPermissionBanner />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/ar/:monumentId" element={<ARPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/user/:userId" element={<UserProfilePage />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/monument/:monumentId" element={<MonumentDetailPage />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>,
);
