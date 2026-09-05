// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
import { startMindAR } from "./mindar";

const mocks = vi.hoisted(() => ({
  start: vi.fn(), stop: vi.fn(), stopTrack: vi.fn(),
  setClearColor: vi.fn(), setAnimationLoop: vi.fn(), dispose: vi.fn(), render: vi.fn(),
}));
vi.mock("mind-ar/dist/mindar-image-three.prod.js", () => ({
  MindARThree: class {
    renderer = mocks;
    scene = {};
    camera = {};
    start = mocks.start;
    stop = mocks.stop;
    constructor({ container }: { container: HTMLElement }) {
      const video = document.createElement("video");
      Object.defineProperty(video, "srcObject", {
        value: { getTracks: () => [{ stop: mocks.stopTrack }] }, writable: true,
      });
      container.append(video);
    }
    addAnchor() { return {}; }
  },
}));
beforeEach(() => { vi.resetAllMocks(); });

it("stops the camera even if initialization and MindAR.stop both fail", async () => {
  const failure = new Error("Invalid target");
  mocks.start.mockRejectedValue(failure);
  mocks.stop.mockImplementation(() => { throw new Error("Controller unavailable"); });
  const container = document.createElement("div");
  await expect(startMindAR({ container, targetImageUrl: "target.mind" })).rejects.toBe(failure);
  expect(mocks.stopTrack).toHaveBeenCalledOnce();
  expect(mocks.dispose).toHaveBeenCalledOnce();
  expect(container.childElementCount).toBe(0);
});

it("releases resources once even when cleanup runs twice", async () => {
  const container = document.createElement("div");
  const cleanup = await startMindAR({ container, targetImageUrl: "target.mind" });
  await Promise.all([cleanup(), cleanup()]);
  expect(mocks.stop).toHaveBeenCalledOnce();
  expect(mocks.stopTrack).toHaveBeenCalledOnce();
  expect(mocks.dispose).toHaveBeenCalledOnce();
  expect(container.childElementCount).toBe(0);
});
