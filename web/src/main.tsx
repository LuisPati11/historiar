import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { GyroPermissionBanner } from "./components/GyroPermissionBanner";
import "./lib/i18n";
import "./index.css";

const HomePage = lazy(() => import("./pages/HomePage").then((m) => ({ default: m.HomePage })));
const ARPage = lazy(() => import("./pages/ARPage").then((m) => ({ default: m.ARPage })));
const AuthPage = lazy(() => import("./pages/AuthPage").then((m) => ({ default: m.AuthPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const FeedPage = lazy(() => import("./pages/FeedPage").then((m) => ({ default: m.FeedPage })));
const SearchPage = lazy(() => import("./pages/SearchPage").then((m) => ({ default: m.SearchPage })));
const ScanPage = lazy(() => import("./pages/ScanPage").then((m) => ({ default: m.ScanPage })));
const UserProfilePage = lazy(() => import("./pages/UserProfilePage").then((m) => ({ default: m.UserProfilePage })));
const CollectionsPage = lazy(() => import("./pages/CollectionsPage").then((m) => ({ default: m.CollectionsPage })));
const MonumentDetailPage = lazy(() => import("./pages/MonumentDetailPage").then((m) => ({ default: m.MonumentDetailPage })));

function RouteFallback() {
  return (
    <main className="min-h-full flex items-center justify-center bg-canvas-white">
      <div className="w-9 h-9 rounded-full border-4 border-pinterest-red border-t-transparent animate-spin" />
    </main>
  );
}

// StrictMode desactivado: MindAR (si se reactiva) toma control exclusivo
// de cámara + WebGLRenderer y el doble-mount deja dos instancias en negro.
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <GyroPermissionBanner />
      <Suspense fallback={<RouteFallback />}>
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
      </Suspense>
    </AuthProvider>
  </BrowserRouter>,
);
