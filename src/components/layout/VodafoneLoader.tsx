"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type VodafoneLoaderProps = {
  fullscreen?: boolean;
  label?: string;
};

export function VodafoneLoader({ fullscreen = false, label = "Loading" }: VodafoneLoaderProps) {
  return (
    <div className={fullscreen ? "vf-loader-overlay" : "vf-loader-inline"} role="status" aria-live="polite">
      <div className="vf-loader-card">
        <svg className="vf-svg-loader" viewBox="0 0 500 500" width="150" height="150" aria-hidden="true">
          <g className="vf-loader-rings">
            <path className="vf-loader-path vf-ring-1" d="M 250 45 A 205 205 0 0 1 455 250" fill="none" strokeWidth="4" strokeLinecap="round" />
            <path className="vf-loader-path vf-ring-2" d="M 250 25 A 225 225 0 0 1 475 250" fill="none" strokeWidth="3" strokeLinecap="round" strokeDasharray="100 40" />
            <path className="vf-loader-path vf-ring-3" d="M 50 250 A 200 200 0 0 0 250 455" fill="none" strokeWidth="3" strokeLinecap="round" strokeDasharray="80 30" />
            <path className="vf-loader-path vf-sub-line-1" d="M 250,55 C 370,55 435,140 435,250" fill="none" strokeWidth="5" strokeLinecap="round" />
            <path className="vf-loader-path vf-sub-line-2" d="M 250,30 C 400,30 460,120 460,250" fill="none" strokeWidth="4" strokeLinecap="round" strokeDasharray="120 50" />
          </g>

          <g className="vf-loader-core">
            <path className="vf-loader-path vf-core-main" d="M 250,80 C 140,80 80,160 80,270 C 80,380 160,440 270,440 C 350,440 410,390 430,310" fill="none" strokeWidth="12" strokeLinecap="round" />
            <path className="vf-core-tail" d="M 270,120 C 320,120 360,150 380,190 L 320,190 C 300,165 285,150 260,150 Z" />
          </g>
        </svg>
        <span className="vf-loader-label">{label}</span>
      </div>
    </div>
  );
}

export default function GlobalRouteLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const visibleSinceRef = useRef(0);
  const fallbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const hide = () => {
      const elapsed = performance.now() - visibleSinceRef.current;
      const delay = Math.max(0, 360 - elapsed);

      window.setTimeout(() => setVisible(false), delay);
      if (fallbackTimerRef.current) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };

    hide();
  }, [pathname]);

  useEffect(() => {
    const show = () => {
      visibleSinceRef.current = performance.now();
      setVisible(true);

      if (fallbackTimerRef.current) window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = window.setTimeout(() => setVisible(false), 8000);
    };

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;

      const anchor = event.target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const nextUrl = new URL(anchor.href, window.location.href);
      if (nextUrl.origin !== window.location.origin) return;
      if (nextUrl.pathname === window.location.pathname && nextUrl.search === window.location.search) return;

      show();
    };

    window.addEventListener("beforeunload", show);
    document.addEventListener("click", handleClick, true);

    return () => {
      window.removeEventListener("beforeunload", show);
      document.removeEventListener("click", handleClick, true);
      if (fallbackTimerRef.current) window.clearTimeout(fallbackTimerRef.current);
    };
  }, []);

  return visible ? <VodafoneLoader fullscreen label="Loading" /> : null;
}
