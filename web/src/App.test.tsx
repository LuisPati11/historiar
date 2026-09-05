// @vitest-environment jsdom
import { act } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { render } from "./test/render";
import { App } from "./App";
import i18n from "./lib/i18n";

vi.mock("./context/AuthProvider", () => ({ AuthProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("./context/authContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("./lib/api/monuments", () => ({ getAllMonuments: async () => [], getNearbyMonuments: async () => [], getCollectionMonuments: async () => [] }));
vi.mock("./lib/api/achievements", () => ({ getCollectionsProgress: async () => [] }));
vi.mock("./components/MonumentsMap", () => ({ MonumentsMap: () => null }));

let view: Awaited<ReturnType<typeof render>>;
afterEach(async () => { await view?.unmount(); vi.unstubAllGlobals(); });

it("navigates from the home page to lazily loaded collections and back", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  await i18n.changeLanguage("es");
  window.history.replaceState(null, "", "/");
  view = await render(<App />);
  await act(async () => { await vi.dynamicImportSettled(); });
  const collections = view.container.querySelector<HTMLAnchorElement>('a[href="/collections"]');
  expect(collections).not.toBeNull();
  await act(async () => { collections!.click(); });
  await act(async () => { await vi.dynamicImportSettled(); });
  expect(window.location.pathname).toBe("/collections");
  expect(view.container.querySelector("h1")?.textContent).toBe(i18n.t("collections.title"));
  const home = view.container.querySelector<HTMLAnchorElement>('a[href="/"]');
  await act(async () => { home!.click(); });
  await act(async () => { await vi.dynamicImportSettled(); });
  expect(window.location.pathname).toBe("/");
});
