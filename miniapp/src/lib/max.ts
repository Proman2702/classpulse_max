/**
 * Тонкая обёртка над MAX Bridge (window.WebApp).
 * Вне MAX (обычный браузер) все методы безопасно деградируют.
 * Документация: https://dev.max.ru/docs/webapps/bridge
 */

interface MaxWebApp {
  platform?: "ios" | "android" | "desktop" | "web" | null;
  initData?: string;
  initDataUnsafe?: {
    user?: { id: number; first_name?: string; last_name?: string; username?: string; photo_url?: string };
  };
  ready?: () => void;
  shareMaxContent?: (content: { text?: string; link?: string }) => Promise<unknown> | void;
  openLink?: (url: string) => void;
  openMaxLink?: (url: string) => void;
  BackButton?: {
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  HapticFeedback?: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => Promise<unknown> | void;
    notificationOccurred: (type: "success" | "warning" | "error") => Promise<unknown> | void;
    selectionChanged?: () => Promise<unknown> | void;
  };
}

declare global {
  interface Window {
    WebApp?: MaxWebApp;
  }
}

// The CDN defines WebApp in ordinary browsers too, with no MAX transport.
// This detects UI capabilities only; authentication still uses Supabase Auth.
const bridge = (): MaxWebApp | undefined => {
  const app = window.WebApp;
  return app?.platform && app.initData ? app : undefined;
};

const runHaptic = (action: () => Promise<unknown> | void) => {
  try {
    void Promise.resolve(action()).catch((error: unknown) => console.warn("MAX haptic feedback unavailable:", error));
  } catch (error: unknown) {
    console.warn("MAX haptic feedback unavailable:", error);
  }
};

export const MAX_LINK_PREFIX = "https://max.ru/";

export const isMaxLink = (value: string) => value.startsWith(MAX_LINK_PREFIX) && value.length > MAX_LINK_PREFIX.length;

export const max = {
  initData: () => bridge()?.initData || "",

  appLink: () => {
    const bot = (import.meta.env?.VITE_MAX_BOT_USERNAME || "t98_hakaton_max_bot").replace(/^@/, "");
    return `${MAX_LINK_PREFIX}${bot}?startapp`;
  },

  async share(text: string, link: string): Promise<"shared" | "copied"> {
    const app = bridge();
    if (app?.shareMaxContent) {
      await app.shareMaxContent({ text, link });
      return "shared";
    }
    if (navigator.share) {
      await navigator.share({ text, url: link });
      return "shared";
    }
    await navigator.clipboard.writeText(`${text}\n${link}`);
    return "copied";
  },

  ready() {
    bridge()?.ready?.();
    document.documentElement.dataset.platform = bridge()?.platform ?? "web";
  },

  /** Имя пользователя MAX — чтобы подставить его в регистрацию. */
  userFirstName: () => bridge()?.initDataUnsafe?.user?.first_name ?? "",

  /** Открывает ссылку max.ru внутри мессенджера, остальные — во внешнем браузере. */
  open(url: string) {
    const app = bridge();
    if (isMaxLink(url) && app?.openMaxLink) return app.openMaxLink(url);
    if (app?.openLink) return app.openLink(url);
    window.open(url, "_blank", "noopener");
  },

  tap: () => runHaptic(() => bridge()?.HapticFeedback?.impactOccurred("light")),
  success: () => runHaptic(() => bridge()?.HapticFeedback?.notificationOccurred("success")),
  error: () => runHaptic(() => bridge()?.HapticFeedback?.notificationOccurred("error")),

  /** Показывает системную кнопку «Назад» MAX. Возвращает функцию отписки. */
  onBack(callback: () => void) {
    const button = bridge()?.BackButton;
    if (!button) return () => undefined;
    button.onClick(callback);
    button.show();
    return () => {
      button.offClick(callback);
      button.hide();
    };
  },
};
