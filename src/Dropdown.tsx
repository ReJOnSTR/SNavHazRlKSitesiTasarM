import { Check, ChevronDown } from "lucide-react"
import { useEffect, useId, useRef, useState, type ReactNode } from "react"

export type DropdownOption<T extends string> = {
  value: T
  label: string
  icon?: ReactNode
}

type DropdownProps<T extends string> = {
  value: T
  options: DropdownOption<T>[]
  onChange: (value: T) => void
  label?: string
  variant?: "field" | "filter"
}

export default function Dropdown<T extends string>({
  value,
  options,
  onChange,
  label,
  variant = "field",
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selected = options.find((option) => option.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [open])

  const openMenu = () => {
    setActive(Math.max(0, options.findIndex((option) => option.value === value)))
    setOpen(true)
  }

  const choose = (next: T) => {
    onChange(next)
    setOpen(false)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setOpen(false)
      return
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      if (!open) return openMenu()
      const step = event.key === "ArrowDown" ? 1 : -1
      setActive((index) => (index + step + options.length) % options.length)
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      if (open) choose(options[active].value)
      else openMenu()
    }
  }

  return (
    <div className={`dropdown dropdown-${variant} ${open ? "is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        {selected?.icon && <span className="dropdown-icon">{selected.icon}</span>}
        <span className="dropdown-value">{selected?.label}</span>
        <ChevronDown className="dropdown-chevron" size={variant === "filter" ? 14 : 16} />
      </button>
      {open && (
        <ul className="dropdown-menu" role="listbox" id={listId}>
          {options.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              className={`dropdown-option ${index === active ? "is-active" : ""} ${
                option.value === value ? "is-selected" : ""
              }`}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option.value)}
            >
              {option.icon && <span className="dropdown-icon">{option.icon}</span>}
              <span className="dropdown-value">{option.label}</span>
              {option.value === value && <Check className="dropdown-check" size={14} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
