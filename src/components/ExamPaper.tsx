import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Copy,
  FileText,
  GripVertical,
  Info,
  Lightbulb,
  Trash2,
} from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { MathText } from "../MathInput"
import {
  PAGE_HEIGHT,
  PAGE_WIDTH,
  isContentType,
  questionTypeLabels,
} from "../data/examDefaults"
import type { ExamMeta, PaperDesign, PaperPage, Question } from "../types/exam"

export function ContentBlockView({ block }: { block: Question }) {
  if (block.type === "section") {
    return (
      <h3 className="block-section-title">
        <MathText text={block.prompt} />
      </h3>
    )
  }

  if (block.type === "formula") {
    return (
      <div className="formula-block">
        {block.title && <span className="block-label">{block.title}</span>}
        <div className="formula-display">
          <MathText text={block.formula ?? ""} />
        </div>
        {block.prompt && (
          <p>
            <MathText text={block.prompt} />
          </p>
        )}
      </div>
    )
  }

  if (block.type === "info") {
    const variant = block.variant ?? "Bilgi"
    return (
      <aside className={`info-block info-${variant}`}>
        <span className="info-badge" aria-hidden="true">
          {variant === "Dikkat" ? (
            <AlertTriangle size={12} />
          ) : variant === "Bilgi" ? (
            <Info size={12} />
          ) : (
            <Lightbulb size={12} />
          )}
        </span>
        <div>
          <strong>{block.title || variant}</strong>
          <p>
            <MathText text={block.prompt} />
          </p>
        </div>
      </aside>
    )
  }

  if (block.type === "example") {
    return (
      <div className="example-block">
        <span className="block-label">{block.title || "Örnek"}</span>
        <p>
          <MathText text={block.prompt} />
        </p>
        {block.correctAnswer && (
          <div className="example-solution">
            <b>Çözüm:</b> <MathText text={block.correctAnswer} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="text-block">
      {block.title && <h4>{block.title}</h4>}
      {block.prompt.split("\n").map((paragraph, index) => (
        <p key={index}>
          <MathText text={paragraph} />
        </p>
      ))}
    </div>
  )
}

export type ExamPaperProps = {
  examMeta: ExamMeta
  questions: Question[]
  selectedQuestionId: number | null
  totalPoints: number
  showAnswerKey: boolean
  showOpticalForm?: boolean
  preview?: boolean
  design: PaperDesign
  onSelectQuestion: (id: number) => void
  onSelectExam: () => void
  onMove: (id: number, direction: -1 | 1) => void
  onReorder?: (fromId: number, toId: number) => void
  onDuplicate: (id: number) => void
  onDelete: (id: number) => void
  maxPages?: number
}

export default function ExamPaper({
  examMeta,
  questions,
  selectedQuestionId,
  totalPoints,
  showAnswerKey,
  showOpticalForm = false,
  preview,
  design,
  onSelectQuestion,
  onSelectExam,
  onMove,
  onReorder,
  onDuplicate,
  onDelete,
  maxPages,
}: ExamPaperProps) {
  const [draggedId, setDraggedId] = useState<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)

  const paperClass = [
    "exam-paper",
    `template-${design.template}`,
    `size-${design.fontSize}`,
    `spacing-${design.spacing}`,
    `options-${design.optionLayout}`,
    `font-${design.fontFamily}`,
    `frame-${design.pageBorder}`,
    `bg-${design.paperBackground ?? "white"}`,
    `num-${design.numberStyle}`,
    `logo-${design.logoSize}`,
    design.columns === 2 ? "two-columns" : "",
    design.dividers ? "with-dividers" : "",
  ].join(" ")
  const resolvedQuestionGap =
    design.questionGap ??
    (design.spacing === "compact"
      ? 6
      : design.spacing === "relaxed"
        ? 20
        : 12)
  const paperStyle = {
    "--paper-accent": design.accent,
    "--wm-opacity": design.watermarkOpacity / 100,
    "--pad": `${((design.margin ?? 15) * PAGE_WIDTH) / 210}px`,
    "--q-gap": `${resolvedQuestionGap}px`,
  } as React.CSSProperties
  const questionItems = questions.filter((item) => !isContentType(item.type))
  let counter = 0
  const numbering = questions.map((item) =>
    isContentType(item.type) ? 0 : ++counter,
  )
  const gradeLevel = examMeta.grade.match(/\d+/)?.[0] ?? ""

  const hasLogo = Boolean(design.logo)
  const initials = examMeta.school
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 2)
    .map((word) => word[0].toLocaleUpperCase("tr"))
    .join("")
  const crest = (
    <span className={`logo-slot ${hasLogo ? "has-image" : "monogram"}`}>
      {hasLogo ? (
        <img src={design.logo} alt="Okul logosu" />
      ) : (
        <b>{initials || "S"}</b>
      )}
    </span>
  )
  const logoCell = hasLogo ? crest : null
  const yearLabel = examMeta.academicYear?.trim() || "2024–2025"
  const examLabel = `${examMeta.term ?? "2"}. Dönem ${examMeta.examNo ?? "1"}. Yazılı`
  const bookletBadge =
    design.booklet && design.booklet !== "none" ? (
      <span className="booklet-badge">
        <small>Kitapçık</small>
        <b>{design.booklet}</b>
      </span>
    ) : null
  const studentFields = (
    <div className="d-student">
      <label>
        <span>Adı Soyadı</span>
        <i />
      </label>
      <label>
        <span>Sınıf / No</span>
        <i />
      </label>
      <label className="d-score">
        <span>Puan</span>
        <i />
      </label>
    </div>
  )
  const examTitle = `${examMeta.subject} Dersi`
  const examSubtitle = `${examMeta.topic} · ${examLabel}`

  const watermark =
    design.watermark === "none" ? null : (
      <div className="paper-watermark" aria-hidden="true">
        {design.watermark === "logo" && design.logo ? (
          <img src={design.logo} alt="" />
        ) : (
          <span>{design.watermarkText}</span>
        )}
      </div>
    )

  const header = (
    <button
      className={`paper-header ${hasLogo ? "has-logo" : ""}`}
      type="button"
      onClick={onSelectExam}
      disabled={preview}
    >
      {design.template === "elegant" ? (
        <div className="d-head elegant-head">
          <div className="elegant-top">
            <div className="elegant-brand">
              {crest}
              <div>
                {design.showSchoolHeader && (
                  <span className="d-school">
                    {examMeta.school} · {yearLabel}
                  </span>
                )}
                <h1>{examTitle}</h1>
                <p className="d-sub">{examSubtitle}</p>
              </div>
            </div>
            <div className="elegant-right">
              {bookletBadge}
              <div className="elegant-facts">
                <span>{examMeta.grade || "—"}</span>
                <span>{examMeta.duration} dk</span>
                <b>{totalPoints} p</b>
              </div>
              <small>{examMeta.date}</small>
            </div>
          </div>
          {design.showStudentBox && studentFields}
        </div>
      ) : design.template === "bold" ? (
        <div className="d-head bold-head">
          <div className="bold-banner">
            {crest}
            <div>
              {design.showSchoolHeader && (
                <span className="d-school">
                  {examMeta.school} · {yearLabel}
                </span>
              )}
              <h1>{examTitle}</h1>
              <p className="d-sub">{examSubtitle}</p>
            </div>
            <dl>
              <div>
                <dt>Sınıf</dt>
                <dd>{examMeta.grade}</dd>
              </div>
              <div>
                <dt>Süre</dt>
                <dd>{examMeta.duration} dk</dd>
              </div>
              <div>
                <dt>Toplam</dt>
                <dd>{totalPoints} p</dd>
              </div>
              {bookletBadge && (
                <div className="bold-booklet">
                  <dt>Kitapçık</dt>
                  <dd>{design.booklet}</dd>
                </div>
              )}
            </dl>
          </div>
          {design.showStudentBox && studentFields}
        </div>
      ) : design.template === "playful" ? (
        <div className="d-head playful-head">
          <div className="playful-card">
            {crest}
            <div>
              {design.showSchoolHeader && (
                <span className="d-school">{examMeta.school}</span>
              )}
              <h1>{examMeta.topic}</h1>
              <p className="d-sub">
                {examMeta.subject} · {examMeta.grade} · {examMeta.date}
              </p>
            </div>
            {bookletBadge}
            <span className="playful-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </div>
          {design.showStudentBox && studentFields}
        </div>
      ) : design.template === "academic" ? (
        <div className="d-head academic-head">
          <div className="academic-grid">
            {crest}
            <div className="academic-center">
              {design.showSchoolHeader && (
                <>
                  <span className="d-school-top">
                    T.C. Millî Eğitim Bakanlığı · {yearLabel}
                  </span>
                  <span className="d-school">{examMeta.school}</span>
                </>
              )}
              <h1>{examTitle}</h1>
              <p className="d-sub">{examSubtitle}</p>
            </div>
            <table className="academic-info">
              <tbody>
                <tr>
                  <th>Tarih</th>
                  <td>{examMeta.date}</td>
                </tr>
                <tr>
                  <th>Süre</th>
                  <td>{examMeta.duration} dk</td>
                </tr>
                <tr>
                  <th>Sınıf</th>
                  <td>{examMeta.grade}</td>
                </tr>
                {bookletBadge && (
                  <tr>
                    <th>Kitapçık</th>
                    <td>{design.booklet}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {design.showStudentBox && studentFields}
        </div>
      ) : design.template === "classic" ? (
        <div className="meb-head">
          <div
            className={`meb-grid ${hasLogo || bookletBadge ? "has-side" : ""}`}
          >
            <div className="meb-side">{logoCell}</div>
            <div className="meb-title">
              {design.showSchoolHeader && (
                <>
                  <span className="meb-year">
                    {yearLabel} Eğitim-Öğretim Yılı
                  </span>
                  <span className="meb-school">
                    {examMeta.school.toLocaleUpperCase("tr")}
                  </span>
                </>
              )}
              <strong>
                {gradeLevel && `${gradeLevel}. Sınıf `}
                {examMeta.subject} Dersi
              </strong>
              <span className="meb-exam">
                {examLabel} Sınavı
                <i>{examMeta.topic}</i>
              </span>
            </div>
            <div className="meb-side end">{bookletBadge}</div>
          </div>
          {design.showStudentBox && (
            <table className="meb-info">
              <tbody>
                <tr>
                  <th>Adı Soyadı</th>
                  <td />
                  <th>Numarası</th>
                  <td className="narrow" />
                  <td className="score-cell" rowSpan={2}>
                    <span>Puan</span>
                  </td>
                </tr>
                <tr>
                  <th>Sınıfı</th>
                  <td>{examMeta.grade}</td>
                  <th>Tarih</th>
                  <td className="narrow">
                    {examMeta.date} · {examMeta.duration} dk
                  </td>
                </tr>
              </tbody>
            </table>
          )}
          <p className="meb-instruction">
            Soruların puan değerleri yanlarında belirtilmiştir. Cevaplarınızı
            sorunun altındaki boşluğa okunaklı biçimde yazınız.
          </p>
        </div>
      ) : design.template === "lgs" ? (
        <div className="lgs-head">
          <div className="lgs-band">
            <span className="lgs-logo">{logoCell}</span>
            <span className="lgs-meta">
              <b>{examMeta.grade}</b>
              {examMeta.date}
            </span>
            <strong>{examMeta.subject.toLocaleUpperCase("tr")}</strong>
            <span className="lgs-meta end">
              <b>{questionItems.length} soru</b>
              {examMeta.duration} dakika
            </span>
            <span className="lgs-booklet">{bookletBadge}</span>
          </div>
          {design.showSchoolHeader && (
            <p className="lgs-school">
              <span>{examMeta.school}</span>
              <span>{examMeta.topic}</span>
              <span>{examLabel}</span>
            </p>
          )}
          {design.showStudentBox && (
            <div className="lgs-student">
              <span>Adı Soyadı</span>
              <i />
              <span>Numarası</span>
              <i />
            </div>
          )}
          <p className="lgs-instr">
            <b>Açıklama</b>
            Bu testte {questionItems.length} soru vardır. Cevaplarınızı cevap
            kâğıdındaki ilgili alana işaretleyiniz.
          </p>
        </div>
      ) : design.template === "tyt" ? (
        <div className="d-head tyt-head">
          <div className="tyt-ribbon-bar">
            {logoCell}
            <span className="tyt-ribbon">
              {design.booklet !== "none" ? `KİTAPÇIK ${design.booklet}` : "DENEME"}
            </span>
            <span className="tyt-ribbon-topic">{examMeta.topic || examTitle}</span>
            <span className="tyt-ribbon-meta">
              {examMeta.grade} · {questionItems.length} Soru · {examMeta.duration} dk
            </span>
          </div>
          {design.showSchoolHeader && (
            <div className="tyt-subbar">
              <span>{examMeta.school}</span>
              <strong>{examMeta.subject.toLocaleUpperCase("tr")} TESTİ</strong>
              <span>{examMeta.date}</span>
            </div>
          )}
          {design.showStudentBox && studentFields}
        </div>
      ) : design.template === "quiz" ? (
        <div className="d-head quiz-head">
          <div className="quiz-top-strip">
            {logoCell}
            <div className="quiz-brand-pill">
              {design.showSchoolHeader && examMeta.school
                ? examMeta.school.toLocaleUpperCase("tr")
                : "TARAMA SINAVI"}
            </div>
            <div className="quiz-segments" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="quiz-center-ribbon">
            <span>{examMeta.subject.toLocaleUpperCase("tr")} · {examMeta.topic || "DEĞERLENDİRME"}</span>
          </div>
          <div className="quiz-meta-line">
            <span>{examMeta.grade || "—"}</span>
            <span>{examMeta.duration} dk</span>
            <b>{totalPoints} puan</b>
            {bookletBadge}
          </div>
          {design.showStudentBox && studentFields}
        </div>
      ) : design.template === "stem" ? (
        <div className="d-head stem-head">
          <div className="stem-box">
            {crest}
            <div className="stem-main">
              {design.showSchoolHeader && (
                <span className="d-school">
                  {examMeta.school} · {yearLabel}
                </span>
              )}
              <h1>{examTitle}</h1>
              <p className="d-sub">{examSubtitle}</p>
            </div>
            <div className="stem-meta">
              {bookletBadge}
              <span>Sınıf: {examMeta.grade || "—"}</span>
              <span>Süre: {examMeta.duration} dk</span>
              <span>Toplam: {totalPoints} p</span>
            </div>
          </div>
          {design.showStudentBox && studentFields}
        </div>
      ) : design.template === "workbook" ? (
        <div className="d-head workbook-head">
          <div className="workbook-header-row">
            <div className="workbook-header-left">
              <span className="workbook-tag">ÇALIŞMA FASİKÜLÜ</span>
              <h1>{examMeta.topic || examTitle}</h1>
              <p>
                {examMeta.subject}
                {examMeta.grade ? ` · ${examMeta.grade}` : ""}
                {design.showSchoolHeader && examMeta.school
                  ? ` · ${examMeta.school}`
                  : ""}
              </p>
            </div>
            <div className="workbook-side">
              {bookletBadge}
              {logoCell}
            </div>
          </div>
          {design.showStudentBox && studentFields}
        </div>
      ) : design.template === "literature" ? (
        <div className="d-head literature-head">
          <div className="literature-top">
            {logoCell}
            <div className="literature-titles">
              {design.showSchoolHeader && (
                <span className="d-school">
                  {examMeta.school} · {yearLabel}
                </span>
              )}
              <h1>{examTitle}</h1>
              <p className="d-sub">{examSubtitle}</p>
            </div>
            <div className="literature-meta">
              {bookletBadge}
              <span>{examMeta.grade || "—"}</span>
              <span>
                {examMeta.duration} dk · {totalPoints} p
              </span>
            </div>
          </div>
          {design.showStudentBox && studentFields}
        </div>
      ) : design.template === "olympiad" ? (
        <div className="d-head olympiad-head">
          <div className="olympiad-booklet-strip" aria-hidden="true">
            <span>{design.booklet !== "none" ? design.booklet : "★"}</span>
            <span>{design.booklet !== "none" ? design.booklet : "★"}</span>
            <span>{design.booklet !== "none" ? design.booklet : "★"}</span>
            <span>{design.booklet !== "none" ? design.booklet : "★"}</span>
            <span>{design.booklet !== "none" ? design.booklet : "★"}</span>
          </div>
          <div className="olympiad-split-bar">
            {logoCell}
            <strong>{examMeta.subject}</strong>
            <span>{examMeta.topic || examLabel}</span>
            <b>
              {questionItems.length} Soru · {examMeta.duration} dk
            </b>
          </div>
          {design.showStudentBox && studentFields}
        </div>
      ) : (
        <div className="min-head">
          <div className="min-top">
            <div className="min-titles">
              {design.showSchoolHeader && (
                <span className="min-school">
                  {examMeta.school} · {yearLabel}
                </span>
              )}
              <h1>{examMeta.subject}</h1>
              <p>
                {examMeta.topic} · {examMeta.grade}
              </p>
            </div>
            {(bookletBadge || logoCell) && (
              <div className="min-side">
                {bookletBadge}
                {logoCell}
              </div>
            )}
          </div>
          {design.showStudentBox && (
            <div className="min-student">
              <span>Adı Soyadı</span>
              <i />
              <span>Sınıf / No</span>
              <i className="short" />
              <span>Tarih</span>
              <b>{examMeta.date}</b>
            </div>
          )}
          <div className="min-note">
            <span>Her soruyu dikkatlice okuyunuz.</span>
            <strong>
              {examMeta.duration} dakika · {totalPoints} puan
            </strong>
          </div>
        </div>
      )}
    </button>
  )

  const runningHead = (
    <div className="paper-running-head">
      <span>
        {examMeta.subject} · {examMeta.topic}
      </span>
      <span>
        {examMeta.grade}
        {bookletBadge && ` · Kitapçık ${design.booklet}`}
      </span>
    </div>
  )

  const closing =
    questions.length > 0 && design.showSignature ? (
      <div className="paper-closing">
        <div className="paper-signature">
          <span className="sig-name">
            {examMeta.teacher?.trim() || "\u00a0"}
          </span>
          <i />
          <span className="sig-role">Ders Öğretmeni</span>
        </div>
      </div>
    ) : null

  const answerPages = (() => {
    const result: typeof questionItems[] = []
    let page: typeof questionItems = []
    let used = 0

    questionItems.forEach((question) => {
      const answer = question.correctAnswer?.trim() || "—"
      const weight = Math.min(
        4,
        Math.max(
          1,
          question.type === "classic" ? 2 : Math.ceil(answer.length / 65),
        ),
      )
      if (page.length > 0 && used + weight > 14) {
        result.push(page)
        page = []
        used = 0
      }
      page.push(question)
      used += weight
    })

    if (page.length > 0 || result.length === 0) result.push(page)
    return result
  })()

  const answerKeyLogo = ["elegant", "bold", "playful", "academic"].includes(
    design.template,
  )
    ? crest
    : logoCell

  const renderQuestion = (question: Question, index: number) => (
    <div
      data-m="q"
      className={`paper-question ${
        selectedQuestionId === question.id ? "selected" : ""
      } ${draggedId === question.id ? "is-dragging" : ""} ${
        dragOverId === question.id && draggedId !== question.id
          ? "is-drag-over"
          : ""
      } block-${question.type} ${
        isContentType(question.type) ? "is-content" : ""
      }`}
      key={question.id}
      draggable={!preview && Boolean(onReorder)}
      onDragStart={(event) => {
        if (preview || !onReorder) return
        setDraggedId(question.id)
        event.dataTransfer.effectAllowed = "move"
        event.dataTransfer.setData("text/plain", String(question.id))
      }}
      onDragOver={(event) => {
        if (preview || !onReorder || draggedId === null) return
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
        if (dragOverId !== question.id) setDragOverId(question.id)
      }}
      onDragLeave={() => {
        if (dragOverId === question.id) setDragOverId(null)
      }}
      onDrop={(event) => {
        if (preview || !onReorder) return
        event.preventDefault()
        if (draggedId !== null && draggedId !== question.id) {
          onReorder(draggedId, question.id)
        }
        setDraggedId(null)
        setDragOverId(null)
      }}
      onDragEnd={() => {
        setDraggedId(null)
        setDragOverId(null)
      }}
      onClick={() => !preview && onSelectQuestion(question.id)}
      role={preview ? undefined : "button"}
      tabIndex={preview ? undefined : 0}
      onKeyDown={(event) => {
        if (!preview && (event.key === "Enter" || event.key === " ")) {
          onSelectQuestion(question.id)
        }
      }}
    >
      {!preview && (
        <div className="question-actions">
          <GripVertical
            size={16}
            className="drag-icon"
            aria-label="Sürükleyerek sırala"
          />
          <button
            type="button"
            aria-label="Soruyu yukarı taşı"
            disabled={index === 0}
            onClick={(event) => {
              event.stopPropagation()
              onMove(question.id, -1)
            }}
          >
            <ArrowUp size={14} />
          </button>
          <button
            type="button"
            aria-label="Soruyu aşağı taşı"
            disabled={index === questions.length - 1}
            onClick={(event) => {
              event.stopPropagation()
              onMove(question.id, 1)
            }}
          >
            <ArrowDown size={14} />
          </button>
          <button
            type="button"
            aria-label="Soruyu çoğalt"
            onClick={(event) => {
              event.stopPropagation()
              onDuplicate(question.id)
            }}
          >
            <Copy size={14} />
          </button>
          <button
            type="button"
            aria-label="Soruyu sil"
            onClick={(event) => {
              event.stopPropagation()
              onDelete(question.id)
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
      {isContentType(question.type) ? (
        <ContentBlockView block={question} />
      ) : (
        <div className="question-line">
          <span className="question-number">
            {design.numberStyle === "paren"
              ? `${numbering[index]})`
              : design.numberStyle === "pill"
                ? `Soru ${numbering[index]}`
                : design.numberStyle === "plain" ||
                    design.numberStyle === "underline"
                  ? `${numbering[index]}.`
                  : numbering[index]}
          </span>
          <div className="question-content">
            {question.lead && (
              <p
                className="question-lead"
                style={{
                  color: question.leadColor || undefined,
                }}
              >
                <MathText text={question.lead} />
              </p>
            )}
            {question.image && (
              <img
                className={`question-image size-${question.imageSize ?? "medium"}${
                  question.imageRawWidth && question.sourceFontPx
                    ? " auto-font-sized"
                    : question.imageScale !== undefined
                      ? " has-img-scale"
                      : ""
                }`}
                style={
                  question.imageRawWidth && question.sourceFontPx
                    ? ({
                        "--img-ratio":
                          question.imageRawWidth / question.sourceFontPx,
                        "--img-scale": (question.imageScale ?? 100) / 100,
                      } as React.CSSProperties)
                    : question.imageScale !== undefined
                      ? ({
                          "--img-scale": (question.imageScale ?? 100) / 100,
                        } as React.CSSProperties)
                      : undefined
                }
                src={question.image}
                alt=""
                onLoad={() => setImagesLoaded((count) => count + 1)}
              />
            )}
            {question.prompt.trim().length > 0 && (
              <p
                style={{
                  color: question.promptColor || undefined,
                }}
              >
                <MathText text={question.prompt} />
              </p>
            )}
            {question.type === "multiple" && question.options && (
              <div
                className={`paper-options ${
                  question.options.length === 5 ? "has-5 " : ""
                }${
                  question.optionLayout === "grid"
                    ? "layout-grid"
                    : question.optionLayout === "inline"
                      ? "layout-inline"
                      : question.optionLayout === "list"
                        ? "layout-list"
                        : question.options.some(
                              (option) =>
                                option.length > (design.columns === 2 ? 18 : 34),
                            )
                          ? "is-long"
                          : ""
                }`}
              >
                {question.options.map((option, optionIndex) => (
                  <span key={`${question.id}-${optionIndex}`}>
                    <b>{String.fromCharCode(65 + optionIndex)}</b>
                    <MathText text={option} />
                  </span>
                ))}
              </div>
            )}
            {question.type === "trueFalse" && (
              <div className="true-false-options">
                <span>Doğru</span>
                <span>Yanlış</span>
              </div>
            )}
            {question.type === "fillBlank" && (
              <div className="answer-line short" />
            )}
            {question.type === "classic" && (
              <div className="classic-answer-lines">
                <i />
                <i />
                <i />
              </div>
            )}
            {question.solutionSpace && question.solutionSpace !== "none" && (
              <div
                className={`question-solution-space space-${question.solutionSpace}`}
                style={{ minHeight: `${question.solutionHeight ?? 76}px` }}
              >
                <span>Çözüm:</span>
              </div>
            )}
          </div>
          {design.showPoints && (
            <span className="question-points">({question.points} p.)</span>
          )}
        </div>
      )}
    </div>
  )

  const inlineOpticalForm =
    showOpticalForm && questionItems.length > 0 && !maxPages ? (
      <div className="inline-optical-form" data-m="optical">
        <div className="inline-optical-head">
          <strong>Optik Cevap Formu</strong>
          {design.booklet !== "none" && <span>Kitapçık {design.booklet}</span>}
        </div>
        <div className="inline-optical-rows">
          {questionItems.map((question, idx) => {
            const bubbleLetters =
              question.type === "trueFalse"
                ? ["D", "Y"]
                : ["A", "B", "C", "D", "E"]
            return (
              <div className="inline-optical-row" key={question.id}>
                <span className="inline-optical-num">{idx + 1}.</span>
                <div className="inline-optical-bubbles">
                  {bubbleLetters.map((letter) => (
                    <span className="inline-optical-bubble" key={letter}>
                      {letter}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    ) : null

  const measureRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<PaperPage[]>([
    { cols: [questions.map((_, index) => index)] },
  ])
  const [zoom, setZoom] = useState(1)
  const [fontsReady, setFontsReady] = useState(0)
  const [imagesLoaded, setImagesLoaded] = useState(0)

  useEffect(() => {
    document.fonts?.ready.then(() => setFontsReady((value) => value + 1))
  }, [])

  useLayoutEffect(() => {
    const root = measureRef.current
    if (!root) return
    const article = root.querySelector("article")
    if (!article) return
    const outer = (element: Element | null) => {
      if (!element) return 0
      const style = getComputedStyle(element)
      return (
        (element as HTMLElement).offsetHeight +
        parseFloat(style.marginTop) +
        parseFloat(style.marginBottom)
      )
    }
    const articleStyle = getComputedStyle(article)
    const body =
      PAGE_HEIGHT -
      parseFloat(articleStyle.paddingTop) -
      parseFloat(articleStyle.paddingBottom)
    const column = root.querySelector(".paper-col")
    const gap = column ? parseFloat(getComputedStyle(column).rowGap) || 0 : 0
    const heights = Array.from(root.querySelectorAll("[data-m='q']")).map(outer)
    const columnCount = design.columns === 2 ? 2 : 1
    const emptyCols = () =>
      Array.from({ length: columnCount }, () => [] as number[])

    const result: PaperPage[] = []
    let current: PaperPage = { cols: emptyCols() }
    let used = Array(columnCount).fill(0) as number[]
    let col = 0
    let capacity = body - outer(root.querySelector("[data-m='header']"))
    const runningCapacity =
      body - outer(root.querySelector("[data-m='running']"))

    heights.forEach((height, index) => {
      let need = used[col] === 0 ? height : height + gap
      if (used[col] > 0 && used[col] + need > capacity) {
        if (col < columnCount - 1) {
          col += 1
        } else {
          result.push(current)
          current = { cols: emptyCols() }
          used = Array(columnCount).fill(0) as number[]
          col = 0
          capacity = runningCapacity
        }
        need = height
      }
      current.cols[col].push(index)
      used[col] += need
    })

    const opticalHeight = outer(root.querySelector("[data-m='optical']"))
    if (opticalHeight > 0) {
      const targetCol = columnCount - 1
      if (col < targetCol) {
        col = targetCol
      }
      const need = used[col] === 0 ? opticalHeight : opticalHeight + gap
      if (used[col] > 0 && used[col] + need > capacity) {
        result.push(current)
        current = { cols: emptyCols() }
        used = Array(columnCount).fill(0) as number[]
        col = targetCol
        capacity = runningCapacity
      }
      current.cols[targetCol].push(-1)
      used[targetCol] += used[targetCol] === 0 ? opticalHeight : opticalHeight + gap
    }

    const closingHeight = outer(root.querySelector("[data-m='closing']"))
    if (closingHeight > 0 && (heights.length > 0 || opticalHeight > 0)) {
      const lastUsed = Math.max(...used)
      if (lastUsed + closingHeight > capacity) {
        result.push(current)
        current = { cols: emptyCols() }
      }
    }

    result.push(current)

    setPages((previous) =>
      JSON.stringify(previous) === JSON.stringify(result) ? previous : result,
    )
  }, [questions, design, examMeta, totalPoints, showOpticalForm, maxPages, fontsReady, imagesLoaded])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const observer = new ResizeObserver(([entry]) => {
      setZoom(Math.min(1, entry.contentRect.width / PAGE_WIDTH))
    })
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  const renderColumns = (cols: number[][]) => (
    <div className="paper-questions">
      {cols.map((indices, colIndex) => (
        <div className="paper-col" key={colIndex}>
          {indices
            .filter((index) => index === -1 || index < questions.length)
            .map((index) =>
              index === -1 ? (
                <div className="inline-optical-slot" key="inline-optical-slot">
                  {inlineOpticalForm}
                </div>
              ) : (
                renderQuestion(questions[index], index)
              ),
            )}
        </div>
      ))}
    </div>
  )

  return (
    <div className="paper-viewport" ref={viewportRef}>
      <div className="paper-stack" style={{ zoom }}>
        {pages.slice(0, maxPages).map((page, pageIndex) => (
          <div className="paper-page-wrap" key={pageIndex}>
            <div className="page-label">
              Sayfa {pageIndex + 1} / {pages.length}
            </div>
            <article className={paperClass} style={paperStyle} lang="tr">
              {watermark}
              {pageIndex === 0 ? header : runningHead}
              {questions.length === 0
                ? pageIndex === 0 && (
                    <div className="paper-questions">
                      <div className="paper-empty">
                        <FileText size={28} />
                        <strong>Henüz soru eklenmedi</strong>
                        <span>
                          Sol panelden bir soru türü seçerek başlayın.
                        </span>
                      </div>
                    </div>
                  )
                : renderColumns(page.cols)}
              {pageIndex === pages.length - 1 && closing}
              <footer className="paper-footer">
                <span>
                  {design.template === "lgs" && pageIndex < pages.length - 1
                    ? "Diğer sayfaya geçiniz."
                    : design.footerNote}
                </span>
                <span>
                  {pageIndex + 1} / {pages.length}
                </span>
              </footer>
            </article>
          </div>
        ))}

        {showAnswerKey && !maxPages && (
          <div className="paper-page-wrap" key="answers-0">
            <div className="page-label">Cevap anahtarı</div>
            <article
              className={`${paperClass} answer-key-paper`}
              style={paperStyle}
              lang="tr"
            >
              {watermark}
              <header className="answer-key-header">
                {answerKeyLogo && (
                  <div className="answer-key-logo">{answerKeyLogo}</div>
                )}
                <div className="answer-key-title">
                  {design.showSchoolHeader && <span>{examMeta.school}</span>}
                  <h1>
                    Cevap Anahtarı
                    {design.booklet !== "none"
                      ? ` (${design.booklet} Kitapçığı)`
                      : ""}
                  </h1>
                  <p>
                    {examMeta.subject} · {examMeta.topic} · {examMeta.grade}
                  </p>
                </div>
                <div className="answer-key-meta">
                  <span>{examLabel}</span>
                  <b>{questionItems.length} soru</b>
                  <strong>{totalPoints} puan</strong>
                </div>
              </header>

              {questionItems.length === 0 ? (
                <div className="answer-key-empty">
                  Cevabı gösterilecek soru bulunmuyor.
                </div>
              ) : (
                <div className="ak-body">
                  {(() => {
                    const indexed = questionItems.map((q, idx) => ({
                      q,
                      num: idx + 1,
                      ans: q.correctAnswer?.trim() || "—",
                    }))
                    const shortItems = indexed.filter(
                      (item) =>
                        item.q.type !== "classic" && item.ans.length <= 16,
                    )
                    const longItems = indexed.filter(
                      (item) =>
                        item.q.type === "classic" || item.ans.length > 16,
                    )
                    return (
                      <>
                        {shortItems.length > 0 && (
                          <section className="ak-section">
                            <h2 className="ak-section-title">
                              Hızlı Kontrol Tablosu
                            </h2>
                            <div className="ak-quick-grid">
                              {shortItems.map((item) => (
                                <div className="ak-quick-cell" key={item.q.id}>
                                  <span className="ak-qnum">{item.num}</span>
                                  <strong className="ak-qans">
                                    <MathText text={item.ans} />
                                  </strong>
                                  <small>{item.q.points}p</small>
                                </div>
                              ))}
                            </div>
                          </section>
                        )}

                        {longItems.length > 0 && (
                          <section className="ak-section">
                            <h2 className="ak-section-title">
                              Açık Uçlu / Çözümlü Cevaplar
                            </h2>
                            <div className="ak-long-list">
                              {longItems.map((item) => (
                                <div className="ak-long-row" key={item.q.id}>
                                  <span className="ak-qnum">{item.num}</span>
                                  <div className="ak-long-text">
                                    <p>
                                      <MathText text={item.ans} />
                                    </p>
                                  </div>
                                  <strong className="ak-long-pts">
                                    {item.q.points} p
                                  </strong>
                                </div>
                              ))}
                            </div>
                          </section>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}

              <div className="answer-key-summary">
                <span>Toplam değerlendirme puanı</span>
                <strong>{totalPoints}</strong>
              </div>

              <footer className="paper-footer answer-key-footer">
                <span>Öğretmen nüshası · {yearLabel}</span>
                <span>Cevap anahtarı</span>
              </footer>
            </article>
          </div>
        )}
      </div>

      <div className="paper-measure" ref={measureRef} aria-hidden="true" inert>
        <article className={paperClass} style={paperStyle} lang="tr">
          <div data-m="header">{header}</div>
          <div data-m="running">{runningHead}</div>
          <div className="paper-questions">
            <div className="paper-col">
              {questions.map((question, index) =>
                renderQuestion(question, index),
              )}
              {inlineOpticalForm}
            </div>
          </div>
          {closing && <div data-m="closing">{closing}</div>}
        </article>
      </div>
    </div>
  )
}
