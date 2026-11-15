import {
  Copy,
  FileText,
  LayoutGrid,
  List,
  Plus,
  Printer,
  Trash2,
  UploadCloud,
} from "lucide-react"
import { useMemo, useState } from "react"
import PageHeader from "./PageHeader"

type ExamStatus = "Taslak" | "Hazır" | "Yazdırıldı"

type ExamItem = {
  id: number
  title: string
  grade: string
  topic: string
  questions: number
  points: number
  status: ExamStatus
  updated: string
}

const initialExams: ExamItem[] = [
  { id: 1, title: "7. Sınıf Matematik — Oran ve Orantı", grade: "7/A", topic: "Oran ve Orantı", questions: 4, points: 80, status: "Taslak", updated: "Bugün" },
  { id: 2, title: "7/B Tam Sayılarla İşlemler Yazılısı", grade: "7/B", topic: "Tam Sayılar", questions: 12, points: 100, status: "Hazır", updated: "Dün" },
  { id: 3, title: "Rasyonel Sayılar Kısa Sınav", grade: "7/A", topic: "Rasyonel Sayılar", questions: 8, points: 50, status: "Yazdırıldı", updated: "12 Mayıs" },
  { id: 4, title: "Cebirsel İfadeler Çalışma Kâğıdı", grade: "7/C", topic: "Cebirsel İfadeler", questions: 10, points: 100, status: "Hazır", updated: "8 Mayıs" },
  { id: 5, title: "Eşitlik ve Denklem — 2. Dönem 1. Yazılı", grade: "7/A", topic: "Denklemler", questions: 15, points: 100, status: "Yazdırıldı", updated: "29 Nisan" },
  { id: 6, title: "Yüzdeler Tekrar Testi", grade: "7/B", topic: "Yüzdeler", questions: 20, points: 100, status: "Taslak", updated: "22 Nisan" },
]

const filters: ("Tümü" | ExamStatus)[] = ["Tümü", "Taslak", "Hazır", "Yazdırıldı"]

type ExamsPageProps = {
  onMenu: () => void
  onOpen: () => void
  onNew: () => void
  onPdf: () => void
  onNotify: (message: string) => void
}

export default function ExamsPage({ onMenu, onOpen, onNew, onPdf, onNotify }: ExamsPageProps) {
  const [exams, setExams] = useState(initialExams)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<(typeof filters)[number]>("Tümü")
  const [layout, setLayout] = useState<"grid" | "list">("grid")

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr")
    return exams.filter(
      (exam) =>
        (filter === "Tümü" || exam.status === filter) &&
        (!query ||
          `${exam.title} ${exam.topic} ${exam.grade}`.toLocaleLowerCase("tr").includes(query)),
    )
  }, [exams, search, filter])

  const duplicate = (exam: ExamItem) => {
    const id = Math.max(...exams.map((item) => item.id)) + 1
    setExams([{ ...exam, id, title: `${exam.title} (kopya)`, status: "Taslak", updated: "Şimdi" }, ...exams])
    onNotify("Sınav kopyalandı")
  }

  const remove = (id: number) => {
    setExams(exams.filter((exam) => exam.id !== id))
    onNotify("Sınav silindi")
  }

  return (
    <div className="home-view">
      <PageHeader
        eyebrow="Arşiv"
        title="Sınavlarım"
        description="Hazırladığın tüm sınavları buradan aç, kopyala veya düzenle."
        search={search}
        searchPlaceholder="Sınav, konu veya sınıf ara"
        onSearch={setSearch}
        onMenu={onMenu}
        actions={
          <>
            <button className="button button-secondary" type="button" onClick={onPdf}>
              <UploadCloud size={16} />
              PDF'den aktar
            </button>
            <button className="button button-primary" type="button" onClick={onNew}>
              <Plus size={16} />
              Yeni sınav
            </button>
          </>
        }
      />
      <div className="home-scroll page-scroll">
        <div className="page-toolbar">
          <div className="filter-chips" role="tablist" aria-label="Duruma göre filtrele">
            {filters.map((item) => (
              <button
                className={filter === item ? "active" : ""}
                key={item}
                type="button"
                role="tab"
                aria-selected={filter === item}
                onClick={() => setFilter(item)}
              >
                {item}
                <span>
                  {item === "Tümü" ? exams.length : exams.filter((exam) => exam.status === item).length}
                </span>
              </button>
            ))}
          </div>
          <div className="layout-toggle">
            <button className={layout === "grid" ? "active" : ""} type="button" aria-label="Kart görünümü" onClick={() => setLayout("grid")}>
              <LayoutGrid size={16} />
            </button>
            <button className={layout === "list" ? "active" : ""} type="button" aria-label="Liste görünümü" onClick={() => setLayout("list")}>
              <List size={16} />
            </button>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="page-empty">
            <FileText size={28} />
            <strong>Sonuç bulunamadı</strong>
            <span>Arama veya filtreyi değiştirmeyi dene.</span>
          </div>
        ) : (
          <div className={layout === "grid" ? "exam-grid" : "exam-list"}>
            {visible.map((exam) => (
              <article className="exam-card" key={exam.id}>
                <button className="exam-card-main" type="button" onClick={onOpen}>
                  <span className="exam-thumb" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="exam-card-text">
                    <span className={`status status-${exam.status}`}>{exam.status}</span>
                    <strong>{exam.title}</strong>
                    <small>
                      {exam.grade} · {exam.questions} soru · {exam.points} puan
                    </small>
                  </span>
                </button>
                <footer>
                  <span>Güncellendi: {exam.updated}</span>
                  <div>
                    <button type="button" aria-label="Yazdır" onClick={() => onNotify("Yazdırma için sınavı açın")}>
                      <Printer size={15} />
                    </button>
                    <button type="button" aria-label="Kopyala" onClick={() => duplicate(exam)}>
                      <Copy size={15} />
                    </button>
                    <button className="danger" type="button" aria-label="Sil" onClick={() => remove(exam.id)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </footer>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
