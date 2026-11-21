import {
  ArrowLeft,
  Check,
  Paintbrush,
  Palette,
  Plus,
  Save,
  Trash2,
} from "lucide-react"
import { type ReactNode, useEffect, useMemo, useState } from "react"
import {
  listUserTemplates,
  saveUserTemplates,
  syncToExactNativeSqlite,
  type StoredCustomTemplate,
} from "../services/db"
import PageHeader from "./PageHeader"

export const fontOptions = [
  { value: "sans", label: "Inter" },
  { value: "roboto", label: "Roboto" },
  { value: "openSans", label: "Open Sans" },
  { value: "lato", label: "Lato" },
  { value: "montserrat", label: "Montserrat" },
  { value: "poppins", label: "Poppins" },
  { value: "raleway", label: "Raleway" },
  { value: "dmSans", label: "DM Sans" },
  { value: "workSans", label: "Work Sans" },
  { value: "sourceSans", label: "Source Sans 3" },
  { value: "firaSans", label: "Fira Sans" },
  { value: "ubuntu", label: "Ubuntu" },
  { value: "rubik", label: "Rubik" },
  { value: "rounded", label: "Nunito" },
  { value: "quicksand", label: "Quicksand" },
  { value: "fredoka", label: "Fredoka" },
  { value: "serif", label: "Libre Baskerville" },
  { value: "merriweather", label: "Merriweather" },
  { value: "lora", label: "Lora" },
  { value: "playfair", label: "Playfair Display" },
  { value: "cormorant", label: "Cormorant Garamond" },
  { value: "oswald", label: "Oswald" },
  { value: "bebas", label: "Bebas Neue" },
  { value: "josefin", label: "Josefin Sans" },
  { value: "caveat", label: "Caveat" },
  { value: "patrickHand", label: "Patrick Hand" },
] as const

export type PaperFont = typeof fontOptions[number]["value"]

export type TemplateDesign = {
  template:
    | "classic"
    | "lgs"
    | "modern"
    | "minimal"
    | "elegant"
    | "bold"
    | "playful"
    | "academic"
    | "tyt"
    | "quiz"
    | "stem"
    | "workbook"
    | "literature"
    | "olympiad"
  fontSize: "small" | "normal" | "large"
  spacing: "compact" | "normal" | "relaxed"
  columns: 1 | 2
  optionLayout: "grid" | "inline" | "list"
  accent: string
  showSchoolHeader: boolean
  showStudentBox: boolean
  showPoints: boolean
  footerNote: string
  logo: string
  watermark: "none" | "text" | "logo"
  watermarkText: string
  watermarkOpacity: number
  fontFamily: PaperFont
  pageBorder:
    | "none"
    | "thin"
    | "double"
    | "rounded"
    | "dashed"
    | "corners"
    | "topBottom"
  paperBackground?: "white" | "cream" | "grid" | "dots" | "lined" | "softTint"
  numberStyle:
    | "plain"
    | "circle"
    | "outlineCircle"
    | "box"
    | "outlineBox"
    | "pill"
    | "paren"
    | "underline"
    | "ribbon"
  dividers: boolean
  logoSize: "small" | "medium" | "large"
  /** Page margin in millimetres (A4 = 210 mm wide). */
  margin: number
  /** Vertical gap between questions in pixels. */
  questionGap?: number
  /** Teacher name and signature line on the last page. */
  showSignature: boolean
  /** Booklet type badge (LGS style A / B). */
  booklet: "none" | "A" | "B"
}

type TemplateItem = {
  id: string
  name: string
  category: "Yazılı" | "Test" | "Çalışma kâğıdı" | "Şablonlarım"
  description: string
  features: string[]
  design: TemplateDesign
}

export const baseDesign: TemplateDesign = {
  template: "classic",
  fontSize: "normal",
  spacing: "normal",
  columns: 1,
  optionLayout: "grid",
  accent: "#1f2937",
  showSchoolHeader: true,
  showStudentBox: true,
  showPoints: true,
  footerNote: "Başarılar dilerim.",
  logo: "",
  watermark: "none",
  watermarkText: "ÖRNEKTİR",
  watermarkOpacity: 7,
  fontFamily: "sans",
  pageBorder: "none",
  paperBackground: "white",
  numberStyle: "plain",
  dividers: false,
  logoSize: "medium",
  margin: 15,
  showSignature: false,
  booklet: "none",
}

const base = baseDesign

const templates: TemplateItem[] = [
  {
    id: "meb",
    name: "MEB resmî yazılı",
    category: "Yazılı",
    description: "Okullarda kullanılan dönem yazılısı düzeni.",
    features: [
      "Dönem ve yazılı numaralı başlık",
      "Ad/No/Sınıf tablosu ve puan kutusu",
      "Öğretmen imza alanı",
    ],
    design: base,
  },
  {
    id: "lgs",
    name: "LGS tipi test",
    category: "Test",
    description: "Merkezi sınav kitapçığı düzeninde çoktan seçmeli test.",
    features: [
      "Ders bandı ve kitapçık türü",
      "Ayırıcı çizgili çift sütun",
      "Her sayfada \u201cDiğer sayfaya geçiniz\u201d",
    ],
    design: {
      ...base,
      template: "lgs",
      columns: 2,
      fontSize: "small",
      spacing: "compact",
      optionLayout: "list",
      showPoints: false,
      showSignature: false,
      booklet: "A",
      footerNote: "Başarılar dileriz.",
    },
  },

  {
    id: "calisma",
    name: "Konu anlatımlı çalışma kâğıdı",
    category: "Çalışma kâğıdı",
    description: "Konu özeti, formül ve bilgi kutularıyla etkinlik sayfası.",
    features: [
      "Sade başlık, bol boşluk",
      "Formül ve bilgi kutularına uygun",
      "Puansız",
    ],
    design: {
      ...base,
      template: "minimal",
      spacing: "relaxed",
      showSchoolHeader: false,
      showPoints: false,
      showSignature: false,
      accent: "#126b57",
      footerNote: "Kolay gelsin!",
    },
  },
  {
    id: "zarif",
    name: "Zarif yazılı",
    category: "Yazılı",
    description:
      "Ortalı arma, serif başlık ve süslemeli ayraçla törensel görünüm.",
    features: [
      "Şeffaf logo ortada",
      "Serif yazı tipi",
      "Çift çizgili sayfa çerçevesi",
    ],
    design: {
      ...base,
      template: "elegant",
      fontFamily: "serif",
      pageBorder: "double",
      accent: "#7c2d12",
      logoSize: "large",
    },
  },
  {
    id: "kurumsal",
    name: "Kurumsal sınav",
    category: "Yazılı",
    description: "Koyu renkli başlık bandında logo ve sınav bilgileri.",
    features: [
      "Şeffaf logo, çerçevesiz",
      "Bant içinde süre ve puan",
      "Kutulu soru numaraları",
    ],
    design: {
      ...base,
      template: "bold",
      accent: "#1e3a8a",
      numberStyle: "box",
      dividers: true,
    },
  },
  {
    id: "akademik",
    name: "Akademik yazılı",
    category: "Yazılı",
    description:
      "Solda logo, ortada kurum, sağda bilgi tablosu olan resmî başlık.",
    features: ["Üç sütunlu başlık", "Klasik yazı tipi", "İnce sayfa çerçevesi"],
    design: {
      ...base,
      template: "academic",
      fontFamily: "serif",
      pageBorder: "thin",
      accent: "#0f172a",
      dividers: true,
    },
  },
  {
    id: "etkinlik",
    name: "Renkli etkinlik kâğıdı",
    category: "Çalışma kâğıdı",
    description: "Yuvarlak köşeli, renkli kartlı ve sıcak bir çalışma sayfası.",
    features: [
      "Yuvarlak yazı tipi",
      "Renkli başlık kartı",
      "Daire soru numarası",
    ],
    design: {
      ...base,
      template: "playful",
      fontFamily: "rounded",
      spacing: "relaxed",
      numberStyle: "circle",
      accent: "#c2410c",
      showSignature: false,
      footerNote: "Harikasın!",
    },
  },
  {
    id: "tyt",
    name: "YKS / Deneme kitapçığı",
    category: "Test",
    description: "Merkezi deneme sınavı düzeninde keskin çift sütunlu test.",
    features: [
      "Oturum ve kitapçık üst bandı",
      "Çift sütunlu kompakt yerleşim",
      "Kutu içinde soru numaraları",
    ],
    design: {
      ...base,
      template: "tyt",
      columns: 2,
      fontSize: "small",
      spacing: "compact",
      optionLayout: "list",
      numberStyle: "box",
      accent: "#1d4ed8",
      booklet: "A",
      showSignature: false,
    },
  },
  {
    id: "quiz",
    name: "Hızlı kısa sınav (Quiz)",
    category: "Test",
    description: "10–15 dakikalık ders içi değerlendirmeler için kompakt şablon.",
    features: [
      "Tek satırda kompakt öğrenci bilgisi",
      "Süre ve puan rozeti",
      "Sıkı satır aralığıyla tek sayfaya sığar",
    ],
    design: {
      ...base,
      template: "quiz",
      fontSize: "small",
      spacing: "compact",
      accent: "#0e7490",
      numberStyle: "circle",
      showSignature: false,
    },
  },
  {
    id: "stem",
    name: "Fen / STEM teknik",
    category: "Yazılı",
    description: "Matematik, fizik ve fen bilimleri için teknik ızgara başlığı.",
    features: [
      "Sol vurgu şeritli teknik başlık",
      "Formül ve bilgi kutularına uyumlu",
      "Net soru ayırıcı çizgiler",
    ],
    design: {
      ...base,
      template: "stem",
      dividers: true,
      accent: "#126b57",
      fontFamily: "firaSans",
    },
  },
  {
    id: "workbook",
    name: "Çalışma fasikülü",
    category: "Çalışma kâğıdı",
    description: "Ödev, tekrar ve konu kavrama föyleri için çerçeveli düzen.",
    features: [
      "İnce sayfa çerçevesi",
      "Geniş satır aralığı ve yazma alanı",
      "Konu odaklı başlık kartı",
    ],
    design: {
      ...base,
      template: "workbook",
      spacing: "relaxed",
      accent: "#7c3aed",
      showSignature: false,
      footerNote: "Evde tekrar etmeyi unutma.",
    },
  },
  {
    id: "literature",
    name: "Edebiyat / Sözel",
    category: "Yazılı",
    description: "Türkçe, edebiyat ve sosyal bilimler için okuma dostu tasarım.",
    features: [
      "Kitap amblemli editöryal başlık",
      "Serif yazı tipi ve rahat okuma aralığı",
      "Alıntı ve metin bloklarına uyumlu düzen",
    ],
    design: {
      ...base,
      template: "literature",
      fontFamily: "serif",
      spacing: "relaxed",
      accent: "#9a3412",
      dividers: true,
    },
  },
  {
    id: "olympiad",
    name: "Olimpiyat / Seçme",
    category: "Test",
    description: "Proje, yarışma ve üst düzey deneme sınavları için prestijli düzen.",
    features: [
      "Madalya amblemli çift çizgili başlık",
      "Çift sütunlu keskin yerleşim",
      "İnce sayfa çerçevesi",
    ],
    design: {
      ...base,
      template: "olympiad",
      columns: 2,
      pageBorder: "thin",
      accent: "#b45309",
      numberStyle: "box",
      booklet: "A",
    },
  },
]

const categories = [
  "Tümü",
  "Yazılı",
  "Test",
  "Çalışma kâğıdı",
  "Şablonlarım",
] as const
const fontLabels = Object.fromEntries(
  fontOptions.map((font) => [font.value, font.label]),
) as Record<PaperFont, string>
const STORAGE_KEY = "sinav-atolyesi-sablonlarim"

const loadCustom = (userId?: string): TemplateItem[] => {
  try {
    const parsed = userId
      ? listUserTemplates(userId)
      : JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")
    return Array.isArray(parsed)
      ? parsed.map((item: TemplateItem | StoredCustomTemplate) => ({
          ...item,
          design: { ...baseDesign, ...item.design },
        }))
      : []
  } catch {
    return []
  }
}

type TemplatesPageProps = {
  userId?: string
  onMenu: () => void
  current: TemplateDesign
  onUse: (design: TemplateDesign, name: string) => void
  renderPreview: (design: TemplateDesign) => ReactNode
  renderInspector: (
    design: TemplateDesign,
    onChange: (design: TemplateDesign) => void,
  ) => ReactNode
}

type Draft = {
  id: string | null
  name: string
  design: TemplateDesign
}

export default function TemplatesPage({
  userId,
  onMenu,
  current,
  onUse,
  renderPreview,
  renderInspector,
}: TemplatesPageProps) {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<typeof categories[number]>("Tümü")
  const [custom, setCustom] = useState<TemplateItem[]>(() => loadCustom(userId))
  const [draft, setDraft] = useState<Draft | null>(null)

  useEffect(() => {
    setCustom(loadCustom(userId))
  }, [userId])

  useEffect(() => {
    try {
      if (userId) {
        saveUserTemplates(userId, custom)
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(custom))
        syncToExactNativeSqlite()
      }
    } catch {
      // Storage may be full (large logos); keep templates in memory.
    }
  }, [custom, userId])

  const all = useMemo(() => [...custom, ...templates], [custom])

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr")
    return all.filter(
      (item) =>
        (category === "Tümü" || item.category === category) &&
        (!query ||
          `${item.name} ${item.description} ${item.features.join(" ")}`
            .toLocaleLowerCase("tr")
            .includes(query)),
    )
  }, [all, search, category])

  const isCurrent = (design: TemplateDesign) =>
    JSON.stringify(design) === JSON.stringify(current)

  const saveDraft = () => {
    if (!draft) return
    const name = draft.name.trim() || "Adsız şablon"
    const existing = custom.find((item) => item.id === draft.id)
    const item: TemplateItem = {
      id: existing?.id ?? `custom-${Date.now()}`,
      name,
      category: "Şablonlarım",
      description: "Kendi düzenlediğin şablon.",
      features: [],
      design: draft.design,
    }
    setCustom((list) =>
      existing
        ? list.map((entry) => (entry.id === item.id ? item : entry))
        : [item, ...list],
    )
    setDraft({ ...draft, id: item.id, name })
  }

  if (draft) {
    const isCustom = custom.some((item) => item.id === draft.id)
    return (
      <div className="home-view">
        <header className="tpl-editor-bar">
          <button
            className="back-button"
            type="button"
            aria-label="Şablonlara dön"
            onClick={() => setDraft(null)}
          >
            <ArrowLeft size={18} />
          </button>
          <div className="tpl-editor-title">
            <span>Şablon tasarımı</span>
            <input
              value={draft.name}
              aria-label="Şablon adı"
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
            />
          </div>
          <div className="tpl-editor-actions">
            <button
              className="button button-secondary"
              type="button"
              aria-label={isCustom ? "Kaydet" : "Şablonlarıma kaydet"}
              onClick={saveDraft}
            >
              <Save size={14} />
              <span className="tpl-save-label">
                {isCustom ? "Kaydet" : "Şablonlarıma kaydet"}
              </span>
            </button>
            <button
              className="button button-primary"
              type="button"
              onClick={() => onUse(draft.design, draft.name)}
            >
              Editörde kullan
            </button>
          </div>
        </header>
        <div className="tpl-editor">
          <div className="paper-scroll tpl-editor-canvas">
            {renderPreview(draft.design)}
          </div>
          <aside className="tpl-editor-panel">
            {renderInspector(draft.design, (design) =>
              setDraft({ ...draft, design }),
            )}
          </aside>
        </div>
      </div>
    )
  }

  return (
    <div className="home-view">
      <PageHeader
        eyebrow="Tasarım"
        title="Şablonlar"
        description="Kâğıdın gerçek görünümünü incele, logonu ve filigranını ekleyerek kendi şablonunu tasarla."
        search={search}
        searchPlaceholder="Şablon ara"
        onSearch={setSearch}
        onMenu={onMenu}
      />
      <div className="home-scroll page-scroll">
        <div className="page-toolbar">
          <div className="filter-chips" role="tablist" aria-label="Kategori">
            {categories.map((item) => (
              <button
                className={category === item ? "active" : ""}
                key={item}
                type="button"
                role="tab"
                aria-selected={category === item}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <button
            className="button button-secondary"
            type="button"
            onClick={() =>
              setDraft({ id: null, name: "Yeni şablon", design: current })
            }
          >
            <Plus size={14} />
            Mevcut tasarımdan şablon oluştur
          </button>
        </div>

        {visible.length === 0 ? (
          <div className="page-empty">
            <Palette size={26} />
            <strong>Henüz kayıtlı şablon yok</strong>
            <span>Bir şablonu özelleştirip kaydettiğinde burada görünür.</span>
          </div>
        ) : (
          <div className="template-gallery">
            {visible.map((item) => {
              const active = isCurrent(item.design)
              const own = item.category === "Şablonlarım"
              return (
                <article
                  className={`template-tile ${active ? "active" : ""}`}
                  key={item.id}
                  style={
                    {
                      "--tile-accent": item.design.accent,
                    } as React.CSSProperties
                  }
                >
                  <div
                    className="template-stage"
                    role="button"
                    tabIndex={0}
                    aria-label={`${item.name} şablonunu önizle ve özelleştir`}
                    onClick={() =>
                      setDraft({
                        id: own ? item.id : null,
                        name: own ? item.name : `${item.name} (özel)`,
                        design: item.design,
                      })
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        setDraft({
                          id: own ? item.id : null,
                          name: own ? item.name : `${item.name} (özel)`,
                          design: item.design,
                        })
                      }
                    }}
                  >
                    <div className="template-preview">
                      {renderPreview(item.design)}
                    </div>
                    <span className="stage-hint">
                      <Paintbrush size={12} />
                      Özelleştir
                    </span>
                    {active && (
                      <span className="in-use">
                        <Check size={12} />
                        Kullanımda
                      </span>
                    )}
                  </div>
                  <div className="template-info">
                    <span className="tile-category">
                      <span className="tile-swatch" aria-hidden="true" />
                      {item.category}
                    </span>
                    <strong>{item.name}</strong>
                    <p>{item.description}</p>
                    <ul className="template-feature-list">
                      {item.features.slice(0, 3).map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                    <div className="tile-tags">
                      <span>
                        {item.design.columns === 2 ? "Çift sütun" : "Tek sütun"}
                      </span>
                      <span>{fontLabels[item.design.fontFamily]}</span>
                    </div>
                    <div className="tile-actions">
                      <button
                        className={`button ${
                          active ? "button-secondary" : "button-primary"
                        }`}
                        type="button"
                        onClick={() => onUse(item.design, item.name)}
                      >
                        {active ? "Editörde aç" : "Kullan"}
                      </button>
                      <button
                        className="button button-secondary tile-icon"
                        type="button"
                        aria-label="Özelleştir"
                        title="Özelleştir"
                        onClick={() =>
                          setDraft({
                            id: own ? item.id : null,
                            name: own ? item.name : `${item.name} (özel)`,
                            design: item.design,
                          })
                        }
                      >
                        <Paintbrush size={15} />
                      </button>
                      {own && (
                        <button
                          className="button button-secondary tile-icon danger"
                          type="button"
                          aria-label="Şablonu sil"
                          title="Sil"
                          onClick={() =>
                            setCustom((list) =>
                              list.filter((entry) => entry.id !== item.id),
                            )
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
