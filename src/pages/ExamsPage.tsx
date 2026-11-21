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
import { isContentType } from "../data/examDefaults"
import type { StoredExam } from "../services/db"
import PageHeader from "./PageHeader"

type ExamStatus = "Taslak" | "Hazır" | "Yazdırıldı"
const filters: ("Tümü" | ExamStatus)[] = ["Tümü", "Taslak", "Hazır", "Yazdırıldı"]

type ExamsPageProps = {
  exams: StoredExam[]
  onMenu: () => void
  onOpen: (id: string) => void
  onNew: () => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onPdf: () => void
  onNotify: (message: string) => void
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
  }).format(date)
}

export default function ExamsPage({
  exams,
  onMenu,
  onOpen,
  onNew,
  onDuplicate,
  onDelete,
  onPdf,
  onNotify,
}: ExamsPageProps) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<(typeof filters)[number]>("Tümü")
  const [layout, setLayout] = useState<"grid" | "list">("grid")

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr")
    return exams.filter(
      (exam) =>
        (filter === "Tümü" || exam.status === filter) &&
        (!query ||
          `${exam.examMeta.title} ${exam.examMeta.topic} ${exam.examMeta.grade}`
            .toLocaleLowerCase("tr")
            .includes(query)),
    )
  }, [exams, search, filter])

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
                  {item === "Tümü"
                    ? exams.length
                    : exams.filter((exam) => exam.status === item).length}
                </span>
              </button>
            ))}
          </div>
          <div className="layout-toggle">
            <button
              className={layout === "grid" ? "active" : ""}
              type="button"
              aria-label="Kart görünümü"
              onClick={() => setLayout("grid")}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={layout === "list" ? "active" : ""}
              type="button"
              aria-label="Liste görünümü"
              onClick={() => setLayout("list")}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="page-empty">
            <FileText size={28} />
            <strong>
              {exams.length === 0 ? "Henüz kayıtlı sınavın yok" : "Sonuç bulunamadı"}
            </strong>
            <span>
              {exams.length === 0
                ? "Yeni sınav oluşturarak başlayabilirsin."
                : "Arama veya filtreyi değiştirmeyi dene."}
            </span>
          </div>
        ) : (
          <div className={layout === "grid" ? "exam-grid" : "exam-list"}>
            {visible.map((exam) => {
              const qCount = exam.questions.filter(
                (q) => !isContentType(q.type),
              ).length
              const pts = exam.questions.reduce(
                (s, q) => (isContentType(q.type) ? s : s + q.points),
                0,
              )
              return (
                <article className="exam-card" key={exam.id}>
                  <button
                    className="exam-card-main"
                    type="button"
                    onClick={() => onOpen(exam.id)}
                  >
                    <span className="exam-thumb" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                    </span>
                    <span className="exam-card-text">
                      <span className={`status status-${exam.status}`}>
                        {exam.status}
                      </span>
                      <strong>{exam.examMeta.title || "İsimsiz sınav"}</strong>
                      <small>
                        {exam.examMeta.grade || "Sınıf yok"} · {qCount} soru ·{" "}
                        {pts} puan
                      </small>
                    </span>
                  </button>
                  <footer>
                    <span>Güncellendi: {formatDate(exam.updatedAt)}</span>
                    <div>
                      <button
                        type="button"
                        aria-label="Yazdır"
                        onClick={() => {
                          onOpen(exam.id)
                          onNotify("Yazdırmak için üstteki Yazdır butonunu kullanın")
                        }}
                      >
                        <Printer size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label="Kopyala"
                        onClick={() => onDuplicate(exam.id)}
                      >
                        <Copy size={15} />
                      </button>
                      <button
                        className="danger"
                        type="button"
                        aria-label="Sil"
                        onClick={() => onDelete(exam.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </footer>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
