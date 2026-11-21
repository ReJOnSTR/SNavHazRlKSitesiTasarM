import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef,
  decodePDFRawStream,
} from "pdf-lib"

function latin1ToBytes(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length)
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i) & 0xff
  }
  return bytes
}

function isRotatedMatrix(
  a: number,
  b: number,
  c: number,
  d: number,
): boolean {
  const len1 = Math.hypot(a, b) || 1
  const len2 = Math.hypot(c, d) || 1
  return Math.abs(b) / len1 > 0.05 || Math.abs(c) / len2 > 0.05
}

function collectLowOpacityStates(
  resources: PDFDict | undefined,
  context: PDFDocument["context"],
): Set<string> {
  const lowAlphaNames = new Set<string>()
  if (!resources) return lowAlphaNames
  const extGState = resources.lookupMaybe(PDFName.of("ExtGState"), PDFDict)
  if (!extGState) return lowAlphaNames

  for (const [key, val] of extGState.entries()) {
    const stateDict =
      val instanceof PDFRef ? context.lookupMaybe(val, PDFDict) : val instanceof PDFDict ? val : undefined
    if (!stateDict) continue
    const ca = stateDict.lookupMaybe(PDFName.of("ca"), PDFNumber)?.asNumber()
    const CA = stateDict.lookupMaybe(PDFName.of("CA"), PDFNumber)?.asNumber()
    if ((ca !== undefined && ca < 0.45) || (CA !== undefined && CA < 0.45)) {
      lowAlphaNames.add(key.asString().replace(/^\//, ""))
    }
  }
  return lowAlphaNames
}

/**
 * Scan PDF content stream outside literal `(...)` and hex `<...>` strings
 * to find matching `openWord ... closeWord` blocks safely.
 */
function replacePdfBlocks(
  input: string,
  openWord: string,
  closeWord: string,
  onBlock: (full: string, inner: string) => string,
): string {
  const isWordChar = (ch: string) => /[A-Za-z0-9_.*+-]/.test(ch)
  const matchesAt = (pos: number, word: string) => {
    if (!input.startsWith(word, pos)) return false
    const before = pos > 0 ? input[pos - 1] : " "
    const after = pos + word.length < input.length ? input[pos + word.length] : " "
    return !isWordChar(before) && !isWordChar(after)
  }

  let out = ""
  let cursor = 0
  let i = 0
  const stack: number[] = []

  while (i < input.length) {
    const ch = input[i]
    if (ch === "(") {
      i += 1
      let depth = 1
      while (i < input.length && depth > 0) {
        if (input[i] === "\\") {
          i += 2
          continue
        }
        if (input[i] === "(") depth += 1
        else if (input[i] === ")") depth -= 1
        i += 1
      }
      continue
    }
    if (ch === "<" && input[i + 1] !== "<") {
      i += 1
      while (i < input.length && input[i] !== ">") i += 1
      i += 1
      continue
    }
    if (ch === "%") {
      while (i < input.length && input[i] !== "\n" && input[i] !== "\r") i += 1
      continue
    }

    if (matchesAt(i, openWord)) {
      stack.push(i)
      i += openWord.length
      continue
    }
    if (matchesAt(i, closeWord) && stack.length > 0) {
      const start = stack.pop()!
      const end = i + closeWord.length
      if (stack.length === 0) {
        out += input.slice(cursor, start)
        const full = input.slice(start, end)
        const inner = input.slice(start + openWord.length, i)
        out += onBlock(full, inner)
        cursor = end
      }
      i = end
      continue
    }
    i += 1
  }

  out += input.slice(cursor)
  return out
}

function stripWatermarkOperators(
  content: string,
  lowAlphaNames: Set<string>,
): { cleaned: string; removedCount: number } {
  let removedCount = 0
  let out = content

  // 1. Remove rotated BT ... ET text blocks ONLY when large-scale or low-opacity (preserves small rotated chart/axis labels)
  const tmRe =
    /(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+Tm\b/
  const tfRe = /\/\S+\s+(-?\d+(?:\.\d+)?)\s+Tf\b/
  const gsRe = /\/([A-Za-z0-9_.-]+)\s+gs\b/g

  out = replacePdfBlocks(out, "BT", "ET", (full) => {
    const m = full.match(tmRe)
    if (m) {
      const a = Number(m[1])
      const b = Number(m[2])
      const c = Number(m[3])
      const d = Number(m[4])
      if (isRotatedMatrix(a, b, c, d)) {
        const tmScale = Math.max(Math.hypot(a, b), Math.hypot(c, d))
        const tfMatch = full.match(tfRe)
        const tfSize = tfMatch ? Number(tfMatch[1]) : 1
        const effectiveSize = tmScale * tfSize
        let hasLowAlpha = false
        for (const gsMatch of full.matchAll(gsRe)) {
          if (lowAlphaNames.has(gsMatch[1])) {
            hasLowAlpha = true
            break
          }
        }
        if (effectiveSize >= 16 || hasLowAlpha) {
          removedCount += 1
          return ""
        }
      }
    }
    return full
  })

  // 2. Remove q ... Q blocks that use low-opacity ExtGState (< 0.45) OR rotated cm paired with text/XObject
  const cmRe =
    /(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+cm\b/g

  let prev = ""
  while (prev !== out) {
    prev = out
    out = replacePdfBlocks(out, "q", "Q", (full, inner) => {
      if (/\bq\b/.test(inner)) {
        // Recurse inside nested q ... Q blocks first so outer blocks aren't falsely stripped
        const innerCleaned = replacePdfBlocks(inner, "q", "Q", (nFull, nInner) => {
          for (const gsMatch of nInner.matchAll(gsRe)) {
            if (lowAlphaNames.has(gsMatch[1])) {
              removedCount += 1
              return ""
            }
          }
          if (/\b(?:Tj|TJ|Do)\b/.test(nInner)) {
            for (const cmMatch of nInner.matchAll(cmRe)) {
              const a = Number(cmMatch[1])
              const b = Number(cmMatch[2])
              const c = Number(cmMatch[3])
              const d = Number(cmMatch[4])
              if (isRotatedMatrix(a, b, c, d)) {
                removedCount += 1
                return ""
              }
            }
          }
          return nFull
        })
        if (innerCleaned !== inner) {
          return `q${innerCleaned}Q`
        }
      }

      for (const gsMatch of inner.matchAll(gsRe)) {
        if (lowAlphaNames.has(gsMatch[1])) {
          removedCount += 1
          return ""
        }
      }
      if (/\b(?:Tj|TJ|Do)\b/.test(inner)) {
        for (const cmMatch of inner.matchAll(cmRe)) {
          const a = Number(cmMatch[1])
          const b = Number(cmMatch[2])
          const c = Number(cmMatch[3])
          const d = Number(cmMatch[4])
          if (isRotatedMatrix(a, b, c, d)) {
            removedCount += 1
            return ""
          }
        }
      }
      return full
    })
  }

  return { cleaned: out, removedCount }
}

export async function stripPdfWatermarks(
  buffer: ArrayBuffer,
): Promise<{ data: Uint8Array; removed: boolean }> {
  const originalBytes = new Uint8Array(buffer)
  try {
    const pdfDoc = await PDFDocument.load(originalBytes, {
      ignoreEncryption: true,
    })
    const context = pdfDoc.context
    const pages = pdfDoc.getPages()
    let totalRemoved = 0

    // Track Form XObjects shared across 2+ pages
    const xObjectRefCounts = new Map<PDFRef, number>()
    if (pages.length >= 2) {
      for (const page of pages) {
        const res = page.node.Resources()
        const xObjDict = res?.lookupMaybe(PDFName.of("XObject"), PDFDict)
        if (!xObjDict) continue
        for (const [, val] of xObjDict.entries()) {
          if (val instanceof PDFRef) {
            xObjectRefCounts.set(val, (xObjectRefCounts.get(val) ?? 0) + 1)
          }
        }
      }
    }

    // Clean Form XObjects (especially those shared across pages or containing rotated/transparent watermarks)
    const processedRefs = new Set<PDFRef>()
    for (const page of pages) {
      // Remove Watermark annotations
      const annots = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray)
      if (annots) {
        for (let i = annots.size() - 1; i >= 0; i--) {
          const annot = annots.lookupMaybe(i, PDFDict)
          const subtype = annot?.lookupMaybe(PDFName.of("Subtype"), PDFName)
          if (subtype?.asString() === "/Watermark") {
            annots.remove(i)
            totalRemoved += 1
          }
        }
      }

      const pageRes = page.node.Resources()
      const pageLowAlpha = collectLowOpacityStates(pageRes, context)

      const xObjDict = pageRes?.lookupMaybe(PDFName.of("XObject"), PDFDict)
      if (xObjDict) {
        for (const [, val] of xObjDict.entries()) {
          if (!(val instanceof PDFRef) || processedRefs.has(val)) continue
          processedRefs.add(val)
          const xStream = context.lookup(val)
          if (!(xStream instanceof PDFRawStream)) continue
          const subtype = xStream.dict.lookupMaybe(PDFName.of("Subtype"), PDFName)
          if (subtype?.asString() !== "/Form") continue

          try {
            const decoded = decodePDFRawStream(xStream).decode()
            const text = new TextDecoder("latin1").decode(decoded)
            const xRes = xStream.dict.lookupMaybe(PDFName.of("Resources"), PDFDict)
            const xLowAlpha = new Set([
              ...pageLowAlpha,
              ...collectLowOpacityStates(xRes, context),
            ])
            const { cleaned, removedCount } = stripWatermarkOperators(
              text,
              xLowAlpha,
            )
            if (removedCount > 0) {
              totalRemoved += removedCount
              const encoded = latin1ToBytes(cleaned)
              const nextStream = context.flateStream(encoded, {
                Type: xStream.dict.get(PDFName.of("Type")),
                Subtype: PDFName.of("Form"),
                BBox: xStream.dict.get(PDFName.of("BBox")),
                Matrix: xStream.dict.get(PDFName.of("Matrix")),
                Resources: xStream.dict.get(PDFName.of("Resources")),
              })
              context.assign(val, nextStream)
            }
          } catch {
            // Skip unreadable XObject stream
          }
        }
      }

      // Clean page content streams
      const contents = page.node.get(PDFName.of("Contents"))
      if (!contents) continue
      const streamRefs: PDFRef[] = []
      const resolved = context.lookup(contents)
      if (contents instanceof PDFRef && resolved instanceof PDFRawStream) {
        streamRefs.push(contents)
      } else if (resolved instanceof PDFArray) {
        for (let i = 0; i < resolved.size(); i++) {
          const item = resolved.get(i)
          if (item instanceof PDFRef) streamRefs.push(item)
        }
      }

      for (const ref of streamRefs) {
        if (processedRefs.has(ref)) continue
        processedRefs.add(ref)
        const stream = context.lookup(ref)
        if (!(stream instanceof PDFRawStream)) continue
        try {
          const decoded = decodePDFRawStream(stream).decode()
          const text = new TextDecoder("latin1").decode(decoded)
          const { cleaned, removedCount } = stripWatermarkOperators(
            text,
            pageLowAlpha,
          )
          if (removedCount > 0) {
            totalRemoved += removedCount
            const nextStream = context.flateStream(
              latin1ToBytes(cleaned),
            )
            context.assign(ref, nextStream)
          }
        } catch {
          // Skip unreadable content stream
        }
      }
    }

    if (totalRemoved === 0) {
      return { data: originalBytes, removed: false }
    }

    const saved = await pdfDoc.save()
    return { data: saved, removed: true }
  } catch {
    return { data: originalBytes, removed: false }
  }
}
