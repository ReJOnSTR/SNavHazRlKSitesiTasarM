import { Check, FileText, Plus } from "lucide-react"
import { useMemo, useState } from "react"
import Dropdown from "../Dropdown"
import PageHeader from "./PageHeader"

export type BankQuestionType = "multiple" | "trueFalse" | "fillBlank" | "classic"
export type BankDifficulty = "Kolay" | "Orta" | "Zor"

export type BankQuestion = {
  type: BankQuestionType
  prompt: string
  points: number
  difficulty: BankDifficulty
  options?: string[]
  correctAnswer: string
  source?: string
}

type BankItem = BankQuestion & { id: number; topic: string; used: number }

const typeLabels: Record<BankQuestionType, string> = {
  multiple: "Çoktan seçmeli",
  trueFalse: "Doğru / yanlış",
  fillBlank: "Boşluk doldurma",
  classic: "Klasik",
}

const bank: BankItem[] = [
  { id: 1, topic: "Oran ve Orantı", type: "multiple", difficulty: "Kolay", points: 10, used: 6, prompt: "A sayısının B sayısına oranı 2/7 ve A = 8 olduğuna göre B kaçtır?", options: ["14", "21", "28", "32"], correctAnswer: "C" },
  { id: 2, topic: "Oran ve Orantı", type: "classic", difficulty: "Orta", points: 15, used: 3, prompt: "Bir araç 3 saatte 240 km yol alıyor. Aynı hızla 5 saatte kaç km yol alacağını orantı kurarak bulunuz.", correctAnswer: "400 km" },
  { id: 3, topic: "Oran ve Orantı", type: "trueFalse", difficulty: "Kolay", points: 5, used: 9, prompt: "Ters orantılı iki çokluktan biri artarken diğeri de artar.", correctAnswer: "Yanlış" },
  { id: 4, topic: "Yüzdeler", type: "multiple", difficulty: "Orta", points: 10, used: 4, prompt: "Fiyatı 250 TL olan bir ürüne %20 indirim yapılırsa yeni fiyatı kaç TL olur?", options: ["180", "200", "210", "230"], correctAnswer: "B" },
  { id: 5, topic: "Yüzdeler", type: "fillBlank", difficulty: "Kolay", points: 5, used: 2, prompt: "80 sayısının %25'i ______'dir.", correctAnswer: "20" },
  { id: 6, topic: "Tam Sayılar", type: "multiple", difficulty: "Kolay", points: 10, used: 11, prompt: "(-6) · (+4) + (-3) işleminin sonucu kaçtır?", options: ["-27", "-21", "21", "27"], correctAnswer: "A" },
  { id: 7, topic: "Tam Sayılar", type: "classic", difficulty: "Zor", points: 20, used: 1, prompt: "Hava sıcaklığı sabah -8 °C iken öğlene kadar her saat 3 °C artıyor. 5 saat sonraki sıcaklığı işlem göstererek bulunuz.", correctAnswer: "-8 + 5 · 3 = 7 °C" },
  { id: 8, topic: "Rasyonel Sayılar", type: "trueFalse", difficulty: "Orta", points: 5, used: 5, prompt: "-3/4 rasyonel sayısı -0,75 ondalık gösterimine eşittir.", correctAnswer: "Doğru" },
  { id: 9, topic: "Cebirsel İfadeler", type: "fillBlank", difficulty: "Orta", points: 10, used: 3, prompt: "3x + 2x - 4 ifadesinin sadeleştirilmiş hali ______'tür.", correctAnswer: "5x - 4" },
  { id: 10, topic: "Denklemler", type: "multiple", difficulty: "Zor", points: 15, used: 2, prompt: "2(x - 3) = x + 4 denkleminin çözümü kaçtır?", options: ["7", "8", "10", "12"], correctAnswer: "C" },
]

const topics = ["Tüm konular", ...Array.from(new Set(bank.map((item) => item.topic)))]

type BankPageProps = {
  onMenu: () => void
  onAdd: (questions: BankQuestion[]) => void
}

function Select({ value, onChange, options, label }: { value: string; onChange: (value: string) => void; options: string[]; label: string }) {
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

export default function BankPage({ onMenu, onAdd }: BankPageProps) {
  const [search, setSearch] = useState("")
  const [topic, setTopic] = useState("Tüm konular")
  const [type, setType] = useState("Tüm türler")
  const [difficulty, setDifficulty] = useState("Tüm zorluklar")
  const [selected, setSelected] = useState<number[]>([])

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr")
    return bank.filter(
      (item) =>
        (topic === "Tüm konular" || item.topic === topic) &&
        (type === "Tüm türler" || typeLabels[item.type] === type) &&
        (difficulty === "Tüm zorluklar" || item.difficulty === difficulty) &&
        (!query || item.prompt.toLocaleLowerCase("tr").includes(query)),
    )
  }, [search, topic, type, difficulty])

  const toggle = (id: number) =>
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))

  const addSelected = (ids: number[]) => {
    const picked = bank
      .filter((item) => ids.includes(item.id))
      .map(({ id: _id, topic: _topic, used: _used, ...question }) => ({ ...question, source: "Soru bankası" }))
    onAdd(picked)
  }

  return (
    <div className="home-view">
      <PageHeader
        eyebrow="Kaynak"
        title="Soru bankası"
        description="Konu, tür ve zorluğa göre filtrele; seçtiğin soruları tek tıkla sınavına ekle."
        search={search}
        searchPlaceholder="Soru metninde ara"
        onSearch={setSearch}
        onMenu={onMenu}
      />
      <div className="home-scroll page-scroll">
        <div className="page-toolbar">
          <div className="filter-row">
            <Select label="Konu" value={topic} onChange={setTopic} options={topics} />
            <Select label="Soru türü" value={type} onChange={setType} options={["Tüm türler", ...Object.values(typeLabels)]} />
            <Select label="Zorluk" value={difficulty} onChange={setDifficulty} options={["Tüm zorluklar", "Kolay", "Orta", "Zor"]} />
          </div>
          <span className="result-count">{visible.length} soru</span>
        </div>

        {visible.length === 0 ? (
          <div className="page-empty">
            <FileText size={28} />
            <strong>Bu filtrelere uygun soru yok</strong>
            <span>Filtreleri genişletmeyi dene.</span>
          </div>
        ) : (
          <div className="bank-list">
            {visible.map((item) => {
              const isSelected = selected.includes(item.id)
              return (
                <article className={`bank-item ${isSelected ? "selected" : ""}`} key={item.id}>
                  <label className="bank-check">
                    <input type="checkbox" checked={isSelected} onChange={() => toggle(item.id)} aria-label="Soruyu seç" />
                    <span className="custom-check">
                      <Check size={13} />
                    </span>
                  </label>
                  <div className="bank-body">
                    <div className="bank-meta">
                      <span className="topic-tag">{item.topic}</span>
                      <span>{typeLabels[item.type]}</span>
                      <span className={`difficulty ${item.difficulty}`}>{item.difficulty}</span>
                    </div>
                    <p>{item.prompt}</p>
                    {item.options && (
                      <div className="bank-options">
                        {item.options.map((option, index) => (
                          <span
                            className={item.correctAnswer === String.fromCharCode(65 + index) ? "correct" : ""}
                            key={option}
                          >
                            {String.fromCharCode(65 + index)}) {option}
                          </span>
                        ))}
                      </div>
                    )}
                    {!item.options && (
                      <small className="bank-answer">Cevap: {item.correctAnswer}</small>
                    )}
                  </div>
                  <div className="bank-side">
                    <strong>{item.points} puan</strong>
                    <small>{item.used} sınavda kullanıldı</small>
                    <button type="button" onClick={() => addSelected([item.id])}>
                      <Plus size={14} />
                      Ekle
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      <div className={`selection-bar ${selected.length ? "visible" : ""}`} aria-hidden={!selected.length}>
        <span>
          <strong>{selected.length}</strong> soru seçildi
        </span>
        <button className="link-button" type="button" onClick={() => setSelected([])}>
          Temizle
        </button>
        <button className="button button-primary" type="button" onClick={() => addSelected(selected)}>
          <Plus size={16} />
          Sınava ekle
        </button>
      </div>
    </div>
  )
}
