// @vitest-environment jsdom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { deferred, render } from "../test/render";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./authContext";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(), getUser: vi.fn(), onAuthStateChange: vi.fn(),
  profile: vi.fn(), changeLanguage: vi.fn(), unsubscribe: vi.fn(),
}));
vi.mock("../lib/supabaseClient", () => ({ supabase: {
  auth: mocks,
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
} }));
vi.mock("../lib/i18n", () => ({
  default: { resolvedLanguage: "es", changeLanguage: mocks.changeLanguage },
  normalizeLocale: (value: string) => value === "en" ? "en" : "es",
}));

const session = (id: string, token = id) => ({
  user: { id, app_metadata: {}, aud: "authenticated", created_at: "2026-01-01", user_metadata: { locale: "en" } } as User,
  access_token: token,
} as Session);
function Status() {
  const { user, session, loading } = useAuth();
  return <output>{loading ? "loading" : `${user?.id ?? "guest"}:${session?.access_token ?? ""}`}</output>;
}
let notify: (event: AuthChangeEvent, value: Session | null) => void;
let view: Awaited<ReturnType<typeof render>>;
async function event(name: AuthChangeEvent, value: Session | null) {
  await act(async () => { notify(name, value); await vi.advanceTimersByTimeAsync(0); });
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers();
  vi.resetAllMocks();
  mocks.getSession.mockResolvedValue({ data: { session: null } });
  mocks.profile.mockResolvedValue({ data: { locale: "en" } });
  mocks.changeLanguage.mockResolvedValue(undefined);
  mocks.onAuthStateChange.mockImplementation((callback) => {
    notify = callback;
    return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
  });
});
afterEach(async () => {
  await view?.unmount();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
async function mount() { view = await render(<AuthProvider><Status /></AuthProvider>); }

describe("session lifecycle", () => {
  it("does not restore a signed-out session when user validation arrives late", async () => {
    const user = deferred<unknown>();
    mocks.getUser.mockReturnValue(user.promise);
    await mount();
    await event("SIGNED_IN", session("alice"));
    await event("SIGNED_OUT", null);
    await act(async () => user.resolve({ data: { user: session("alice").user }, error: null }));
    expect(view.container.textContent).toBe("guest:");
    expect(mocks.changeLanguage).not.toHaveBeenCalled();
  });

  it("ignores the initial session read after a newer sign-in", async () => {
    const initial = deferred<unknown>();
    mocks.getSession.mockReturnValue(initial.promise);
    mocks.getUser.mockResolvedValue({ data: { user: session("bob").user }, error: null });
    await mount();
    await event("SIGNED_IN", session("bob"));
    await act(async () => initial.resolve({ data: { session: session("alice") } }));
    expect(view.container.textContent).toBe("bob:bob");
  });

  it("keeps the refreshed token when an earlier validation finishes last", async () => {
    const old = deferred<unknown>();
    mocks.getUser.mockReturnValueOnce(old.promise)
      .mockResolvedValue({ data: { user: session("alice").user }, error: null });
    await mount();
    await event("SIGNED_IN", session("alice", "old"));
    await event("TOKEN_REFRESHED", session("alice", "new"));
    await act(async () => old.resolve({ data: { user: session("alice").user }, error: null }));
    expect(view.container.textContent).toBe("alice:new");
  });

  it("clears a session rejected by Auth", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { status: 401 } });
    await mount();
    await event("SIGNED_IN", session("alice"));
    expect(view.container.textContent).toBe("guest:");
  });

  it("preserves the local session during a network failure", async () => {
    mocks.getUser.mockRejectedValue(new TypeError("Failed to fetch"));
    await mount();
    await event("SIGNED_IN", session("alice"));
    expect(view.container.textContent).toBe("alice:alice");
  });

  it("does not leave guest navigation waiting forever for session storage", async () => {
    mocks.getSession.mockReturnValue(new Promise(() => {}));
    await mount();
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(view.container.textContent).toBe("guest:");
  });

  it("ignores language lookup after sign-out", async () => {
    const profile = deferred<unknown>();
    mocks.profile.mockReturnValue(profile.promise);
    mocks.getUser.mockResolvedValue({ data: { user: session("alice").user }, error: null });
    await mount();
    await event("SIGNED_IN", session("alice"));
    await event("SIGNED_OUT", null);
    await act(async () => profile.resolve({ data: { locale: "en" } }));
    expect(mocks.changeLanguage).not.toHaveBeenCalled();
  });
});
