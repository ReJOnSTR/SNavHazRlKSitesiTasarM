import {
  FileText,
  LayoutTemplate,
  Menu,
  Plus,
  Search,
  Sparkles,
  UploadCloud,
} from "lucide-react"
import { useMemo, useState } from "react"
import { isContentType } from "../data/examDefaults"
import { TopbarTitle, TopbarTools } from "../pages/PageHeader"
import type { StoredExam, UserAccount } from "../services/db"

function formatRelativeDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
  }).format(date)
}

export default function HomeView({
  user,
  exams,
  bankCount,
  onMenu,
  onNewExam,
  onPdf,
  onTemplate,
  onOpenExam,
  onAllExams,
}: {
  user: UserAccount
  exams: StoredExam[]
  bankCount: number
  onMenu: () => void
  onNewExam: () => void
  onPdf: () => void
  onTemplate: () => void
  onOpenExam: (id: string) => void
  onAllExams: () => void
}) {
  const [query, setQuery] = useState("")

  const visibleExams = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr")
    const filtered = q
      ? exams.filter((e) =>
          `${e.examMeta.title} ${e.examMeta.topic} ${e.examMeta.grade}`
            .toLocaleLowerCase("tr")
            .includes(q),
        )
      : exams
    return filtered.slice(0, 4)
  }, [exams, query])

  const totalExamQuestions = useMemo(
    () =>
      exams.reduce(
        (sum, exam) =>
          sum + exam.questions.filter((q) => !isContentType(q.type)).length,
        0,
      ),
    [exams],
  )

  return (
    <div className="home-view">
      <header className="home-topbar">
        <button
          className="icon-button mobile-menu"
          type="button"
          aria-label="Menüyü aç"
          onClick={onMenu}
        >
          <Menu size={20} />
        </button>
        <TopbarTitle title="Ana sayfa" />
        <label className="home-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sınavlarında ara"
            aria-label="Ara"
          />
        </label>
        <TopbarTools />
      </header>

      <div className="home-scroll">
        <section className="home-hero">
          <div>
            <p className="eyebrow">Hoş geldin, {user.name}</p>
            <h1>Bugün hangi sınavı hazırlıyoruz?</h1>
            <p>
              Sorularını ekle, kâğıt tasarımını seç ve dakikalar içinde
              yazdırmaya hazır bir sınav oluştur.
            </p>
            <div className="hero-actions">
              <button
                className="button button-primary large"
                type="button"
                onClick={onNewExam}
              >
                <Plus size={18} />
                Yeni sınav oluştur
              </button>
              <button
                className="button button-secondary large"
                type="button"
                onClick={onPdf}
              >
                <UploadCloud size={18} />
                PDF'den soru ekle
              </button>
              <button
                className="button button-secondary large"
                type="button"
                onClick={onTemplate}
              >
                <LayoutTemplate size={18} />
                Şablon seç
              </button>
            </div>
          </div>
          <div className="hero-paper" aria-hidden="true">
            <div className="hero-sheet back" />
            <div className="hero-sheet">
              <span className="sheet-title" />
              <span className="sheet-sub" />
              <span className="sheet-box" />
              {[0, 1, 2].map((row) => (
                <div className="sheet-question" key={row}>
                  <b>{row + 1}.</b>
                  <span />
                  <span className="short" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="home-grid">
          <section className="home-card recent-card">
            <div className="home-card-header">
              <h2>Son sınavlar</h2>
              <button type="button" onClick={onAllExams}>
                Tümünü gör
              </button>
            </div>
            {visibleExams.length === 0 ? (
              <div className="page-empty" style={{ padding: "24px 12px" }}>
                <FileText size={24} />
                <strong>Henüz sınavın yok</strong>
                <span>İlk sınavını oluşturarak başla.</span>
              </div>
            ) : (
              <ul>
                {visibleExams.map((exam) => {
                  const qCount = exam.questions.filter(
                    (q) => !isContentType(q.type),
                  ).length
                  const pts = exam.questions.reduce(
                    (s, q) => (isContentType(q.type) ? s : s + q.points),
                    0,
                  )
                  return (
                    <li key={exam.id}>
                      <button
                        type="button"
                        onClick={() => onOpenExam(exam.id)}
                      >
                        <span className="recent-icon">
                          <FileText size={17} />
                        </span>
                        <span className="recent-text">
                          <strong>{exam.examMeta.title || "İsimsiz sınav"}</strong>
                          <small>
                            {qCount} soru · {pts} puan
                          </small>
                        </span>
                        <span className={`status status-${exam.status}`}>
                          {exam.status}
                        </span>
                        <span className="recent-date">
                          {formatRelativeDate(exam.updatedAt)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <aside className="home-side">
            <section className="home-card stats-card">
              <h2>Hesap özeti</h2>
              <div className="stats">
                <div>
                  <strong>{exams.length}</strong>
                  <span>Kayıtlı sınav</span>
                </div>
                <div>
                  <strong>{bankCount}</strong>
                  <span>Soru bankasında</span>
                </div>
                <div>
                  <strong>{totalExamQuestions}</strong>
                  <span>Toplam soru</span>
                </div>
              </div>
            </section>
            <section className="home-card tip-card">
              <Sparkles size={18} />
              <div>
                <strong>İpucu</strong>
                <p>
                  Editörde “Kâğıt tasarımı” ile şablon, yazı boyutu ve sütun
                  düzenini tek tıkla değiştirebilirsin.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}
