import { baseDesign } from "../pages/TemplatesPage"
import type {
  ContentKind,
  Difficulty,
  ExamMeta,
  PaperDesign,
  Question,
  QuestionKind,
  QuestionType,
} from "../types/exam"

export const PAGE_WIDTH = 720
export const PAGE_HEIGHT = Math.round((PAGE_WIDTH * 297) / 210)

export const questionKinds: QuestionKind[] = [
  "multiple",
  "trueFalse",
  "fillBlank",
  "classic",
]

export const contentKinds: ContentKind[] = [
  "section",
  "text",
  "formula",
  "info",
  "example",
]

export const isContentType = (type: QuestionType): type is ContentKind =>
  (contentKinds as string[]).includes(type)

export const contentDescriptions: Record<ContentKind, string> = {
  section: "A, B, C bölüm yönergesi",
  text: "Konu anlatımı / okuma metni",
  formula: "Kesir, üs, kök içeren formül",
  info: "Bilgi, hatırlatma, dikkat",
  example: "Örnek soru ve çözümü",
}

export const defaultDesign: PaperDesign = baseDesign

export const accentOptions = [
  "#1f2937",
  "#126b57",
  "#1d4ed8",
  "#0e7490",
  "#7c3aed",
  "#be185d",
  "#9a3412",
  "#b45309",
]

export const questionTypeLabels: Record<QuestionType, string> = {
  multiple: "Çoktan seçmeli",
  trueFalse: "Doğru / yanlış",
  fillBlank: "Boşluk doldurma",
  classic: "Klasik",
  none: "Belirtilmemiş (Boş)",
  section: "Bölüm başlığı",
  text: "Konu anlatımı",
  formula: "Formül",
  info: "Bilgi kutusu",
  example: "Örnek çözüm",
}

export const emptyExamMeta: ExamMeta = {
  title: "Yeni Sınav",
  school: "",
  grade: "",
  subject: "",
  topic: "",
  duration: 40,
  date: "",
  academicYear: "2025–2026",
  term: "1",
  examNo: "1",
  teacher: "",
  targetPoints: 100,
}

export const createQuestion = (type: QuestionType, id: number): Question => {
  const shared = { id, points: 10, difficulty: "Orta" as Difficulty }
  const content = { id, points: 0, difficulty: "Orta" as Difficulty }

  if (type === "section") {
    return {
      ...content,
      type,
      prompt: "B. Aşağıdaki soruları cevaplayınız.",
      correctAnswer: "",
    }
  }

  if (type === "text") {
    return {
      ...content,
      type,
      title: "Konu Anlatımı: Oran",
      prompt:
        "İki çokluğun bölme işlemiyle karşılaştırılmasına oran denir. a ve b çokluklarının oranı [a/b] ya da a : b biçiminde gösterilir.\nOranı alınan çokluklar aynı birimden olmalıdır.",
      correctAnswer: "",
    }
  }

  if (type === "formula") {
    return {
      ...content,
      type,
      title: "Formül",
      formula: "[a/b] = [c/d]  ⇒  a · d = b · c",
      prompt: "Formülün açıklamasını buraya yazın.",
      correctAnswer: "",
    }
  }

  if (type === "info") {
    return {
      ...content,
      type,
      variant: "Hatırlatma",
      title: "Hatırlatma",
      prompt:
        "Doğru orantılı iki çokluktan biri artarken diğeri de aynı oranda artar.",
      correctAnswer: "",
    }
  }

  if (type === "example") {
    return {
      ...content,
      type,
      title: "Örnek",
      prompt: "3 kalem 12 TL ise 5 kalem kaç TL'dir?",
      correctAnswer: "[3/12] = [5/x]  ⇒  3x = 60  ⇒  x = 20 TL",
    }
  }

  if (type === "multiple") {
    return {
      ...shared,
      type,
      prompt: "Yeni çoktan seçmeli sorununuzu buraya yazın.",
      options: ["A seçeneği", "B seçeneği", "C seçeneği", "D seçeneği"],
      correctAnswer: "A",
    }
  }

  if (type === "trueFalse") {
    return {
      ...shared,
      type,
      prompt: "Yeni doğru / yanlış ifadenizi buraya yazın.",
      correctAnswer: "Doğru",
    }
  }

  if (type === "fillBlank") {
    return {
      ...shared,
      type,
      prompt: "Boşluk doldurma sorunuzu ______ işaretiyle yazın.",
      correctAnswer: "Örnek cevap",
    }
  }

  return {
    ...shared,
    type,
    prompt: "Yeni klasik sorunuzu buraya yazın.",
    correctAnswer: "Örnek cevap",
  }
}
