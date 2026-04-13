export type BasicAnsiColorId =
  | 'black'
  | 'gray'
  | 'red'
  | 'brightRed'
  | 'yellow'
  | 'brightYellow'
  | 'green'
  | 'brightGreen'
  | 'cyan'
  | 'brightCyan'
  | 'blue'
  | 'brightBlue'
  | 'magenta'
  | 'brightMagenta'
  | 'white'
  | 'brightWhite'

export type AnsiColorId = BasicAnsiColorId | `xterm${number}`

export type AnsiColorOption = {
  id: AnsiColorId
  label: string
  ansiSequence: string
  cssColor: string
}

export type ColorSpan = {
  start: number
  end: number
  colorId: AnsiColorId
}

export type StyledSegment = {
  text: string
  ansiSequence: string | null
  cssColor: string | null
}

export const basicAnsiColorOptions: AnsiColorOption[] = [
  { id: 'black', label: 'black', ansiSequence: '\u001b[30m', cssColor: '#020617' },
  { id: 'gray', label: 'gray', ansiSequence: '\u001b[90m', cssColor: '#94a3b8' },
  { id: 'red', label: 'red', ansiSequence: '\u001b[31m', cssColor: '#ef4444' },
  { id: 'brightRed', label: 'bright red', ansiSequence: '\u001b[91m', cssColor: '#f87171' },
  { id: 'yellow', label: 'yellow', ansiSequence: '\u001b[33m', cssColor: '#eab308' },
  { id: 'brightYellow', label: 'bright yellow', ansiSequence: '\u001b[93m', cssColor: '#fde047' },
  { id: 'green', label: 'green', ansiSequence: '\u001b[32m', cssColor: '#22c55e' },
  { id: 'brightGreen', label: 'bright green', ansiSequence: '\u001b[92m', cssColor: '#4ade80' },
  { id: 'cyan', label: 'cyan', ansiSequence: '\u001b[36m', cssColor: '#06b6d4' },
  { id: 'brightCyan', label: 'bright cyan', ansiSequence: '\u001b[96m', cssColor: '#67e8f9' },
  { id: 'blue', label: 'blue', ansiSequence: '\u001b[34m', cssColor: '#3b82f6' },
  { id: 'brightBlue', label: 'bright blue', ansiSequence: '\u001b[94m', cssColor: '#60a5fa' },
  { id: 'magenta', label: 'magenta', ansiSequence: '\u001b[35m', cssColor: '#d946ef' },
  { id: 'brightMagenta', label: 'bright magenta', ansiSequence: '\u001b[95m', cssColor: '#e879f9' },
  { id: 'white', label: 'white', ansiSequence: '\u001b[37m', cssColor: '#e5e7eb' },
  { id: 'brightWhite', label: 'bright white', ansiSequence: '\u001b[97m', cssColor: '#f8fafc' },
]

function rgbToHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`
}

function getXtermRgb(index: number) {
  const systemPalette = [
    [0, 0, 0],
    [128, 0, 0],
    [0, 128, 0],
    [128, 128, 0],
    [0, 0, 128],
    [128, 0, 128],
    [0, 128, 128],
    [192, 192, 192],
    [128, 128, 128],
    [255, 0, 0],
    [0, 255, 0],
    [255, 255, 0],
    [0, 0, 255],
    [255, 0, 255],
    [0, 255, 255],
    [255, 255, 255],
  ]

  if (index < 16) {
    const [red, green, blue] = systemPalette[index] ?? systemPalette[0]
    return { red, green, blue }
  }

  if (index < 232) {
    const cubeIndex = index - 16
    const levels = [0, 95, 135, 175, 215, 255]
    const red = levels[Math.floor(cubeIndex / 36)] ?? 0
    const green = levels[Math.floor((cubeIndex % 36) / 6)] ?? 0
    const blue = levels[cubeIndex % 6] ?? 0
    return { red, green, blue }
  }

  const gray = 8 + (index - 232) * 10
  return { red: gray, green: gray, blue: gray }
}

function rgbToHsl(red: number, green: number, blue: number) {
  const r = red / 255
  const g = green / 255
  const b = blue / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 2

  if (max === min) {
    return { hue: -1, saturation: 0, lightness }
  }

  const difference = max - min
  const saturation = lightness > 0.5 ? difference / (2 - max - min) : difference / (max + min)
  let hue = 0

  switch (max) {
    case r:
      hue = (g - b) / difference + (g < b ? 6 : 0)
      break
    case g:
      hue = (b - r) / difference + 2
      break
    default:
      hue = (r - g) / difference + 4
      break
  }

  return { hue: hue * 60, saturation, lightness }
}

export const xtermAnsiColorOptions: AnsiColorOption[] = Array.from({ length: 256 }, (_, index) => {
  const { red, green, blue } = getXtermRgb(index)

  return {
    id: `xterm${index}` as AnsiColorId,
    label: `xterm ${index}`,
    ansiSequence: `\u001b[38;5;${index}m`,
    cssColor: rgbToHex(red, green, blue),
    red,
    green,
    blue,
  }
})
  .sort((left, right) => {
    const leftGray = left.red === left.green && left.green === left.blue
    const rightGray = right.red === right.green && right.green === right.blue

    if (leftGray !== rightGray) {
      return leftGray ? -1 : 1
    }

    const leftHsl = rgbToHsl(left.red, left.green, left.blue)
    const rightHsl = rgbToHsl(right.red, right.green, right.blue)

    if (leftGray && rightGray) {
      return leftHsl.lightness - rightHsl.lightness
    }

    if (leftHsl.hue !== rightHsl.hue) {
      return leftHsl.hue - rightHsl.hue
    }

    if (leftHsl.lightness !== rightHsl.lightness) {
      return leftHsl.lightness - rightHsl.lightness
    }

    return rightHsl.saturation - leftHsl.saturation
  })
  .map(({ red: _, green: __, blue: ___, ...option }) => option)

const ansiColorsById = new Map([...basicAnsiColorOptions, ...xtermAnsiColorOptions].map((color) => [color.id, color]))

function compareSpans(left: ColorSpan, right: ColorSpan) {
  if (left.start !== right.start) {
    return left.start - right.start
  }

  if (left.end !== right.end) {
    return left.end - right.end
  }

  return left.colorId.localeCompare(right.colorId)
}

export function normalizeColorSpans(spans: ColorSpan[]) {
  const normalized = spans
    .filter((span) => span.end > span.start)
    .map((span) => ({
      start: Math.max(0, span.start),
      end: Math.max(0, span.end),
      colorId: span.colorId,
    }))
    .sort(compareSpans)

  return normalized.reduce<ColorSpan[]>((merged, span) => {
    const previous = merged.at(-1)

    if (previous && previous.colorId === span.colorId && previous.end >= span.start) {
      previous.end = Math.max(previous.end, span.end)
      return merged
    }

    merged.push({ ...span })
    return merged
  }, [])
}

export function applyColorToRange(spans: ColorSpan[], start: number, end: number, colorId: AnsiColorId | null) {
  const rangeStart = Math.min(start, end)
  const rangeEnd = Math.max(start, end)

  if (rangeEnd <= rangeStart) {
    return normalizeColorSpans(spans)
  }

  const nextSpans = normalizeColorSpans(spans).flatMap((span) => {
    if (span.end <= rangeStart || span.start >= rangeEnd) {
      return [span]
    }

    const remaining: ColorSpan[] = []

    if (span.start < rangeStart) {
      remaining.push({ ...span, end: rangeStart })
    }

    if (span.end > rangeEnd) {
      remaining.push({ ...span, start: rangeEnd })
    }

    return remaining
  })

  if (colorId) {
    nextSpans.push({ start: rangeStart, end: rangeEnd, colorId })
  }

  return normalizeColorSpans(nextSpans)
}

export function shiftColorSpansForEdit(spans: ColorSpan[], start: number, end: number, insertedLength: number) {
  const rangeStart = Math.min(start, end)
  const rangeEnd = Math.max(start, end)
  const removedLength = rangeEnd - rangeStart
  const delta = insertedLength - removedLength

  const nextSpans = normalizeColorSpans(spans).flatMap((span) => {
    if (span.end <= rangeStart) {
      return [span]
    }

    if (span.start >= rangeEnd) {
      return [{ ...span, start: span.start + delta, end: span.end + delta }]
    }

    const remaining: ColorSpan[] = []

    if (span.start < rangeStart) {
      remaining.push({ ...span, end: rangeStart })
    }

    if (span.end > rangeEnd) {
      remaining.push({ ...span, start: rangeStart + insertedLength, end: span.end + delta })
    }

    return remaining
  })

  return normalizeColorSpans(nextSpans)
}

export function buildStyledSegments(text: string, spans: ColorSpan[], rangeStart = 0, rangeEnd = text.length): StyledSegment[] {
  const safeStart = Math.max(0, Math.min(rangeStart, text.length))
  const safeEnd = Math.max(safeStart, Math.min(rangeEnd, text.length))
  const visibleSpans = normalizeColorSpans(spans)
    .map((span) => ({ ...span, start: Math.max(span.start, safeStart), end: Math.min(span.end, safeEnd) }))
    .filter((span) => span.end > span.start)

  const segments: StyledSegment[] = []
  let cursor = safeStart

  for (const span of visibleSpans) {
    if (cursor < span.start) {
      segments.push({ text: text.slice(cursor, span.start), ansiSequence: null, cssColor: null })
    }

    const color = ansiColorsById.get(span.colorId)
    segments.push({
      text: text.slice(span.start, span.end),
      ansiSequence: color?.ansiSequence ?? null,
      cssColor: color?.cssColor ?? null,
    })
    cursor = span.end
  }

  if (cursor < safeEnd) {
    segments.push({ text: text.slice(cursor, safeEnd), ansiSequence: null, cssColor: null })
  }

  return segments.filter((segment) => segment.text !== '')
}

export function toAnsiString(text: string, spans: ColorSpan[], rangeStart = 0, rangeEnd = text.length) {
  return buildStyledSegments(text, spans, rangeStart, rangeEnd)
    .map((segment) => {
      if (segment.ansiSequence == null) {
        return segment.text
      }

      return `${segment.ansiSequence}${segment.text}\u001b[39m`
    })
    .join('')
}
