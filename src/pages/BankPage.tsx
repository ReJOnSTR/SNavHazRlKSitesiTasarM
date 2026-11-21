import { Check, FileText, Plus, Trash2, X } from "lucide-react"
import { useMemo, useState } from "react"
import Dropdown from "../Dropdown"
import type { StoredBankItem } from "../services/db"
import PageHeader from "./PageHeader"

import type { QuestionImageSize } from "../types/exam"

export type BankQuestionType = "multiple" | "trueFalse" | "fillBlank" | "classic"
export type BankDifficulty = "Kolay" | "Orta" | "Zor"

export type BankQuestion = {
  bankId?: string
  type: BankQuestionType
  prompt: string
  points: number
  difficulty: BankDifficulty
  options?: string[]
  correctAnswer: string
  source?: string
  lead?: string
  leadBold?: boolean
  leadColor?: string
  promptBold?: boolean
  promptColor?: string
  image?: string
  imageSize?: QuestionImageSize
  imageRawWidth?: number
  sourceFontPx?: number
  imageScale?: number
  optionLayout?: "inherit" | "grid" | "inline" | "list"
  solutionSpace?: "none" | "lines" | "box" | "grid"
  solutionHeight?: number
}

const typeLabels: Record<BankQuestionType, string> = {
  multiple: "Çoktan seçmeli",
  trueFalse: "Doğru / yanlış",
  fillBlank: "Boşluk doldurma",
  classic: "Klasik",
}

type BankPageProps = {
  items: StoredBankItem[]
  onMenu: () => void
  onCreate: (item: Omit<StoredBankItem, "id" | "userId" | "used">) => void
  onDelete: (id: string) => void
  onAdd: (questions: BankQuestion[]) => void
}

function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string
  onChange: (value: string) => void
  options: string[]
  label: string
}) {
  return (
    <Dropdown
      variant="filter"
      label={label}
      value={value}
      options={options.map((option) => ({ value: option, label: option }))}
      onChange={onChange}
    />
  )
}

export default function BankPage({
  items,
  onMenu,
  onCreate,
  onDelete,
  onAdd,
}: BankPageProps) {
  const [search, setSearch] = useState("")
  const [topic, setTopic] = useState("Tüm konular")
  const [type, setType] = useState("Tüm türler")
  const [difficulty, setDifficulty] = useState("Tüm zorluklar")
  const [selected, setSelected] = useState<string[]>([])

  const [adding, setAdding] = useState(false)
  const [newTopic, setNewTopic] = useState("")
  const [newType, setNewType] = useState<BankQuestionType>("classic")
  const [newDifficulty, setNewDifficulty] = useState<BankDifficulty>("Orta")
  const [newPoints, setNewPoints] = useState(10)
  const [newPrompt, setNewPrompt] = useState("")
  const [newAnswer, setNewAnswer] = useState("")

  const topics = useMemo(
    () => [
      "Tüm konular",
      ...Array.from(new Set(items.map((item) => item.topic).filter(Boolean))),
    ],
    [items],
  )

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr")
    return items.filter(
      (item) =>
        (topic === "Tüm konular" || item.topic === topic) &&
        (type === "Tüm türler" || typeLabels[item.type] === type) &&
        (difficulty === "Tüm zorluklar" || item.difficulty === difficulty) &&
        (!query ||
          `${item.prompt} ${item.topic}`.toLocaleLowerCase("tr").includes(query)),
    )
  }, [items, search, topic, type, difficulty])

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    )

  const addSelected = (ids: string[]) => {
    const picked = items
      .filter((item) => ids.includes(item.id))
      .map(({ id, userId: _uid, topic: _topic, used: _used, ...question }) => ({
        ...question,
        bankId: id,
        source: question.source || "Soru bankası",
      }))
    onAdd(picked)
  }

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault()
    if (!newPrompt.trim()) return
    onCreate({
      topic: newTopic.trim() || "Genel",
      type: newType,
      difficulty: newDifficulty,
      points: Math.max(1, newPoints),
      prompt: newPrompt.trim(),
      options:
        newType === "multiple"
          ? ["A seçeneği", "B seçeneği", "C seçeneği", "D seçeneği"]
          : undefined,
      correctAnswer: newAnswer.trim() || (newType === "multiple" ? "A" : "Örnek cevap"),
    })
    setNewPrompt("")
    setNewAnswer("")
    setNewTopic("")
    setAdding(false)
  }

  return (
    <div className="home-view">
      <PageHeader
        eyebrow="Kaynak"
        title="Soru bankası"
        description="Kendi sorularını ekle, filtrele ve tek tıkla sınavına aktar."
        search={search}
        searchPlaceholder="Soru metninde veya konuda ara"
        onSearch={setSearch}
        onMenu={onMenu}
        actions={
          <button
            className="button button-primary"
            type="button"
            onClick={() => setAdding((v) => !v)}
          >
            {adding ? <X size={16} /> : <Plus size={16} />}
            {adding ? "Vazgeç" : "Yeni soru ekle"}
          </button>
        }
      />
      <div className="home-scroll page-scroll">
        {adding && (
          <form className="bank-create-form" onSubmit={handleCreate}>
            <div className="form-row">
              <label className="form-field">
                <span>Konu</span>
                <input
                  value={newTopic}
                  placeholder="Örn. Oran ve Orantı"
                  onChange={(e) => setNewTopic(e.target.value)}
                />
              </label>
              <label className="form-field">
                <span>Soru türü</span>
                <Dropdown<BankQuestionType>
                  label="Soru türü"
                  value={newType}
                  options={Object.entries(typeLabels).map(([val, label]) => ({
                    value: val as BankQuestionType,
                    label,
                  }))}
                  onChange={setNewType}
                />
              </label>
              <label className="form-field">
                <span>Zorluk</span>
                <Dropdown<BankDifficulty>
                  label="Zorluk"
                  value={newDifficulty}
                  options={(["Kolay", "Orta", "Zor"] as BankDifficulty[]).map(
                    (d) => ({ value: d, label: d }),
                  )}
                  onChange={setNewDifficulty}
                />
              </label>
              <label className="form-field">
                <span>Puan</span>
                <input
                  type="number"
                  min={1}
                  value={newPoints}
                  onChange={(e) => setNewPoints(Number(e.target.value))}
                />
              </label>
            </div>
            <label className="form-field">
              <span>Soru metni</span>
              <textarea
                required
                rows={3}
                value={newPrompt}
                placeholder="Soru metnini yazın..."
                onChange={(e) => setNewPrompt(e.target.value)}
              />
            </label>
            <label className="form-field">
              <span>Doğru cevap / Çözüm</span>
              <input
                value={newAnswer}
                placeholder={
                  newType === "multiple" ? "Örn. A" : "Örn. 400 km"
                }
                onChange={(e) => setNewAnswer(e.target.value)}
              />
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="button button-primary" type="submit">
                <Plus size={16} />
                Bankaya kaydet
              </button>
            </div>
          </form>
        )}

        <div className="page-toolbar">
          <div className="filter-row">
            <Select label="Konu" value={topic} onChange={setTopic} options={topics} />
            <Select
              label="Soru türü"
              value={type}
              onChange={setType}
              options={["Tüm türler", ...Object.values(typeLabels)]}
            />
            <Select
              label="Zorluk"
              value={difficulty}
              onChange={setDifficulty}
              options={["Tüm zorluklar", "Kolay", "Orta", "Zor"]}
            />
          </div>
          <span className="result-count">{visible.length} soru</span>
        </div>

        {visible.length === 0 ? (
          <div className="page-empty">
            <FileText size={28} />
            <strong>
              {items.length === 0
                ? "Soru bankan henüz boş"
                : "Bu filtrelere uygun soru yok"}
            </strong>
            <span>
              {items.length === 0
                ? "Yukarıdan yeni soru ekleyebilir veya editörden soruları bankaya kaydedebilirsin."
                : "Filtreleri genişletmeyi dene."}
            </span>
          </div>
        ) : (
          <div className="bank-list">
            {visible.map((item) => {
              const isSelected = selected.includes(item.id)
              return (
                <article
                  className={`bank-item ${isSelected ? "selected" : ""}`}
                  key={item.id}
                >
                  <label className="bank-check">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(item.id)}
                      aria-label="Soruyu seç"
                    />
                    <span className="custom-check">
                      <Check size={13} />
                    </span>
                  </label>
                  <div className="bank-body">
                    <div className="bank-meta">
                      <span className="topic-tag">{item.topic}</span>
                      <span>{typeLabels[item.type]}</span>
                      <span className={`difficulty ${item.difficulty}`}>
                        {item.difficulty}
                      </span>
                    </div>
                    <p>{item.prompt}</p>
                    {item.options && (
                      <div className="bank-options">
                        {item.options.map((option, index) => (
                          <span
                            className={
                              item.correctAnswer ===
                              String.fromCharCode(65 + index)
                                ? "correct"
                                : ""
                            }
                            key={`${item.id}-${index}`}
                          >
                            {String.fromCharCode(65 + index)}) {option}
                          </span>
                        ))}
                      </div>
                    )}
                    {!item.options && (
                      <small className="bank-answer">
                        Cevap: {item.correctAnswer}
                      </small>
                    )}
                  </div>
                  <div className="bank-side">
                    <strong>{item.points} puan</strong>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => addSelected([item.id])}
                      >
                        <Plus size={14} />
                        Ekle
                      </button>
                      <button
                        type="button"
                        aria-label="Soruyu bankadan sil"
                        onClick={() => onDelete(item.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      <div
        className={`selection-bar ${selected.length ? "visible" : ""}`}
        aria-hidden={!selected.length}
      >
        <span>
          <strong>{selected.length}</strong> soru seçildi
        </span>
        <button
          className="link-button"
          type="button"
          onClick={() => setSelected([])}
        >
          Temizle
        </button>
        <button
          className="button button-primary"
          type="button"
          onClick={() => addSelected(selected)}
        >
          <Plus size={16} />
          Sınava ekle
        </button>
      </div>
    </div>
  )
}
