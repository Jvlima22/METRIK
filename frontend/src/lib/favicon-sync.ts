import { useEffect } from "react";

const LIGHT_FAVICON = "/logo-ilustration.png?v=2";
const DARK_FAVICON = "/logo-ilustration-white.png?v=2";

function prefersDarkTheme() {
  if (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) return true;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function syncFavicon() {
  if (typeof document === "undefined") return;
  const href = prefersDarkTheme() ? DARK_FAVICON : LIGHT_FAVICON;
  let link = document.querySelector<HTMLLinkElement>("link[data-metrik-favicon]");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    link.dataset.metrikFavicon = "true";
    document.head.appendChild(link);
  }
  if (link.href !== new URL(href, window.location.origin).href) link.href = href;
}

export function FaviconSync() {
  useEffect(() => {
    syncFavicon();
    const root = document.documentElement;
    const observer = new MutationObserver(syncFavicon);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener?.("change", syncFavicon);
    return () => {
      observer.disconnect();
      media.removeEventListener?.("change", syncFavicon);
    };
  }, []);

  return null;
}
