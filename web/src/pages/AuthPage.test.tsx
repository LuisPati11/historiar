// @vitest-environment jsdom
import { act } from "react";
import { BrowserRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../test/render";
import i18n from "../lib/i18n";
import { AuthPage } from "./AuthPage";

const mocks = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock("../lib/supabaseClient", () => ({
  publicStorageUrl: () => "https://example.com/hero.jpg",
  supabase: { auth: mocks },
}));

let authUser: { id: string } | null = null;
vi.mock("../context/authContext", () => ({
  useAuth: () => ({ user: authUser, loading: false }),
}));

let view: Awaited<ReturnType<typeof render>>;

function setInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.resetAllMocks();
  authUser = null;
  await i18n.changeLanguage("es");
  mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
  mocks.updateUser.mockResolvedValue({ error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: mocks.unsubscribe } } });
});

afterEach(async () => {
  await view?.unmount();
  vi.unstubAllGlobals();
});

async function mount(path: string) {
  window.history.replaceState(null, "", path);
  view = await render(<BrowserRouter><AuthPage /></BrowserRouter>);
}

describe("password recovery", () => {
  it("requests a recovery email that returns to the published auth route", async () => {
    await mount("/auth");

    const forgotButton = [...view.container.querySelectorAll("button")]
      .find((button) => button.textContent === i18n.t("auth.forgot_password"));
    await act(async () => forgotButton?.click());

    const email = view.container.querySelector<HTMLInputElement>("#auth-email")!;
    await act(async () => setInput(email, "explorer@example.com"));
    const form = view.container.querySelector("form")!;
    await act(async () => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));

    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith("explorer@example.com", {
      redirectTo: `${window.location.origin}/auth?mode=reset`,
    });
    expect(view.container.textContent).toContain(i18n.t("auth.recovery_sent_title"));
  });

  it("keeps a recovery session on the reset screen and saves the new password", async () => {
    authUser = { id: "explorer" };
    await mount("/auth?mode=reset");

    expect(window.location.pathname).toBe("/auth");
    expect(view.container.textContent).toContain(i18n.t("auth.reset_hero"));

    const password = view.container.querySelector<HTMLInputElement>("#auth-password")!;
    const confirmation = view.container.querySelector<HTMLInputElement>("#auth-password-confirmation")!;
    await act(async () => {
      setInput(password, "new-password-123");
      setInput(confirmation, "new-password-123");
    });
    const form = view.container.querySelector("form")!;
    await act(async () => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));

    expect(mocks.updateUser).toHaveBeenCalledWith({ password: "new-password-123" });
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(window.location.pathname).toBe("/auth");
    expect(view.container.textContent).toContain(i18n.t("auth.password_updated"));
  });
});
