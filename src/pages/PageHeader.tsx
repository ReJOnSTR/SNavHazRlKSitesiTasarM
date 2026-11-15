import { Bell, CalendarDays, CircleHelp, Menu, Search } from "lucide-react"
import type { ReactNode } from "react"

type PageHeaderProps = {
  eyebrow: string
  title: string
  description: string
  search: string
  searchPlaceholder: string
  onSearch: (value: string) => void
  onMenu: () => void
  actions?: ReactNode
}

/** Left side of the top bar: section + current page, aligned with the sidebar brand row. */
export function TopbarTitle({ title }: { title: string }) {
  return (
    <div className="topbar-title">
      <span>Sınav Atölyesi</span>
      <strong>{title}</strong>
    </div>
  )
}

/** Right side of the top bar, shared by every page. */
export function TopbarTools() {
  return (
    <div className="topbar-tools">
      <div className="home-date">
        <CalendarDays size={15} />
        <span>20 Mayıs 2025, Salı</span>
      </div>
      <span className="topbar-divider" aria-hidden="true" />
      <button className="icon-button topbar-icon" type="button" aria-label="Bildirimler">
        <Bell size={17} />
        <i className="topbar-dot" />
      </button>
      <button className="icon-button topbar-icon" type="button" aria-label="Yardım">
        <CircleHelp size={17} />
      </button>
    </div>
  )
}

export default function PageHeader({
  eyebrow,
  title,
  description,
  search,
  searchPlaceholder,
  onSearch,
  onMenu,
  actions,
}: PageHeaderProps) {
  return (
    <>
      <header className="home-topbar">
        <button
          className="icon-button mobile-menu"
          type="button"
          aria-label="Menüyü aç"
          onClick={onMenu}
        >
          <Menu size={20} />
        </button>
        <TopbarTitle title={title} />
        <label className="home-search">
          <Search size={16} />
          <input
            aria-label={searchPlaceholder}
            placeholder={searchPlaceholder}
            value={search}
            onChange={(event) => onSearch(event.target.value)}
          />
        </label>
        <TopbarTools />
      </header>
      <div className="page-intro">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {actions && <div className="page-intro-actions">{actions}</div>}
      </div>
    </>
  )
}
