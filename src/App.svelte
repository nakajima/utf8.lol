<script lang="ts">
  import { onDestroy } from 'svelte'
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
  let frames: string[] = starterFrames
  let frameSignature = starterFrames.join('\n')
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
  let isPlaying = true
  let timer: ReturnType<typeof setInterval> | null = null

  function parseFrames(value: string) {
    return value
      .split('\n')
      .map((line) => line.replace(/\r$/, ''))
      .filter((line) => line !== '')
  }

  function setFrames(nextFrames: string[]) {
    framesText = nextFrames.join('\n')
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
    framesText = ''
  }

  function clearTimer() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  function togglePlay() {
    if (frames.length < 2) {
      return
    }

    isPlaying = !isPlaying
  }

  $: frames = parseFrames(framesText)
  $: frameSignature = frames.join('\n')
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
  $: if (frames.length < 2) {
    isPlaying = false
  }
  $: if (frames.length === 0) {
    previewIndex = 0
  }
  $: activeFrame = frames.length > 0 ? frames[previewIndex % frames.length] : ''
  $: {
    clearTimer()

    if (isPlaying && frames.length > 1) {
      const frameCount = frames.length
      timer = setInterval(() => {
        previewIndex = (previewIndex + 1) % frameCount
      }, safeInterval)
    }
  }

  onDestroy(clearTimer)
</script>

<svelte:head>
  <title>ascii spinner builder</title>
</svelte:head>

<section class="page">
  <header class="header">
    <h1>ascii spinner builder</h1>
    <p class="intro">pick from a larger bank, load common spinners, add your own frames, and preview the result.</p>
  </header>

  <section class="preview-row">
    <div>
      <h2>preview</h2>
      <div class="preview" aria-live="off">
        {#if frames.length > 0}
          {activeFrame}
        {:else}
          <span class="empty">no frames</span>
        {/if}
      </div>
      <p class="meta">{frames.length} frame{frames.length === 1 ? '' : 's'}</p>
    </div>

    <div class="preview-controls">
      <button type="button" onclick={togglePlay} disabled={frames.length < 2}>
        {isPlaying ? 'pause' : 'play'}
      </button>

      <label class="field speed-field">
        <span>interval (ms)</span>
        <input type="number" min="10" step="1" bind:value={intervalMs} />
      </label>
    </div>
  </section>

  <section class="layout">
    <div class="panel">
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

    <div class="panel">
      <div class="section-head">
        <h2>frames</h2>
        <div class="actions">
          <button type="button" onclick={loadStarterFrames}>starter</button>
          <button type="button" onclick={clearFrames}>clear</button>
        </div>
      </div>

      <textarea bind:value={framesText} spellcheck="false"></textarea>
      <p class="section-note">load a common spinner, then edit one frame per line.</p>
      <p class="section-note attribution">
        From
        <a href={cliSpinnerSourceUrl} target="_blank" rel="noreferrer">sindresorhus/cli-spinners</a>.
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
            onclick={() => loadPreset(preset)}
          >
            {preset.name}
          </button>
        {/each}
      </div>

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

  .attribution a {
    color: inherit;
  }

  .filter-list,
  .character-list,
  .preset-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 1rem 0 0;
  }

  .character-list,
  .preset-list {
    margin-bottom: 1.25rem;
  }

  .filter-list button,
  .character-list button,
  .preset-list button {
    white-space: pre;
  }

  .character-list button {
    min-width: 3rem;
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

    .preview {
      font-size: 2.5rem;
    }

    .section-head,
    .preview-controls,
    .inline-field {
      align-items: flex-start;
      flex-direction: column;
    }

    .speed-field {
      min-width: 0;
      width: 100%;
    }
  }
</style>
