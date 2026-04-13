<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import {
    basicAnsiColorOptions,
    xtermAnsiColorOptions,
    applyColorToRange,
    buildStyledSegments,
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

  type AnsiPaletteMode = '16' | '256'

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
  let ansiPaletteMode: AnsiPaletteMode = '16'
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
  let pendingTextEdit: PendingTextEdit | null = null
  let copyStatus = ''
  let copyTimer: ReturnType<typeof setTimeout> | null = null

  function setFrames(nextFrames: string[]) {
    clearCopyTimer()
    framesText = nextFrames.join('\n')
    colorSpans = []
    selectedTextStart = 0
    selectedTextEnd = 0
    copyStatus = ''

    queueMicrotask(() => {
      if (framesTextarea) {
        framesTextarea.setSelectionRange(0, 0)
      }

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
  }

  function updateTextSelection() {
    if (!framesTextarea) {
      return
    }

    selectedTextStart = framesTextarea.selectionStart
    selectedTextEnd = framesTextarea.selectionEnd
  }

  function rememberPendingTextEdit() {
    if (!framesTextarea) {
      return
    }

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

  function reselectText() {
    if (!framesTextarea) {
      return
    }

    framesTextarea.focus()
    framesTextarea.setSelectionRange(selectedTextStart, selectedTextEnd)
  }

  function applyColorToSelection(colorId: AnsiColorId | null) {
    if (!selectionHasColorableText) {
      return
    }

    colorSpans = applyColorToRange(colorSpans, selectedTextStart, selectedTextEnd, colorId)
    reselectText()
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

  async function copyAnsiFrames() {
    clearCopyTimer()

    if (rawAnsiFrames.length === 0) {
      copyStatus = 'no frames to copy'
      return
    }

    try {
      await navigator.clipboard.writeText(rawAnsiFrames.join('\n'))
      copyStatus = 'copied ansi frames'
    } catch {
      copyStatus = 'clipboard write failed'
    }

    copyTimer = setTimeout(() => {
      copyStatus = ''
    }, 2000)
  }

  function getPresetFrame(preset: CliSpinnerPreset, clock: number) {
    if (preset.frames.length === 0) {
      return ''
    }

    return preset.frames[Math.floor(clock / Math.max(10, preset.interval)) % preset.frames.length]
  }

  onMount(() => {
    presetClock = Date.now()
    presetTimer = setInterval(() => {
      presetClock = Date.now()
    }, 40)

    queueMicrotask(() => {
      syncEditorScroll()
      updateTextSelection()
    })

    return () => {
      clearPresetTimer()
    }
  })

  function togglePlay() {
    wantsToPlay = !wantsToPlay
  }

  $: frameRanges = parseFrameRanges(framesText)
  $: frames = frameRanges.map(({ text }) => text)
  $: frameSignature = frames.join('\n')
  $: editorSegments = buildStyledSegments(framesText, colorSpans)
  $: rawAnsiFrames = frameRanges.map(({ start, end }) => toAnsiString(framesText, colorSpans, start, end))
  $: selectedText = framesText.slice(selectedTextStart, selectedTextEnd)
  $: selectionHasColorableText = /\S/u.test(selectedText)
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

        <textarea
          bind:this={framesTextarea}
          class="frames-editor"
          value={framesText}
          spellcheck="false"
          wrap="off"
          onbeforeinput={rememberPendingTextEdit}
          oninput={handleFramesInput}
          onscroll={syncEditorScroll}
          onselect={updateTextSelection}
          onclick={updateTextSelection}
          onkeyup={updateTextSelection}
        ></textarea>
      </div>

      {#if selectionHasColorableText}
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

          <div class="ansi-color-grid" class:ansi-color-grid-256={ansiPaletteMode === '256'} aria-label="ansi color tools">
            <button
              type="button"
              class="ansi-color-tile ansi-color-clear"
              title="clear color"
              aria-label="clear color"
              onmousedown={(event) => event.preventDefault()}
              onclick={() => applyColorToSelection(null)}
            >
              <span aria-hidden="true">×</span>
            </button>

            {#each visibleAnsiColorOptions as color}
              <button
                type="button"
                class="ansi-color-tile"
                title={color.label}
                aria-label={color.label}
                onmousedown={(event) => event.preventDefault()}
                onclick={() => applyColorToSelection(color.id)}
              >
                <span class="ansi-swatch" aria-hidden="true" style:background={color.cssColor}></span>
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <p class="section-note">
        {#if selectionHasColorableText}
          {selectedTextEnd - selectedTextStart} character{selectedTextEnd - selectedTextStart === 1 ? '' : 's'} selected.
        {:else if selectedTextEnd > selectedTextStart}
          whitespace-only selections do not get color controls.
        {:else}
          select characters in the editor to color them.
        {/if}
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

  .ansi-color-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(2rem, 2rem));
    gap: 0.5rem;
  }

  .ansi-color-grid-256 {
    grid-template-columns: repeat(auto-fill, minmax(1.25rem, 1.25rem));
    gap: 0.35rem;
    max-height: 11rem;
    overflow: auto;
    padding-right: 0.25rem;
  }

  .ansi-color-tile {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
  }

  .ansi-color-grid-256 .ansi-color-tile {
    width: 1.25rem;
    height: 1.25rem;
  }

  .ansi-swatch {
    display: inline-block;
    width: 100%;
    height: 100%;
    border: 1px solid color-mix(in oklch, var(--text) 35%, transparent);
  }

  .ansi-color-clear {
    color: var(--muted);
  }

  .editor-shell {
    position: relative;
    margin-top: 0.75rem;
    border: 1px solid var(--border);
  }

  .editor-overlay,
  .frames-editor {
    width: 100%;
    min-height: 22rem;
    padding: 0.5rem 0.75rem;
    font: inherit;
    line-height: 1.4;
    white-space: pre;
  }

  .editor-overlay {
    position: absolute;
    inset: 0;
    overflow: auto;
    color: var(--text);
    pointer-events: none;
    scrollbar-width: none;
  }

  .editor-overlay::-webkit-scrollbar {
    display: none;
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
