"use client";
import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ChevronDown } from "lucide-react";
import { navigation } from "@/config/site";
import type { SiteConfig } from "@/types";
import { CopyButton } from "@/components/minecraft/copy-button";
import { CartButton } from "@/components/features/cart";
import { serverAddress } from "@/lib/utils";
export function Navbar({ config }: { config: SiteConfig }) {
  const path = usePathname();
  const [open, setOpen] = useState(false),
    [scrolled, setScrolled] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    setOpen(false);
  }, [path]);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
      if (e.key === "Tab") {
        const els = panel.current?.querySelectorAll<
          HTMLAnchorElement | HTMLButtonElement
        >("a,button");
        if (!els?.length) return;
        const first = toggle.current,
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open]);
  return (
    <>
      <div className="topbar">
        <div className="container">
          <span>
            <span className="tiny-square" /> MINECRAFT JAVA NETWORK
          </span>
          <span>
            {config.SERVER_VERSION}
            <span className="topbar-separator">/</span>
            {config.DEMO_MODE
              ? "DEMO · Cần cấu hình server thật"
              : "Chơi công bằng. Kết nối cùng nhau."}
          </span>
        </div>
      </div>
      <header className={`navbar ${scrolled ? "is-scrolled" : ""}`}>
        <div className="container nav-inner">
          <Link
            href="/"
            className="brand"
            aria-label={`${config.SERVER_NAME} — Trang chủ`}
          >
            <Image src="/icons/logo.svg" alt="" width={42} height={42} />
            <span>
              {config.SERVER_NAME}
              <small>MINECRAFT NETWORK</small>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label="Điều hướng chính">
            {navigation.map(([href, label]) => (
              <Link
                href={href}
                key={href}
                className={
                  (href === "/" ? path === href : path.startsWith(href))
                    ? "active"
                    : ""
                }
              >
                {label}
                {href === "/store" && <span className="nav-store-dot" />}
              </Link>
            ))}
          </nav>
          <div className="nav-actions">
            <CartButton />
            <CopyButton
              address={serverAddress(config.SERVER_IP, config.SERVER_PORT)}
              compact
            />
            <button
              className="menu-toggle"
              ref={toggle}
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Đóng menu" : "Mở menu"}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {open && (
          <div ref={panel} id="mobile-nav" className="mobile-nav">
            <nav className="container" aria-label="Điều hướng di động">
              {navigation.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={path === href ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {label}
                  <ChevronDown size={13} />
                </Link>
              ))}
              <Link href="/game-modes" onClick={() => setOpen(false)}>
                Chế độ chơi
                <ChevronDown size={13} />
              </Link>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
