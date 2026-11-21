import { isContentType, questionTypeLabels } from "../data/examDefaults"
import type {
  ExamMeta,
  ExamSnapshot,
  PaperDesign,
  Question,
} from "../types/exam"

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function shuffleQuestionOptions(question: Question): Question {
  if (question.type !== "multiple" || !question.options || question.options.length < 2) {
    return question
  }
  const correctIndex = question.correctAnswer.trim().toUpperCase().charCodeAt(0) - 65
  const tagged = question.options.map((text, index) => ({
    text,
    isCorrect: index === correctIndex,
  }))
  const shuffled = shuffleArray(tagged)
  const newCorrectIndex = shuffled.findIndex((item) => item.isCorrect)
  return {
    ...question,
    options: shuffled.map((item) => item.text),
    correctAnswer:
      newCorrectIndex >= 0
        ? String.fromCharCode(65 + newCorrectIndex)
        : question.correctAnswer,
  }
}

/**
 * Shuffles questions within each section (preserving content blocks in place)
 * and optionally shuffles multiple-choice options while updating correctAnswer.
 */
export function shuffleBookletQuestions(
  questions: Question[],
  shuffleOptions: boolean,
): Question[] {
  const result: Question[] = []
  let bucket: Question[] = []

  const flushBucket = () => {
    if (bucket.length === 0) return
    const shuffled = shuffleArray(bucket).map((q) =>
      shuffleOptions ? shuffleQuestionOptions(q) : q,
    )
    result.push(...shuffled)
    bucket = []
  }

  for (const item of questions) {
    if (isContentType(item.type)) {
      flushBucket()
      result.push(item)
    } else {
      bucket.push(item)
    }
  }
  flushBucket()
  return result
}

export function sanitizeFileName(name: string, fallback = "sinav"): string {
  return (
    name
      .trim()
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 90) || fallback
  )
}

export function exportExamJson(snapshot: ExamSnapshot) {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    ...snapshot,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${sanitizeFileName(snapshot.examMeta.title)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export function parseExamJson(raw: string): ExamSnapshot {
  const parsed = JSON.parse(raw) as Partial<ExamSnapshot>
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !parsed.examMeta ||
    !Array.isArray(parsed.questions) ||
    !parsed.design
  ) {
    throw new Error("Geçersiz sınav yedek dosyası formatı.")
  }
  return {
    examMeta: parsed.examMeta as ExamMeta,
    questions: parsed.questions as Question[],
    design: parsed.design as PaperDesign,
  }
}

export async function exportExamDocx(
  examMeta: ExamMeta,
  questions: Question[],
  showAnswerKey: boolean,
) {
  const { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } =
    await import("docx")

  const children: InstanceType<typeof Paragraph>[] = []

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({ text: examMeta.school || "Sınav Kâğıdı", bold: true }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `${examMeta.academicYear || ""} ${examMeta.term}. Dönem ${examMeta.examNo}. Yazılı — ${examMeta.subject} (${examMeta.grade})`,
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `${examMeta.title} · Süre: ${examMeta.duration} dk · Tarih: ${examMeta.date}`,
          italics: true,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 280 },
      children: [
        new TextRun(
          "Adı Soyadı: ________________________   Sınıf / No: ____________   Puan: ______",
        ),
      ],
    }),
  )

  let qNumber = 0
  for (const item of questions) {
    if (isContentType(item.type)) {
      const heading = item.title ? `${item.title}: ` : ""
      children.push(
        new Paragraph({
          spacing: { before: 160, after: 100 },
          children: [
            new TextRun({
              text: `${heading}${item.formula ? `${item.formula} — ` : ""}${item.prompt}`,
              bold: item.type === "section",
              italics: item.type !== "section",
            }),
          ],
        }),
      )
      continue
    }

    qNumber += 1
    if (item.lead) {
      children.push(
        new Paragraph({
          spacing: { before: 140, after: 60 },
          children: [new TextRun({ text: item.lead, italics: true })],
        }),
      )
    }

    children.push(
      new Paragraph({
        spacing: { before: 140, after: 80 },
        children: [
          new TextRun({ text: `${qNumber}. `, bold: true }),
          new TextRun({ text: item.prompt }),
          new TextRun({ text: `  (${item.points} puan)`, italics: true }),
        ],
      }),
    )

    if (item.type === "multiple" && item.options) {
      item.options.forEach((opt, idx) => {
        const letter = String.fromCharCode(65 + idx)
        children.push(
          new Paragraph({
            indent: { left: 360 },
            spacing: { after: 40 },
            children: [
              new TextRun({ text: `${letter}) `, bold: true }),
              new TextRun(opt),
            ],
          }),
        )
      })
    } else if (item.type === "trueFalse") {
      children.push(
        new Paragraph({
          indent: { left: 360 },
          spacing: { after: 80 },
          children: [new TextRun("(  ) Doğru     (  ) Yanlış")],
        }),
      )
    } else if (item.type === "classic") {
      children.push(
        new Paragraph({
          spacing: { after: 280 },
          children: [new TextRun("")],
        }),
      )
    }
  }

  if (showAnswerKey) {
    children.push(
      new Paragraph({
        pageBreakBefore: true,
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 160 },
        children: [new TextRun({ text: "Cevap Anahtarı", bold: true })],
      }),
    )
    let ansNo = 0
    for (const item of questions) {
      if (isContentType(item.type)) continue
      ansNo += 1
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: `${ansNo}. `, bold: true }),
            new TextRun(
              `[${questionTypeLabels[item.type]}] ${item.correctAnswer || "—"} (${item.points} p)`,
            ),
          ],
        }),
      )
    }
  }

  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${sanitizeFileName(examMeta.title)}.docx`
  link.click()
  URL.revokeObjectURL(url)
}
