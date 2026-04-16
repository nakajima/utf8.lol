<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import {
    basicAnsiColorOptions,
    xtermAnsiColorOptions,
    applyColorToRange,
    buildStyledSegments,
    containsAnsiSgr,
    normalizeColorSpans,
    parseAnsiText,
    shiftColorSpansForEdit,
    toAnsiString,
    type AnsiColorId,
    type AnsiColorOption,
    type ColorSpan,
  } from './lib/ansiColors'
  import { cliSpinnerPresets, cliSpinnerSourceUrl, type CliSpinnerPreset } from './lib/cliSpinners'

  type BankCategoryId =
    | 'all'
    | 'ascii'
    | 'fragments'
    | 'blocks'
    | 'box'
    | 'circles'
    | 'triangles'
    | 'arrows'
    | 'braille'
    | 'custom'

  type PresetCategoryId = 'all' | 'ascii' | 'braille' | 'blocks' | 'box' | 'shapes' | 'arrows' | 'other'

  type BankCategory = {
    id: Exclude<BankCategoryId, 'all' | 'custom'>
    label: string
    items: string[]
  }

  type SpinnerPreset = CliSpinnerPreset & {
    category: Exclude<PresetCategoryId, 'all'>
  }

  type FrameRange = {
    text: string
    start: number
    end: number
  }

  type PendingTextEdit = {
    start: number
    end: number
    previousLength: number
  }

  type EditorLine = {
    text: string
    start: number
    end: number
  }

  type EditorSelectionPosition = {
    lineIndex: number
    column: number
  }

  type RectangularSelectionRow = {
    lineIndex: number
    start: number
    end: number
  }

  type RectangularSelection = {
    rows: RectangularSelectionRow[]
    columnStart: number
    columnEnd: number
    anchorLineIndex: number
    focusLineIndex: number
  }

  type RgbColor = {
    red: number
    green: number
    blue: number
  }

  type EditorMetrics = {
    charWidth: number
    lineHeight: number
  }

  type AnsiPaletteMode = '16' | '256'

  type ShareState = {
    version: 1
    framesText: string
    colorSpans: ColorSpan[]
    intervalMs: number
    ansiPaletteMode: AnsiPaletteMode
  }

  const fallbackEditorMetrics: EditorMetrics = {
    charWidth: 8,
    lineHeight: 22,
  }

  const bankCategories: BankCategory[] = [
    {
      id: 'ascii',
      label: 'ascii',
      items: [
        '|',
        '/',
        '-',
        '\\',
        '_',
        '=',
        '~',
        '`',
        "'",
        '.',
        ',',
        ':',
        ';',
        '!',
        '?',
        '·',
        '*',
        '+',
        'x',
        'X',
        'o',
        'O',
        '0',
        '#',
        '@',
        '%',
        '&',
        '<',
        '>',
        '(',
        ')',
        '[',
        ']',
        '{',
        '}',
        '^',
        'v',
        '°',
        'º',
        '´',
        '‾',
        '£',
        'β',
        'ρ',
        '≡',
      ],
    },
    {
      id: 'fragments',
      label: 'fragments',
      items: ['[]', '()', '<>', '{}', '..', '...', '....', '--', '==', '=>', '<=', '<=>', '/\\', '\\/'],
    },
    {
      id: 'blocks',
      label: 'blocks',
      items: [
        '▁',
        '▂',
        '▃',
        '▄',
        '▅',
        '▆',
        '▇',
        '█',
        '▉',
        '▊',
        '▋',
        '▌',
        '▍',
        '▎',
        '▏',
        '░',
        '▒',
        '▓',
        '▖',
        '▘',
        '▝',
        '▗',
        '□',
        '■',
        '▣',
        '▫',
        '▪',
        '▮',
        '▯',
      ],
    },
    {
      id: 'box',
      label: 'box drawing',
      items: [
        '─',
        '│',
        '┄',
        '┆',
        '┈',
        '┊',
        '╱',
        '╲',
        '╳',
        '┌',
        '┐',
        '└',
        '┘',
        '├',
        '┤',
        '┬',
        '┴',
        '┼',
        '╭',
        '╮',
        '╯',
        '╰',
        '╫',
        '╪',
        '⌈',
        '⌉',
        '⌊',
        '⌋',
      ],
    },
    {
      id: 'circles',
      label: 'shapes',
      items: [
        '•',
        '◦',
        '∙',
        '○',
        '◉',
        '◎',
        '●',
        '◌',
        '◍',
        '◐',
        '◓',
        '◑',
        '◒',
        '◴',
        '◷',
        '◶',
        '◵',
        '◔',
        '◕',
        '⊙',
        '⊶',
        '⊷',
        '◜',
        '◝',
        '◞',
        '◟',
        '◠',
        '◡',
        '◰',
        '◱',
        '◲',
        '◳',
        '✶',
        '✷',
        '✸',
        '✹',
        '✺',
        '⦾',
        '⦿',
        '⧆',
        '⧇',
        '㊀',
        '㊁',
        '㊂',
        '☱',
        '☲',
        '☴',
        '☗',
        '☖',
      ],
    },
    {
      id: 'triangles',
      label: 'triangles',
      items: ['△', '▲', '▷', '▶', '▽', '▼', '◁', '◀', '◇', '◆', '◈', '◊', '◢', '◣', '◤', '◥', '▹', '▸'],
    },
    {
      id: 'arrows',
      label: 'arrows',
      items: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙', '↔', '↕', '↺', '↻'],
    },
    {
      id: 'braille',
      label: 'braille',
      items: [
        '⠁',
        '⠂',
        '⠄',
        '⡀',
        '⢀',
        '⠠',
        '⠐',
        '⠈',
        '⠋',
        '⠙',
        '⠚',
        '⠞',
        '⠖',
        '⠒',
        '⠹',
        '⠸',
        '⠼',
        '⠴',
        '⠦',
        '⠧',
        '⠇',
        '⠏',
        '⣀',
        '⣄',
        '⣤',
        '⣦',
        '⣶',
        '⣷',
        '⣿',
        '⣾',
        '⣽',
        '⣻',
        '⢿',
        '⡿',
        '⣟',
        '⣯',
      ],
    },
  ]

  const builtInCharacters = [...new Set(bankCategories.flatMap(({ items }) => items))]
  const starterPreset = cliSpinnerPresets.find(({ name }) => name === 'simpleDotsScrolling') ?? cliSpinnerPresets[0]

  const presetFilters: Array<{ id: PresetCategoryId; label: string }> = [
    { id: 'all', label: 'all' },
    { id: 'ascii', label: 'ascii' },
    { id: 'braille', label: 'braille' },
    { id: 'blocks', label: 'blocks' },
    { id: 'box', label: 'box drawing' },
    { id: 'shapes', label: 'shapes' },
    { id: 'arrows', label: 'arrows' },
    { id: 'other', label: 'other' },
  ]

  function parseFrameRanges(value: string) {
    const ranges: FrameRange[] = []
    let offset = 0

    for (const rawLine of value.split('\n')) {
      const line = rawLine.replace(/\r$/, '')

      if (line !== '') {
        ranges.push({
          text: line,
          start: offset,
          end: offset + line.length,
        })
      }

      offset += rawLine.length + 1
    }

    return ranges
  }

  function parseEditorLines(value: string) {
    const lines: EditorLine[] = []
    let offset = 0

    for (const rawLine of value.split('\n')) {
      const line = rawLine.replace(/\r$/, '')
      lines.push({
        text: line,
        start: offset,
        end: offset + line.length,
      })
      offset += rawLine.length + 1
    }

    return lines
  }

  function getSelectionPositionAtOffset(lines: EditorLine[], offset: number, textLength: number): EditorSelectionPosition {
    const safeOffset = Math.max(0, Math.min(offset, textLength))

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]

      if (safeOffset <= line.end || index === lines.length - 1) {
        return {
          lineIndex: index,
          column: Math.max(0, Math.min(safeOffset - line.start, line.text.length)),
        }
      }
    }

    const fallback = lines.at(-1) ?? { text: '', start: 0, end: 0 }
    return { lineIndex: Math.max(0, lines.length - 1), column: fallback.text.length }
  }

  function getOffsetAtSelectionPosition(lines: EditorLine[], position: EditorSelectionPosition) {
    const safeLineIndex = Math.max(0, Math.min(position.lineIndex, lines.length - 1))
    const line = lines[safeLineIndex] ?? { text: '', start: 0, end: 0 }
    return line.start + Math.max(0, Math.min(position.column, line.text.length))
  }

  function buildRectangularSelection(
    lines: EditorLine[],
    startPosition: EditorSelectionPosition,
    endPosition: EditorSelectionPosition,
  ) {
    const firstLineIndex = Math.min(startPosition.lineIndex, endPosition.lineIndex)
    const lastLineIndex = Math.max(startPosition.lineIndex, endPosition.lineIndex)
    const columnStart = Math.min(startPosition.column, endPosition.column)
    const columnEnd = Math.max(startPosition.column, endPosition.column)

    if (columnEnd <= columnStart) {
      return null
    }

    const rows: RectangularSelectionRow[] = []

    for (let lineIndex = firstLineIndex; lineIndex <= lastLineIndex; lineIndex += 1) {
      const line = lines[lineIndex] ?? { text: '', start: 0, end: 0 }
      const startOffset = line.start + Math.min(columnStart, line.text.length)
      const endOffset = line.start + Math.min(columnEnd, line.text.length)
      rows.push({ lineIndex, start: startOffset, end: endOffset })
    }

    return {
      rows,
      columnStart,
      columnEnd,
      anchorLineIndex: startPosition.lineIndex,
      focusLineIndex: endPosition.lineIndex,
    }
  }

  function getRectangularSelection(value: string, start: number, end: number) {
    if (start === end) {
      return null
    }

    const lines = parseEditorLines(value)
    return buildRectangularSelection(
      lines,
      getSelectionPositionAtOffset(lines, start, value.length),
      getSelectionPositionAtOffset(lines, end, value.length),
    )
  }

  function parseHexColor(value: string): RgbColor {
    const normalized = value.startsWith('#') ? value.slice(1) : value

    if (normalized.length !== 6) {
      return { red: 255, green: 255, blue: 255 }
    }

    return {
      red: Number.parseInt(normalized.slice(0, 2), 16),
      green: Number.parseInt(normalized.slice(2, 4), 16),
      blue: Number.parseInt(normalized.slice(4, 6), 16),
    }
  }

  function interpolateRgbColor(start: RgbColor, end: RgbColor, factor: number): RgbColor {
    return {
      red: Math.round(start.red + (end.red - start.red) * factor),
      green: Math.round(start.green + (end.green - start.green) * factor),
      blue: Math.round(start.blue + (end.blue - start.blue) * factor),
    }
  }

  function getClosestPaletteColorId(target: RgbColor, palette: AnsiColorOption[]) {
    const fallback = palette[0] ?? basicAnsiColorOptions[0]
    let closestColorId = fallback.id
    let closestDistance = Number.POSITIVE_INFINITY

    for (const option of palette) {
      const candidate = parseHexColor(option.cssColor)
      const distance =
        (candidate.red - target.red) ** 2 +
        (candidate.green - target.green) ** 2 +
        (candidate.blue - target.blue) ** 2

      if (distance < closestDistance) {
        closestColorId = option.id
        closestDistance = distance
      }
    }

    return closestColorId
  }

  function unique(values: string[]) {
    return [...new Set(values)]
  }

  function isAsciiOnly(value: string) {
    for (const character of value) {
      if ((character.codePointAt(0) ?? 0) > 0x7f) {
        return false
      }
    }

    return true
  }

  function matchesAny(frames: string[], pattern: RegExp) {
    return frames.some((frame) => pattern.test(frame))
  }

  function categorizePreset(preset: CliSpinnerPreset): Exclude<PresetCategoryId, 'all'> {
    const { name, frames } = preset
    const joined = frames.join('')

    if (matchesAny(frames, /[\u2800-\u28ff]/u)) {
      return 'braille'
    }

    if (isAsciiOnly(joined)) {
      return 'ascii'
    }

    if (name.startsWith('arrow') || matchesAny(frames, /[←-⇿▹▸]/u)) {
      return 'arrows'
    }

    if (matchesAny(frames, /[\u2500-\u257f⌈⌉⌊⌋]/u)) {
      return 'box'
    }

    if (matchesAny(frames, /[▁-█░▒▓▖▘▝▗]/u)) {
      return 'blocks'
    }

    if (matchesAny(frames, /[•◦∙○◉◎●◌◍◐◓◑◒◔◕◜◝◞◟◠◡◰◱◲◳◴◷◶◵△▲▷▶▽▼◁◀◇◆◈◊◢◣◤◥⊙⊶⊷✶✷✸✹✺⦾⦿⧆⧇☱☲☴☗☖㊀㊁㊂▫▪□■▮▯]/u)) {
      return 'shapes'
    }

    return 'other'
  }

  const presetSpinners: SpinnerPreset[] = cliSpinnerPresets.map((preset) => ({
    ...preset,
    category: categorizePreset(preset),
  }))

  const starterFrames = starterPreset.frames

  let framesText = starterFrames.join('\n')
  let frameRanges: FrameRange[] = parseFrameRanges(framesText)
  let editorLines: EditorLine[] = parseEditorLines(framesText)
  let frames: string[] = starterFrames
  let frameSignature = starterFrames.join('\n')
  let colorSpans: ColorSpan[] = []
  let editorSegments = buildStyledSegments(framesText, colorSpans)
  let activeFrameSegments = buildStyledSegments('', colorSpans)
  let rawAnsiFrames: string[] = []
  let selectedTextStart = 0
  let selectedTextEnd = 0
  let selectedText = ''
  let selectionHasColorableText = false
  let rectangularSelection: RectangularSelection | null = null
  let rectangularSelectionCharacterCount = 0
  let rectangularSelectionColumnCount = 0
  let rectangularSelectionColorableRowCount = 0
  let rectangularSelectionHasColorableText = false
  let showSelectionTools = false
  let canApplyFrameGradient = false
  let gradientPickTarget: null = null
  let selectedColorHex = '#06b6d4'
  let gradientStartColorHex = '#06b6d4'
  let gradientEndColorHex = '#e879f9'
  let ansiPaletteMode: AnsiPaletteMode = '256'
  let visibleAnsiColorOptions: AnsiColorOption[] = basicAnsiColorOptions
  let customCharacters: string[] = []
  let selectedBankCategory: BankCategoryId = 'all'
  let selectedPresetCategory: PresetCategoryId = 'all'
  let bankFilters: Array<{ id: BankCategoryId; label: string }> = []
  let palette: string[] = builtInCharacters
  let visiblePresets: SpinnerPreset[] = presetSpinners
  let customCharacter = ''
  let intervalMs = starterPreset.interval
  let safeInterval = starterPreset.interval
  let previewIndex = 0
  let activeFrame = starterFrames[0] ?? ''
  let wantsToPlay = true
  let timer: ReturnType<typeof setInterval> | null = null
  let presetClock = 0
  let presetTimer: ReturnType<typeof setInterval> | null = null
  let framesTextarea: HTMLTextAreaElement | null = null
  let framesOverlay: HTMLDivElement | null = null
  let framesSelectionOverlay: HTMLDivElement | null = null
  let pendingTextEdit: PendingTextEdit | null = null
  let customRectangularSelection: RectangularSelection | null = null
  let rectangularSelectionDragAnchor: EditorSelectionPosition | null = null
  let editorMetrics: EditorMetrics = fallbackEditorMetrics
  let editorLongestLineLength = Math.max(...starterFrames.map((frame) => frame.length), 0)
  let editorContentWidth = Math.max(1, editorLongestLineLength) * fallbackEditorMetrics.charWidth
  let editorContentHeight = Math.max(1, starterFrames.length) * fallbackEditorMetrics.lineHeight
  let copyStatus = ''
  let copyTimer: ReturnType<typeof setTimeout> | null = null
  let hasLoadedUrlState = false
  let shareStateHash = ''

  function setFrames(nextFrames: string[]) {
    clearCopyTimer()
    framesText = nextFrames.join('\n')
    colorSpans = []
    selectedTextStart = 0
    selectedTextEnd = 0
    customRectangularSelection = null
    copyStatus = ''

    queueMicrotask(() => {
      if (framesTextarea) {
        framesTextarea.setSelectionRange(0, 0)
      }

      measureEditorMetrics()
      syncEditorScroll()
      updateTextSelection()
    })
  }

  function syncEditorScroll() {
    if (!framesTextarea || !framesOverlay) {
      return
    }

    framesOverlay.scrollTop = framesTextarea.scrollTop
    framesOverlay.scrollLeft = framesTextarea.scrollLeft

    if (framesSelectionOverlay) {
      framesSelectionOverlay.scrollTop = framesTextarea.scrollTop
      framesSelectionOverlay.scrollLeft = framesTextarea.scrollLeft
    }
  }

  function updateTextSelection() {
    if (!framesTextarea) {
      return
    }

    selectedTextStart = framesTextarea.selectionStart
    selectedTextEnd = framesTextarea.selectionEnd
  }

  function measureEditorMetrics() {
    if (!framesTextarea) {
      return
    }

    const styles = window.getComputedStyle(framesTextarea)
    const probe = document.createElement('span')
    probe.textContent = '0'
    probe.style.position = 'absolute'
    probe.style.visibility = 'hidden'
    probe.style.whiteSpace = 'pre'
    probe.style.font = styles.font
    probe.style.letterSpacing = styles.letterSpacing
    probe.style.lineHeight = styles.lineHeight
    document.body.append(probe)

    const probeRect = probe.getBoundingClientRect()
    probe.remove()

    editorMetrics = {
      charWidth: probeRect.width || fallbackEditorMetrics.charWidth,
      lineHeight: Number.parseFloat(styles.lineHeight) || probeRect.height || fallbackEditorMetrics.lineHeight,
    }
  }

  function getPointerSelectionPosition(event: MouseEvent): EditorSelectionPosition | null {
    if (!framesTextarea) {
      return null
    }

    const styles = window.getComputedStyle(framesTextarea)
    const textareaRect = framesTextarea.getBoundingClientRect()
    const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0
    const paddingTop = Number.parseFloat(styles.paddingTop) || 0
    const column = Math.max(
      0,
      Math.round((event.clientX - textareaRect.left + framesTextarea.scrollLeft - paddingLeft) / Math.max(editorMetrics.charWidth, 1)),
    )
    const lineIndex = Math.max(
      0,
      Math.min(
        Math.floor((event.clientY - textareaRect.top + framesTextarea.scrollTop - paddingTop) / Math.max(editorMetrics.lineHeight, 1)),
        Math.max(editorLines.length - 1, 0),
      ),
    )

    return { lineIndex, column }
  }

  function stopRectangularSelectionDrag() {
    rectangularSelectionDragAnchor = null
    window.removeEventListener('mousemove', handleRectangularSelectionDrag)
    window.removeEventListener('mouseup', stopRectangularSelectionDrag)
  }

  function handleRectangularSelectionDrag(event: MouseEvent) {
    if (!rectangularSelectionDragAnchor) {
      return
    }

    event.preventDefault()
    const currentPosition = getPointerSelectionPosition(event)

    if (!currentPosition) {
      return
    }

    customRectangularSelection = buildRectangularSelection(editorLines, rectangularSelectionDragAnchor, currentPosition)
  }

  function handleFramesMouseDown(event: MouseEvent) {
    if (!event.altKey || event.button !== 0) {
      stopRectangularSelectionDrag()
      customRectangularSelection = null
      return
    }

    if (!framesTextarea) {
      return
    }

    event.preventDefault()
    stopRectangularSelectionDrag()
    measureEditorMetrics()

    const anchorPosition = getPointerSelectionPosition(event)

    if (!anchorPosition) {
      return
    }

    rectangularSelectionDragAnchor = anchorPosition
    customRectangularSelection = null

    const anchorOffset = getOffsetAtSelectionPosition(editorLines, anchorPosition)
    selectedTextStart = anchorOffset
    selectedTextEnd = anchorOffset
    framesTextarea.focus()
    framesTextarea.setSelectionRange(anchorOffset, anchorOffset)

    window.addEventListener('mousemove', handleRectangularSelectionDrag)
    window.addEventListener('mouseup', stopRectangularSelectionDrag)
  }

  function rememberPendingTextEdit() {
    if (!framesTextarea) {
      return
    }

    customRectangularSelection = null
    pendingTextEdit = {
      start: framesTextarea.selectionStart,
      end: framesTextarea.selectionEnd,
      previousLength: framesText.length,
    }
  }

  function handleFramesInput(event: Event) {
    const nextValue = (event.currentTarget as HTMLTextAreaElement).value

    if (pendingTextEdit) {
      const { start, end, previousLength } = pendingTextEdit
      const insertedLength = nextValue.length - (previousLength - (end - start))
      colorSpans = shiftColorSpansForEdit(colorSpans, start, end, insertedLength)
      pendingTextEdit = null
    }

    framesText = nextValue
    updateTextSelection()
    syncEditorScroll()
  }

  function handleFramesPaste(event: ClipboardEvent) {
    if (!framesTextarea) {
      return
    }

    const pastedText = event.clipboardData?.getData('text/plain') ?? ''

    if (!pastedText || !containsAnsiSgr(pastedText)) {
      return
    }

    event.preventDefault()
    stopRectangularSelectionDrag()
    customRectangularSelection = null
    pendingTextEdit = null

    const selectionStart = framesTextarea.selectionStart
    const selectionEnd = framesTextarea.selectionEnd
    const pastedContent = parseAnsiText(pastedText)
    const insertedText = pastedContent.text
    const nextText = `${framesText.slice(0, selectionStart)}${insertedText}${framesText.slice(selectionEnd)}`
    const shiftedExistingSpans = shiftColorSpansForEdit(colorSpans, selectionStart, selectionEnd, insertedText.length)
    const shiftedPastedSpans = pastedContent.spans.map((span) => ({
      ...span,
      start: span.start + selectionStart,
      end: span.end + selectionStart,
    }))

    framesText = nextText
    colorSpans = normalizeColorSpans([...shiftedExistingSpans, ...shiftedPastedSpans])
    selectedTextStart = selectionStart + insertedText.length
    selectedTextEnd = selectionStart + insertedText.length

    queueMicrotask(() => {
      if (framesTextarea) {
        framesTextarea.focus()
        framesTextarea.setSelectionRange(selectedTextStart, selectedTextEnd)
      }

      measureEditorMetrics()
      syncEditorScroll()
      updateTextSelection()
    })
  }

  function reselectText() {
    if (!framesTextarea) {
      return
    }

    framesTextarea.focus()
    framesTextarea.setSelectionRange(selectedTextStart, selectedTextEnd)
  }

  function applyColorToSelection(colorId: AnsiColorId | null) {
    if (customRectangularSelection) {
      if (!rectangularSelectionHasColorableText) {
        return
      }

      let nextSpans = colorSpans
      customRectangularSelection.rows.forEach((row) => {
        if (row.end > row.start) {
          nextSpans = applyColorToRange(nextSpans, row.start, row.end, colorId)
        }
      })
      colorSpans = nextSpans
      reselectText()
      return
    }

    if (!selectionHasColorableText) {
      return
    }

    colorSpans = applyColorToRange(colorSpans, selectedTextStart, selectedTextEnd, colorId)
    reselectText()
  }

  function applyPickedColorToSelection() {
    const palette = visibleAnsiColorOptions.length > 0 ? visibleAnsiColorOptions : basicAnsiColorOptions
    const colorId = getClosestPaletteColorId(parseHexColor(selectedColorHex), palette)
    applyColorToSelection(colorId)
  }

  function applyFrameGradientToSelection() {
    if (!rectangularSelection || !canApplyFrameGradient) {
      return
    }

    const startColor = parseHexColor(gradientStartColorHex)
    const endColor = parseHexColor(gradientEndColorHex)
    const palette = visibleAnsiColorOptions.length > 0 ? visibleAnsiColorOptions : basicAnsiColorOptions
    const colorableRows = rectangularSelection.rows.filter(
      (row) => row.end > row.start && /\S/u.test(framesText.slice(row.start, row.end)),
    )
    const orderedRows =
      rectangularSelection.anchorLineIndex <= rectangularSelection.focusLineIndex
        ? colorableRows
        : [...colorableRows].reverse()
    const rowCount = orderedRows.length
    let nextSpans = colorSpans

    orderedRows.forEach((row, rowIndex) => {
      const factor = rowCount === 1 ? 0 : rowIndex / (rowCount - 1)
      const interpolatedColor = interpolateRgbColor(startColor, endColor, factor)
      const colorId = getClosestPaletteColorId(interpolatedColor, palette)
      nextSpans = applyColorToRange(nextSpans, row.start, row.end, colorId)
    })

    colorSpans = nextSpans
    reselectText()
  }

  function encodeShareState(state: ShareState) {
    const bytes = new TextEncoder().encode(JSON.stringify(state))
    let binary = ''

    for (let index = 0; index < bytes.length; index += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
    }

    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '')
  }

  function decodeShareState(value: string): ShareState | null {
    try {
      const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
      const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
      const binary = atob(padded)
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
      const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Partial<ShareState>

      if (parsed.version !== 1 || typeof parsed.framesText !== 'string' || !Array.isArray(parsed.colorSpans)) {
        return null
      }

      return {
        version: 1,
        framesText: parsed.framesText,
        colorSpans: normalizeColorSpans(
          parsed.colorSpans.filter(
            (span): span is ColorSpan =>
              typeof span?.start === 'number' && typeof span?.end === 'number' && typeof span?.colorId === 'string',
          ),
        ),
        intervalMs:
          typeof parsed.intervalMs === 'number' && Number.isFinite(parsed.intervalMs)
            ? Math.max(10, parsed.intervalMs)
            : starterPreset.interval,
        ansiPaletteMode: parsed.ansiPaletteMode === '16' ? '16' : '256',
      }
    } catch {
      return null
    }
  }

  function applyShareState(state: ShareState) {
    framesText = state.framesText
    colorSpans = normalizeColorSpans(state.colorSpans)
    intervalMs = state.intervalMs
    ansiPaletteMode = state.ansiPaletteMode
    selectedTextStart = 0
    selectedTextEnd = 0
    customRectangularSelection = null

    queueMicrotask(() => {
      if (framesTextarea) {
        framesTextarea.setSelectionRange(0, 0)
      }

      measureEditorMetrics()
      syncEditorScroll()
      updateTextSelection()
    })
  }

  function getPaletteForCategory(categoryId: BankCategoryId) {
    if (categoryId === 'all') {
      return unique([...builtInCharacters, ...customCharacters])
    }

    if (categoryId === 'custom') {
      return customCharacters
    }

    return bankCategories.find((category) => category.id === categoryId)?.items ?? []
  }

  function toggleCharacter(character: string) {
    if (frames.includes(character)) {
      setFrames(frames.filter((frame) => frame !== character))
      return
    }

    setFrames([...frames, character])
  }

  function addCustomCharacter() {
    const value = customCharacter.trim()

    if (!value) {
      return
    }

    if (!builtInCharacters.includes(value) && !customCharacters.includes(value)) {
      customCharacters = [...customCharacters, value]
    }

    if (!frames.includes(value)) {
      setFrames([...frames, value])
    }

    customCharacter = ''
    selectedBankCategory = builtInCharacters.includes(value) ? selectedBankCategory : 'custom'
  }

  function handleCustomSubmit(event: Event) {
    event.preventDefault()
    addCustomCharacter()
  }

  function loadPreset(preset: CliSpinnerPreset) {
    previewIndex = 0
    intervalMs = preset.interval
    setFrames(preset.frames)
  }

  function loadStarterFrames() {
    loadPreset(starterPreset)
  }

  function clearFrames() {
    setFrames([])
  }

  function clearTimer() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  function clearPresetTimer() {
    if (presetTimer) {
      clearInterval(presetTimer)
      presetTimer = null
    }
  }

  function clearCopyTimer() {
    if (copyTimer) {
      clearTimeout(copyTimer)
      copyTimer = null
    }
  }

  function fallbackCopyText(value: string) {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.setAttribute('readonly', 'true')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    textarea.style.pointerEvents = 'none'
    document.body.append(textarea)
    textarea.select()
    textarea.setSelectionRange(0, textarea.value.length)

    try {
      return document.execCommand('copy')
    } finally {
      textarea.remove()
    }
  }

  async function copyTextToClipboard(value: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
        return true
      }
    } catch {
      // fall through to execCommand fallback
    }

    return fallbackCopyText(value)
  }

  function setCopyStatus(value: string) {
    clearCopyTimer()
    copyStatus = value
    copyTimer = setTimeout(() => {
      copyStatus = ''
    }, 2000)
  }

  async function copyAnsiFrames() {
    if (rawAnsiFrames.length === 0) {
      setCopyStatus('no frames to copy')
      return
    }

    const didCopy = await copyTextToClipboard(rawAnsiFrames.join('\n'))
    setCopyStatus(didCopy ? 'copied ansi frames' : 'clipboard write failed')
  }

  function getPresetFrame(preset: CliSpinnerPreset, clock: number) {
    if (preset.frames.length === 0) {
      return ''
    }

    return preset.frames[Math.floor(clock / Math.max(10, preset.interval)) % preset.frames.length]
  }

  onMount(() => {
    const handleWindowResize = () => {
      measureEditorMetrics()
    }

    const shareHash = new URLSearchParams(window.location.hash.slice(1)).get('s')
    const sharedState = shareHash ? decodeShareState(shareHash) : null

    if (sharedState) {
      applyShareState(sharedState)
    }

    hasLoadedUrlState = true
    presetClock = Date.now()
    presetTimer = setInterval(() => {
      presetClock = Date.now()
    }, 40)

    queueMicrotask(() => {
      measureEditorMetrics()
      syncEditorScroll()
      updateTextSelection()
    })

    window.addEventListener('resize', handleWindowResize)

    return () => {
      window.removeEventListener('resize', handleWindowResize)
      clearPresetTimer()
      stopRectangularSelectionDrag()
    }
  })

  function togglePlay() {
    wantsToPlay = !wantsToPlay
  }

  $: frameRanges = parseFrameRanges(framesText)
  $: editorLines = parseEditorLines(framesText)
  $: editorLongestLineLength = editorLines.reduce((longest, line) => Math.max(longest, line.text.length), 0)
  $: editorContentWidth = Math.max(1, editorLongestLineLength, customRectangularSelection?.columnEnd ?? 0) * editorMetrics.charWidth
  $: editorContentHeight = Math.max(1, editorLines.length) * editorMetrics.lineHeight
  $: frames = frameRanges.map(({ text }) => text)
  $: frameSignature = frames.join('\n')
  $: editorSegments = buildStyledSegments(framesText, colorSpans)
  $: rawAnsiFrames = frameRanges.map(({ start, end }) => toAnsiString(framesText, colorSpans, start, end))
  $: selectedText = framesText.slice(selectedTextStart, selectedTextEnd)
  $: selectionHasColorableText = /\S/u.test(selectedText)
  $: rectangularSelection = customRectangularSelection ?? getRectangularSelection(framesText, selectedTextStart, selectedTextEnd)
  $: rectangularSelectionCharacterCount =
    rectangularSelection?.rows.reduce((total, row) => total + (row.end - row.start), 0) ?? 0
  $: rectangularSelectionColumnCount =
    rectangularSelection ? rectangularSelection.columnEnd - rectangularSelection.columnStart : 0
  $: rectangularSelectionColorableRowCount =
    rectangularSelection?.rows.filter(({ start, end }) => /\S/u.test(framesText.slice(start, end))).length ?? 0
  $: rectangularSelectionHasColorableText = rectangularSelectionColorableRowCount > 0
  $: showSelectionTools = selectionHasColorableText || rectangularSelectionHasColorableText
  $: canApplyFrameGradient = rectangularSelectionColorableRowCount > 1 && rectangularSelectionCharacterCount > 0
  $: visibleAnsiColorOptions = ansiPaletteMode === '16' ? basicAnsiColorOptions : xtermAnsiColorOptions
  $: bankFilters = [
    { id: 'all', label: 'all' },
    ...bankCategories.map(({ id, label }) => ({ id, label })),
    { id: 'custom', label: customCharacters.length > 0 ? `custom ${customCharacters.length}` : 'custom' },
  ]
  $: palette = getPaletteForCategory(selectedBankCategory)
  $: visiblePresets =
    selectedPresetCategory === 'all'
      ? presetSpinners
      : presetSpinners.filter((preset) => preset.category === selectedPresetCategory)
  $: safeInterval = Number.isFinite(intervalMs) ? Math.max(10, intervalMs) : starterPreset.interval
  $: shareStateHash = encodeShareState({
    version: 1,
    framesText,
    colorSpans,
    intervalMs: safeInterval,
    ansiPaletteMode,
  })
  $: if (hasLoadedUrlState && typeof window !== 'undefined') {
    const nextHash = `#s=${shareStateHash}`

    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash)
    }
  }
  $: if (frames.length === 0) {
    previewIndex = 0
  }
  $: activeFrame = frames.length > 0 ? frames[previewIndex % frames.length] : ''
  $: activeFrameSegments =
    frames.length > 0
      ? buildStyledSegments(
          framesText,
          colorSpans,
          frameRanges[previewIndex % frames.length]?.start ?? 0,
          frameRanges[previewIndex % frames.length]?.end ?? 0,
        )
      : []
  $: {
    clearTimer()

    if (wantsToPlay && frames.length > 1) {
      const frameCount = frames.length
      timer = setInterval(() => {
        previewIndex = (previewIndex + 1) % frameCount
      }, safeInterval)
    }
  }

  onDestroy(() => {
    clearTimer()
    clearPresetTimer()
    clearCopyTimer()
    stopRectangularSelectionDrag()
  })
</script>

<svelte:head>
  <title>utf8.lol</title>
</svelte:head>

<section class="page">
  <header class="header">
    <h1>utf8.lol</h1>
    <p class="intro">make the text go round and round. <a href="https://github.com/nakajima/utf8.lol">view source</a></p>
  </header>

  <section class="preview-row">
    <div>
      <h2>preview</h2>
      <div class="preview" aria-live="off">
        {#if frames.length > 0}
          <span class="preview-frame" aria-label={activeFrame}>
            {#each activeFrameSegments as segment}
              {#if segment.cssColor}
                <span class="preview-segment" style:color={segment.cssColor}>{segment.text}</span>
              {:else}
                <span class="preview-segment">{segment.text}</span>
              {/if}
            {/each}
          </span>
        {:else}
          <span class="empty">no frames</span>
        {/if}
      </div>
      <p class="meta">{frames.length} frame{frames.length === 1 ? '' : 's'}</p>
    </div>

    <div class="preview-controls">
      <button type="button" onclick={togglePlay}>
        {wantsToPlay ? 'pause' : 'play'}
      </button>

      <label class="field speed-field">
        <span>interval (ms)</span>
        <input type="number" min="10" step="1" bind:value={intervalMs} />
      </label>
    </div>
  </section>

  <section class="layout">
    <div class="panel bank-panel">
      <div class="section-head">
        <h2>character bank</h2>
      </div>
      <p class="section-note">filter the bank, then click characters or fragments to add or remove them from the frame list.</p>

      <div class="filter-list">
        {#each bankFilters as filter}
          <button
            type="button"
            class:selected={selectedBankCategory === filter.id}
            aria-pressed={selectedBankCategory === filter.id}
            onclick={() => (selectedBankCategory = filter.id)}
          >
            {filter.label}
          </button>
        {/each}
      </div>

      {#if palette.length > 0}
        <div class="character-list">
          {#each palette as character}
            <button
              type="button"
              class:selected={frames.includes(character)}
              aria-pressed={frames.includes(character)}
              onclick={() => toggleCharacter(character)}
            >
              {character}
            </button>
          {/each}
        </div>
      {:else}
        <p class="empty-note">no custom items yet.</p>
      {/if}

      <form class="custom-form" onsubmit={handleCustomSubmit}>
        <label class="field" for="custom-character">
          <span>custom character or fragment</span>
          <div class="inline-field">
            <input
              id="custom-character"
              bind:value={customCharacter}
              placeholder="ex: @ or <=>"
              autocomplete="off"
            />
            <button type="submit">add</button>
          </div>
        </label>
      </form>
    </div>

    <div class="panel frames-panel">
      <div class="section-head">
        <h2>frames</h2>
        <div class="actions">
          <button type="button" onclick={loadStarterFrames}>starter</button>
          <button type="button" onclick={clearFrames}>clear</button>
          <button type="button" onclick={copyAnsiFrames}>copy ansi</button>
        </div>
      </div>

      <div class="editor-shell">
        <div class="editor-overlay" bind:this={framesOverlay} aria-hidden="true">
          {#if editorSegments.length > 0}
            {#each editorSegments as segment}
              {#if segment.cssColor}
                <span style:color={segment.cssColor}>{segment.text}</span>
              {:else}
                <span>{segment.text}</span>
              {/if}
            {/each}
          {:else}
            <span> </span>
          {/if}
        </div>

        <div class="editor-selection-overlay" bind:this={framesSelectionOverlay} aria-hidden="true">
          <div class="editor-selection-content" style:width={`${editorContentWidth}px`} style:height={`${editorContentHeight}px`}>
            {#if customRectangularSelection}
              {#each customRectangularSelection.rows as row}
                <div
                  class="selection-rect"
                  style:top={`${row.lineIndex * editorMetrics.lineHeight}px`}
                  style:left={`${customRectangularSelection.columnStart * editorMetrics.charWidth}px`}
                  style:width={`${(customRectangularSelection.columnEnd - customRectangularSelection.columnStart) * editorMetrics.charWidth}px`}
                  style:height={`${editorMetrics.lineHeight}px`}
                ></div>
              {/each}
            {/if}
          </div>
        </div>

        <textarea
          bind:this={framesTextarea}
          class="frames-editor"
          value={framesText}
          spellcheck="false"
          wrap="off"
          onmousedown={handleFramesMouseDown}
          onbeforeinput={rememberPendingTextEdit}
          onpaste={handleFramesPaste}
          oninput={handleFramesInput}
          onscroll={syncEditorScroll}
          onselect={updateTextSelection}
          onclick={updateTextSelection}
          onkeyup={updateTextSelection}
        ></textarea>
      </div>

      {#if showSelectionTools}
        <div class="ansi-picker">
          <div class="ansi-mode-toggle" aria-label="ansi palette mode">
            <button
              type="button"
              class:selected={ansiPaletteMode === '16'}
              aria-pressed={ansiPaletteMode === '16'}
              onclick={() => (ansiPaletteMode = '16')}
            >
              16
            </button>
            <button
              type="button"
              class:selected={ansiPaletteMode === '256'}
              aria-pressed={ansiPaletteMode === '256'}
              onclick={() => (ansiPaletteMode = '256')}
            >
              256
            </button>
          </div>

          <div class="color-tool-row">
            <label class="color-input-field">
              <span>color</span>
              <input type="color" bind:value={selectedColorHex} />
            </label>

            <div class="color-tool-actions">
              <button type="button" onmousedown={(event) => event.preventDefault()} onclick={applyPickedColorToSelection}>
                apply color
              </button>
              <button
                type="button"
                onmousedown={(event) => event.preventDefault()}
                onclick={() => applyColorToSelection(null)}
              >
                clear
              </button>
            </div>
          </div>

          {#if (rectangularSelection?.rows.length ?? 0) > 1}
            <div class="gradient-controls">
              <div class="gradient-stop-controls">
                <label class="color-input-field">
                  <span>start</span>
                  <input type="color" bind:value={gradientStartColorHex} />
                </label>
                <label class="color-input-field">
                  <span>end</span>
                  <input type="color" bind:value={gradientEndColorHex} />
                </label>
              </div>

              <button
                type="button"
                onmousedown={(event) => event.preventDefault()}
                onclick={applyFrameGradientToSelection}
                disabled={!canApplyFrameGradient}
              >
                frame gradient
              </button>
            </div>
          {/if}
        </div>
      {/if}

      <p class="section-note">
        {#if customRectangularSelection}
          {customRectangularSelection.rows.length} line{customRectangularSelection.rows.length === 1 ? '' : 's'} × {rectangularSelectionColumnCount} column{rectangularSelectionColumnCount === 1 ? '' : 's'} box selected.
        {:else if canApplyFrameGradient}
          {rectangularSelectionColorableRowCount} colorable line{rectangularSelectionColorableRowCount === 1 ? '' : 's'} across {rectangularSelectionColumnCount} column{rectangularSelectionColumnCount === 1 ? '' : 's'} selected for frame gradient.
        {:else if selectionHasColorableText}
          {selectedTextEnd - selectedTextStart} character{selectedTextEnd - selectedTextStart === 1 ? '' : 's'} selected.
        {:else if selectedTextEnd > selectedTextStart}
          whitespace-only selections do not get color controls.
        {:else}
          select characters in the editor to color them, or hold option and drag to box-select.
        {/if}
        {#if (rectangularSelection?.rows.length ?? 0) > 1 && !customRectangularSelection}
          Multiline frame gradients use a rectangular block between the selection endpoints.
        {/if}
        {#if showSelectionTools}
          Colors are approximated to the nearest {ansiPaletteMode === '16' ? '16-color' : '256-color'} ANSI value when applied. {ansiPaletteMode === '16' ? 'Switch to 256 for smoother gradients.' : ''}
        {/if}
        {#if canApplyFrameGradient} Blank rows inside the box are skipped, and the gradient follows your drag direction.{/if}
        {#if copyStatus} {copyStatus}.{/if}
      </p>
      <div class="filter-list">
        {#each presetFilters as filter}
          <button
            type="button"
            class:selected={selectedPresetCategory === filter.id}
            aria-pressed={selectedPresetCategory === filter.id}
            onclick={() => (selectedPresetCategory = filter.id)}
          >
            {filter.label}
          </button>
        {/each}
      </div>

      <div class="preset-list">
        {#each visiblePresets as preset}
          <button
            type="button"
            class:selected={frameSignature === preset.frames.join('\n')}
            aria-label={`load preset ${preset.name}`}
            title={preset.name}
            onclick={() => loadPreset(preset)}
          >
            <span class="preset-preview" aria-hidden="true">{getPresetFrame(preset, presetClock)}</span>
          </button>
        {/each}
      </div>
      <p class="section-note attribution">
        Presets from
        <a href={cliSpinnerSourceUrl} target="_blank" rel="noreferrer">sindresorhus/cli-spinners</a>.
      </p>


    </div>
  </section>
</section>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
  }

  .header,
  .preview-row,
  .panel {
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }

  .header {
    padding-top: 0;
    border-top: 0;
  }

  .preview-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 1rem;
    align-items: end;
  }

  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 2rem;
  }

  h1,
  h2,
  p {
    margin: 0;
  }

  h1,
  h2 {
    font-size: 1rem;
    font-weight: 700;
    text-transform: lowercase;
  }

  .intro,
  .meta,
  .section-note,
  .field span,
  .empty,
  .empty-note {
    color: var(--muted);
  }

  .intro {
    margin-top: 0.5rem;
    max-width: 48rem;
  }

  .preview {
    min-height: 4rem;
    padding: 0.75rem 0;
    font-size: 3rem;
    line-height: 1;
    white-space: pre;
  }

  .preview-frame,
  .preview-segment {
    white-space: pre;
  }

  .meta,
  .empty-note {
    font-size: 0.875rem;
  }

  .field {
    display: grid;
    gap: 0.5rem;
  }

  .preview-controls {
    display: flex;
    gap: 0.75rem;
    align-items: end;
  }

  .speed-field {
    align-self: end;
    min-width: 12rem;
  }

  .section-head {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
  }

  .section-note {
    margin-top: 0.5rem;
  }

  .ansi-picker {
    display: grid;
    gap: 0.75rem;
    margin-top: 0.75rem;
  }

  .ansi-mode-toggle {
    display: flex;
    gap: 0.5rem;
  }

  .ansi-mode-toggle button.selected {
    background: var(--surface);
  }

  .color-tool-row,
  .gradient-controls,
  .gradient-stop-controls,
  .color-tool-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: end;
  }

  .color-input-field {
    display: grid;
    gap: 0.35rem;
  }

  .color-input-field span {
    color: var(--muted);
    font-size: 0.875rem;
    text-transform: lowercase;
  }

  .color-input-field input[type='color'] {
    width: 3rem;
    height: 2rem;
    padding: 0;
    background: transparent;
    border: 1px solid var(--border);
    cursor: pointer;
  }

  .editor-shell {
    position: relative;
    margin-top: 0.75rem;
    border: 1px solid var(--border);
  }

  .editor-overlay,
  .editor-selection-overlay,
  .frames-editor {
    width: 100%;
    min-height: 22rem;
    padding: 0.5rem 0.75rem;
    font: inherit;
    line-height: 1.4;
    white-space: pre;
  }

  .editor-overlay,
  .editor-selection-overlay {
    position: absolute;
    inset: 0;
    overflow: auto;
    pointer-events: none;
    scrollbar-width: none;
  }

  .editor-overlay {
    color: var(--text);
  }

  .editor-overlay::-webkit-scrollbar,
  .editor-selection-overlay::-webkit-scrollbar {
    display: none;
  }

  .editor-selection-overlay {
    z-index: 2;
  }

  .editor-selection-content {
    position: relative;
    min-width: 100%;
    min-height: 100%;
  }

  .selection-rect {
    position: absolute;
    background: color-mix(in oklch, var(--text) 14%, transparent);
    outline: 1px solid color-mix(in oklch, var(--text) 28%, transparent);
  }

  .frames-editor {
    position: relative;
    z-index: 1;
    min-height: 22rem;
    margin-top: 0;
    color: transparent;
    caret-color: var(--text);
    background: transparent;
    border: 0;
    resize: vertical;
    -webkit-text-fill-color: transparent;
  }

  .frames-editor:focus-visible {
    outline: 1px solid var(--text);
    outline-offset: -1px;
  }

  .attribution a {
    color: inherit;
  }

  .filter-list,
  .character-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 1rem 0 0;
  }

  .preset-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(4.5rem, 1fr));
    gap: 0.5rem;
    margin: 1rem 0 1.25rem;
  }

  .filter-list button,
  .character-list button {
    white-space: pre;
  }

  .character-list button {
    min-width: 3rem;
  }

  .preset-list button {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 3rem;
    padding: 0.75rem;
    white-space: pre;
    overflow: hidden;
    color: var(--muted);
    border-color: color-mix(in oklch, var(--border) 45%, transparent);
  }

  .preset-list button:hover,
  .preset-list button.selected {
    color: var(--text);
    border-color: var(--text);
  }

  .preset-preview {
    display: block;
    max-width: 100%;
    overflow: hidden;
    font-size: 1.125rem;
    line-height: 1;
    text-overflow: clip;
    opacity: 0.8;
  }

  .preset-list button:hover .preset-preview,
  .preset-list button.selected .preset-preview {
    opacity: 1;
  }

  .filter-list button.selected,
  .character-list button.selected,
  .preset-list button.selected {
    background: var(--surface);
  }

  .inline-field,
  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .inline-field input {
    min-width: 0;
  }

  .custom-form {
    margin-top: 0.5rem;
  }

  textarea {
    min-height: 22rem;
    margin-top: 0.25rem;
    white-space: pre;
  }

  @media (max-width: 820px) {
    .preview-row,
    .layout {
      grid-template-columns: 1fr;
    }

    .frames-panel {
      order: -1;
    }

    .preview {
      font-size: 2.5rem;
    }

    .section-head,
    .inline-field {
      align-items: flex-start;
      flex-direction: column;
    }

    .preview-controls {
      align-items: end;
      flex-direction: row;
      flex-wrap: nowrap;
    }

    .speed-field {
      min-width: 10rem;
      width: auto;
    }
  }
</style>
