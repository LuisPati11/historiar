// @vitest-environment jsdom
import { act } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { deferred, render } from "../test/render";
import { ScanPage } from "./ScanPage";

const mocks = vi.hoisted(() => ({ start: vi.fn(), destroy: vi.fn(), stop: vi.fn(), navigate: vi.fn(), t: (key: string) => key }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: mocks.t }) }));
vi.mock("react-router-dom", () => ({ useNavigate: () => mocks.navigate }));
vi.mock("qr-scanner", () => ({ default: class {
  start = mocks.start;
  destroy = mocks.destroy;
  stop = mocks.stop;
} }));
let view: Awaited<ReturnType<typeof render>>;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.resetAllMocks();
});
afterEach(async () => {
  if (view.container.isConnected) await view.unmount();
  vi.unstubAllGlobals();
});

it("does not start the camera if permission resolves after leaving the page", async () => {
  const permission = deferred<{ state: string }>();
  vi.stubGlobal("navigator", { permissions: { query: () => permission.promise } });
  view = await render(<ScanPage />);
  await view.unmount();
  await act(async () => permission.resolve({ state: "granted" }));
  expect(mocks.start).not.toHaveBeenCalled();
});

it("disposes a scanner whose start resolves after unmount", async () => {
  const start = deferred<void>();
  mocks.start.mockReturnValue(start.promise);
  vi.stubGlobal("navigator", { permissions: { query: async () => ({ state: "granted" }) } });
  view = await render(<ScanPage />);
  await view.unmount();
  await act(async () => start.resolve());
  expect(mocks.destroy).toHaveBeenCalledTimes(2);
  expect(mocks.navigate).not.toHaveBeenCalled();
});
