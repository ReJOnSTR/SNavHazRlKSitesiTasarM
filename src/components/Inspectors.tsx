import {
  Check,
  Download,
  Image as ImageIcon,
  Plus,
  Shuffle,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react"
import { useRef, useState } from "react"
import Dropdown from "../Dropdown"
import MathInput from "../MathInput"
import {
  accentOptions,
  isContentType,
  questionKinds,
  questionTypeLabels,
} from "../data/examDefaults"
import { fontOptions } from "../pages/TemplatesPage"
import type {
  Difficulty,
  ExamMeta,
  InfoVariant,
  PaperDesign,
  Question,
  RubricItem,
} from "../types/exam"
import TypeIcon from "./TypeIcon"

const MAX_IMAGE_BYTES = 3 * 1024 * 1024

function FormField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function ChoiceGroup<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T
  options: {
    value: T
    label: string
  }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="segmented-control" data-count={options.length}>
      {options.map((option) => (
        <button
          className={value === option.value ? "active" : ""}
          key={String(option.value)}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="toggle-row compact">
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <i />
    </label>
  )
}

const templateOptions: {
  value: PaperDesign["template"]
  label: string
  description: string
}[] = [
  {
    value: "classic",
    label: "MEB yazılı",
    description: "Bilgi tablosu, puan kutusu",
  },
  { value: "lgs", label: "LGS test", description: "Başlık bandı, çift sütun" },
  { value: "minimal", label: "Sade", description: "Çalışma kâğıdı düzeni" },
  {
    value: "elegant",
    label: "Zarif",
    description: "Ortalı arma, serif başlık",
  },
  { value: "bold", label: "Kurumsal", description: "Koyu başlık bandı" },
  { value: "playful", label: "Etkinlik", description: "Yuvarlak, renkli kart" },
  { value: "academic", label: "Akademik", description: "Logo + bilgi tablosu" },
  { value: "tyt", label: "YKS / Deneme", description: "Merkezi deneme bandı" },
  { value: "quiz", label: "Kısa sınav", description: "Kompakt quiz düzeni" },
  { value: "stem", label: "Fen / STEM", description: "Teknik ızgara başlık" },
  { value: "workbook", label: "Fasikül", description: "Çalışma föyü düzeni" },
  { value: "literature", label: "Edebiyat", description: "Sözel / serif düzen" },
  { value: "olympiad", label: "Olimpiyat", description: "Yarışma & seçme" },
]

const formulaSnippets = [
  { label: "Kesir", value: "[a/b]" },
  { label: "Üs", value: "x^{n}" },
  { label: "x²", value: "x^2" },
  { label: "x³", value: "x^3" },
  { label: "Alt indis", value: "a_1" },
  { label: "Kök", value: "√{x}" },
  { label: "±", value: " ± " },
  { label: "·", value: " · " },
  { label: "×", value: " × " },
  { label: "÷", value: " ÷ " },
  { label: "≤", value: " ≤ " },
  { label: "≥", value: " ≥ " },
  { label: "≠", value: " ≠ " },
  { label: "≈", value: " ≈ " },
  { label: "π", value: "π" },
  { label: "°", value: "°" },
  { label: "Δ", value: "Δ" },
  { label: "∠", value: "∠" },
  { label: "△", value: "△" },
  { label: "⊥", value: " ⊥ " },
  { label: "∥", value: " ∥ " },
  { label: "∈", value: " ∈ " },
  { label: "∪", value: " ∪ " },
  { label: "∩", value: " ∩ " },
  { label: "⇒", value: "  ⇒  " },
  { label: "⇔", value: "  ⇔  " },
]

export function ContentInspector({
  block,
  onUpdate,
  onDelete,
}: {
  block: Question
  onUpdate: (updates: Partial<Question>) => void
  onDelete: () => void
}) {
  const formulaRef = useRef<HTMLInputElement>(null)

  const insertSnippet = (snippet: string) => {
    const input = formulaRef.current
    const current = block.formula ?? ""
    const start = input?.selectionStart ?? current.length
    const end = input?.selectionEnd ?? current.length
    const next = current.slice(0, start) + snippet + current.slice(end)
    onUpdate({ formula: next })
    requestAnimationFrame(() => {
      input?.focus()
      input?.setSelectionRange(start + snippet.length, start + snippet.length)
    })
  }

  return (
    <div className="inspector-content">
      <div className="block-type-pill">
        <TypeIcon type={block.type} />
        <span>{questionTypeLabels[block.type]}</span>
      </div>

      {block.type === "section" && (
        <FormField label="Bölüm yönergesi">
          <textarea
            rows={3}
            value={block.prompt}
            onChange={(event) => onUpdate({ prompt: event.target.value })}
          />
        </FormField>
      )}

      {block.type === "info" && (
        <FormField label="Kutu türü">
          <ChoiceGroup<InfoVariant>
            value={block.variant ?? "Bilgi"}
            options={[
              { value: "Bilgi", label: "Bilgi" },
              { value: "Hatırlatma", label: "Hatırlatma" },
              { value: "Dikkat", label: "Dikkat" },
            ]}
            onChange={(variant) =>
              onUpdate({
                variant,
                title:
                  !block.title ||
                  ["Bilgi", "Hatırlatma", "Dikkat"].includes(block.title)
                    ? variant
                    : block.title,
              })
            }
          />
        </FormField>
      )}

      {block.type !== "section" && (
        <FormField label="Başlık">
          <input
            value={block.title ?? ""}
            onChange={(event) => onUpdate({ title: event.target.value })}
          />
        </FormField>
      )}

      {block.type === "formula" && (
        <>
          <FormField label="Formül">
            <input
              className="formula-input"
              ref={formulaRef}
              value={block.formula ?? ""}
              onChange={(event) => onUpdate({ formula: event.target.value })}
            />
          </FormField>
          <div className="snippet-row" aria-label="Sembol ekle">
            {formulaSnippets.map((snippet) => (
              <button
                key={snippet.label}
                type="button"
                onClick={() => insertSnippet(snippet.value)}
              >
                {snippet.label}
              </button>
            ))}
          </div>
        </>
      )}

      {block.type !== "section" && (
        <FormField
          label={
            block.type === "formula"
              ? "Açıklama"
              : block.type === "example"
                ? "Örnek soru"
                : "Metin"
          }
        >
          <MathInput
            multiline
            rows={block.type === "text" ? 8 : 4}
            value={block.prompt}
            onChange={(prompt) => onUpdate({ prompt })}
          />
        </FormField>
      )}

      {block.type === "example" && (
        <FormField label="Çözüm">
          <MathInput
            multiline
            rows={3}
            label="Çözüm"
            value={block.correctAnswer}
            onChange={(correctAnswer) => onUpdate({ correctAnswer })}
          />
        </FormField>
      )}

      {block.type === "text" && (
        <p className="math-hint">Yeni paragraf için satır başı yapın.</p>
      )}

      <button
        className="delete-question-button"
        type="button"
        onClick={onDelete}
      >
        <Trash2 size={17} />
        Bloğu sil
      </button>
    </div>
  )
}

function LogoWatermarkFields({
  design,
  onUpdate,
  onNotify,
}: {
  design: PaperDesign
  onUpdate: (updates: Partial<PaperDesign>) => void
  onNotify?: (message: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const readLogo = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      onNotify?.("Lütfen geçerli bir görsel dosyası seçin.")
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      onNotify?.("Logo dosyası en fazla 3 MB olabilir.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => onUpdate({ logo: String(reader.result) })
    reader.readAsDataURL(file)
  }

  return (
    <div className="design-group">
      <span className="group-label">Logo ve filigran</span>
      <div className="logo-picker">
        <div className="logo-preview">
          {design.logo ? (
            <img src={design.logo} alt="Yüklenen logo" />
          ) : (
            <ImageIcon size={18} />
          )}
        </div>
        <div>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => fileRef.current?.click()}
          >
            <UploadCloud size={14} />
            {design.logo ? "Değiştir" : "Logo yükle"}
          </button>
          {design.logo && (
            <button
              className="link-remove"
              type="button"
              onClick={() =>
                onUpdate({
                  logo: "",
                  watermark:
                    design.watermark === "logo" ? "none" : design.watermark,
                })
              }
            >
              Kaldır
            </button>
          )}
          <small>Şeffaf PNG · en fazla 3 MB</small>
        </div>
        <input
          ref={fileRef}
          className="sr-only"
          type="file"
          accept="image/png,.png"
          onChange={(event) => {
            readLogo(event.target.files?.[0])
            event.target.value = ""
          }}
        />
      </div>
      <FormField label="Logo boyutu">
        <ChoiceGroup
          value={design.logoSize}
          options={[
            { value: "small", label: "S" },
            { value: "medium", label: "M" },
            { value: "large", label: "L" },
          ]}
          onChange={(logoSize) => onUpdate({ logoSize })}
        />
      </FormField>
      <span className="group-label">Filigran</span>
      <ChoiceGroup
        value={design.watermark}
        options={[
          { value: "none", label: "Filigran yok" },
          { value: "text", label: "Yazı" },
          { value: "logo", label: "Logo" },
        ]}
        onChange={(watermark) => {
          if (watermark === "logo" && !design.logo) {
            fileRef.current?.click()
          }
          onUpdate({ watermark })
        }}
      />
      {design.watermark === "text" && (
        <input
          className="watermark-input"
          value={design.watermarkText}
          maxLength={24}
          aria-label="Filigran yazısı"
          onChange={(event) => onUpdate({ watermarkText: event.target.value })}
        />
      )}
      {design.watermark !== "none" && (
        <label className="range-field">
          <span>Görünürlük</span>
          <input
            type="range"
            min={3}
            max={25}
            value={design.watermarkOpacity}
            onChange={(event) =>
              onUpdate({ watermarkOpacity: Number(event.target.value) })
            }
          />
          <b>%{design.watermarkOpacity}</b>
        </label>
      )}
    </div>
  )
}

export function DesignInspector({
  design,
  onUpdate,
  onReset,
  onNotify,
}: {
  design: PaperDesign
  onUpdate: (updates: Partial<PaperDesign>) => void
  onReset: () => void
  onNotify?: (message: string) => void
}) {
  return (
    <div className="inspector-content">
      <div className="design-group">
        <span className="group-label">Şablon</span>
        <div className="template-grid">
          {templateOptions.map((option) => (
            <button
              className={`template-card ${
                design.template === option.value ? "active" : ""
              }`}
              key={option.value}
              type="button"
              aria-pressed={design.template === option.value}
              onClick={() => onUpdate({ template: option.value })}
            >
              <span className={`template-thumb thumb-${option.value}`}>
                <i />
                <i />
                <i />
                <i />
              </span>
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="design-group">
        <span className="group-label">Vurgu rengi</span>
        <div className="swatches">
          {accentOptions.map((color) => (
            <button
              className={design.accent === color ? "active" : ""}
              key={color}
              type="button"
              aria-label={`Vurgu rengi ${color}`}
              aria-pressed={design.accent === color}
              style={{ background: color }}
              onClick={() => onUpdate({ accent: color })}
            >
              {design.accent === color && <Check size={13} />}
            </button>
          ))}
          <label
            className={`swatch-custom ${
              accentOptions.includes(design.accent) ? "" : "active"
            }`}
            title="Özel renk"
          >
            <input
              type="color"
              value={design.accent}
              aria-label="Özel vurgu rengi"
              onChange={(event) => onUpdate({ accent: event.target.value })}
            />
          </label>
        </div>
      </div>

      <FormField label="Yazı boyutu">
        <ChoiceGroup
          value={design.fontSize}
          options={[
            { value: "small", label: "Küçük" },
            { value: "normal", label: "Normal" },
            { value: "large", label: "Büyük" },
          ]}
          onChange={(fontSize) => onUpdate({ fontSize })}
        />
      </FormField>
      <FormField label="Soru aralığı">
        {(() => {
          const presets: Record<PaperDesign["spacing"], number> = {
            compact: 6,
            normal: 12,
            relaxed: 20,
          }
          const currentGap = design.questionGap ?? presets[design.spacing]
          return (
            <>
              <ChoiceGroup
                value={design.spacing}
                options={[
                  { value: "compact", label: "Sıkı" },
                  { value: "normal", label: "Normal" },
                  { value: "relaxed", label: "Geniş" },
                ]}
                onChange={(spacing) =>
                  onUpdate({ spacing, questionGap: presets[spacing] })
                }
              />
              <label className="range-field margin-field" style={{ marginTop: 6 }}>
                <span>İnce ayar</span>
                <input
                  type="range"
                  min={4}
                  max={40}
                  step={2}
                  value={currentGap}
                  onChange={(event) => {
                    const gap = Number(event.target.value)
                    const spacing: PaperDesign["spacing"] =
                      gap <= 8 ? "compact" : gap <= 16 ? "normal" : "relaxed"
                    onUpdate({ questionGap: gap, spacing })
                  }}
                />
                <b>{currentGap} px</b>
              </label>
            </>
          )
        })()}
      </FormField>
      <div className="form-row">
        <FormField label="Sütun">
          <ChoiceGroup
            value={design.columns}
            options={[
              { value: 1, label: "Tek" },
              { value: 2, label: "Çift" },
            ]}
            onChange={(columns) => onUpdate({ columns })}
          />
        </FormField>
      </div>
      <FormField label="Şıklar">
        <ChoiceGroup
          value={design.optionLayout}
          options={[
            { value: "grid", label: "Izgara" },
            { value: "inline", label: "Yan yana" },
            { value: "list", label: "Alt alta" },
          ]}
          onChange={(optionLayout) => onUpdate({ optionLayout })}
        />
      </FormField>

      <FormField label="Yazı tipi">
        <Dropdown<PaperDesign["fontFamily"]>
          label="Yazı tipi"
          value={design.fontFamily}
          options={fontOptions.map((font) => ({
            value: font.value,
            label: font.label,
            icon: <span className={`font-sample font-${font.value}`}>Aa</span>,
          }))}
          onChange={(fontFamily) => onUpdate({ fontFamily })}
        />
      </FormField>
      <FormField label="Soru numarası">
        <Dropdown<PaperDesign["numberStyle"]>
          label="Soru numarası"
          value={design.numberStyle}
          options={[
            { value: "plain", label: "Sade (1.)" },
            { value: "paren", label: "Parantez (1))" },
            { value: "underline", label: "Altı çizgili (1.)" },
            { value: "circle", label: "Dolu daire" },
            { value: "outlineCircle", label: "Çerçeveli daire" },
            { value: "box", label: "Dolu kare" },
            { value: "outlineBox", label: "Çerçeveli kare" },
            { value: "pill", label: "Etiket (Soru 1)" },
            { value: "ribbon", label: "Bayrak rozet" },
          ]}
          onChange={(numberStyle) => onUpdate({ numberStyle })}
        />
      </FormField>
      <FormField label="Sayfa çerçevesi">
        <Dropdown<PaperDesign["pageBorder"]>
          label="Sayfa çerçevesi"
          value={design.pageBorder}
          options={[
            { value: "none", label: "Yok (Çerçevesiz)" },
            { value: "thin", label: "İnce çerçeve" },
            { value: "double", label: "Çift çizgili" },
            { value: "rounded", label: "Yuvarlak köşeli" },
            { value: "dashed", label: "Kesikli çerçeve" },
            { value: "corners", label: "Köşe çizgileri" },
            { value: "topBottom", label: "Üst-alt şerit" },
          ]}
          onChange={(pageBorder) => onUpdate({ pageBorder })}
        />
      </FormField>

      <FormField label="Kâğıt arka planı">
        <Dropdown<NonNullable<PaperDesign["paperBackground"]>>
          label="Kâğıt arka planı"
          value={design.paperBackground ?? "white"}
          options={[
            { value: "white", label: "Düz beyaz" },
            { value: "cream", label: "Krem / Fildişi" },
            { value: "softTint", label: "Hafif vurgu tonu" },
            { value: "grid", label: "Kareli defter" },
            { value: "dots", label: "Noktalı defter" },
            { value: "lined", label: "Çizgili defter" },
          ]}
          onChange={(paperBackground) => onUpdate({ paperBackground })}
        />
      </FormField>

      <label className="range-field margin-field">
        <span>Kenar boşluğu</span>
        <input
          type="range"
          min={8}
          max={25}
          value={design.margin}
          onChange={(event) => onUpdate({ margin: Number(event.target.value) })}
        />
        <b>{design.margin} mm</b>
      </label>

      <div className="design-group toggles">
        <span className="group-label">Kâğıt öğeleri</span>
        <ToggleRow
          title="Soru ayırıcı çizgiler"
          description="Sorular arasında ince çizgi"
          checked={design.dividers}
          onChange={(dividers) => onUpdate({ dividers })}
        />
        <ToggleRow
          title="Okul başlığı"
          description="T.C., okul adı ve öğretim yılı"
          checked={design.showSchoolHeader}
          onChange={(showSchoolHeader) => onUpdate({ showSchoolHeader })}
        />
        <ToggleRow
          title="Öğrenci bilgi kutusu"
          description="Ad, sınıf, tarih ve süre alanı"
          checked={design.showStudentBox}
          onChange={(showStudentBox) => onUpdate({ showStudentBox })}
        />
        <ToggleRow
          title="Soru puanları"
          description="Her sorunun yanında puan"
          checked={design.showPoints}
          onChange={(showPoints) => onUpdate({ showPoints })}
        />
        <ToggleRow
          title="Öğretmen imzası"
          description="Son sayfada ad ve imza alanı"
          checked={design.showSignature}
          onChange={(showSignature) => onUpdate({ showSignature })}
        />
      </div>

      <div className="design-group">
        <span className="group-label">Kitapçık türü</span>
        <ChoiceGroup<PaperDesign["booklet"]>
          value={design.booklet}
          options={[
            { value: "none", label: "Yok" },
            { value: "A", label: "A" },
            { value: "B", label: "B" },
          ]}
          onChange={(booklet) => onUpdate({ booklet })}
        />
      </div>

      <LogoWatermarkFields
        design={design}
        onUpdate={onUpdate}
        onNotify={onNotify}
      />

      <FormField label="Alt bilgi notu">
        <input
          value={design.footerNote}
          onChange={(event) => onUpdate({ footerNote: event.target.value })}
        />
      </FormField>

      <button className="reset-design-button" type="button" onClick={onReset}>
        Varsayılan tasarıma dön
      </button>
    </div>
  )
}

export function ExamInspector({
  examMeta,
  questions,
  totalPoints,
  showAnswerKey,
  showOpticalForm,
  booklet,
  onUpdate,
  onToggleAnswerKey,
  onToggleOpticalForm,
  onShuffleBooklet,
  onDownloadAnswerKeyPdf,
  onDownloadDualBookletPdf,
}: {
  examMeta: ExamMeta
  questions: Question[]
  totalPoints: number
  showAnswerKey: boolean
  showOpticalForm: boolean
  booklet: PaperDesign["booklet"]
  onUpdate: (updates: Partial<ExamMeta>) => void
  onToggleAnswerKey: (value: boolean) => void
  onToggleOpticalForm: (value: boolean) => void
  onShuffleBooklet: (nextBooklet: "A" | "B", shuffleOptions: boolean) => void
  onDownloadAnswerKeyPdf: () => void
  onDownloadDualBookletPdf?: () => void
}) {
  const [shuffleOptions, setShuffleOptions] = useState(true)
  const target = examMeta.targetPoints ?? 100
  const diff = target - totalPoints

  return (
    <div className="inspector-content">
      <div className="info-callout">
        <Sparkles size={17} />
        <p>Buradaki değişiklikler sınav kâğıdına anında yansır.</p>
      </div>

      <div className="points-summary-card">
        <div className="points-summary-head">
          <span>Puan kontrolü</span>
          <strong className={diff === 0 ? "is-complete" : diff < 0 ? "is-over" : ""}>
            {totalPoints} / {target} p
          </strong>
        </div>
        <div className="points-bar">
          <span
            style={{
              width: `${Math.min(100, target > 0 ? (totalPoints / target) * 100 : 0)}%`,
            }}
          />
        </div>
        <small>
          {diff === 0
            ? "Hedef puana ulaşıldı"
            : diff > 0
              ? `Hedefe ${diff} puan kaldı`
              : `Hedefin ${Math.abs(diff)} puan üzerinde`}
        </small>
      </div>

      <FormField label="Sınav başlığı">
        <input
          value={examMeta.title}
          onChange={(event) => onUpdate({ title: event.target.value })}
        />
      </FormField>
      <FormField label="Okul adı">
        <input
          value={examMeta.school}
          onChange={(event) => onUpdate({ school: event.target.value })}
        />
      </FormField>
      <div className="form-row">
        <FormField label="Sınıf">
          <input
            value={examMeta.grade}
            onChange={(event) => onUpdate({ grade: event.target.value })}
          />
        </FormField>
        <FormField label="Süre">
          <div className="suffix-input">
            <input
              min="1"
              type="number"
              value={examMeta.duration}
              onChange={(event) =>
                onUpdate({ duration: Number(event.target.value) })
              }
            />
            <span>dk.</span>
          </div>
        </FormField>
      </div>
      <div className="form-row">
        <FormField label="Hedef puan">
          <input
            min="1"
            type="number"
            value={target}
            onChange={(event) =>
              onUpdate({ targetPoints: Math.max(1, Number(event.target.value)) })
            }
          />
        </FormField>
        <FormField label="Ders">
          <input
            value={examMeta.subject}
            onChange={(event) => onUpdate({ subject: event.target.value })}
          />
        </FormField>
      </div>
      <FormField label="Konu">
        <input
          value={examMeta.topic}
          onChange={(event) => onUpdate({ topic: event.target.value })}
        />
      </FormField>
      <FormField label="Tarih">
        <input
          value={examMeta.date}
          onChange={(event) => onUpdate({ date: event.target.value })}
        />
      </FormField>
      <FormField label="Öğretim yılı">
        <input
          value={examMeta.academicYear}
          placeholder="2024–2025"
          onChange={(event) => onUpdate({ academicYear: event.target.value })}
        />
      </FormField>
      <div className="form-row">
        <FormField label="Dönem">
          <Dropdown<ExamMeta["term"]>
            label="Dönem"
            value={examMeta.term}
            options={[
              { value: "1", label: "1. Dönem" },
              { value: "2", label: "2. Dönem" },
            ]}
            onChange={(term) => onUpdate({ term })}
          />
        </FormField>
        <FormField label="Yazılı">
          <Dropdown<ExamMeta["examNo"]>
            label="Yazılı"
            value={examMeta.examNo}
            options={[
              { value: "1", label: "1. Yazılı" },
              { value: "2", label: "2. Yazılı" },
              { value: "3", label: "3. Yazılı" },
            ]}
            onChange={(examNo) => onUpdate({ examNo })}
          />
        </FormField>
      </div>
      <FormField label="Ders öğretmeni">
        <input
          value={examMeta.teacher}
          placeholder="Ad Soyad (imza alanında görünür)"
          onChange={(event) => onUpdate({ teacher: event.target.value })}
        />
      </FormField>

      <div className="design-group">
        <span className="group-label">Kitapçık &amp; Karıştırma</span>
        <ToggleRow
          title="Şıkları da karıştır"
          description="Çoktan seçmeli sorularda şıkların yerini değiştir"
          checked={shuffleOptions}
          onChange={setShuffleOptions}
        />
        <div className="booklet-shuffle-row">
          <button
            className={`button button-secondary ${booklet === "A" ? "active" : ""}`}
            type="button"
            onClick={() => onShuffleBooklet("A", shuffleOptions)}
          >
            <Shuffle size={14} />
            A Kitapçığı üret
          </button>
          <button
            className={`button button-secondary ${booklet === "B" ? "active" : ""}`}
            type="button"
            onClick={() => onShuffleBooklet("B", shuffleOptions)}
          >
            <Shuffle size={14} />
            B Kitapçığı üret
          </button>
        </div>
        {onDownloadDualBookletPdf && (
          <button
            className="button button-secondary"
            style={{ marginTop: 8, width: "100%" }}
            type="button"
            onClick={onDownloadDualBookletPdf}
          >
            <Download size={14} />
            A + B Çift Kitapçık PDF İndir
          </button>
        )}
      </div>

      <ToggleRow
        title="Cevap anahtarı sayfası"
        description="Şablona uygun öğretmen nüshasını çıktının sonuna ekle"
        checked={showAnswerKey}
        onChange={onToggleAnswerKey}
      />

      <ToggleRow
        title="Optik cevap formu"
        description="Soruların sonuna optik kodlama alanı ekle"
        checked={showOpticalForm}
        onChange={onToggleOpticalForm}
      />

      {showAnswerKey && (
        <button
          className="button button-secondary full-width"
          type="button"
          onClick={onDownloadAnswerKeyPdf}
        >
          <Download size={15} />
          Yalnızca cevap anahtarını PDF indir
        </button>
      )}
    </div>
  )
}

function QuestionLeadFields({
  question,
  onUpdate,
  onNotify,
}: {
  question: Question
  onUpdate: (updates: Partial<Question>) => void
  onNotify?: (message: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const hasLead = question.lead !== undefined
  const hasSubText = question.subText !== undefined
  const readImage = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      onNotify?.("Lütfen geçerli bir görsel dosyası seçin.")
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      onNotify?.("Soru görseli en fazla 3 MB olabilir.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => onUpdate({ image: String(reader.result) })
    reader.readAsDataURL(file)
  }

  return (
    <div className="question-lead-fields">
      {hasLead && (
        <div className="form-field">
          <span className="field-head">
            Giriş metni (öncül)
            <button
              className="link-remove"
              type="button"
              onClick={() => onUpdate({ lead: undefined })}
            >
              Kaldır
            </button>
          </span>
          <MathInput
            multiline
            rows={4}
            label="Giriş metni"
            value={question.lead ?? ""}
            onChange={(lead) => onUpdate({ lead })}
          />
          <small className="field-hint">
            Sorudan önce okunacak metin: okuma parçası, senaryo veya öncüller.
          </small>
        </div>
      )}

      {question.image && (
        <div className="form-field">
          <span className="field-head">
            Soru görseli
            <button
              className="link-remove"
              type="button"
              onClick={() =>
                onUpdate({ image: undefined, imageSize: undefined })
              }
            >
              Kaldır
            </button>
          </span>
          <div className="question-image-preview">
            <img src={question.image} alt="Soru görseli önizlemesi" />
            <button
              className="button button-secondary"
              type="button"
              onClick={() => fileRef.current?.click()}
            >
              <UploadCloud size={14} />
              Değiştir
            </button>
          </div>
          <ChoiceGroup
            value={question.imageSize ?? "medium"}
            options={[
              { value: "small", label: "Küçük" },
              { value: "medium", label: "Orta" },
              { value: "full", label: "Tam" },
            ]}
            onChange={(imageSize) => onUpdate({ imageSize })}
          />
          <label className="range-field margin-field" style={{ marginTop: 8 }}>
            <span>Görsel ölçeği</span>
            <input
              type="range"
              min={40}
              max={150}
              step={5}
              value={question.imageScale ?? 100}
              onChange={(event) =>
                onUpdate({ imageScale: Number(event.target.value) })
              }
            />
            <b>%{question.imageScale ?? 100}</b>
          </label>
          {question.sourceFontPx && (
            <small className="field-hint">
              PDF yazı boyutuna otomatik uyumlu — kağıt yazı boyutuyla birlikte
              ölçeklenir.
            </small>
          )}
        </div>
      )}

      {hasSubText && (
        <div className="form-field">
          <span className="field-head">
            Alt metin (görsel altı)
            <button
              className="link-remove"
              type="button"
              onClick={() => onUpdate({ subText: undefined })}
            >
              Kaldır
            </button>
          </span>
          <MathInput
            multiline
            rows={3}
            label="Alt metin"
            value={question.subText ?? ""}
            onChange={(subText) => onUpdate({ subText })}
          />
          <small className="field-hint">
            Görselin altında, kalın soru kökünden önce yer alan açıklama veya
            formül.
          </small>
        </div>
      )}

      {(!hasLead || !hasSubText || !question.image) && (
        <div className="lead-add-row">
          {!hasLead && (
            <button
              className="lead-add-button"
              type="button"
              onClick={() => onUpdate({ lead: "" })}
            >
              <Plus size={13} />
              Giriş metni
            </button>
          )}
          {!hasSubText && (
            <button
              className="lead-add-button"
              type="button"
              onClick={() => onUpdate({ subText: "" })}
            >
              <Plus size={13} />
              Alt metin
            </button>
          )}
          {!question.image && (
            <button
              className="lead-add-button"
              type="button"
              onClick={() => fileRef.current?.click()}
            >
              <ImageIcon size={13} />
              Görsel ekle (max 3 MB)
            </button>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        className="sr-only"
        type="file"
        accept="image/*"
        onChange={(event) => {
          readImage(event.target.files?.[0])
          event.target.value = ""
        }}
      />
    </div>
  )
}

export function QuestionInspector({
  question,
  onUpdate,
  onUpdateOption,
  onSaveToBank,
  onDelete,
  onNotify,
}: {
  question: Question
  onUpdate: (updates: Partial<Question>) => void
  onUpdateOption: (index: number, value: string) => void
  onSaveToBank?: () => void
  onDelete: () => void
  onNotify?: (message: string) => void
}) {
  return (
    <div className="inspector-content">
      <FormField label="Soru türü">
        <Dropdown
          label="Soru türü"
          value={question.type}
          options={[...questionKinds, "none" as const].map((type) => ({
            value: type,
            label: questionTypeLabels[type],
            icon: <TypeIcon type={type} />,
          }))}
          onChange={(type) =>
            onUpdate({
              type,
              options:
                type === "multiple"
                  ? (question.options ?? [
                      "A seçeneği",
                      "B seçeneği",
                      "C seçeneği",
                      "D seçeneği",
                    ])
                  : undefined,
            })
          }
        />
      </FormField>

      <QuestionLeadFields
        question={question}
        onUpdate={onUpdate}
        onNotify={onNotify}
      />

      <FormField label="Soru metni">
        <MathInput
          multiline
          rows={5}
          label="Soru metni"
          value={question.prompt}
          onChange={(prompt) => onUpdate({ prompt })}
        />
      </FormField>

      <label className="checkbox-inline" style={{ marginTop: -4 }}>
        <input
          type="checkbox"
          checked={
            question.promptBold === true ||
            (question.promptBold !== false &&
              Boolean(question.image || question.subText || question.lead))
          }
          onChange={(event) => onUpdate({ promptBold: event.target.checked })}
        />
        <span>Soru metnini kalın yaz</span>
      </label>

      {question.type === "multiple" && question.options && (
        <>
          <FormField label="Şık yerleşimi">
            <ChoiceGroup<NonNullable<Question["optionLayout"]>>
              value={question.optionLayout ?? "inherit"}
              options={[
                { value: "inherit", label: "Genel" },
                { value: "grid", label: "Izgara" },
                { value: "inline", label: "Yan yana" },
                { value: "list", label: "Alt alta" },
              ]}
              onChange={(optionLayout) => onUpdate({ optionLayout })}
            />
          </FormField>

          <fieldset className="options-fieldset">
          <legend>
            Seçenekler
            <small>Doğru cevabı soldaki daireden seçin</small>
          </legend>
          {question.options.map((option, index) => {
            const letter = String.fromCharCode(65 + index)
            return (
              <div
                className={`option-row ${
                  question.correctAnswer === letter ? "is-correct" : ""
                }`}
                key={index}
              >
                <label
                  className="option-radio"
                  title="Doğru cevap olarak işaretle"
                >
                  <input
                    name="correct-answer"
                    type="radio"
                    checked={question.correctAnswer === letter}
                    onChange={() => onUpdate({ correctAnswer: letter })}
                  />
                  <span>{letter}</span>
                </label>
                <MathInput
                  compact
                  label={`${letter} seçeneği`}
                  value={option}
                  onChange={(value) => onUpdateOption(index, value)}
                />
                <button
                  className="option-remove"
                  type="button"
                  aria-label={`${letter} seçeneğini sil`}
                  disabled={question.options!.length <= 2}
                  onClick={() => {
                    const options = question.options!.filter(
                      (_, i) => i !== index,
                    )
                    const correct = question.correctAnswer.charCodeAt(0) - 65
                    const nextCorrect =
                      correct === index
                        ? "A"
                        : correct > index
                          ? String.fromCharCode(64 + correct)
                          : question.correctAnswer
                    onUpdate({ options, correctAnswer: nextCorrect })
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            )
          })}
          {question.options.length < 8 && (
            <button
              className="option-add"
              type="button"
              onClick={() =>
                onUpdate({
                  options: [
                    ...question.options!,
                    `${String.fromCharCode(65 + question.options!.length)} seçeneği`,
                  ],
                })
              }
            >
              <Plus size={14} />
              Seçenek ekle
              <span>{question.options.length} / 8</span>
            </button>
          )}
        </fieldset>
        </>
      )}

      {question.type === "trueFalse" ? (
        <FormField label="Doğru cevap">
          <div className="segmented-control">
            {["Doğru", "Yanlış"].map((answer) => (
              <button
                className={question.correctAnswer === answer ? "active" : ""}
                key={answer}
                type="button"
                onClick={() => onUpdate({ correctAnswer: answer })}
              >
                {answer}
              </button>
            ))}
          </div>
        </FormField>
      ) : (
        question.type !== "multiple" && (
          <FormField label="Örnek cevap">
            <MathInput
              multiline
              rows={3}
              label="Örnek cevap"
              value={question.correctAnswer}
              onChange={(correctAnswer) => onUpdate({ correctAnswer })}
            />
          </FormField>
        )
      )}

      <FormField label="Çözüm alanı">
        <ChoiceGroup<NonNullable<Question["solutionSpace"]>>
          value={question.solutionSpace ?? "none"}
          options={[
            { value: "none", label: "Yok" },
            { value: "lines", label: "Çizgili" },
            { value: "box", label: "Kutu" },
            { value: "grid", label: "Kareli" },
          ]}
          onChange={(solutionSpace) => onUpdate({ solutionSpace })}
        />
      </FormField>

      {question.solutionSpace && question.solutionSpace !== "none" && (
        <label className="range-field margin-field">
          <span>Çözüm yüksekliği</span>
          <input
            type="range"
            min={44}
            max={320}
            step={4}
            value={question.solutionHeight ?? 76}
            onChange={(event) =>
              onUpdate({ solutionHeight: Number(event.target.value) })
            }
          />
          <b>{question.solutionHeight ?? 76} px</b>
        </label>
      )}

      <div className="form-row">
        <FormField label="Puan">
          <input
            min="0"
            type="number"
            value={question.points}
            onChange={(event) =>
              onUpdate({ points: Number(event.target.value) })
            }
          />
        </FormField>
        <FormField label="Zorluk">
          <Dropdown<Difficulty>
            label="Zorluk"
            value={question.difficulty}
            options={(["Kolay", "Orta", "Zor"] as Difficulty[]).map(
              (level) => ({
                value: level,
                label: level,
                icon: <span className={`dropdown-dot dot-${level}`} />,
              }),
            )}
            onChange={(difficulty) => onUpdate({ difficulty })}
          />
        </FormField>
      </div>

      {question.type === "classic" && (
        <div className="rubric-editor">
          <div className="rubric-editor-head">
            <span>Puanlama ölçeği (Rubrik)</span>
            <button
              className="button button-ghost button-sm"
              type="button"
              onClick={() => {
                const next: RubricItem[] = [
                  ...(question.rubric ?? []),
                  {
                    id: `rubric-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    label: "Ölçüt",
                    points: 5,
                  },
                ]
                onUpdate({ rubric: next })
              }}
            >
              <Plus size={13} />
              Ölçüt ekle
            </button>
          </div>
          {question.rubric && question.rubric.length > 0 ? (
            <>
              <div className="rubric-items">
                {question.rubric.map((item, idx) => (
                  <div className="rubric-item-row" key={item.id}>
                    <input
                      aria-label={`Ölçüt ${idx + 1}`}
                      placeholder="Ölçüt açıklaması..."
                      type="text"
                      value={item.label}
                      onChange={(e) => {
                        const next = (question.rubric ?? []).map((r) =>
                          r.id === item.id ? { ...r, label: e.target.value } : r,
                        )
                        onUpdate({ rubric: next })
                      }}
                    />
                    <input
                      aria-label={`Ölçüt ${idx + 1} puanı`}
                      className="rubric-pts-input"
                      min="0"
                      type="number"
                      value={item.points}
                      onChange={(e) => {
                        const pts = Math.max(0, Number(e.target.value) || 0)
                        const next = (question.rubric ?? []).map((r) =>
                          r.id === item.id ? { ...r, points: pts } : r,
                        )
                        onUpdate({ rubric: next })
                      }}
                    />
                    <button
                      aria-label="Ölçütü sil"
                      className="icon-button"
                      type="button"
                      onClick={() => {
                        const next = (question.rubric ?? []).filter(
                          (r) => r.id !== item.id,
                        )
                        onUpdate({ rubric: next })
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
              {(() => {
                const rubricTotal = question.rubric.reduce(
                  (sum, r) => sum + (Number(r.points) || 0),
                  0,
                )
                return (
                  <div className="rubric-footer">
                    <span>
                      Rubrik toplamı: <strong>{rubricTotal} p</strong>
                    </span>
                    {rubricTotal !== question.points && (
                      <button
                        className="button button-secondary button-sm"
                        type="button"
                        onClick={() => onUpdate({ points: rubricTotal })}
                      >
                        Soru puanına eşitle ({rubricTotal})
                      </button>
                    )}
                  </div>
                )
              })()}
            </>
          ) : (
            <p className="rubric-empty-hint">
              Klasik soru için adım bazlı puanlama ölçütü ekleyebilirsiniz; cevap
              anahtarında otomatik listelenir.
            </p>
          )}
        </div>
      )}

      {onSaveToBank && (
        <button
          className="button button-secondary full-width"
          type="button"
          onClick={onSaveToBank}
        >
          <Plus size={16} />
          Soru bankasına kaydet
        </button>
      )}

      <button
        className="delete-question-button"
        type="button"
        onClick={onDelete}
      >
        <Trash2 size={17} />
        Soruyu sil
      </button>
    </div>
  )
}
