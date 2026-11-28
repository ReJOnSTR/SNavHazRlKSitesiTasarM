const SUPERSCRIPT_MAP: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
  "⁺": "+",
  "⁻": "-",
  "⁼": "=",
  "⁽": "(",
  "⁾": ")",
  "ⁿ": "n",
  "ⁱ": "i",
}

const SUBSCRIPT_MAP: Record<string, string> = {
  "₀": "0",
  "₁": "1",
  "₂": "2",
  "₃": "3",
  "₄": "4",
  "₅": "5",
  "₆": "6",
  "₇": "7",
  "₈": "8",
  "₉": "9",
  "₊": "+",
  "₋": "-",
  "₌": "=",
  "₍": "(",
  "₎": ")",
}

/** Normalize extracted PDF/OCR math symbols into MathText syntax ([a/b], ^{n}, _{n}, √{x}). */
export function normalizeExtractedMath(raw: string): string {
  if (!raw) return raw
  let out = raw

  out = out.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ]+/g, (run) => {
    const mapped = Array.from(run)
      .map((ch) => SUPERSCRIPT_MAP[ch] ?? ch)
      .join("")
    return `^{${mapped}}`
  })

  out = out.replace(/[₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎]+/g, (run) => {
    const mapped = Array.from(run)
      .map((ch) => SUBSCRIPT_MAP[ch] ?? ch)
      .join("")
    return `_{${mapped}}`
  })

  out = out.replace(/√\(([^()]+)\)/g, "√{$1}")
  out = out.replace(/√([0-9]+|[a-zA-Z])(?![{])/g, "√{$1}")

  out = out.replace(
    /(^|[\s(=+\-×·])(\d{1,3}|[a-zA-Z])\/(\d{1,3}|[a-zA-Z])(?=$|[\s),.;:?!+\-×·])/g,
    (full, prefix: string, num: string, den: string) => {
      if (/^[A-Z]$/.test(num) && /^[A-Z]$/.test(den)) return full
      return `${prefix}[${num}/${den}]`
    },
  )

  return out
}

export type OcrParsedQuestion = {
  lead?: string
  prompt: string
  options?: string[]
  optionLayout?: "inherit" | "grid" | "inline" | "list"
  parsedType: "multiple" | "classic" | "trueFalse" | "fillBlank" | "none"
}

let ocrWorkerPromise: Promise<import("tesseract.js").Worker> | null = null

async function getOcrWorker(): Promise<import("tesseract.js").Worker> {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = (async () => {
      const { createWorker } = await import("tesseract.js")
      return createWorker("tur")
    })()
  }
  try {
    return await ocrWorkerPromise
  } catch (err) {
    ocrWorkerPromise = null
    throw err
  }
}

const optLineRe = /^\(?([A-E])\s*[.):\-]\s*(.+)/
const inlineOptRe =
  /(?:^|\s)\(?([A-E])\s*[.)]\s*([\s\S]*?)(?=\s+\(?[A-E]\s*[.)]|$)/g
const qNumRe = /^(?:Soru\s*)?\d{1,2}\s*[.):\-]\s*/i

/** Run offline Turkish OCR on a cropped question image and split into prompt + options. */
export async function recognizeQuestionOcr(
  imageDataUrl: string,
): Promise<OcrParsedQuestion> {
  const worker = await getOcrWorker()
  const { data } = await worker.recognize(imageDataUrl)
  const rawLines = (data.text ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const stemLines: string[] = []
  const options: string[] = []
  let optionRows = 0
  let strippedNum = false

  for (const line of rawLines) {
    const inlineMatches = Array.from(line.matchAll(inlineOptRe))
    if (inlineMatches.length >= 2) {
      optionRows += 1
      for (const m of inlineMatches) {
        options.push(normalizeExtractedMath(m[2].trim()))
      }
      continue
    }
    const m = line.match(optLineRe)
    if (m) {
      optionRows += 1
      options.push(normalizeExtractedMath(m[2].trim()))
      continue
    }
    let cleanLine = line
    if (!strippedNum) {
      cleanLine = cleanLine.replace(qNumRe, "").trim()
      strippedNum = true
    }
    if (cleanLine) stemLines.push(cleanLine)
  }

  let lead: string | undefined
  let promptLines = stemLines
  if (stemLines.length >= 3) {
    const stemCueRe =
      /(?:kaçtır|hangisi|hangileridir|olabilir|olamaz|doğrudur|yanlıştır|bulunuz|hesaplayınız)\b|\?$/i
    const splitIdx = stemLines.findIndex(
      (l, idx) => idx > 0 && idx >= stemLines.length - 2 && stemCueRe.test(l),
    )
    if (splitIdx > 0) {
      lead = normalizeExtractedMath(stemLines.slice(0, splitIdx).join(" "))
      promptLines = stemLines.slice(splitIdx)
    }
  }

  const prompt = normalizeExtractedMath(promptLines.join(" "))
  let optionLayout: OcrParsedQuestion["optionLayout"]
  if (options.length >= 2) {
    if (optionRows === 1) optionLayout = "inline"
    else if (optionRows < options.length) optionLayout = "grid"
    else optionLayout = "list"
  }

  let parsedType: OcrParsedQuestion["parsedType"] = "none"
  if (options.length >= 2) parsedType = "multiple"
  else if (/doğru\s*\/\s*yanlış|\(D\s*\/\s*Y\)/i.test(prompt)) parsedType = "trueFalse"
  else if (/_{3,}|\.{4,}/.test(prompt)) parsedType = "fillBlank"
  else if (prompt.length > 0) parsedType = "classic"

  return {
    lead,
    prompt,
    options: options.length >= 2 ? options.slice(0, 8) : undefined,
    optionLayout,
    parsedType,
  }
}
