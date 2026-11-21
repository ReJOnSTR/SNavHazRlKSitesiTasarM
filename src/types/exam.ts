import type { TemplateDesign } from "../pages/TemplatesPage"

export type QuestionKind = "multiple" | "trueFalse" | "fillBlank" | "classic" | "none"
export type ContentKind = "section" | "text" | "formula" | "info" | "example"
export type QuestionType = QuestionKind | ContentKind
export type InfoVariant = "Bilgi" | "Hatırlatma" | "Dikkat"
export type Difficulty = "Kolay" | "Orta" | "Zor"
export type MobileTab = "questions" | "paper" | "settings"
export type AppView = "home" | "editor" | "exams" | "bank" | "templates" | "settings"
export type InspectorTab = "info" | "design"

export type PaperDesign = TemplateDesign

export type PdfStep = "closed" | "upload" | "crop"

export type SavedPdfEntry = {
  id: string
  name: string
  file: File
  lastPage?: number
}

export type QuestionImageSize = "small" | "medium" | "full"

export type Question = {
  id: number
  type: QuestionType
  prompt: string
  points: number
  difficulty: Difficulty
  options?: string[]
  correctAnswer: string
  source?: string
  title?: string
  formula?: string
  variant?: InfoVariant
  /** Optional lead text (öncül) printed before the question stem */
  lead?: string
  leadBold?: boolean
  leadColor?: string
  promptBold?: boolean
  promptColor?: string
  /** Optional image (data URL) printed above the question stem */
  image?: string
  imageSize?: QuestionImageSize
  /** Cropped PDF image width in source canvas pixels (for font-matched scaling) */
  imageRawWidth?: number
  /** Detected source font height in source canvas pixels */
  sourceFontPx?: number
  /** Manual scale percentage (40..150, default 100) */
  imageScale?: number
  /** Optional per-question option layout override */
  optionLayout?: "inherit" | "grid" | "inline" | "list"
  /** Optional student solution area printed at the end of the question */
  solutionSpace?: "none" | "lines" | "box" | "grid"
  solutionHeight?: number
  /** Optional scoring rubric criteria for classic/open-ended questions */
  rubric?: RubricItem[]
}

export type RubricItem = {
  id: string
  label: string
  points: number
}

export type ExamMeta = {
  title: string
  school: string
  grade: string
  subject: string
  topic: string
  duration: number
  date: string
  academicYear: string
  term: "1" | "2"
  examNo: "1" | "2" | "3"
  teacher: string
  /** Optional target total points (e.g. 100) for point tracking */
  targetPoints?: number
}

export type PaperPage = { cols: number[][] }

export type DetectedPdfQuestion = Omit<Question, "id">

export type ExamSnapshot = {
  examMeta: ExamMeta
  questions: Question[]
  design: PaperDesign
}
