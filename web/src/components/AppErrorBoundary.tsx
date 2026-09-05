import { Component, type ErrorInfo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

function FatalErrorFallback() {
  const { t } = useTranslation();
  return (
    <main className="min-h-full flex items-center justify-center bg-canvas-white px-6 text-center">
      <div className="max-w-sm">
        <h1 className="text-heading font-bold text-jet-black">{t("common.unexpected_error")}</h1>
        <p className="mt-2 text-body text-ash-gray">{t("common.connection_error")}</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-full bg-pinterest-red px-6 py-3 text-body font-semibold text-canvas-white">
          {t("common.reload")}
        </button>
      </div>
    </main>
  );
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled application error", error, info.componentStack);
  }

  render() {
    return this.state.failed ? <FatalErrorFallback /> : this.props.children;
  }
}
