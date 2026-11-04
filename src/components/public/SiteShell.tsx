import type { ReactNode } from "react";
import Link from "next/link";
import type { NavigationItem, Settings, Theme } from "@/shared/content";
import { themeStyle } from "./theme";
export function SiteShell({
  settings,
  navigation,
  theme,
  children,
}: {
  settings: Settings;
  navigation: NavigationItem[];
  theme: Theme;
  children: ReactNode;
}) {
  const primary = navigation
    .filter((n) => n.visible && n.group === "primary")
    .sort((a, b) => a.order - b.order);
  const footer = navigation
    .filter((n) => n.visible && n.group === "footer")
    .sort((a, b) => a.order - b.order);
  return (
    <div
      className="public-site"
      data-hero={theme.heroVariant}
      data-button={theme.buttonVariant}
      style={themeStyle(theme)}
    >
      <a className="public-skip" href="#main">
        Перейти к содержимому
      </a>
      <header className="public-header" id="top">
        <div className="public-container public-header-inner">
          <Link
            className="public-brand"
            href="/"
            aria-label={settings.siteTitle}
          >
            <span className="public-brand-mark" aria-hidden="true">
              ✳
            </span>
            <span>{settings.brandLabel}</span>
          </Link>
          <nav className="public-desktop-nav" aria-label="Основная навигация">
            {primary.slice(0, 4).map((n) => (
              <a href={n.href} key={n.id}>
                {n.label}
              </a>
            ))}
            {primary.length > 4 && (
              <details className="public-nav-more">
                <summary>Ещё</summary>
                <div>
                  {primary.slice(4).map((n) => (
                    <a href={n.href} key={n.id}>
                      {n.label}
                    </a>
                  ))}
                </div>
              </details>
            )}
          </nav>
          <a className="public-header-booking" href={settings.bookingUrl}>
            {settings.bookingLabel}
            <span aria-hidden="true"> ↗</span>
          </a>
          <details className="public-mobile-nav">
            <summary aria-label="Открыть меню">
              <span aria-hidden="true">☰</span> Меню
            </summary>
            <nav aria-label="Мобильная навигация">
              {primary.map((n) => (
                <a href={n.href} key={n.id}>
                  {n.label}
                </a>
              ))}
              <a href={settings.bookingUrl}>{settings.bookingLabel}</a>
            </nav>
          </details>
        </div>
      </header>
      {children}
      <footer className="public-footer" id="footer">
        <div className="public-container">
          <div className="public-footer-top">
            <Link className="public-brand" href="/">
              <span className="public-brand-mark" aria-hidden="true">
                ✳
              </span>
              {settings.brandLabel}
            </Link>
            <p>{settings.footerText}</p>
            <div className="public-footer-contact">
              {settings.phone && (
                <a href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`}>
                  {settings.phone}
                </a>
              )}
              {settings.email && (
                <a href={`mailto:${settings.email}`}>{settings.email}</a>
              )}
              {settings.socialUrl && (
                <a href={settings.socialUrl}>Социальные сети ↗</a>
              )}
            </div>
          </div>
          <nav aria-label="Документы" className="public-footer-links">
            {footer.map((n) => (
              <a href={n.href} key={n.id}>
                {n.label}
              </a>
            ))}
          </nav>
          <p className="public-legal">{settings.legalText}</p>
        </div>
      </footer>
    </div>
  );
}
