// @vitest-environment jsdom
import { act } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { deferred, render } from "../test/render";
import { ARPage } from "./ARPage";

const mocks = vi.hoisted(() => ({
  t: (key: string) => key, navigate: vi.fn(), startMindAR: vi.fn(),
  startVisit: vi.fn(), completeVisit: vi.fn(), medals: vi.fn(),
  position: vi.fn(),
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: mocks.t }) }));
vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
  useParams: () => ({ monumentId: "11111111-1111-1111-8111-111111111111" }),
}));
vi.mock("../lib/i18n", () => ({ currentLocale: () => "es" }));
vi.mock("../lib/api/monuments", () => ({
  checkMonumentWithin: async () => true,
  getMonument: async () => ({ id: "11111111-1111-1111-8111-111111111111", name: "Toledo", mind_target_url: "target.mind", video_url: "history.mp4" }),
}));
vi.mock("../lib/api/visits", () => ({ startVisitVerification: mocks.startVisit, completeVisitVerification: mocks.completeVisit }));
vi.mock("../lib/api/achievements", () => ({ getNewlyEarnedMedals: mocks.medals }));
vi.mock("../ar/mindar", () => ({ startMindAR: mocks.startMindAR }));
vi.mock("../components/MedalCelebration", () => ({ MedalCelebration: () => <div>celebration</div> }));

let view: Awaited<ReturnType<typeof render>>;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.resetAllMocks();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  mocks.position.mockImplementation((resolve) => resolve({ coords: { latitude: 38.9863, longitude: -3.9286 } }));
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: mocks.position } });
  mocks.startVisit.mockResolvedValue(null);
  mocks.medals.mockResolvedValue([]);
});
afterEach(async () => {
  if (view?.container.isConnected) await view.unmount();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function click(label: string) {
  const button = [...view.container.querySelectorAll("button")].find((item) => item.textContent === label);
  expect(button).toBeTruthy();
  await act(async () => button!.click());
}

it("releases a camera whose startup finishes after leaving AR", async () => {
  const startup = deferred<() => Promise<void>>();
  const cleanup = vi.fn().mockResolvedValue(undefined);
  mocks.startMindAR.mockReturnValue(startup.promise);
  view = await render(<ARPage />);
  await click("ar.start_scanner");
  expect(mocks.startMindAR).toHaveBeenCalledOnce();
  await view.unmount();
  await act(async () => startup.resolve(cleanup));
  expect(cleanup).toHaveBeenCalledOnce();
  expect(document.documentElement.classList.contains("theme-ar")).toBe(false);
});

it("does not request a camera after a GPS result arrives on an abandoned page", async () => {
  view = await render(<ARPage />);
  let finishGps!: (value: unknown) => void;
  mocks.position.mockImplementation((resolve) => { finishGps = resolve; });
  await click("ar.start_scanner");
  await view.unmount();
  await act(async () => finishGps({ coords: { latitude: 38.9863, longitude: -3.9286 } }));
  expect(mocks.startMindAR).not.toHaveBeenCalled();
  expect(mocks.startVisit).not.toHaveBeenCalled();
});

it("lets guests play and retry rejected media without saving a visit", async () => {
  mocks.startMindAR.mockImplementation(async ({ onTargetFound }) => {
    onTargetFound();
    return async () => {};
  });
  view = await render(<ARPage />);
  await click("ar.start_scanner");
  vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error("Autoplay blocked"));
  await click("ar.start_experience");
  expect(view.container.querySelector('[role="alert"]')?.textContent).toContain("ar.media_error");
  expect(mocks.completeVisit).not.toHaveBeenCalled();
  await click("common.retry");
  expect(view.container.querySelector('[role="alert"]')).toBeNull();
});
