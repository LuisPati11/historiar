import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthProvider } from "./context/AuthProvider";
import { AppErrorBoundary } from "./components/AppErrorBoundary";

const CHUNK_RECOVERY_KEY = "historiar:chunk-recovery";
const CHUNK_RECOVERY_WINDOW_MS = 5 * 60_000;
let chunkRecoveryStarted = false;

function recoverFromStaleChunk(): boolean {
  if (chunkRecoveryStarted) return true;

  let state = { at: 0, attempts: 0 };
  let storedValue: string | null;
  try {
    storedValue = sessionStorage.getItem(CHUNK_RECOVERY_KEY);
  } catch {
    return false;
  }
  try {
    const stored = JSON.parse(storedValue ?? "null") as typeof state | null;
    if (stored && Number.isFinite(stored.at) && Number.isInteger(stored.attempts)) state = stored;
  } catch {
    try {
      sessionStorage.removeItem(CHUNK_RECOVERY_KEY);
    } catch {
      return false;
    }
  }

  if (Date.now() - state.at > CHUNK_RECOVERY_WINDOW_MS) state = { at: Date.now(), attempts: 0 };
  if (state.attempts >= 2) return false;

  const attempt = state.attempts + 1;
  try {
    sessionStorage.setItem(CHUNK_RECOVERY_KEY, JSON.stringify({ at: Date.now(), attempts: attempt }));
  } catch {
    return false;
  }
  chunkRecoveryStarted = true;

  void (async () => {
    try {
      if ("caches" in window) {
        if (attempt === 1) {
          await caches.delete("js-chunks");
        } else {
          const names = await caches.keys();
          await Promise.all(names.map((name) => caches.delete(name)));
        }
      }

      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (attempt === 1) {
          await Promise.all(registrations.map((registration) => registration.update().catch(() => undefined)));
          await new Promise((resolve) => window.setTimeout(resolve, 750));
        } else {
          await Promise.all(registrations.map((registration) => registration.unregister()));
        }
      }
    } finally {
      window.location.reload();
    }
  })();

  return true;
}

function handlePreloadError(event: Event) {
  if (recoverFromStaleChunk()) event.preventDefault();
}

window.addEventListener("vite:preloadError", handlePreloadError);
if (import.meta.hot) {
  import.meta.hot.dispose(() => window.removeEventListener("vite:preloadError", handlePreloadError));
}

function lazyPage<T extends { default: React.ComponentType }>(
  factory: () => Promise<T>,
): React.LazyExoticComponent<T["default"]> {
  return lazy(() =>
    factory().catch((error: unknown) => {
      if (recoverFromStaleChunk()) return new Promise<never>(() => {});
      throw error;
    }),
  );
}

const HomePage = lazyPage(() => import("./pages/HomePage").then((module) => ({ default: module.HomePage })));
const ARPage = lazyPage(() => import("./pages/ARPage").then((module) => ({ default: module.ARPage })));
const AuthPage = lazyPage(() => import("./pages/AuthPage").then((module) => ({ default: module.AuthPage })));
const ProfilePage = lazyPage(() => import("./pages/ProfilePage").then((module) => ({ default: module.ProfilePage })));
const FeedPage = lazyPage(() => import("./pages/FeedPage").then((module) => ({ default: module.FeedPage })));
const SearchPage = lazyPage(() => import("./pages/SearchPage").then((module) => ({ default: module.SearchPage })));
const ScanPage = lazyPage(() => import("./pages/ScanPage").then((module) => ({ default: module.ScanPage })));
const UserProfilePage = lazyPage(() => import("./pages/UserProfilePage").then((module) => ({ default: module.UserProfilePage })));
const CollectionsPage = lazyPage(() => import("./pages/CollectionsPage").then((module) => ({ default: module.CollectionsPage })));
const CollectionDetailPage = lazyPage(() => import("./pages/CollectionDetailPage").then((module) => ({ default: module.CollectionDetailPage })));
const MonumentDetailPage = lazyPage(() => import("./pages/MonumentDetailPage").then((module) => ({ default: module.MonumentDetailPage })));
const NotFoundPage = lazyPage(() => import("./pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));

function RouteFallback() {
  const { t } = useTranslation();
  return (
    <main className="min-h-full flex items-center justify-center bg-canvas-white">
      <div role="status" className="size-9 rounded-full border-4 border-pinterest-red border-t-transparent animate-spin">
        <span className="sr-only">{t("common.loading")}</span>
      </div>
    </main>
  );
}

export function App() {
  return (
    <BrowserRouter useTransitions={false}>
      <AppErrorBoundary>
        <AuthProvider>
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
              <Route path="/collections/:collectionId" element={<CollectionDetailPage />} />
              <Route path="/monument/:monumentId" element={<MonumentDetailPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </AppErrorBoundary>
    </BrowserRouter>
  );
}
