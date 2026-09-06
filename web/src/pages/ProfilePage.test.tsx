// @vitest-environment jsdom
import { act } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "../lib/i18n";
import { render } from "../test/render";
import { ProfilePage } from "./ProfilePage";

const mocks = vi.hoisted(() => ({
  getUserMedals: vi.fn(),
  getCollectionsProgress: vi.fn(),
  getFollowers: vi.fn(),
  getFollowing: vi.fn(),
  getMyProfileSettings: vi.fn(),
}));

vi.mock("../context/authContext", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "explorer@example.com",
      user_metadata: { username: "Explorer", locale: "en" },
    },
    loading: false,
    signOut: vi.fn(),
  }),
}));
vi.mock("../lib/api/achievements", () => ({
  getUserMedals: mocks.getUserMedals,
  getCollectionsProgress: mocks.getCollectionsProgress,
}));
vi.mock("../lib/api/social", () => ({
  getFollowers: mocks.getFollowers,
  getFollowing: mocks.getFollowing,
}));
vi.mock("../lib/api/profile", () => ({
  getMyProfileSettings: mocks.getMyProfileSettings,
  syncProfile: vi.fn(),
  updatePreferredLocale: vi.fn(),
  updateProfileVisibility: vi.fn(),
}));
vi.mock("../lib/supabaseClient", () => ({
  publicStorageUrl: () => "hero.jpg",
  supabase: { auth: { updateUser: vi.fn(), refreshSession: vi.fn() } },
}));
vi.mock("../components/MedalCard", () => ({ MedalModal: () => null }));
vi.mock("../components/GyroPermissionBanner", () => ({ GyroPermissionBanner: () => null }));

let view: Awaited<ReturnType<typeof render>>;

async function mountProfile() {
  view = await render(<MemoryRouter initialEntries={["/profile"]}><ProfilePage /></MemoryRouter>);
  await act(async () => { await Promise.resolve(); });
}

beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.resetAllMocks();
  mocks.getUserMedals.mockResolvedValue([]);
  mocks.getCollectionsProgress.mockResolvedValue([]);
  mocks.getFollowers.mockResolvedValue([]);
  mocks.getFollowing.mockResolvedValue([]);
  mocks.getMyProfileSettings.mockResolvedValue({ locale: "en", is_public: false });
  await i18n.changeLanguage("es");
});

afterEach(async () => {
  await view?.unmount();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("profile loading", () => {
  it("does not refetch when applying the profile language changes t", async () => {
    await mountProfile();
    await act(async () => { await Promise.resolve(); });

    expect(i18n.resolvedLanguage).toBe("en");
    expect(mocks.getUserMedals).toHaveBeenCalledTimes(1);
    expect(mocks.getCollectionsProgress).toHaveBeenCalledTimes(1);
    expect(view.container.textContent).toContain("Explorer");
  });

  it("leaves the loading state when one profile request hangs", async () => {
    vi.useFakeTimers();
    mocks.getUserMedals.mockReturnValue(new Promise(() => {}));

    await mountProfile();
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });

    expect(view.container.textContent).toContain(i18n.t("user_profile.load_error_title"));
    expect(view.container.textContent).toContain(i18n.t("common.retry"));
  });
});
