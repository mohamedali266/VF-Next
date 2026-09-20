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
      <div className="vf-loader-mark">
        <svg className="vf-svg-loader" viewBox="0 0 500 500" width="190" height="190" aria-hidden="true">
          <g className="vf-loader-rings">
            <path className="vf-loader-path vf-ring-1" d="M 82 355 A 214 214 0 0 1 390 84" fill="none" strokeWidth="7" strokeLinecap="round" />
            <path className="vf-loader-path vf-ring-2" d="M 52 386 A 248 248 0 0 1 420 52" fill="none" strokeWidth="5" strokeLinecap="round" strokeDasharray="164 48" />
            <path className="vf-loader-path vf-ring-3" d="M 87 420 A 276 276 0 0 0 456 170" fill="none" strokeWidth="5" strokeLinecap="round" strokeDasharray="128 54" />
            <path className="vf-loader-path vf-sub-line-1" d="M 284 116 C 366 128 424 195 432 286" fill="none" strokeWidth="6" strokeLinecap="round" />
            <path className="vf-loader-path vf-sub-line-2" d="M 302 154 C 364 171 405 223 408 294" fill="none" strokeWidth="5" strokeLinecap="round" strokeDasharray="92 38" />
          </g>

          <g className="vf-loader-core">
            <path className="vf-loader-path vf-core-main" d="M 317 105 C 240 82 143 126 109 238 C 66 378 170 451 292 428 C 386 410 435 319 405 235 C 389 191 351 161 300 151 C 286 148 282 128 317 105" fill="none" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
            <path className="vf-loader-path vf-core-cut" d="M 312 154 C 350 166 378 194 391 233" fill="none" strokeWidth="12" strokeLinecap="round" />
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
