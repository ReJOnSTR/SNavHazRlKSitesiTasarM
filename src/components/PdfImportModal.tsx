import { useEffect, useRef, useState } from "react"
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Crop,
  FileText,
  FolderOpen,
  LoaderCircle,
  Plus,
  Trash2,
  UploadCloud,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import type { PDFDocumentProxy, PDFPageProxy, PageViewport } from "pdfjs-dist"
import { MathText } from "../MathInput"
import { stripPdfWatermarks } from "../utils/pdfWatermarkRemover"
import type {
  DetectedPdfQuestion,
  PdfStep,
  QuestionKind,
  SavedPdfEntry,
} from "../types/exam"

type CroppedQuestionItem = {
  id: string
  pdfName: string
  page: number
  fullImage: string
  imageRawWidth: number
  sourceFontPx?: number
  mode: "split" | "image"
  parsedType: QuestionKind
  lead?: string
  leadBold?: boolean
  leadColor?: string
  prompt: string
  promptBold?: boolean
  promptColor?: string
  options?: string[]
  optionLayout?: "inherit" | "grid" | "inline" | "list"
  figureImage?: string
  figureWidth?: number
}

type PageTextSample = {
  x1: number
  y1: number
  x2: number
  y2: number
  cx: number
  cy: number
  fontPx: number
  text: string
  fontBoldHint: boolean
  isRotatedWatermark: boolean
}

type SelectionRect = {
  startX: number
  startY: number
  endX: number
  endY: number
}

type NormalizedBox = {
  x: number
  y: number
  w: number
  h: number
}

type PdfModalProps = {
  step: PdfStep
  pdfLibrary: SavedPdfEntry[]
  activePdfId: string | null
  error: string
  closeRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
  onSelectPdf: (id: string) => void
  onRemovePdf: (id: string) => void
  onPageChange: (pdfId: string, page: number) => void
  onFiles: (files: FileList | null) => void
  onImportCropped: (items: DetectedPdfQuestion[]) => void
}

function fitRegionToInk(
  canvas: HTMLCanvasElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  pad = 10,
): { x: number; y: number; w: number; h: number } {
  const ctx = canvas.getContext("2d")
  if (!ctx || sw < 1 || sh < 1) return { x: sx, y: sy, w: sw, h: sh }

  try {
    const img = ctx.getImageData(sx, sy, sw, sh).data
    let minX = sw
    let minY = sh
    let maxX = -1
    let maxY = -1
    const step = 2
    for (let y = 0; y < sh; y += step) {
      for (let x = 0; x < sw; x += step) {
        const idx = (y * sw + x) * 4
        if (
          img[idx + 3] > 20 &&
          (img[idx] < 240 || img[idx + 1] < 240 || img[idx + 2] < 240)
        ) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
    if (maxX > minX && maxY > minY) {
      const nx1 = Math.max(0, sx + minX - pad)
      const ny1 = Math.max(0, sy + minY - pad)
      const nx2 = Math.min(canvas.width, sx + maxX + pad)
      const ny2 = Math.min(canvas.height, sy + maxY + pad)
      if (nx2 - nx1 >= 12 && ny2 - ny1 >= 12) {
        return { x: nx1, y: ny1, w: nx2 - nx1, h: ny2 - ny1 }
      }
    }
  } catch {
    // Fallback to raw region
  }
  return { x: sx, y: sy, w: sw, h: sh }
}

async function extractPageTextSamples(
  page: PDFPageProxy,
  viewport: PageViewport,
  canvas: HTMLCanvasElement,
  transformUtil: typeof import("pdfjs-dist")["Util"],
): Promise<PageTextSample[]> {
  const cw = canvas.width
  const ch = canvas.height
  if (cw === 0 || ch === 0) return []

  const content = await page.getTextContent()
  const styles = (content.styles ?? {}) as Record<string, { fontFamily?: string }>
  const textSamples: PageTextSample[] = []

  for (const item of content.items) {
    if (!("str" in item) || !item.str.trim()) continue
    const t = transformUtil.transform(viewport.transform, item.transform)
    const fontH = Math.max(4, Math.hypot(t[2], t[3]))
    const trimmed = item.str.trim()
    const itemW = Math.max(
      4,
      item.width > 0
        ? item.width * viewport.scale
        : trimmed.length * fontH * 0.55,
    )
    const angle = Math.abs(Math.atan2(t[1], t[0]))
    const isRotatedWatermark = angle > 0.12

    let x1 = t[4]
    let y1 = t[5] - fontH
    let x2 = x1 + itemW
    let y2 = t[5] + fontH * 0.25

    if (isRotatedWatermark) {
      const uLen = Math.hypot(t[0], t[1]) || 1
      const bx = (t[0] / uLen) * itemW
      const by = (t[1] / uLen) * itemW
      const ax = t[2]
      const ay = t[3]
      const xs = [t[4], t[4] + bx, t[4] + ax, t[4] + bx + ax, t[4] - ax, t[4] + bx - ax]
      const ys = [t[5], t[5] + by, t[5] + ay, t[5] + by + ay, t[5] - ay, t[5] + by - ay]
      x1 = Math.min(...xs) - 4
      y1 = Math.min(...ys) - 4
      x2 = Math.max(...xs) + 4
      y2 = Math.max(...ys) + 4
    }

    const fontName = "fontName" in item ? String(item.fontName) : ""
    const fontFamily = styles[fontName]?.fontFamily ?? ""
    const fontBoldHint = /bold|black|heavy|semibold|demi/i.test(
      `${fontName} ${fontFamily}`,
    )
    textSamples.push({
      x1,
      y1,
      x2,
      y2,
      cx: (x1 + x2) * 0.5 / cw,
      cy: (y1 + y2) * 0.5 / ch,
      fontPx: fontH,
      text: trimmed,
      fontBoldHint,
      isRotatedWatermark,
    })
  }

  return textSamples
}

function detectAndCleanWatermark(
  canvas: HTMLCanvasElement,
  samples: PageTextSample[],
  applyClean: boolean,
  refImageData: ImageData | null,
): { watermarkDetected: boolean; cleanSamples: PageTextSample[] } {
  const horizFonts = samples
    .filter((s) => !s.isRotatedWatermark)
    .map((s) => s.fontPx)
    .sort((a, b) => a - b)
  const medianFont =
    horizFonts.length > 0 ? horizFonts[Math.floor(horizFonts.length / 2)] : 18

  const watermarkSamples: PageTextSample[] = []
  const cleanSamples: PageTextSample[] = []
  for (const s of samples) {
    const isGiantBg =
      s.fontPx > medianFont * 2.4 &&
      s.text.length >= 2 &&
      (s.isRotatedWatermark || s.y1 > canvas.height * 0.12)
    if (s.isRotatedWatermark || isGiantBg) {
      watermarkSamples.push(s)
    } else {
      cleanSamples.push(s)
    }
  }

  let wmPixelCount = 0
  const ctx = canvas.getContext("2d")
  if (ctx) {
    try {
      const cw = canvas.width
      const ch = canvas.height
      const imgData = ctx.getImageData(0, 0, cw, ch)
      const data = imgData.data

      // Build text-protection mask around normal text bounding boxes (+3px pad)
      const textMask = new Uint8Array(cw * ch)
      for (const s of cleanSamples) {
        const minX = Math.max(0, Math.floor(s.x1) - 3)
        const maxX = Math.min(cw - 1, Math.ceil(s.x2) + 3)
        const minY = Math.max(0, Math.floor(s.y1) - 3)
        const maxY = Math.min(ch - 1, Math.ceil(s.y2) + 3)
        for (let py = minY; py <= maxY; py++) {
          const rowOffset = py * cw
          for (let px = minX; px <= maxX; px++) {
            textMask[rowOffset + px] = 1
          }
        }
      }

      const hasDarkNeighbor = (x: number, y: number) => {
        for (let dy = -1; dy <= 1; dy++) {
          const ny = y + dy
          if (ny < 0 || ny >= ch) continue
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            const nx = x + dx
            if (nx < 0 || nx >= cw) continue
            const ni = (ny * cw + nx) * 4
            const nLum =
              0.299 * data[ni] + 0.587 * data[ni + 1] + 0.114 * data[ni + 2]
            if (nLum < 85) return true
          }
        }
        return false
      }

      if (
        refImageData &&
        refImageData.width === cw &&
        refImageData.height === ch
      ) {
        // Cross-page diff: pixels identical across two different pages (and not dark text / protected text mask)
        const refData = refImageData.data
        const yStart = Math.floor(ch * 0.05)
        const yEnd = Math.floor(ch * 0.95)
        for (let y = yStart; y < yEnd; y++) {
          for (let x = 0; x < cw; x++) {
            const idx = y * cw + x
            const i = idx * 4
            const r1 = data[i]
            const g1 = data[i + 1]
            const b1 = data[i + 2]
            if (r1 >= 246 && g1 >= 246 && b1 >= 246) continue
            const r2 = refData[i]
            const g2 = refData[i + 1]
            const b2 = refData[i + 2]
            if (r2 >= 246 && g2 >= 246 && b2 >= 246) continue

            if (
              Math.abs(r1 - r2) <= 12 &&
              Math.abs(g1 - g2) <= 12 &&
              Math.abs(b1 - b2) <= 12
            ) {
              const lum = 0.299 * r1 + 0.587 * g1 + 0.114 * b1
              if (textMask[idx] && lum < 225) continue
              if (lum >= 165 && !hasDarkNeighbor(x, y)) {
                wmPixelCount += 1
                if (applyClean) {
                  data[i] = 255
                  data[i + 1] = 255
                  data[i + 2] = 255
                  data[i + 3] = 255
                }
              }
            }
          }
        }
      } else {
        // Single-page fallback: only remove ultra-faint desaturated gray outside protected text
        for (let y = 0; y < ch; y++) {
          for (let x = 0; x < cw; x++) {
            const idx = y * cw + x
            if (textMask[idx]) continue
            const i = idx * 4
            const r = data[i]
            const g = data[i + 1]
            const b = data[i + 2]
            const a = data[i + 3]
            if (a < 20 || (r >= 248 && g >= 248 && b >= 248)) continue
            const lum = 0.299 * r + 0.587 * g + 0.114 * b
            const spread = Math.max(r, g, b) - Math.min(r, g, b)
            if (lum >= 226 && spread < 10 && !hasDarkNeighbor(x, y)) {
              wmPixelCount += 1
              if (applyClean) {
                data[i] = 255
                data[i + 1] = 255
                data[i + 2] = 255
                data[i + 3] = 255
              }
            }
          }
        }
      }

      if (applyClean && wmPixelCount > 0) {
        ctx.putImageData(imgData, 0, 0)
      }
    } catch {
      // Ignore pixel access errors
    }
  }

  const watermarkDetected =
    watermarkSamples.length > 0 || wmPixelCount >= 350

  return {
    watermarkDetected,
    cleanSamples: applyClean ? cleanSamples : samples,
  }
}

function sampleRegionStyle(
  canvas: HTMLCanvasElement,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  fontBoldHint: boolean,
): { isBold: boolean; color?: string } {
  const ctx = canvas.getContext("2d")
  if (!ctx) return { isBold: fontBoldHint }
  const rx = Math.max(0, Math.floor(x1))
  const ry = Math.max(0, Math.floor(y1))
  const rw = Math.min(canvas.width - rx, Math.ceil(x2 - x1))
  const rh = Math.min(canvas.height - ry, Math.ceil(y2 - y1))
  if (rw < 2 || rh < 2) return { isBold: fontBoldHint }

  try {
    const img = ctx.getImageData(rx, ry, rw, rh).data
    const step = rw * rh <= 3600 ? 1 : 2
    let inkPixels = 0
    let totalSamples = 0
    let colorPixels = 0
    let sumR = 0
    let sumG = 0
    let sumB = 0

    for (let y = 0; y < rh; y += step) {
      for (let x = 0; x < rw; x += step) {
        totalSamples += 1
        const idx = (y * rw + x) * 4
        const r = img[idx]
        const g = img[idx + 1]
        const b = img[idx + 2]
        if (img[idx + 3] > 20 && (r < 218 || g < 218 || b < 218)) {
          inkPixels += 1
          const spread = Math.max(r, g, b) - Math.min(r, g, b)
          if (spread > 26) {
            colorPixels += 1
            sumR += r
            sumG += g
            sumB += b
          }
        }
      }
    }

    const density = totalSamples > 0 ? inkPixels / totalSamples : 0
    const isBold = fontBoldHint || density >= 0.34

    let color: string | undefined
    if (inkPixels > 0 && colorPixels / inkPixels >= 0.28 && colorPixels >= 2) {
      const avgR = Math.round(sumR / colorPixels)
      const avgG = Math.round(sumG / colorPixels)
      const avgB = Math.round(sumB / colorPixels)
      const toHex = (v: number) => v.toString(16).padStart(2, "0")
      color = `#${toHex(avgR)}${toHex(avgG)}${toHex(avgB)}`
    }

    return { isBold, color }
  } catch {
    return { isBold: fontBoldHint }
  }
}

function formatLineRuns(
  ordered: { text: string; gapBefore: string; isBold: boolean; color?: string }[],
  baseBold: boolean,
  baseColor?: string,
): string {
  if (ordered.length === 0) return ""
  const out: string[] = []
  let i = 0
  while (i < ordered.length) {
    const cur = ordered[i]
    const diffBold = cur.isBold !== baseBold && cur.isBold
    const diffColor = cur.color && cur.color !== baseColor ? cur.color : undefined
    let chunk = cur.text
    let j = i + 1
    while (j < ordered.length) {
      const nxt = ordered[j]
      const nxtDiffBold = nxt.isBold !== baseBold && nxt.isBold
      const nxtDiffColor =
        nxt.color && nxt.color !== baseColor ? nxt.color : undefined
      if (nxtDiffBold === diffBold && nxtDiffColor === diffColor) {
        chunk += nxt.gapBefore + nxt.text
        j += 1
      } else {
        break
      }
    }
    if (i > 0) out.push(cur.gapBefore)
    let formatted = chunk
    if (diffBold) formatted = `**${formatted}**`
    if (diffColor) formatted = `{${diffColor}|${formatted}}`
    out.push(formatted)
    i = j
  }
  return out.join("").trim()
}

function analyzeQuestionCrop(
  canvas: HTMLCanvasElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  insideSamples: PageTextSample[],
): {
  mode: "split" | "image"
  parsedType: QuestionKind
  lead?: string
  leadBold?: boolean
  leadColor?: string
  prompt: string
  promptBold?: boolean
  promptColor?: string
  options?: string[]
  optionLayout?: "inherit" | "grid" | "inline" | "list"
  figureImage?: string
  figureWidth?: number
} {
  if (insideSamples.length === 0) {
    return { mode: "image", parsedType: "none", prompt: "" }
  }

  type LineBucket = {
    y1: number
    y2: number
    h: number
    items: PageTextSample[]
  }
  const sorted = [...insideSamples].sort((a, b) => a.y1 - b.y1 || a.x1 - b.x1)
  const lines: LineBucket[] = []

  for (const s of sorted) {
    const sCy = (s.y1 + s.y2) * 0.5
    const match = lines.find((line) => {
      const lineCy = (line.y1 + line.y2) * 0.5
      const overlap = Math.min(line.y2, s.y2) - Math.max(line.y1, s.y1)
      return (
        overlap > 0 ||
        Math.abs(lineCy - sCy) <= Math.max(line.h, s.fontPx) * 0.55
      )
    })
    if (match) {
      match.items.push(s)
      match.y1 = Math.min(match.y1, s.y1)
      match.y2 = Math.max(match.y2, s.y2)
    } else {
      lines.push({ y1: s.y1, y2: s.y2, h: s.fontPx, items: [s] })
    }
  }

  const lineEntries = lines.map((line) => {
    const ordered = [...line.items].sort((a, b) => a.x1 - b.x1)
    let text = ""
    let minX = Infinity
    let maxX = -Infinity
    let fontSum = 0
    let boldVotes = 0
    const styledItems: {
      text: string
      gapBefore: string
      isBold: boolean
      color?: string
    }[] = []
    for (let i = 0; i < ordered.length; i++) {
      const cur = ordered[i]
      minX = Math.min(minX, cur.x1)
      maxX = Math.max(maxX, cur.x2)
      fontSum += cur.fontPx
      if (cur.fontBoldHint) boldVotes += 1
      let gapBefore = ""
      if (i > 0) {
        const gap = cur.x1 - ordered[i - 1].x2
        gapBefore = gap > cur.fontPx * 1.35 ? "  " : " "
        text += gapBefore
      }
      text += cur.text
      const itemStyle = sampleRegionStyle(
        canvas,
        cur.x1,
        cur.y1,
        cur.x2,
        cur.y2,
        cur.fontBoldHint,
      )
      styledItems.push({
        text: cur.text,
        gapBefore,
        isBold: itemStyle.isBold,
        color: itemStyle.color,
      })
    }
    const avgFontPx = ordered.length > 0 ? fontSum / ordered.length : 12
    const styleInfo = sampleRegionStyle(
      canvas,
      minX,
      line.y1,
      maxX,
      line.y2,
      boldVotes > ordered.length * 0.5,
    )
    return {
      text: text.trim(),
      x1: minX,
      x2: maxX,
      y1: line.y1,
      y2: line.y2,
      fontPx: avgFontPx,
      isBold: styleInfo.isBold,
      color: styleInfo.color,
      styledItems,
      items: ordered,
    }
  })

  const fontList = lineEntries.map((l) => l.fontPx).sort((a, b) => a - b)
  const medianFontPx =
    fontList.length > 0 ? fontList[Math.floor(fontList.length / 2)] : 12

  const optionLineRe = /^([A-E])\s*[.)]\s*(.+)/
  const inlineOptionRe =
    /(?:^|\s)([A-E])\s*[.)]\s*([\s\S]*?)(?=\s+[A-E]\s*[.)]|$)/g
  const qNumStartRe = /^(?:Soru\s*)?\d{1,2}\s*[.):\-]\s+/i
  const unitOnlyRe = /^(?:cm|mm|dm|km|kg|gr|lt|ml|sn|dk|sa|br|m|g|l|s|t)$/i

  const isProseOrFormulaLine = (rawText: string) => {
    const trimmed = rawText.trim()
    if (!trimmed) return false
    if (/\?$/.test(trimmed) || qNumStartRe.test(trimmed)) return true
    if (trimmed.length >= 18 || trimmed.split(/\s+/).length >= 3) return true
    // Catch 1-2 word Turkish prose continuations like "verilmiştir.", "olduğu biliniyor."
    const words = trimmed.match(/[a-zA-ZçğıöşüÇĞİÖŞÜ]{3,}/g) ?? []
    if (words.some((w) => !unitOnlyRe.test(w))) return true
    // Catch standalone math/set formulas like "s(A) = 9", "A ∩ B = {0, 1, 4, 5, 6}"
    if (
      trimmed.length >= 5 &&
      /[=≠<>≤≥∈∉⊂⊃∪∩{}]/.test(trimmed) &&
      !/^\s*[A-Z]\s*=\s*\d+\s*°?\s*$/.test(trimmed)
    ) {
      return true
    }
    return false
  }

  const proseOrOptionLines: typeof lineEntries = []
  const proseOrOptionItems: PageTextSample[] = []
  for (const line of lineEntries) {
    const inlineMatches = Array.from(line.text.matchAll(inlineOptionRe))
    const isOpt = inlineMatches.length >= 2 || optionLineRe.test(line.text)
    if (isOpt || isProseOrFormulaLine(line.text)) {
      proseOrOptionLines.push(line)
      proseOrOptionItems.push(...line.items)
    }
  }

  // Locate figure/diagram bounds via maskCanvas, then crop from ORIGINAL canvas so text on top of the image is NEVER cut/erased
  let figureBounds: { x: number; y: number; w: number; h: number } | null = null
  let tightFigureBounds: { x1: number; y1: number; x2: number; y2: number } | null = null
  let figureImage: string | undefined
  let figureWidth: number | undefined

  const maskCanvas = document.createElement("canvas")
  maskCanvas.width = sw
  maskCanvas.height = sh
  const mCtx = maskCanvas.getContext("2d")
  if (mCtx) {
    mCtx.fillStyle = "#ffffff"
    mCtx.fillRect(0, 0, sw, sh)
    mCtx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh)
    mCtx.fillStyle = "#ffffff"
    for (const it of proseOrOptionItems) {
      mCtx.fillRect(
        it.x1 - sx - 4,
        it.y1 - sy - 3,
        it.x2 - it.x1 + 8,
        it.y2 - it.y1 + 6,
      )
    }

    try {
      const img = mCtx.getImageData(0, 0, sw, sh).data
      const step = 2
      const rowCounts: { y: number; count: number; minX: number; maxX: number }[] = []
      for (let y = 0; y < sh; y += step) {
        let rowCount = 0
        let rMinX = sw
        let rMaxX = -1
        for (let x = 0; x < sw; x += step) {
          const idx = (y * sw + x) * 4
          if (
            img[idx + 3] > 20 &&
            (img[idx] < 232 || img[idx + 1] < 232 || img[idx + 2] < 232)
          ) {
            rowCount += 1
            if (x < rMinX) rMinX = x
            if (x > rMaxX) rMaxX = x
          }
        }
        rowCounts.push({ y, count: rowCount, minX: rMinX, maxX: rMaxX })
      }

      // Group inked rows into vertical graphic bands separated by > 16px blank gaps
      type Band = { minY: number; maxY: number; minX: number; maxX: number; ink: number }
      const bands: Band[] = []
      let currentBand: Band | null = null
      let emptyRunPx = 0

      for (const row of rowCounts) {
        if (row.count >= 2) {
          if (!currentBand) {
            currentBand = {
              minY: row.y,
              maxY: row.y,
              minX: row.minX,
              maxX: row.maxX,
              ink: row.count,
            }
          } else {
            currentBand.maxY = row.y
            currentBand.minX = Math.min(currentBand.minX, row.minX)
            currentBand.maxX = Math.max(currentBand.maxX, row.maxX)
            currentBand.ink += row.count
          }
          emptyRunPx = 0
        } else if (currentBand) {
          emptyRunPx += step
          if (emptyRunPx > 16) {
            bands.push(currentBand)
            currentBand = null
            emptyRunPx = 0
          }
        }
      }
      if (currentBand) bands.push(currentBand)

      // Pick the primary graphic band (tallest/densest band >= 32px high and >= 180 ink samples)
      const validBands = bands
        .filter((b) => b.maxX - b.minX >= 44 && b.maxY - b.minY >= 32 && b.ink >= 180)
        .sort((a, b) => b.ink - a.ink)

      const bestBand = validBands[0]
      if (bestBand) {
        const minX = bestBand.minX
        const maxX = bestBand.maxX
        const minY = bestBand.minY
        const maxY = bestBand.maxY
        tightFigureBounds = {
          x1: sx + minX,
          y1: sy + minY,
          x2: sx + maxX,
          y2: sy + maxY,
        }
        const pad = 10
        const fx0 = Math.max(0, minX - pad)
        let fy = Math.max(0, minY - pad)
        const fx2 = Math.min(sw, maxX + pad)
        let fy2 = Math.min(sh, maxY + pad)

        // Clamp top/bottom against prose & option lines so surrounding text/formulas never leak into the figure
        const figCenterY = (minY + maxY) * 0.5
        for (const line of proseOrOptionLines) {
          const ly1 = line.y1 - sy
          const ly2 = line.y2 - sy
          if (ly2 <= figCenterY && ly2 > fy && ly2 < minY + 4) {
            fy = Math.max(fy, ly2 + 2)
          }
          if (ly1 >= figCenterY && ly1 < fy2 && ly1 > maxY - 4) {
            fy2 = Math.min(fy2, ly1 - 2)
          }
        }

        const fw = fx2 - fx0
        const fh = fy2 - fy
        if (fw >= 44 && fh >= 32) {
          figureBounds = { x: sx + fx0, y: sy + fy, w: fw, h: fh }
        }
      }
    } catch {
      // Ignore pixel read error
    }
  }

  // Classify lines into upper heading/lead, prompt, and options
  type ParsedLine = {
    text: string
    styledText: string
    x1: number
    x2: number
    y1: number
    y2: number
    fontPx: number
    isBold: boolean
    color?: string
  }
  const stemLines: ParsedLine[] = []
  const options: string[] = []
  let optionRows = 0
  const extractedTextItems: PageTextSample[] = []
  const qNumRe = /^(?:Soru\s*)?\d{1,2}\s*[.):\-]\s*/i
  let strippedNum = false

  for (const line of lineEntries) {
    let text = line.text
    if (!text) continue

    const inlineMatches = Array.from(text.matchAll(inlineOptionRe))
    if (inlineMatches.length >= 2) {
      extractedTextItems.push(...line.items)
      optionRows += 1
      for (const m of inlineMatches) {
        options.push(m[2].trim())
      }
      continue
    }

    const optMatch = text.match(optionLineRe)
    if (optMatch) {
      extractedTextItems.push(...line.items)
      optionRows += 1
      options.push(optMatch[2].trim())
      continue
    }

    // Any non-option, non-prose/formula line whose center falls inside the tight graphic bounds belongs to the figure
    if (tightFigureBounds) {
      const lcx = (line.x1 + line.x2) * 0.5
      const lcy = (line.y1 + line.y2) * 0.5
      const insideTightFig =
        lcx >= tightFigureBounds.x1 - 2 &&
        lcx <= tightFigureBounds.x2 + 2 &&
        lcy >= tightFigureBounds.y1 - 2 &&
        lcy <= tightFigureBounds.y2 + 2
      if (insideTightFig && !isProseOrFormulaLine(text)) {
        continue
      }
    }

    if (options.length === 0) {
      let styledItems = line.styledItems
      if (!strippedNum) {
        const cleaned = text.replace(qNumRe, "").trim()
        if (cleaned !== text && styledItems.length > 0) {
          const diff = text.length - cleaned.length
          if (styledItems[0].text.length <= diff) {
            styledItems = styledItems.slice(1)
            if (styledItems.length > 0) {
              styledItems[0] = { ...styledItems[0], gapBefore: "" }
            }
          } else {
            styledItems = [
              {
                ...styledItems[0],
                text: styledItems[0].text.replace(qNumRe, "").trim(),
              },
              ...styledItems.slice(1),
            ]
          }
        }
        text = cleaned
        strippedNum = true
      }
      if (text) {
        extractedTextItems.push(...line.items)
        const styledText = formatLineRuns(styledItems, line.isBold, line.color)
        stemLines.push({
          text,
          styledText: styledText || text,
          x1: line.x1,
          x2: line.x2,
          y1: line.y1,
          y2: line.y2,
          fontPx: line.fontPx,
          isBold: line.isBold,
          color: line.color,
        })
      }
    }
  }

  // Render figureImage from original canvas, erasing ONLY the text items we extracted into lead/prompt/options
  if (figureBounds) {
    const figCanvas = document.createElement("canvas")
    figCanvas.width = figureBounds.w
    figCanvas.height = figureBounds.h
    const fCtx = figCanvas.getContext("2d")
    if (fCtx) {
      fCtx.fillStyle = "#ffffff"
      fCtx.fillRect(0, 0, figureBounds.w, figureBounds.h)
      fCtx.drawImage(
        canvas,
        figureBounds.x,
        figureBounds.y,
        figureBounds.w,
        figureBounds.h,
        0,
        0,
        figureBounds.w,
        figureBounds.h,
      )
      fCtx.fillStyle = "#ffffff"
      for (const it of extractedTextItems) {
        fCtx.fillRect(
          it.x1 - figureBounds.x - 3,
          it.y1 - figureBounds.y - 2,
          it.x2 - it.x1 + 6,
          it.y2 - it.y1 + 4,
        )
      }
      figureImage = figCanvas.toDataURL("image/png")
      figureWidth = figureBounds.w
    }
  }

  let leadLines: ParsedLine[] = []
  let promptLines: ParsedLine[] = stemLines

  if (figureBounds && stemLines.length >= 2) {
    const aboveFig = stemLines.filter((l) => l.y2 <= figureBounds!.y + 6)
    const belowFig = stemLines.filter((l) => l.y1 >= figureBounds!.y + 6)
    if (aboveFig.length > 0 && belowFig.length > 0) {
      leadLines = aboveFig
      promptLines = belowFig
    }
  }

  if (leadLines.length === 0 && promptLines.length >= 2) {
    // Bold lower question stem vs normal upper intro text (common in Turkish exams)
    let boldStartIdx = -1
    for (let i = 1; i < promptLines.length; i++) {
      if (promptLines[i].isBold && !promptLines[i - 1].isBold) {
        const upperMostlyNormal =
          promptLines.slice(0, i).filter((l) => !l.isBold).length >=
          Math.ceil(i * 0.6)
        const lowerMostlyBold =
          promptLines.slice(i).filter((l) => l.isBold).length >=
          Math.ceil((promptLines.length - i) * 0.6)
        if (upperMostlyNormal && lowerMostlyBold) {
          boldStartIdx = i
        }
      }
    }
    if (boldStartIdx > 0) {
      leadLines = promptLines.slice(0, boldStartIdx)
      promptLines = promptLines.slice(boldStartIdx)
    }
  }

  if (leadLines.length === 0 && promptLines.length >= 2) {
    // Vertical paragraph gap between upper intro and lower question stem
    let gapSplitIdx = -1
    for (let i = 1; i < promptLines.length; i++) {
      const prev = promptLines[i - 1]
      const cur = promptLines[i]
      if (cur.y1 - prev.y2 > prev.fontPx * 0.8) {
        const lowerText = promptLines
          .slice(i)
          .map((l) => l.text)
          .join(" ")
        if (
          /\?$/.test(lowerText) ||
          /^(?:Buna göre|Yukarıdaki|Aşağıdaki|Bu\s)/i.test(lowerText)
        ) {
          gapSplitIdx = i
        }
      }
    }
    if (gapSplitIdx > 0) {
      leadLines = promptLines.slice(0, gapSplitIdx)
      promptLines = promptLines.slice(gapSplitIdx)
    }
  }

  if (leadLines.length === 0 && promptLines.length >= 2) {
    // Upper bold/larger heading lines followed by normal body text
    let splitAt = 0
    for (let i = 0; i < promptLines.length - 1; i++) {
      const l = promptLines[i]
      const isHeading = l.isBold || l.fontPx >= medianFontPx * 1.12
      if (isHeading) {
        splitAt = i + 1
      } else {
        break
      }
    }
    if (splitAt > 0 && splitAt < promptLines.length) {
      leadLines = promptLines.slice(0, splitAt)
      promptLines = promptLines.slice(splitAt)
    }
  }

  const maxStemWidth = Math.max(
    1,
    ...stemLines.map((l) => l.x2 - l.x1),
  )
  const listMarkerRe =
    /^(?:(?:I{1,3}|IV|V|VI{0,3})[.)]|[•\-*—]|\d{1,2}[.)])\s*/
  const joinPreservingSpacing = (
    group: ParsedLine[],
    groupBold: boolean,
    groupColor?: string,
  ) => {
    let acc = ""
    for (let i = 0; i < group.length; i++) {
      const l = group[i]
      let t = l.styledText
      if (l.isBold && !groupBold && !t.startsWith("**")) t = `**${t}**`
      if (l.color && l.color !== groupColor && !t.startsWith(`{${l.color}|`)) {
        t = `{${l.color}|${t}}`
      }
      if (i > 0) {
        const prev = group[i - 1]
        const gapY = l.y1 - prev.y2
        const prevShort =
          prev.x2 - prev.x1 < maxStemWidth * 0.72 &&
          /[.?!:]$/.test(prev.text)
        if (gapY > prev.fontPx * 0.9) {
          acc += "\n\n"
        } else if (listMarkerRe.test(l.text) || prevShort) {
          acc += "\n"
        } else {
          acc += " "
        }
      }
      acc += t
    }
    return acc.trim()
  }

  const leadBold =
    leadLines.length > 0 && leadLines.every((l) => l.isBold)
  const leadColors = new Set(leadLines.map((l) => l.color).filter(Boolean))
  const leadColor =
    leadColors.size === 1 && leadLines.every((l) => l.color)
      ? leadLines[0].color
      : undefined
  const lead =
    leadLines.length > 0
      ? joinPreservingSpacing(leadLines, leadBold, leadColor)
      : undefined

  const promptBold =
    promptLines.length > 0 && promptLines.every((l) => l.isBold)
  const promptColors = new Set(promptLines.map((l) => l.color).filter(Boolean))
  const promptColor =
    promptColors.size === 1 && promptLines.every((l) => l.color)
      ? promptLines[0].color
      : undefined
  const prompt = joinPreservingSpacing(promptLines, promptBold, promptColor)

  let optionLayout: "inherit" | "grid" | "inline" | "list" | undefined
  if (options.length >= 2) {
    if (optionRows === 1) optionLayout = "inline"
    else if (optionRows < options.length) optionLayout = "grid"
    else optionLayout = "list"
  }

  let parsedType: QuestionKind = "none"
  if (options.length >= 2) {
    parsedType = "multiple"
  } else if (/doğru\s*\/\s*yanlış|\(D\s*\/\s*Y\)/i.test(prompt)) {
    parsedType = "trueFalse"
  } else if (/_{3,}|\.{4,}/.test(prompt)) {
    parsedType = "fillBlank"
  } else if (prompt.length > 0 || lead) {
    parsedType = "classic"
  }

  return {
    mode: prompt.length > 0 || Boolean(lead) || options.length >= 2 ? "split" : "image",
    parsedType,
    lead,
    leadBold,
    leadColor,
    prompt,
    promptBold,
    promptColor,
    options: options.length >= 2 ? options.slice(0, 8) : undefined,
    optionLayout,
    figureImage,
    figureWidth,
  }
}

export default function PdfImportModal({
  step,
  pdfLibrary,
  activePdfId,
  error,
  closeRef,
  onClose,
  onSelectPdf,
  onRemovePdf,
  onPageChange,
  onFiles,
  onImportCropped,
}: PdfModalProps) {
  const activePdf =
    pdfLibrary.find((item) => item.id === activePdfId) ?? pdfLibrary[0] ?? null

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [cropPageCount, setCropPageCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageLoading, setPageLoading] = useState(false)
  const [cropError, setCropError] = useState("")
  const [croppedItems, setCroppedItems] = useState<CroppedQuestionItem[]>([])
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [recropTargetId, setRecropTargetId] = useState<string | null>(null)
  const [selection, setSelection] = useState<SelectionRect | null>(null)
  const [pendingBox, setPendingBox] = useState<NormalizedBox | null>(null)
  const [zoom, setZoom] = useState(1)
  const [removeWatermark, setRemoveWatermark] = useState(true)
  const [watermarkDetected, setWatermarkDetected] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null)
  const pageTextSamplesRef = useRef<PageTextSample[]>([])
  const refPageCacheRef = useRef<{
    pdfId: string
    pageNo: number
    imageData: ImageData
  } | null>(null)

  // Load active PDF document when switching files or opening crop view
  useEffect(() => {
    if (step !== "crop" || !activePdf) {
      setPdfDoc(null)
      setCropPageCount(0)
      setCurrentPage(1)
      setSelection(null)
      setPendingBox(null)
      setCropError("")
      return
    }

    let cancelled = false
    let loadedDoc: PDFDocumentProxy | null = null
    setPageLoading(true)
    setCropError("")
    setPendingBox(null)
    setSelection(null)
    refPageCacheRef.current = null

      ; (async () => {
        try {
          const pdfjs = await import("pdfjs-dist")
          const rawWorkerUrl = new URL(
            "pdfjs-dist/build/pdf.worker.min.mjs",
            import.meta.url,
          ).toString()
          if (!pdfjs.GlobalWorkerOptions.workerSrc) {
            if (window.location.protocol === "exact-app:") {
              try {
                const res = await fetch(rawWorkerUrl)
                const blob = new Blob([await res.arrayBuffer()], {
                  type: "text/javascript",
                })
                pdfjs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob)
              } catch {
                pdfjs.GlobalWorkerOptions.workerSrc = rawWorkerUrl
              }
            } else {
              pdfjs.GlobalWorkerOptions.workerSrc = rawWorkerUrl
            }
          }
          const buffer = await activePdf.file.arrayBuffer()
          const prepared = removeWatermark
            ? await stripPdfWatermarks(buffer)
            : { data: new Uint8Array(buffer), removed: false }
          if (cancelled) return
          loadedDoc = await pdfjs.getDocument({ data: prepared.data }).promise
          if (cancelled) {
            void loadedDoc.cleanup()
            return
          }
          setWatermarkDetected(prepared.removed)
          setPdfDoc(loadedDoc)
          setCropPageCount(loadedDoc.numPages)
          setCurrentPage(
            Math.min(loadedDoc.numPages, Math.max(1, activePdf.lastPage ?? 1)),
          )
        } catch (err) {
          if (!cancelled) {
            setCropError(
              err instanceof Error
                ? err.message
                : "PDF sayfası görüntülenemedi.",
            )
            setPageLoading(false)
          }
        }
      })()

    return () => {
      cancelled = true
      if (loadedDoc) void loadedDoc.cleanup()
    }
  }, [step, activePdf?.id, removeWatermark])

  // Render active page and detect question boxes
  useEffect(() => {
    if (step !== "crop" || !pdfDoc || !canvasRef.current) return
    let cancelled = false
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null
    setPageLoading(true)
    setSelection(null)
    setPendingBox(null)

      ; (async () => {
        try {
          const page = await pdfDoc.getPage(currentPage)
          if (cancelled || !canvasRef.current) return
          const viewport = page.getViewport({ scale: 2 })
          const canvas = canvasRef.current
          const context = canvas.getContext("2d")
          if (!context) return
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          renderTask = page.render({
            canvas,
            canvasContext: context,
            viewport,
          })
          await renderTask.promise
          if (cancelled) return
          const { Util } = await import("pdfjs-dist")
          const rawSamples = await extractPageTextSamples(
            page,
            viewport,
            canvas,
            Util,
          )

          let refImageData: ImageData | null = null
          if (removeWatermark && pdfDoc.numPages >= 2 && activePdf) {
            const targetRefPage = currentPage === 1 ? 2 : 1
            if (
              refPageCacheRef.current &&
              refPageCacheRef.current.pdfId === activePdf.id &&
              refPageCacheRef.current.pageNo === targetRefPage
            ) {
              refImageData = refPageCacheRef.current.imageData
            } else {
              try {
                const refPage = await pdfDoc.getPage(targetRefPage)
                if (!cancelled) {
                  const refViewport = refPage.getViewport({ scale: 2 })
                  const off = document.createElement("canvas")
                  off.width = Math.floor(refViewport.width)
                  off.height = Math.floor(refViewport.height)
                  const offCtx = off.getContext("2d")
                  if (offCtx) {
                    await refPage.render({
                      canvas: off,
                      canvasContext: offCtx,
                      viewport: refViewport,
                    }).promise
                    if (!cancelled) {
                      refImageData = offCtx.getImageData(
                        0,
                        0,
                        off.width,
                        off.height,
                      )
                      refPageCacheRef.current = {
                        pdfId: activePdf.id,
                        pageNo: targetRefPage,
                        imageData: refImageData,
                      }
                    }
                  }
                }
              } catch {
                // Ignore reference page render errors
              }
            }
          }

          if (cancelled) return
          const wmResult = detectAndCleanWatermark(
            canvas,
            rawSamples,
            removeWatermark,
            refImageData,
          )
          if (!cancelled) {
            pageTextSamplesRef.current = wmResult.cleanSamples
            if (wmResult.watermarkDetected) setWatermarkDetected(true)
            setPageLoading(false)
          }
        } catch {
          if (!cancelled) setPageLoading(false)
        }
      })()

    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [step, pdfDoc, currentPage, removeWatermark])

  const getStageCoords = (event: React.PointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current
    if (!stage) return { x: 0, y: 0 }
    const rect = stage.getBoundingClientRect()
    const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left))
    const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top))
    return { x, y }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pageLoading || !canvasRef.current) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const pt = getStageCoords(event)
    dragOriginRef.current = pt
    setPendingBox(null)
    setSelection({ startX: pt.x, startY: pt.y, endX: pt.x, endY: pt.y })
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOriginRef.current) return
    const pt = getStageCoords(event)
    setSelection({
      startX: dragOriginRef.current.x,
      startY: dragOriginRef.current.y,
      endX: pt.x,
      endY: pt.y,
    })
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOriginRef.current) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    const pt = getStageCoords(event)
    const finalRect: SelectionRect = {
      startX: dragOriginRef.current.x,
      startY: dragOriginRef.current.y,
      endX: pt.x,
      endY: pt.y,
    }
    dragOriginRef.current = null
    setSelection(null)

    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return
    const stageRect = stage.getBoundingClientRect()
    const left = Math.min(finalRect.startX, finalRect.endX)
    const top = Math.min(finalRect.startY, finalRect.endY)
    const width = Math.abs(finalRect.endX - finalRect.startX)
    const height = Math.abs(finalRect.endY - finalRect.startY)
    if (width < 16 || height < 16 || stageRect.width === 0 || stageRect.height === 0) {
      return
    }

    const scaleX = canvas.width / stageRect.width
    const scaleY = canvas.height / stageRect.height
    const sx = Math.round(left * scaleX)
    const sy = Math.round(top * scaleY)
    const sw = Math.max(1, Math.round(width * scaleX))
    const sh = Math.max(1, Math.round(height * scaleY))

    // Automatically fit/resize the selection to the question content
    const fitted = fitRegionToInk(canvas, sx, sy, sw, sh, 10)
    setPendingBox({
      x: fitted.x / canvas.width,
      y: fitted.y / canvas.height,
      w: fitted.w / canvas.width,
      h: fitted.h / canvas.height,
    })
  }

  const startRecropFigure = (item: CroppedQuestionItem) => {
    setRecropTargetId(item.id)
    setPendingBox(null)
    if (activePdf && item.pdfName !== activePdf.name) {
      const targetPdf = pdfLibrary.find((p) => p.name === item.pdfName)
      if (targetPdf) onSelectPdf(targetPdf.id)
    } else if (activePdf && item.page !== currentPage) {
      setCurrentPage(item.page)
      onPageChange(activePdf.id, item.page)
    }
  }

  const handleApplyPendingCrop = () => {
    const canvas = canvasRef.current
    if (!canvas || !pendingBox || !activePdf) return
    const sx = Math.round(pendingBox.x * canvas.width)
    const sy = Math.round(pendingBox.y * canvas.height)
    const sw = Math.max(1, Math.round(pendingBox.w * canvas.width))
    const sh = Math.max(1, Math.round(pendingBox.h * canvas.height))

    const out = document.createElement("canvas")
    out.width = sw
    out.height = sh
    const ctx = out.getContext("2d")
    if (!ctx) return
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, sw, sh)
    ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh)

    const dataUrl = out.toDataURL("image/png")

    if (recropTargetId) {
      setCroppedItems((prev) =>
        prev.map((entry) => {
          if (entry.id !== recropTargetId) return entry
          if (entry.mode === "image") {
            return {
              ...entry,
              fullImage: dataUrl,
              imageRawWidth: sw,
            }
          }
          return {
            ...entry,
            figureImage: dataUrl,
            figureWidth: sw,
          }
        }),
      )
      setEditingItemId(recropTargetId)
      setRecropTargetId(null)
      setPendingBox(null)
      return
    }

    const insideSamples = pageTextSamplesRef.current.filter(
      (s) =>
        s.x2 >= sx &&
        s.x1 <= sx + sw &&
        s.y2 >= sy &&
        s.y1 <= sy + sh,
    )
    const fontValues = insideSamples.map((s) => s.fontPx).sort((a, b) => a - b)
    const sourceFontPx =
      fontValues.length > 0
        ? fontValues[Math.floor(fontValues.length / 2)]
        : undefined

    const analyzed = analyzeQuestionCrop(
      canvas,
      sx,
      sy,
      sw,
      sh,
      insideSamples,
    )

    const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setCroppedItems((prev) => [
      ...prev,
      {
        id: newId,
        pdfName: activePdf.name,
        page: currentPage,
        fullImage: dataUrl,
        imageRawWidth: sw,
        sourceFontPx,
        mode: analyzed.mode,
        parsedType: analyzed.parsedType,
        lead: analyzed.lead,
        leadBold: analyzed.leadBold,
        leadColor: analyzed.leadColor,
        prompt: analyzed.prompt,
        promptBold: analyzed.promptBold,
        promptColor: analyzed.promptColor,
        options: analyzed.options,
        optionLayout: analyzed.optionLayout,
        figureImage: analyzed.figureImage,
        figureWidth: analyzed.figureWidth,
      },
    ])
    setEditingItemId(newId)
    setPendingBox(null)
  }

  const handleImportCropped = () => {
    if (croppedItems.length === 0) return
    const questions: DetectedPdfQuestion[] = croppedItems.map((item) => {
      if (item.mode === "split") {
        return {
          type: item.parsedType,
          lead: item.lead,
          leadBold: item.leadBold,
          leadColor: item.leadColor,
          prompt: item.prompt,
          promptBold: item.promptBold,
          promptColor: item.promptColor,
          points: 10,
          difficulty: "Orta",
          options: item.options ? [...item.options] : undefined,
          optionLayout: item.optionLayout,
          correctAnswer:
            item.parsedType === "multiple"
              ? "A"
              : item.parsedType === "trueFalse"
                ? "Doğru"
                : "",
          source: `${item.pdfName} · Sayfa ${item.page}`,
          image: item.figureImage,
          imageSize: item.figureImage ? "medium" : undefined,
          imageRawWidth: item.figureWidth,
          sourceFontPx: item.figureImage ? item.sourceFontPx : undefined,
          imageScale: item.figureImage ? 100 : undefined,
        }
      }
      return {
        type: "none",
        prompt: "",
        points: 10,
        difficulty: "Orta",
        correctAnswer: "",
        source: `${item.pdfName} · Sayfa ${item.page}`,
        image: item.fullImage,
        imageSize: "full",
        imageRawWidth: item.imageRawWidth,
        sourceFontPx: item.sourceFontPx,
        imageScale: 100,
      }
    })
    onImportCropped(questions)
  }

  const selectionBoxStyle = selection
    ? {
      left: `${Math.min(selection.startX, selection.endX)}px`,
      top: `${Math.min(selection.startY, selection.endY)}px`,
      width: `${Math.abs(selection.endX - selection.startX)}px`,
      height: `${Math.abs(selection.endY - selection.startY)}px`,
    }
    : undefined

  return (
    <div className="modal-backdrop">
      <section
        className={`pdf-modal ${step === "crop" ? "pdf-modal--wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-title"
      >
        <header className="modal-header">
          <div>
            <span className="modal-icon">
              <FolderOpen size={20} />
            </span>
            <div>
              <h2 id="pdf-title">PDF'den soru ekle</h2>
              <p>
                Birden fazla PDF yükle, soru alanını seç ve Uygula ile
                kırpılanlara ekle.
              </p>
            </div>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Pencereyi kapat"
            onClick={onClose}
            ref={closeRef}
          >
            <X size={19} />
          </button>
        </header>

        {step === "upload" && (
          <div className="upload-step">
            <label
              className="drop-zone"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                onFiles(event.dataTransfer.files)
              }}
            >
              <span className="upload-orbit">
                <UploadCloud size={27} />
              </span>
              <strong>PDF dosyalarını buraya bırak</strong>
              <p>Birden fazla PDF seçebilirsin; hepsi burada kayıtlı kalır</p>
              <span className="fake-file-button">PDF dosyası seç</span>
              <small>En fazla 25 MB / dosya · Yalnızca PDF</small>
              <input
                type="file"
                multiple
                accept=".pdf,application/pdf"
                onChange={(event) => {
                  onFiles(event.target.files)
                  event.target.value = ""
                }}
              />
            </label>
            <div className="pdf-upload-features">
              <span>Otomatik soru algılama</span>
              <span>Puntoya göre ölçekleme</span>
              <span>Çoklu PDF desteği</span>
            </div>
            {error && <p className="file-error">{error}</p>}
          </div>
        )}

        {step === "crop" && activePdf && (
          <>
            <div className="pdf-library-bar">
              <span className="pdf-library-label">
                Kayıtlı PDF'ler ({pdfLibrary.length})
              </span>
              <div className="pdf-library-list" role="tablist" aria-label="Kayıtlı PDF dosyaları">
                {pdfLibrary.map((entry) => {
                  const cropCount = croppedItems.filter(
                    (c) => c.pdfName === entry.name,
                  ).length
                  return (
                    <div
                      key={entry.id}
                      className={`pdf-library-chip ${entry.id === activePdf.id ? "active" : ""
                        }`}
                    >
                      <button
                        type="button"
                        className="pdf-library-select"
                        onClick={() => onSelectPdf(entry.id)}
                        title={entry.name}
                      >
                        <FileText size={13} />
                        <span>{entry.name}</span>
                        {cropCount > 0 && (
                          <b className="pdf-chip-count">{cropCount}</b>
                        )}
                      </button>
                      <button
                        type="button"
                        className="pdf-library-remove"
                        aria-label={`${entry.name} dosyasını kaldır`}
                        onClick={() => onRemovePdf(entry.id)}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )
                })}
              </div>
              <label className="pdf-add-file-btn">
                <Plus size={13} />
                <span>PDF ekle</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,application/pdf"
                  onChange={(event) => {
                    onFiles(event.target.files)
                    event.target.value = ""
                  }}
                />
              </label>
            </div>

            {error && (
              <p className="file-error" style={{ margin: "8px 20px 0" }}>
                {error}
              </p>
            )}

            <div className="pdf-crop-workspace">
              <div className="pdf-crop-canvas-pane">
                <div className="pdf-crop-toolbar">
                  <div className="pdf-toolbar-left">
                    <div className="pdf-page-nav">
                      <button
                        type="button"
                        disabled={currentPage <= 1 || pageLoading}
                        onClick={() => {
                          const next = Math.max(1, currentPage - 1)
                          setCurrentPage(next)
                          onPageChange(activePdf.id, next)
                        }}
                        aria-label="Önceki sayfa"
                      >
                        <ChevronLeft size={15} />
                      </button>
                      <span>
                        Sayfa {currentPage} / {cropPageCount || 1}
                      </span>
                      <button
                        type="button"
                        disabled={currentPage >= cropPageCount || pageLoading}
                        onClick={() => {
                          const next = Math.min(cropPageCount, currentPage + 1)
                          setCurrentPage(next)
                          onPageChange(activePdf.id, next)
                        }}
                        aria-label="Sonraki sayfa"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
                    <div className="pdf-zoom-nav">
                      <button
                        type="button"
                        disabled={zoom <= 0.75}
                        onClick={() =>
                          setZoom((z) => Math.max(0.75, Number((z - 0.25).toFixed(2))))
                        }
                        aria-label="Uzaklaştır"
                      >
                        <ZoomOut size={14} />
                      </button>
                      <button
                        type="button"
                        className="pdf-zoom-reset"
                        onClick={() => setZoom(1)}
                        title="Varsayılan yakınlaştırma"
                      >
                        %{Math.round(zoom * 100)}
                      </button>
                      <button
                        type="button"
                        disabled={zoom >= 1.75}
                        onClick={() =>
                          setZoom((z) => Math.min(1.75, Number((z + 0.25).toFixed(2))))
                        }
                        aria-label="Yakınlaştır"
                      >
                        <ZoomIn size={14} />
                      </button>
                    </div>
                  </div>
                  <span className={`pdf-crop-hint ${recropTargetId ? "is-recrop" : ""}`}>
                    <Crop size={13} />
                    {recropTargetId
                      ? "Yeni görsel alanını sürükleyip seç ve Uygula de"
                      : pendingBox
                        ? "Otomatik boyutlandırıldı · Uygula'ya bas"
                        : "Soru alanını fareyle sürükleyip seç"}
                  </span>
                  {recropTargetId && !pendingBox && (
                    <button
                      type="button"
                      className="pdf-cancel-btn"
                      onClick={() => setRecropTargetId(null)}
                    >
                      Yeniden seçimi iptal et
                    </button>
                  )}
                  <button
                    type="button"
                    className={`pdf-ai-pill ${removeWatermark ? "active" : ""}`}
                    onClick={() => setRemoveWatermark((v) => !v)}
                    title="PDF yüklenirken filigran katmanlarını otomatik kaldır"
                  >
                    <span>
                      Filigran temizle
                      {removeWatermark && watermarkDetected ? " ✓" : ""}
                    </span>
                  </button>
                  {pendingBox && (
                    <div className="pdf-crop-toolbar-actions">
                      <button
                        type="button"
                        className="pdf-apply-btn"
                        onClick={handleApplyPendingCrop}
                      >
                        <Check size={13} />
                        Uygula
                      </button>
                      <button
                        type="button"
                        className="pdf-cancel-btn"
                        onClick={() => setPendingBox(null)}
                      >
                        İptal
                      </button>
                    </div>
                  )}
                </div>

                <div className="pdf-crop-scroll">
                  {cropError ? (
                    <p className="file-error">{cropError}</p>
                  ) : (
                    <div
                      ref={stageRef}
                      className={`pdf-crop-stage ${pageLoading ? "is-loading" : ""}`}
                      style={{ width: `${zoom * 100}%` }}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                    >
                      <canvas ref={canvasRef} />
                      {selectionBoxStyle && (
                        <div
                          className="pdf-crop-selection"
                          style={selectionBoxStyle}
                        />
                      )}
                      {pendingBox && (
                        <div
                          className="pdf-pending-box"
                          style={{
                            left: `${pendingBox.x * 100}%`,
                            top: `${pendingBox.y * 100}%`,
                            width: `${pendingBox.w * 100}%`,
                            height: `${pendingBox.h * 100}%`,
                          }}
                          onPointerDown={(event) => event.stopPropagation()}
                        >
                          <span className="pdf-handle tl" />
                          <span className="pdf-handle tr" />
                          <span className="pdf-handle bl" />
                          <span className="pdf-handle br" />
                          <div
                            className={`pdf-pending-actions ${pendingBox.y + pendingBox.h > 0.88 ? "inside-top" : ""
                              }`}
                          >
                            <button
                              type="button"
                              className="pdf-apply-btn"
                              onClick={handleApplyPendingCrop}
                            >
                              <Check size={12} />
                              Uygula
                            </button>
                            <button
                              type="button"
                              className="pdf-cancel-btn"
                              onClick={() => setPendingBox(null)}
                              aria-label="Seçimi iptal et"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      )}
                      {pageLoading && (
                        <div className="pdf-crop-loading">
                          <LoaderCircle className="spinner" size={22} />
                          <span>Sayfa hazırlanıyor…</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <aside className="pdf-crop-sidebar">
                <div className="pdf-crop-sidebar-head">
                  <strong>
                    Kırpılan sorular{" "}
                    <span className="pdf-count-pill">{croppedItems.length}</span>
                  </strong>
                  {croppedItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCroppedItems([])}
                    >
                      Temizle
                    </button>
                  )}
                </div>
                {croppedItems.length === 0 ? (
                  <div className="pdf-crop-empty">
                    <span className="pdf-crop-empty-icon">
                      <Crop size={20} />
                    </span>
                    <strong>Henüz soru eklenmedi</strong>
                    <p>
                      Soldaki sayfada bir soruyu fareyle sürükleyip seçin,
                      ardından <b>Uygula</b> deyin; soru otomatik parçalara
                      ayrılır.
                    </p>
                  </div>
                ) : (
                  <div className="pdf-crop-list">
                    {croppedItems.map((item, idx) => (
                      <div className="pdf-crop-item" key={item.id}>
                        <div className="pdf-crop-item-head">
                          <span className="pdf-crop-item-title" title={`${item.pdfName} · Sayfa ${item.page}`}>
                            <b>#{idx + 1}</b>
                            <small>
                              S.{item.page} · {item.pdfName}
                            </small>
                          </span>
                          <div className="pdf-crop-item-actions">
                            {item.mode === "split" && (
                              <button
                                type="button"
                                className="pdf-mode-toggle-btn"
                                onClick={() =>
                                  setEditingItemId((cur) =>
                                    cur === item.id ? null : item.id,
                                  )
                                }
                              >
                                {editingItemId === item.id ? "Tamam" : "Kontrol et"}
                              </button>
                            )}
                            {(item.prompt || item.lead || item.options) && (
                              <button
                                type="button"
                                className="pdf-mode-toggle-btn"
                                onClick={() =>
                                  setCroppedItems((prev) =>
                                    prev.map((entry) =>
                                      entry.id === item.id
                                        ? {
                                          ...entry,
                                          mode:
                                            entry.mode === "split"
                                              ? "image"
                                              : "split",
                                        }
                                        : entry,
                                    ),
                                  )
                                }
                              >
                                {item.mode === "split"
                                  ? "Tek görsel"
                                  : "Parçalı"}
                              </button>
                            )}
                            <button
                              type="button"
                              aria-label={`Soru ${idx + 1} görselini kaldır`}
                              onClick={() =>
                                setCroppedItems((prev) =>
                                  prev.filter((entry) => entry.id !== item.id),
                                )
                              }
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        {item.mode === "split" ? (
                          editingItemId === item.id ? (
                            <div className="pdf-split-editor">
                              <label className="pdf-edit-field">
                                <span>Soru türü</span>
                                <select
                                  value={item.parsedType}
                                  onChange={(event) => {
                                    const nextType = event.target
                                      .value as QuestionKind
                                    setCroppedItems((prev) =>
                                      prev.map((entry) =>
                                        entry.id === item.id
                                          ? {
                                            ...entry,
                                            parsedType: nextType,
                                            options:
                                              nextType === "multiple"
                                                ? (entry.options ?? [
                                                  "A",
                                                  "B",
                                                  "C",
                                                  "D",
                                                ])
                                                : entry.options,
                                          }
                                          : entry,
                                      ),
                                    )
                                  }}
                                >
                                  <option value="multiple">Çoktan seçmeli</option>
                                  <option value="classic">Klasik</option>
                                  <option value="trueFalse">Doğru / yanlış</option>
                                  <option value="fillBlank">Boşluk doldurma</option>
                                  <option value="none">Belirtilmemiş</option>
                                </select>
                              </label>
                              <label className="pdf-edit-field">
                                <span>Üst metin / başlık (opsiyonel)</span>
                                <textarea
                                  rows={2}
                                  value={item.lead ?? ""}
                                  placeholder="Üst metin yoksa boş bırakın"
                                  onChange={(event) => {
                                    const val = event.target.value
                                    setCroppedItems((prev) =>
                                      prev.map((entry) =>
                                        entry.id === item.id
                                          ? {
                                            ...entry,
                                            lead: val || undefined,
                                          }
                                          : entry,
                                      ),
                                    )
                                  }}
                                />
                              </label>
                              {item.figureImage ? (
                                <div className="pdf-edit-figure">
                                  <div className="pdf-edit-figure-head">
                                    <span>Ayrıştırılan görsel</span>
                                    <div className="pdf-edit-figure-actions">
                                      <button
                                        type="button"
                                        className="pdf-recrop-btn"
                                        onClick={() => startRecropFigure(item)}
                                      >
                                        {recropTargetId === item.id
                                          ? "Sayfadan seçiliyor…"
                                          : "Görseli tekrar al"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setCroppedItems((prev) =>
                                            prev.map((entry) =>
                                              entry.id === item.id
                                                ? {
                                                  ...entry,
                                                  figureImage: undefined,
                                                  figureWidth: undefined,
                                                }
                                                : entry,
                                            ),
                                          )
                                        }
                                      >
                                        Kaldır
                                      </button>
                                    </div>
                                  </div>
                                  <div className="pdf-crop-thumb">
                                    <img
                                      src={item.figureImage}
                                      alt={`Soru ${idx + 1} şekli`}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="pdf-add-figure-btn"
                                  onClick={() => startRecropFigure(item)}
                                >
                                  <Plus size={12} />
                                  {recropTargetId === item.id
                                    ? "Sayfadan görsel alanını seçin…"
                                    : "PDF'den görsel seç"}
                                </button>
                              )}
                              <label className="pdf-edit-field">
                                <span>Soru metni</span>
                                <textarea
                                  rows={3}
                                  value={item.prompt}
                                  onChange={(event) => {
                                    const val = event.target.value
                                    setCroppedItems((prev) =>
                                      prev.map((entry) =>
                                        entry.id === item.id
                                          ? { ...entry, prompt: val }
                                          : entry,
                                      ),
                                    )
                                  }}
                                />
                              </label>
                              {item.parsedType === "multiple" &&
                                item.options && (
                                  <div className="pdf-edit-options">
                                    <span>Şıklar</span>
                                    {item.options.map((opt, optIdx) => (
                                      <div
                                        className="pdf-edit-opt-row"
                                        key={optIdx}
                                      >
                                        <b>
                                          {String.fromCharCode(65 + optIdx)})
                                        </b>
                                        <input
                                          type="text"
                                          value={opt}
                                          onChange={(event) => {
                                            const val = event.target.value
                                            setCroppedItems((prev) =>
                                              prev.map((entry) =>
                                                entry.id === item.id &&
                                                  entry.options
                                                  ? {
                                                    ...entry,
                                                    options:
                                                      entry.options.map(
                                                        (o, j) =>
                                                          j === optIdx
                                                            ? val
                                                            : o,
                                                      ),
                                                  }
                                                  : entry,
                                              ),
                                            )
                                          }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}
                            </div>
                          ) : (
                            <div className="pdf-split-preview">
                              {item.lead && (
                                <p
                                  className="pdf-split-lead"
                                  style={{
                                    fontWeight: 400,
                                    color: item.leadColor || undefined,
                                  }}
                                >
                                  <MathText text={item.lead} />
                                </p>
                              )}
                              {item.figureImage && (
                                <div className="pdf-crop-thumb">
                                  <img
                                    src={item.figureImage}
                                    alt={`Soru ${idx + 1} şekli`}
                                  />
                                </div>
                              )}
                              {item.prompt && (
                                <p
                                  className="pdf-split-prompt"
                                  style={{
                                    fontWeight: 700,
                                    color: item.promptColor || undefined,
                                  }}
                                >
                                  <MathText text={item.prompt} />
                                </p>
                              )}
                              {item.options && item.options.length > 0 && (
                                <div className="pdf-split-options">
                                  {item.options.map((opt, optIdx) => (
                                    <span key={optIdx}>
                                      <b>{String.fromCharCode(65 + optIdx)})</b>{" "}
                                      <MathText text={opt} />
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        ) : (
                          <div className="pdf-split-preview">
                            <div className="pdf-crop-thumb">
                              <img
                                src={item.fullImage}
                                alt={`Kırpılan soru ${idx + 1}`}
                              />
                            </div>
                            <button
                              type="button"
                              className="pdf-add-figure-btn"
                              onClick={() => startRecropFigure(item)}
                            >
                              <Crop size={12} />
                              {recropTargetId === item.id
                                ? "Sayfadan yeni alanı seçin…"
                                : "Görseli tekrar al"}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </aside>
            </div>

            <footer className="modal-footer">
              <span className="pdf-footer-status">
                {croppedItems.length > 0 && <i className="pdf-status-dot" />}
                {croppedItems.length} görsel soru sınava eklenmeye hazır
              </span>
              <div>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={onClose}
                >
                  Vazgeç
                </button>
                <button
                  className="button button-primary"
                  type="button"
                  disabled={croppedItems.length === 0}
                  onClick={handleImportCropped}
                >
                  <Plus size={17} />
                  Sınava ekle{croppedItems.length > 0 ? ` (${croppedItems.length})` : ""}
                </button>
              </div>
            </footer>
          </>
        )}
      </section>
    </div>
  )
}
