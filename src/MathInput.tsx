import { Sigma } from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"

// Lightweight math & inline style notation: [a/b] fraction, x^2 / x^{10} superscript,
// a_1 / a_{12} subscript, √{x} square root, **bold**, {#rrggbb|colored text}.
export const mathPattern =
  /\{(#[0-9a-fA-F]{6})\|([^}]+)\}|\*\*([^*]+)\*\*|\[([^[\]/]+)\/([^[\]]+)\]|\^(\{[^}]*\}|[^\s{])|_(\{[^}]*\}|[^\s{_])|√\{([^}]*)\}/g

export function MathText({ text }: { text: string }) {
  const parts: ReactNode[] = []
  const strip = (value: string) => value.replace(/^\{|\}$/g, "")
  let last = 0

  for (const match of text.matchAll(mathPattern)) {
    const index = match.index ?? 0
    if (index > last) parts.push(text.slice(last, index))
    if (match[1] !== undefined && match[2] !== undefined) {
      parts.push(
        <span key={index} style={{ color: match[1] }}>
          <MathText text={match[2]} />
        </span>,
      )
    } else if (match[3] !== undefined) {
      parts.push(
        <strong key={index}>
          <MathText text={match[3]} />
        </strong>,
      )
    } else if (match[4] !== undefined) {
      parts.push(
        <span className="frac" key={index}>
          <span>{match[4].trim()}</span>
          <span>{match[5].trim()}</span>
        </span>,
      )
    } else if (match[6] !== undefined) {
      parts.push(<sup key={index}>{strip(match[6])}</sup>)
    } else if (match[7] !== undefined) {
      parts.push(<sub key={index}>{strip(match[7])}</sub>)
    } else if (match[8] !== undefined) {
      parts.push(
        <span className="sqrt" key={index}>
          √<span>{match[8]}</span>
        </span>,
      )
    }
    last = index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}

type Item = {
  id: string
  name: string
  keys: string
  preview: ReactNode
  before: string
  after?: string
  symbol?: boolean
}

const structures: Item[] = [
  {
    id: "frac",
    name: "Kesir",
    keys: "kesir bolu bölü oran",
    before: "[",
    after: "/]",
    preview: (
      <span className="frac">
        <span>a</span>
        <span>b</span>
      </span>
    ),
  },
  { id: "pow", name: "Üs", keys: "us üs kuvvet kare küp", before: "^{", after: "}", preview: <>x<sup>n</sup></> },
  { id: "sub", name: "Alt indis", keys: "alt indis", before: "_{", after: "}", preview: <>x<sub>n</sub></> },
  {
    id: "sqrt",
    name: "Karekök",
    keys: "kok kök karekok karekök",
    before: "√{",
    after: "}",
    preview: (
      <span className="sqrt">
        √<span>x</span>
      </span>
    ),
  },
  { id: "par", name: "Parantez", keys: "parantez", before: "(", after: ")", preview: "( )" },
  { id: "abs", name: "Mutlak değer", keys: "mutlak deger değer", before: "|", after: "|", preview: "|x|" },
]

const sym = (symbol: string, name: string, keys: string): Item => ({
  id: symbol,
  name,
  keys,
  before: symbol,
  preview: symbol,
  symbol: true,
})

const symbolItems: Item[] = [
  sym("×", "Çarpı", "carpi çarpı carpma"),
  sym("÷", "Bölme", "bolme bölme"),
  sym("·", "Nokta çarpım", "nokta carpim"),
  sym("±", "Artı eksi", "arti eksi artı"),
  sym("≠", "Eşit değil", "esit degil eşit"),
  sym("≈", "Yaklaşık", "yaklasik yaklaşık"),
  sym("≤", "Küçük eşit", "kucuk esit küçük"),
  sym("≥", "Büyük eşit", "buyuk esit büyük"),
  sym("π", "Pi", "pi"),
  sym("°", "Derece", "derece"),
  sym("∞", "Sonsuz", "sonsuz"),
  sym("∠", "Açı", "aci açı"),
  sym("△", "Üçgen", "ucgen üçgen"),
  sym("⊥", "Dik", "dik"),
  sym("∥", "Paralel", "paralel"),
  sym("α", "Alfa", "alfa"),
  sym("β", "Beta", "beta"),
  sym("θ", "Teta", "teta"),
  sym("∑", "Toplam", "toplam sigma"),
  sym("Δ", "Delta", "delta fark"),
  sym("Ω", "Ohm", "ohm omega"),
  sym("∈", "Elemanıdır", "eleman kume küme"),
  sym("∉", "Elemanı değildir", "eleman degil kume küme"),
  sym("∪", "Birleşim", "birlesim birleşim kume"),
  sym("∩", "Kesişim", "kesisim kesişim kume"),
  sym("⊂", "Alt küme", "alt kume küme"),
  sym("∅", "Boş küme", "bos kume küme"),
  sym("≡", "Denktir", "denk denktir"),
  sym("∼", "Benzer", "benzer benzerlik"),
  sym("→", "Ok", "ok sag sağ"),
  sym("⇒", "İse", "ise gerektirme ok"),
  sym("⇔", "Ancak ve ancak", "ancak cift ok"),
]

const allItems = [...structures, ...symbolItems]

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")

const filterItems = (query: string) => {
  const q = normalize(query)
  if (!q) return allItems
  return allItems.filter((item) =>
    normalize(`${item.name} ${item.keys}`)
      .split(/\s+/)
      .some((word) => word.startsWith(q)),
  )
}

type MathInputProps = {
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  rows?: number
  label?: string
  placeholder?: string
  compact?: boolean
}

type Menu = { start: number; query: string; active: number; fromSlash: boolean }

export default function MathInput({
  value,
  onChange,
  multiline,
  rows = 4,
  label,
  placeholder,
  compact,
}: MathInputProps) {
  const fieldRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [menu, setMenu] = useState<Menu | null>(null)
  const items = menu ? filterItems(menu.query) : []

  useEffect(() => {
    listRef.current
      ?.querySelector(".is-active")
      ?.scrollIntoView({ block: "nearest" })
  }, [menu?.active])

  const setCaret = (position: number) =>
    requestAnimationFrame(() => {
      fieldRef.current?.focus()
      fieldRef.current?.setSelectionRange(position, position)
    })

  // Insert an item at the selection (wrapping it), or replace the "/query" trigger.
  const apply = (item: Item) => {
    const field = fieldRef.current
    let start = field?.selectionStart ?? value.length
    let end = field?.selectionEnd ?? value.length
    let inner = value.slice(start, end)

    if (menu?.fromSlash) {
      start = menu.start
      end = menu.start + 1 + menu.query.length
      inner = ""
      // "3/" + Kesir → [3/…]: take the number/word right before the slash as numerator.
      if (item.id === "frac") {
        const prev = value.slice(0, start).match(/([\p{L}\p{N}]+)$/u)
        if (prev) {
          start -= prev[1].length
          inner = prev[1]
        }
      }
    }

    const after = item.after ?? ""
    const next = value.slice(0, start) + item.before + inner + after + value.slice(end)
    onChange(next)
    const caret =
      start + item.before.length + inner.length + (inner && after.startsWith("/") ? 1 : 0)
    setMenu(null)
    setCaret(caret)
  }

  const openPalette = () => {
    const position = fieldRef.current?.selectionStart ?? value.length
    setMenu({ start: position, query: "", active: 0, fromSlash: false })
    fieldRef.current?.focus()
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const next = event.target.value
    const caret = event.target.selectionStart ?? next.length
    onChange(next)

    if (menu?.fromSlash) {
      const query = next.slice(menu.start + 1, caret)
      if (next[menu.start] !== "/" || caret <= menu.start || /\s/.test(query) || query.length > 14) {
        setMenu(null)
      } else {
        setMenu({ ...menu, query, active: 0 })
      }
      return
    }

    // A freshly typed "/" opens the formula menu.
    if (next.length > value.length && next[caret - 1] === "/") {
      setMenu({ start: caret - 1, query: "", active: 0, fromSlash: true })
    } else if (menu) {
      setMenu(null)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!menu) return
    if (event.key === "Escape") {
      event.preventDefault()
      setMenu(null)
      return
    }
    if (!items.length) return
    const columns = 1
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      const step = (event.key === "ArrowDown" ? 1 : -1) * columns
      setMenu({ ...menu, active: (menu.active + step + items.length) % items.length })
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault()
      apply(items[menu.active] ?? items[0])
    }
  }

  const fieldProps = {
    ref: fieldRef,
    value,
    placeholder: placeholder ?? (compact ? undefined : "Yazmaya başlayın — formül için / yazın"),
    "aria-label": label,
    "aria-expanded": Boolean(menu),
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    onBlur: () => setMenu(null),
  }

  const structuresShown = items.filter((item) => !item.symbol)
  const symbolsShown = items.filter((item) => item.symbol)

  return (
    <div className={`math-input ${compact ? "is-compact" : ""} ${menu ? "menu-open" : ""}`}>
      <div className="math-field-wrap">
          {multiline ? <textarea rows={rows} {...fieldProps} /> : <input {...fieldProps} />}
      {menu && (
        <div
          className="math-menu"
          ref={listRef}
          role="listbox"
          onMouseDown={(event) => event.preventDefault()}
        >
          {menu.fromSlash && (
            <div className="math-menu-query">
              <span>/</span>
              {menu.query || <em>yazarak arayın: kesir, kök, üs, pi…</em>}
            </div>
          )}
          {items.length === 0 && <div className="math-menu-empty">Sonuç yok — Esc ile kapatın</div>}
          {structuresShown.length > 0 && (
            <>
              <div className="math-menu-label">Yapılar</div>
              {structuresShown.map((item) => {
                const index = items.indexOf(item)
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={index === menu.active}
                    className={`math-menu-item ${index === menu.active ? "is-active" : ""}`}
                    onMouseEnter={() => setMenu({ ...menu, active: index })}
                    onClick={() => apply(item)}
                  >
                    <span className="math-menu-preview"><span>{item.preview}</span></span>
                    <span>{item.name}</span>
                    <code>
                      {item.before}
                      {item.after ? "…" + item.after : ""}
                    </code>
                  </button>
                )
              })}
            </>
          )}
          {symbolsShown.length > 0 && (
            <>
              <div className="math-menu-label">Semboller</div>
              <div className="math-menu-symbols">
                {symbolsShown.map((item) => {
                  const index = items.indexOf(item)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      title={item.name}
                      aria-label={item.name}
                      aria-selected={index === menu.active}
                      className={`math-menu-symbol ${index === menu.active ? "is-active" : ""}`}
                      onMouseEnter={() => setMenu({ ...menu, active: index })}
                      onClick={() => apply(item)}
                    >
                      {item.preview}
                    </button>
                  )
                })}
              </div>
            </>
          )}
          <div className="math-menu-foot">
            <span><kbd>↑</kbd><kbd>↓</kbd> seç</span>
            <span><kbd>Enter</kbd> ekle</span>
            <span><kbd>Esc</kbd> kapat</span>
          </div>
        </div>
      )}

      </div>

      <div
        className="math-toolbar"
        role="toolbar"
        aria-label="Matematik araçları"
        onMouseDown={(event) => event.preventDefault()}
      >
        {structures.slice(0, 4).map((item) => (
          <button
            key={item.id}
            type="button"
            className="math-tool math-tool-structure"
            title={item.name}
            aria-label={item.name}
            onClick={() => apply(item)}
          >
            <span>{item.preview}</span>
          </button>
        ))}
        <button
          type="button"
          className={`math-tool math-tool-more ${menu && !menu.fromSlash ? "active" : ""}`}
          onClick={() => (menu ? setMenu(null) : openPalette())}
        >
          <Sigma size={13} />
          Formül
        </button>
        <span className="math-hint-key">
          <kbd>/</kbd> hızlı ekle
        </span>
      </div>
    </div>
  )
}
