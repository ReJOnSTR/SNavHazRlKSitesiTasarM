import type { QuestionKind } from "../types/exam"

export type LocalAiStatus = {
  available: boolean
  models: string[]
  preferredModel: string | null
  isVisionModel: boolean
}

export type LocalAiAnalysisResult = {
  lead?: string
  prompt: string
  options?: string[]
  questionType: QuestionKind
  hasFigure: boolean
  /** Normalized 0..1 coordinates inside the cropped question image */
  figureBox?: { x: number; y: number; w: number; h: number }
}

const VISION_MODEL_PATTERNS = [
  "qwen2.5vl",
  "qwen2-vl",
  "qwen3-vl",
  "gemma3",
  "llama3.2-vision",
  "minicpm-v",
  "llava",
  "moondream",
  "granite-vision",
  "bakllava",
]

function isVisionCapable(modelName: string): boolean {
  const lower = modelName.toLowerCase()
  return VISION_MODEL_PATTERNS.some((pattern) => lower.includes(pattern))
}

export async function checkLocalOllamaStatus(): Promise<LocalAiStatus> {
  try {
    const res = await fetch("/api/ollama/api/tags", {
      signal: AbortSignal.timeout(1500),
    })
    if (!res.ok) {
      return {
        available: false,
        models: [],
        preferredModel: null,
        isVisionModel: false,
      }
    }
    const data = (await res.json()) as { models?: { name?: string }[] }
    const models = (data.models ?? [])
      .map((m) => m.name ?? "")
      .filter(Boolean)
    if (models.length === 0) {
      return {
        available: true,
        models: [],
        preferredModel: null,
        isVisionModel: false,
      }
    }
    const visionModel = models.find((name) => isVisionCapable(name))
    const preferredModel = visionModel ?? models[0]
    return {
      available: true,
      models,
      preferredModel,
      isVisionModel: Boolean(visionModel),
    }
  } catch {
    return {
      available: false,
      models: [],
      preferredModel: null,
      isVisionModel: false,
    }
  }
}

export async function analyzeQuestionWithLocalAi({
  model,
  isVisionModel,
  imageDataUrl,
  rawLinesText,
}: {
  model: string
  isVisionModel: boolean
  imageDataUrl: string
  rawLinesText: string
}): Promise<LocalAiAnalysisResult | null> {
  try {
    const base64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, "")
    const systemPrompt = [
      "Sen Türkçedeki sınav sorularını yapısal parçalara ayıran bir asistansın.",
      "Sadece geçerli JSON döndür, başka hiçbir açıklama yazma.",
      "JSON şeması:",
      "{",
      '  "lead": "varsa üst bilgi/okuma metni/başlık (yoksa boş string)",',
      '  "prompt": "soru kökü (soru numarası ve A/B/C/D/E şıkları olmadan)",',
      '  "options": ["A şıkkı metni", "B şıkkı metni", ...],',
      '  "questionType": "multiple" | "classic" | "trueFalse" | "fillBlank" | "none",',
      '  "hasFigure": true | false,',
      '  "figureBox": [x1, y1, x2, y2] // 0..1000 normalize koordinatlar; şekil yoksa null',
      "}",
      "Kurallar:",
      "- Şekil/grafik/tablo içindeki kısa etiketleri (A, B, 5 cm, x, y vb.) prompt içine alma.",
      "- Şıkları mutlaka options dizisine A), B) önekleri olmadan yaz.",
      "- Soru metnindeki hiçbir kelimeyi veya sayıyı atlama.",
    ].join("\n")

    const userPrompt = rawLinesText
      ? `PDF metin satırları:\n${rawLinesText}\n\nBu soruyu JSON olarak ayrıştır.`
      : "Bu soru görselini analiz edip JSON olarak ayrıştır."

    const message: {
      role: "user"
      content: string
      images?: string[]
    } = {
      role: "user",
      content: userPrompt,
    }
    if (isVisionModel && base64) {
      message.images = [base64]
    }

    const res = await fetch("/api/ollama/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        model,
        stream: false,
        format: "json",
        options: { temperature: 0.1 },
        messages: [
          { role: "system", content: systemPrompt },
          message,
        ],
      }),
    })

    if (!res.ok) return null
    const data = (await res.json()) as {
      message?: { content?: string }
    }
    const raw = data.message?.content?.trim()
    if (!raw) return null

    const parsed = JSON.parse(raw) as {
      lead?: unknown
      prompt?: unknown
      options?: unknown
      questionType?: unknown
      hasFigure?: unknown
      figureBox?: unknown
    }

    const lead = typeof parsed.lead === "string" ? parsed.lead.trim() : ""
    const prompt =
      typeof parsed.prompt === "string" ? parsed.prompt.trim() : ""
    const options = Array.isArray(parsed.options)
      ? parsed.options
          .map((o) => String(o ?? "").trim())
          .filter(Boolean)
          .slice(0, 8)
      : []

    const validTypes: QuestionKind[] = [
      "multiple",
      "classic",
      "trueFalse",
      "fillBlank",
      "none",
    ]
    const questionType = validTypes.includes(
      parsed.questionType as QuestionKind,
    )
      ? (parsed.questionType as QuestionKind)
      : options.length >= 2
        ? "multiple"
        : prompt
          ? "classic"
          : "none"

    let figureBox: LocalAiAnalysisResult["figureBox"]
    if (
      parsed.hasFigure &&
      Array.isArray(parsed.figureBox) &&
      parsed.figureBox.length === 4 &&
      parsed.figureBox.every((n) => typeof n === "number" && Number.isFinite(n))
    ) {
      const [x1, y1, x2, y2] = parsed.figureBox as number[]
      const nx1 = Math.max(0, Math.min(1, x1 / 1000))
      const ny1 = Math.max(0, Math.min(1, y1 / 1000))
      const nx2 = Math.max(0, Math.min(1, x2 / 1000))
      const ny2 = Math.max(0, Math.min(1, y2 / 1000))
      if (nx2 - nx1 > 0.05 && ny2 - ny1 > 0.05) {
        figureBox = {
          x: nx1,
          y: ny1,
          w: nx2 - nx1,
          h: ny2 - ny1,
        }
      }
    }

    return {
      lead: lead || undefined,
      prompt,
      options: options.length >= 2 ? options : undefined,
      questionType,
      hasFigure: Boolean(parsed.hasFigure),
      figureBox,
    }
  } catch {
    return null
  }
}
