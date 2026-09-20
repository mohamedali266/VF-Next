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
            <path className="vf-loader-path vf-ring vf-ring-outer" pathLength="1" d="M 306 42 C 167 39 54 149 54 287 C 54 401 139 461 258 459" fill="none" strokeWidth="5" strokeLinecap="round" />
            <path className="vf-loader-path vf-ring vf-ring-mid" pathLength="1" d="M 330 68 C 210 52 86 143 82 279 C 78 390 158 435 266 431" fill="none" strokeWidth="7" strokeLinecap="round" />
            <path className="vf-loader-path vf-ring vf-ring-inner" pathLength="1" d="M 354 105 C 260 82 125 151 122 281 C 120 367 188 399 278 392" fill="none" strokeWidth="9" strokeLinecap="round" />
            <path className="vf-loader-path vf-ring vf-ring-right" pathLength="1" d="M 333 144 C 429 165 473 247 442 342 C 418 415 360 454 283 458" fill="none" strokeWidth="5" strokeLinecap="round" />
            <path className="vf-loader-path vf-ring vf-ring-right-inner" pathLength="1" d="M 330 180 C 397 200 428 262 404 335 C 385 392 339 421 283 426" fill="none" strokeWidth="6" strokeLinecap="round" />
          </g>

          <g className="vf-loader-core">
            <path className="vf-loader-path vf-core-main" d="M 317 84 C 235 79 150 139 124 240 C 92 363 180 434 296 405 C 386 382 424 287 382 219 C 362 187 326 166 283 162 C 280 129 292 101 317 84" fill="none" strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" />
            <path className="vf-loader-path vf-core-cut" d="M 302 152 C 345 158 376 181 392 216" fill="none" strokeWidth="8" strokeLinecap="round" />
            <path className="vf-loader-path vf-core-top" d="M 292 96 C 330 92 363 102 389 122" fill="none" strokeWidth="7" strokeLinecap="round" />
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
