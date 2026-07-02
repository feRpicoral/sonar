"use client";

import { useEffect } from "react";

const NATIVE_FRAME_WIDTH = 1440;
const NAV_SCROLL_THRESHOLD = 8;
const PARALLAX_MAX_SCROLL = 700;
const PARALLAX_FACTOR = 0.04;

/**
 * Progressive enhancement for the landing page: frosts the nav on scroll,
 * scales the fixed-width product mockups down to their container, and applies a
 * light parallax to the hero shot. Renders nothing and cleans up on unmount.
 */
export function MarketingEffects() {
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>("[data-marketing-nav]");
    const shots = Array.from(document.querySelectorAll<HTMLElement>("[data-marketing-shot]"));
    const parallax = document.querySelector<HTMLElement>("[data-marketing-parallax]");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onNavScroll = () => {
      nav?.setAttribute("data-scrolled", String(window.scrollY > NAV_SCROLL_THRESHOLD));
    };

    const fitShots = () => {
      for (const shot of shots) {
        const frame = shot.querySelector<HTMLIFrameElement>("iframe");
        if (frame) frame.style.transform = `scale(${shot.clientWidth / NATIVE_FRAME_WIDTH})`;
      }
    };

    const onParallax = () => {
      if (!parallax) return;
      const offset = -Math.min(window.scrollY, PARALLAX_MAX_SCROLL) * PARALLAX_FACTOR;
      parallax.style.transform = `translateY(${offset}px)`;
    };

    onNavScroll();
    fitShots();

    window.addEventListener("scroll", onNavScroll, { passive: true });
    window.addEventListener("resize", fitShots, { passive: true });

    const observer =
      "ResizeObserver" in window ? new ResizeObserver(fitShots) : (null as ResizeObserver | null);
    for (const shot of shots) observer?.observe(shot);

    if (!reduceMotion) {
      onParallax();
      window.addEventListener("scroll", onParallax, { passive: true });
    }

    return () => {
      window.removeEventListener("scroll", onNavScroll);
      window.removeEventListener("resize", fitShots);
      window.removeEventListener("scroll", onParallax);
      observer?.disconnect();
    };
  }, []);

  return null;
}
