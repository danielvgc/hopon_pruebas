'use client';

import * as React from "react";
import { Api, HopOnUser, registerUnauthorizedHandler, setAccessToken, API_BASE_URL } from "@/lib/api";

type AuthStatus = "loading" | "authenticated" | "guest";

type AuthContextValue = {
  status: AuthStatus;
  user: HopOnUser | null;
  accessToken: string | null;
  loginWithGoogle: () => Promise<void>;
  loginAsDemo: (opts?: { username?: string; email?: string }) => Promise<void>;
  signup: (opts: { email: string; password: string; username: string }) => Promise<void>;
  login: (opts: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  guestName: string | null;
  setGuestName: (value: string) => void;
  guestTokens: Record<number, string>;
  getGuestToken: (eventId: number) => string | undefined;
  rememberGuestToken: (eventId: number, token: string) => void;
  clearGuestToken: (eventId: number) => void;
  setUser: (user: HopOnUser | null) => void;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

// Note: API_ORIGIN logic kept but not used directly (used in API client for CORS)
(() => {
  try {
    const origin = new URL(API_BASE_URL).origin;
    if (typeof window !== "undefined" && origin === window.location.origin) {
      // If the configured API_BASE_URL resolves to the same origin as the
      // frontend (sometimes happens when NEXT_PUBLIC_API_BASE_URL is unset or
      // misconfigured), assume a local backend at port 8000 on localhost.
      const proto = window.location.protocol || "http:";
      const host = window.location.hostname || "localhost";
      return `${proto}//${host}:8000`;
    }
    return origin;
  } catch {
    return "http://localhost:8000";
  }
})();

const LOCAL_STORAGE_KEYS = {
  guestName: "hopon_guest_name",
  guestTokens: "hopon_guest_tokens",
  authPayload: "hoponAuthPayload",
};

const POPUP_FEATURES = "width=500,height=600";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<AuthStatus>("loading");
  const [user, setUser] = React.useState<HopOnUser | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [guestName, setGuestNameState] = React.useState<string | null>(null);
  const [guestTokens, setGuestTokens] = React.useState<Record<number, string>>({});
  const popupRef = React.useRef<Window | null>(null);
  const loginResolver = React.useRef<{
    resolve: () => void;
    reject: (reason?: unknown) => void;
  } | null>(null);

  // Keep API module in sync with access token.
  React.useEffect(() => {
    setAccessToken(token);
  }, [token]);

  const closePopup = React.useCallback(() => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    popupRef.current = null;
  }, []);

  const resetToGuest = React.useCallback(() => {
    setUser(null);
    setToken(null);
    setStatus("guest");
  }, []);

  const applyAuthPayload = React.useCallback((payload: { user?: HopOnUser; access_token?: string | null; needs_username_setup?: boolean }) => {
    let nextStatus: AuthStatus | null = null;
    if (payload.user) {
      // Add needs_username_setup flag to user object for checking in pages
      const userWithFlag: HopOnUser = {
        ...payload.user,
        needs_username_setup: payload.needs_username_setup || false,
      };
      setUser(userWithFlag);
      nextStatus = "authenticated";
    }
    if (payload.access_token) {
      setToken(payload.access_token);
      nextStatus = "authenticated";
    }
    if (nextStatus) {
      setStatus(nextStatus);
    }
  }, []);

  // Load guest state from localStorage.
  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedName = window.localStorage.getItem(LOCAL_STORAGE_KEYS.guestName);
    if (storedName) {
      setGuestNameState(storedName);
    }
    const storedTokens = window.localStorage.getItem(LOCAL_STORAGE_KEYS.guestTokens);
    if (storedTokens) {
      try {
        const parsed = JSON.parse(storedTokens) as Record<number, string>;
        setGuestTokens(parsed);
      } catch {
        window.localStorage.removeItem(LOCAL_STORAGE_KEYS.guestTokens);
      }
    }
  }, []);

  // Handle payload saved to localStorage (when popup cannot message opener).
  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedPayload = window.localStorage.getItem(LOCAL_STORAGE_KEYS.authPayload);
    if (storedPayload) {
      try {
        const parsed = JSON.parse(storedPayload) as {
          user?: HopOnUser;
          access_token?: string;
          needs_username_setup?: boolean;
        };
        applyAuthPayload(parsed);
      } finally {
        window.localStorage.removeItem(LOCAL_STORAGE_KEYS.authPayload);
      }
    }
  }, [applyAuthPayload, closePopup]);

  // Register global unauthorized handler to refresh tokens.
  React.useEffect(() => {
    registerUnauthorizedHandler(async () => {
      try {
        const result = await Api.refreshAccessToken();
        if (result?.access_token && result?.user) {
          applyAuthPayload({ access_token: result.access_token, user: result.user });
          return true;
        }
      } catch {
        // ignore
      }
      resetToGuest();
      return false;
    });
  }, [applyAuthPayload, resetToGuest]);

  // Listen for auth messages from popup.
  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    function handleMessage(event: MessageEvent) {
      // Accept messages from any origin for the popup (it's our own backend)
      // The security is ensured by postMessage target validation on the backend side
      const data = event.data;
      if (!data || typeof data !== "object" || data.type !== "hopon:auth") {
        return;
      }
      closePopup();
      const payload = data.payload as { user?: HopOnUser; access_token?: string; needs_username_setup?: boolean };
      if (!payload?.user || !payload?.access_token) {
        console.error("Invalid authentication payload", payload);
        loginResolver.current?.reject(new Error("Invalid authentication payload"));
        loginResolver.current = null;
        return;
      }
      applyAuthPayload(payload);
      loginResolver.current?.resolve();
      loginResolver.current = null;
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [applyAuthPayload, closePopup]);

  // Fetch current session on mount.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // First, check if there's a pending auth payload from a popup redirect
        const storedPayload = typeof window !== "undefined" ? window.localStorage.getItem(LOCAL_STORAGE_KEYS.authPayload) : null;
        if (storedPayload) {
          try {
            const payload = JSON.parse(storedPayload) as {
              user?: HopOnUser;
              access_token?: string;
              needs_username_setup?: boolean;
            };
            if (cancelled) {
              return;
            }
            applyAuthPayload(payload);
            window.localStorage.removeItem(LOCAL_STORAGE_KEYS.authPayload);
            return;
          } catch (err) {
            console.error("Failed to parse stored auth payload:", err);
            window.localStorage.removeItem(LOCAL_STORAGE_KEYS.authPayload);
          }
        }

        // If no stored payload, fetch session from backend
        const result = await Api.session();
        if (cancelled) {
          return;
        }
        if (result?.authenticated && result.user) {
          if (result.access_token) {
            setToken(result.access_token);
          }
          setUser(result.user);
          setStatus("authenticated");
        } else {
          resetToGuest();
        }
      } catch {
        if (!cancelled) {
          resetToGuest();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resetToGuest, applyAuthPayload]);

  const loginWithGoogle = React.useCallback(() => {
    if (typeof window === "undefined") {
      return Promise.reject(new Error("Window unavailable"));
    }
    const loginUrl = Api.getGoogleLoginUrl(window.location.origin);
    const popup = window.open(loginUrl, "hopon-google-auth", POPUP_FEATURES);
    if (!popup) {
      return Promise.reject(new Error("Unable to open login window. Please check if pop-ups are blocked."));
    }
    popupRef.current = popup;
    return new Promise<void>((resolve, reject) => {
      loginResolver.current = { resolve, reject };

      // Monitor popup close so we can reject if the user closed it without completing auth.
      const interval = window.setInterval(() => {
        const p = popupRef.current;
        if (!p) {
          window.clearInterval(interval);
          if (loginResolver.current) {
            loginResolver.current.reject(new Error("Authentication cancelled"));
            loginResolver.current = null;
          }
          return;
        }
        if (p.closed) {
          window.clearInterval(interval);
          // Check if auth was stored in localStorage (fallback from popup)
          const storedPayload = window.localStorage.getItem(LOCAL_STORAGE_KEYS.authPayload);
          if (storedPayload && loginResolver.current) {
            try {
              const payload = JSON.parse(storedPayload) as {
                user?: HopOnUser;
                access_token?: string;
                needs_username_setup?: boolean;
              };
              applyAuthPayload(payload);
              window.localStorage.removeItem(LOCAL_STORAGE_KEYS.authPayload);
              loginResolver.current.resolve();
            } catch (err) {
              loginResolver.current.reject(err);
            }
          } else if (loginResolver.current) {
            loginResolver.current.reject(new Error("Authentication window closed"));
          }
          loginResolver.current = null;
          popupRef.current = null;
        }
      }, 500);
    });
  }, [applyAuthPayload]);

  const logout = React.useCallback(async () => {
    try {
      await Api.logout();
    } catch {
      // ignore backend errors during logout
    } finally {
      closePopup();
      resetToGuest();
    }
  }, [closePopup, resetToGuest]);

  const loginAsDemo = React.useCallback(async (opts?: { username?: string; email?: string }) => {
    try {
      const result = await Api.demoLogin(opts || {});
      if (result?.access_token && result?.user) {
        applyAuthPayload({ access_token: result.access_token, user: result.user });
      }
    } catch (err) {
      throw err;
    }
  }, [applyAuthPayload]);

  const signup = React.useCallback(async (opts: { email: string; password: string; username: string }) => {
    try {
      const result = await Api.signup(opts);
      if (result?.access_token && result?.user) {
        applyAuthPayload({ access_token: result.access_token, user: result.user });
      }
    } catch (err) {
      throw err;
    }
  }, [applyAuthPayload]);

  const login = React.useCallback(async (opts: { email: string; password: string }) => {
    try {
      const result = await Api.login(opts);
      if (result?.access_token && result?.user) {
        applyAuthPayload({ access_token: result.access_token, user: result.user });
      }
    } catch (err) {
      throw err;
    }
  }, [applyAuthPayload]);

  const setGuestName = React.useCallback((value: string) => {
    setGuestNameState(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCAL_STORAGE_KEYS.guestName, value);
    }
  }, []);

  const rememberGuestToken = React.useCallback((eventId: number, tokenValue: string) => {
    setGuestTokens((prev) => {
      const next = { ...prev, [eventId]: tokenValue };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LOCAL_STORAGE_KEYS.guestTokens, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const clearGuestToken = React.useCallback((eventId: number) => {
    setGuestTokens((prev) => {
      if (!(eventId in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[eventId];
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LOCAL_STORAGE_KEYS.guestTokens, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const getGuestToken = React.useCallback(
    (eventId: number) => guestTokens[eventId],
    [guestTokens]
  );

  const contextValue = React.useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      accessToken: token,
      loginWithGoogle,
      loginAsDemo,
      signup,
      login,
      logout,
      guestName,
      setGuestName,
      guestTokens,
      getGuestToken,
      rememberGuestToken,
      clearGuestToken,
      setUser,
    }),
    [
      status,
      user,
      token,
      loginWithGoogle,
      loginAsDemo,
      signup,
      login,
      logout,
      guestName,
      setGuestName,
      guestTokens,
      getGuestToken,
      rememberGuestToken,
      clearGuestToken,
    ]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
