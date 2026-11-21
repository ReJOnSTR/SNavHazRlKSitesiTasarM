import { Download, Plus, Trash2, Users, X } from "lucide-react"
import { isContentType } from "../data/examDefaults"
import type { Question, StudentGrade } from "../types/exam"
import { sanitizeFileName } from "../utils/examUtils"

type GradingModalProps = {
  open: boolean
  examTitle: string
  questions: Question[]
  grades: StudentGrade[]
  onClose: () => void
  onChange: (next: StudentGrade[]) => void
}

export default function GradingModal({
  open,
  examTitle,
  questions,
  grades,
  onClose,
  onChange,
}: GradingModalProps) {
  if (!open) return null

  const gradableQuestions = questions.filter((q) => !isContentType(q.type))
  const maxPoints = gradableQuestions.reduce(
    (sum, q) => sum + (Number(q.points) || 0),
    0,
  )

  const getStudentTotal = (g: StudentGrade) =>
    gradableQuestions.reduce(
      (sum, q) => sum + (Number(g.scores[q.id]) || 0),
      0,
    )

  const totals = grades.map(getStudentTotal)
  const studentCount = grades.length
  const classAvg =
    studentCount > 0
      ? totals.reduce((a, b) => a + b, 0) / studentCount
      : 0
  const highest = studentCount > 0 ? Math.max(...totals) : 0
  const lowest = studentCount > 0 ? Math.min(...totals) : 0
  const passThreshold = maxPoints > 0 ? maxPoints * 0.5 : 50
  const passCount = totals.filter((t) => t >= passThreshold).length
  const passRate =
    studentCount > 0 ? Math.round((passCount / studentCount) * 100) : 0

  const handleAddStudent = () => {
    const next: StudentGrade = {
      id: `stu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      studentNo: "",
      studentName: `Öğrenci ${grades.length + 1}`,
      booklet: "A",
      scores: {},
    }
    onChange([...grades, next])
  }

  const handleUpdateStudent = (
    id: string,
    patch: Partial<StudentGrade>,
  ) => {
    onChange(grades.map((g) => (g.id === id ? { ...g, ...patch } : g)))
  }

  const handleScoreChange = (
    studentId: string,
    questionId: number,
    maxPts: number,
    raw: string,
  ) => {
    const parsed = raw === "" ? 0 : Number(raw)
    const clamped = Number.isFinite(parsed)
      ? Math.max(0, Math.min(maxPts, parsed))
      : 0
    onChange(
      grades.map((g) =>
        g.id === studentId
          ? { ...g, scores: { ...g.scores, [questionId]: clamped } }
          : g,
      ),
    )
  }

  const handleDeleteStudent = (id: string) => {
    onChange(grades.filter((g) => g.id !== id))
  }

  const handleExportCsv = () => {
    const headers = [
      "Öğrenci No",
      "Ad Soyad",
      "Kitapçık",
      ...gradableQuestions.map((q, i) => `S${i + 1} (${q.points}p)`),
      `Toplam (${maxPoints}p)`,
    ]
    const escapeCell = (val: string | number) => {
      const s = String(val ?? "")
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const rows = grades.map((g) => [
      g.studentNo,
      g.studentName,
      g.booklet ?? "A",
      ...gradableQuestions.map((q) => g.scores[q.id] ?? 0),
      getStudentTotal(g),
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCell).join(","))
      .join("\n")
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${sanitizeFileName(examTitle || "sinav")}-notlar.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Not Girişi ve Sınıf Analizi"
      onClick={onClose}
    >
      <div
        className="modal-card grading-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="grading-header-title">
            <Users size={18} />
            <div>
              <h2>Not Girişi &amp; Sınıf Analizi</h2>
              <p>
                {examTitle || "Sınav"} · {gradableQuestions.length} soru ·
                Toplam {maxPoints} puan
              </p>
            </div>
          </div>
          <div className="grading-header-actions">
            <button
              className="button button-secondary button-sm"
              type="button"
              onClick={handleExportCsv}
              disabled={grades.length === 0}
            >
              <Download size={14} />
              CSV İndir
            </button>
            <button
              className="button button-primary button-sm"
              type="button"
              onClick={handleAddStudent}
            >
              <Plus size={14} />
              Öğrenci Ekle
            </button>
            <button
              aria-label="Kapat"
              className="icon-button"
              type="button"
              onClick={onClose}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="grading-stats-grid">
          <div className="grading-stat-card">
            <span>Öğrenci Sayısı</span>
            <strong>{studentCount}</strong>
          </div>
          <div className="grading-stat-card">
            <span>Sınıf Ortalaması</span>
            <strong>
              {classAvg.toFixed(1)} <small>/ {maxPoints}</small>
            </strong>
          </div>
          <div className="grading-stat-card">
            <span>En Yüksek / En Düşük</span>
            <strong>
              {highest} / {lowest}
            </strong>
          </div>
          <div className="grading-stat-card">
            <span>Başarı Oranı (≥%50)</span>
            <strong>%{passRate}</strong>
          </div>
        </div>

        {gradableQuestions.length > 0 && studentCount > 0 && (
          <div className="grading-question-avgs">
            <span className="grading-qavg-title">Soru bazlı başarı:</span>
            <div className="grading-qavg-pills">
              {gradableQuestions.map((q, idx) => {
                const qAvg =
                  grades.reduce(
                    (sum, g) => sum + (Number(g.scores[q.id]) || 0),
                    0,
                  ) / studentCount
                const pct =
                  q.points > 0 ? Math.round((qAvg / q.points) * 100) : 0
                return (
                  <div className="grading-qavg-pill" key={q.id}>
                    <span>S{idx + 1}</span>
                    <strong>%{pct}</strong>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="grading-table-wrap">
          {grades.length === 0 ? (
            <div className="grading-empty">
              <Users size={28} />
              <p>Henüz öğrenci notu girilmedi.</p>
              <button
                className="button button-primary button-sm"
                type="button"
                onClick={handleAddStudent}
              >
                <Plus size={14} />
                İlk Öğrenciyi Ekle
              </button>
            </div>
          ) : (
            <table className="grading-table">
              <thead>
                <tr>
                  <th className="col-no">No</th>
                  <th className="col-name">Ad Soyad</th>
                  <th className="col-booklet">Kit.</th>
                  {gradableQuestions.map((q, idx) => (
                    <th key={q.id} title={q.prompt}>
                      S{idx + 1}
                      <small>({q.points}p)</small>
                    </th>
                  ))}
                  <th className="col-total">Toplam</th>
                  <th className="col-act" />
                </tr>
              </thead>
              <tbody>
                {grades.map((g) => {
                  const total = getStudentTotal(g)
                  const passed = total >= passThreshold
                  return (
                    <tr key={g.id}>
                      <td>
                        <input
                          aria-label="Öğrenci No"
                          className="grading-input grading-input-no"
                          placeholder="101"
                          type="text"
                          value={g.studentNo}
                          onChange={(e) =>
                            handleUpdateStudent(g.id, {
                              studentNo: e.target.value,
                            })
                          }
                        />
                      </td>
                      <td>
                        <input
                          aria-label="Ad Soyad"
                          className="grading-input grading-input-name"
                          placeholder="Ad Soyad"
                          type="text"
                          value={g.studentName}
                          onChange={(e) =>
                            handleUpdateStudent(g.id, {
                              studentName: e.target.value,
                            })
                          }
                        />
                      </td>
                      <td>
                        <select
                          aria-label="Kitapçık"
                          className="grading-select"
                          value={g.booklet ?? "A"}
                          onChange={(e) =>
                            handleUpdateStudent(g.id, {
                              booklet: e.target.value as "A" | "B",
                            })
                          }
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                        </select>
                      </td>
                      {gradableQuestions.map((q) => (
                        <td key={q.id}>
                          <input
                            aria-label={`Soru puanı`}
                            className="grading-input grading-input-score"
                            max={q.points}
                            min={0}
                            type="number"
                            value={g.scores[q.id] ?? ""}
                            placeholder="0"
                            onChange={(e) =>
                              handleScoreChange(
                                g.id,
                                q.id,
                                q.points,
                                e.target.value,
                              )
                            }
                          />
                        </td>
                      ))}
                      <td className="col-total">
                        <span
                          className={`grading-total-badge ${passed ? "pass" : "fail"}`}
                        >
                          {total}
                        </span>
                      </td>
                      <td>
                        <button
                          aria-label="Öğrenciyi sil"
                          className="icon-button"
                          type="button"
                          onClick={() => handleDeleteStudent(g.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
