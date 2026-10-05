<script setup>
import { ref, computed, onMounted } from 'vue'
import { PointingBubble } from '../src/index.js'

// Demo 1: hover hints
const actions = [
  { label: 'Download', text: 'Save as PDF.' },
  {
    label: 'Share',
    text:
      'Copy a public link to this article. Anyone with the link can read it without signing in, ' +
      'and it stays valid until you turn off sharing in the article settings or delete the article.'
  },
  {
    label: 'Delete',
    text: 'Move the article to the trash. You can restore it within 30 days.',
    danger: true
  }
]
const hint = ref(null)
let hideTimer = 0

const showHint = (e, action) => {
  clearTimeout(hideTimer)
  hint.value = { el: e.currentTarget, ...action }
}

// A short delay lets the bubble glide to the next button instead of vanishing over the gap.
const hideHint = () => {
  hideTimer = setTimeout(() => (hint.value = null), 150)
}

// Demo 2: guided tour
const steps = [
  { label: 'Bold', text: 'Make the selected text stand out. Shortcut: Ctrl+B.' },
  { label: 'Italic', text: 'Add emphasis to the selection. Shortcut: Ctrl+I.' },
  {
    label: 'Link',
    text: 'Turn the selection into a hyperlink. Paste a URL, or start typing to search your other posts.'
  },
  {
    label: 'Publish',
    text: 'Ready? Your post goes live right away, and subscribers get an email notification.'
  }
]
const stepEls = []
const step = ref(-1)
const tourTarget = computed(() => (step.value >= 0 ? stepEls[step.value] : null))

// Demo 3: absolute coordinates
const chart = ref(null)
const peak = ref(null)
const point = ref(null)
const pointLabel = ref('')

const pointAt = (x, y, label) => {
  point.value = { x: Math.round(x), y: Math.round(y) }
  pointLabel.value = label
}

const onChartClick = (e) => {
  const rect = chart.value.getBoundingClientRect()
  pointAt(e.clientX - rect.left, e.clientY - rect.top, 'You clicked here')
}

onMounted(() => {
  const c = chart.value.getBoundingClientRect()
  const p = peak.value.getBoundingClientRect()
  pointAt(p.left + p.width / 2 - c.left, p.top + p.height / 2 - c.top, 'Peak: 1,240 visitors')
})
</script>

<template>
  <div class="page">
    <header>
      <h1>vue-pointing-bubble</h1>
      <p>
        A Vue 3 callout whose tail points <em>exactly</em> at a DOM element or at absolute (x, y) coordinates.
        <a href="https://github.com/MurzNN/vue-pointing-bubble">GitHub</a>
      </p>
    </header>

    <section class="demo">
      <h2>1. Hover hints</h2>
      <p class="hint">Hover or focus a button to see what it does. The bubble resizes to fit each hint.</p>
      <p>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis
        dapibus posuere velit aliquet. Donec ullamcorper nulla non metus auctor fringilla. Maecenas
        faucibus mollis interdum, sed posuere consectetur est at lobortis.
      </p>
      <p>
        Cras mattis consectetur purus sit amet fermentum. Vestibulum id ligula porta felis euismod
        semper. Aenean lacinia bibendum nulla sed consectetur.
      </p>
      <div class="row">
        <button
          v-for="action in actions"
          :key="action.label"
          class="btn"
          :class="{ danger: action.danger }"
          @mouseenter="showHint($event, action)"
          @focus="showHint($event, action)"
          @mouseleave="hideHint"
          @blur="hideHint"
        >
          {{ action.label }}
        </button>
      </div>

      <PointingBubble
        :target="hint?.el"
        :max-width="260"
        :tail-length="28"
        :tail-base-width="16"
        :padding="12"
      >
        <p class="bubble-title">{{ hint?.label }}</p>
        <p class="bubble-text">{{ hint?.text }}</p>
      </PointingBubble>
    </section>

    <section class="demo">
      <h2>2. Guided tour</h2>
      <p class="hint">Walk the user through a toolbar, one button at a time.</p>
      <div class="row">
        <button
          v-for="(s, i) in steps"
          :key="s.label"
          :ref="(el) => (stepEls[i] = el)"
          class="btn"
          :class="{ active: step === i }"
        >
          {{ s.label }}
        </button>
        <button class="btn primary" style="margin-left: auto" @click="step = step < 0 ? 0 : -1">
          {{ step < 0 ? 'Start tour' : 'End tour' }}
        </button>
      </div>
      <p>
        Nullam quis risus eget urna mollis ornare vel eu leo. Etiam porta sem malesuada magna mollis
        euismod. Curabitur blandit tempus porttitor. Donec sed odio dui, praesent commodo cursus
        magna, vel scelerisque nisl consectetur et.
      </p>
      <p>
        Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Morbi leo risus,
        porta ac consectetur ac, vestibulum at eros. Sed posuere consectetur est at lobortis.
      </p>

      <PointingBubble
        :target="tourTarget"
        :box-width="260"
        :tail-length="32"
        :padding="14"
        fill-color="#eef2ff"
        stroke-color="#6366f1"
      >
        <p class="bubble-title">{{ steps[step]?.label }}</p>
        <p class="bubble-text">{{ steps[step]?.text }}</p>
        <div class="bubble-actions">
          <span>Step {{ step + 1 }} of {{ steps.length }}</span>
          <span class="row" style="gap: 6px">
            <button class="btn small" :disabled="step === 0" @click="step--">Back</button>
            <button class="btn small primary" @click="step = step < steps.length - 1 ? step + 1 : -1">
              {{ step < steps.length - 1 ? 'Next' : 'Done' }}
            </button>
          </span>
        </div>
      </PointingBubble>
    </section>

    <section class="demo">
      <h2>3. Annotating a picture by coordinates</h2>
      <p class="hint">Click anywhere on the chart. The tip lands on the exact pixel you clicked.</p>
      <p>
        Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa
        justo sit amet risus. Sed posuere consectetur est at lobortis.
      </p>
      <div ref="chart" class="chart" @click="onChartClick">
        <svg viewBox="0 0 600 240" role="img" aria-label="Visitors per month">
          <g stroke="#e2e8f0">
            <line x1="0" y1="40" x2="600" y2="40" />
            <line x1="0" y1="100" x2="600" y2="100" />
            <line x1="0" y1="160" x2="600" y2="160" />
            <line x1="0" y1="220" x2="600" y2="220" />
          </g>
          <polygon
            points="30,190 120,150 210,40 300,120 390,95 480,140 570,70 570,220 30,220"
            fill="#c7d2fe"
            opacity="0.5"
          />
          <polyline
            points="30,190 120,150 210,40 300,120 390,95 480,140 570,70"
            fill="none"
            stroke="#4f46e5"
            stroke-width="3"
            stroke-linejoin="round"
          />
          <g fill="#4f46e5">
            <circle cx="30" cy="190" r="5" />
            <circle cx="120" cy="150" r="5" />
            <circle ref="peak" cx="210" cy="40" r="5" />
            <circle cx="300" cy="120" r="5" />
            <circle cx="390" cy="95" r="5" />
            <circle cx="480" cy="140" r="5" />
            <circle cx="570" cy="70" r="5" />
          </g>
        </svg>

        <PointingBubble
          :target="point"
          :tail-length="30"
          :tail-base-width="14"
          :padding="12"
          fill-color="#1e293b"
          stroke-color="#1e293b"
          @click.stop
        >
          <p class="bubble-title" style="color: #fff">{{ pointLabel }}</p>
          <p class="bubble-text" style="color: #cbd5e1">x: {{ point?.x }}, y: {{ point?.y }}</p>
        </PointingBubble>
      </div>
    </section>

    <footer>
      MIT licensed · <a href="https://github.com/MurzNN/vue-pointing-bubble">Source on GitHub</a>
    </footer>
  </div>
</template>
