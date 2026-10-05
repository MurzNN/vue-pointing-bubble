<script>
let uid = 0

const ANIMATED_KEYS = ['tx', 'ty', 'bx', 'by', 'w', 'h']
</script>

<script setup>
/**
 * Precision Vue 3 callout ("pointing bubble") component.
 * Draws the box and its tail as a single continuous SVG path, so the tip vertex
 * lands exactly on the target coordinate (x, y) or on the center of a target element.
 */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  // DOM element, component instance, or { x, y } relative to the positioned parent.
  target: {
    type: [Object, typeof Element !== 'undefined' ? Element : Object],
    default: null
  },
  // 'auto' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  preferredPlacement: {
    type: String,
    default: 'auto',
    validator: (v) => ['auto', 'top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(v)
  },
  // Fixed box size in px; when null, the box fits its content.
  boxWidth: { type: Number, default: null },
  boxHeight: { type: Number, default: null },
  // Content wraps at this width (px) when boxWidth is null.
  maxWidth: { type: Number, default: 280 },
  // Distance from the box edge to the tip.
  tailLength: { type: Number, default: 45 },
  // Width of the tail where it attaches to the box.
  tailBaseWidth: { type: Number, default: 24 },
  fillColor: { type: String, default: '#f8fafc' },
  strokeColor: { type: String, default: '#475569' },
  strokeWidth: { type: Number, default: 1.5 },
  borderRadius: { type: Number, default: 16 },
  padding: { type: [Number, String], default: 16 },
  shadow: { type: Boolean, default: true },
  zIndex: { type: [Number, String], default: 30 },
  // Duration in ms of the move animation when the target changes; 0 disables it.
  transitionDuration: { type: Number, default: 200 }
})

const filterId = `vue-pointing-bubble-shadow-${++uid}`
const containerRef = ref(null)
const contentRef = ref(null)
const tip = ref(null)
const measured = ref(null)
const containerSize = ref({ width: 0, height: 0 })

const resolveElement = (t) => {
  if (typeof Element === 'undefined' || !t) return null
  if (t instanceof Element) return t
  if (t.$el instanceof Element) return t.$el
  return null
}

const update = () => {
  const container = containerRef.value
  if (!container) return
  if (!props.target) {
    tip.value = null
    return
  }

  const containerRect = container.getBoundingClientRect()
  containerSize.value = { width: containerRect.width, height: containerRect.height }

  const el = resolveElement(props.target)
  if (el) {
    const r = el.getBoundingClientRect()
    tip.value = {
      x: r.left + r.width / 2 - containerRect.left,
      y: r.top + r.height / 2 - containerRect.top
    }
  } else if (typeof props.target.x === 'number' && typeof props.target.y === 'number') {
    tip.value = { x: props.target.x, y: props.target.y }
  }
}

watch(() => [props.target, props.target?.x, props.target?.y], update, { flush: 'post' })

const measure = () => {
  const el = contentRef.value
  measured.value = el ? { width: el.offsetWidth, height: el.offsetHeight } : null
}

let contentObserver = null

watch(contentRef, (el, old) => {
  if (old) contentObserver?.unobserve(old)
  if (el) {
    if (!contentObserver && typeof ResizeObserver !== 'undefined') contentObserver = new ResizeObserver(measure)
    contentObserver?.observe(el)
  }
  measure()
}, { flush: 'post' })

// Where the bubble should end up for the current tip, content size, and props.
const geometry = computed(() => {
  if (!tip.value) return null
  const w = props.boxWidth ?? measured.value?.width
  const h = props.boxHeight ?? measured.value?.height
  if (!w || !h) return null
  const { x: tx, y: ty } = tip.value
  const tLen = props.tailLength
  const cw = containerSize.value.width || 800
  const ch = containerSize.value.height || 600

  let placement = props.preferredPlacement
  if (placement === 'auto') {
    const right = tx > cw / 2
    const bottom = ty > ch / 2
    placement = `${bottom ? 'top' : 'bottom'}-${right ? 'left' : 'right'}`
  }

  const [vertical, horizontal] = placement.split('-')
  return {
    placement,
    tx,
    ty,
    bx: horizontal === 'left' ? tx - w - tLen : tx + tLen,
    by: vertical === 'top' ? ty - h - tLen : ty + tLen,
    w,
    h
  }
})

// What is rendered right now; eases towards `geometry` so the path and the content move together.
const current = ref(null)
let frame = 0

const prefersReducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

watch(geometry, (to) => {
  if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(frame)
  const from = current.value
  const duration = props.transitionDuration
  if (!to || !from || duration <= 0 || typeof requestAnimationFrame === 'undefined' || prefersReducedMotion()) {
    current.value = to
    return
  }

  const start = performance.now()
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration)
    const eased = 1 - Math.pow(1 - t, 3)
    const next = { placement: to.placement }
    for (const key of ANIMATED_KEYS) next[key] = from[key] + (to[key] - from[key]) * eased
    current.value = next
    if (t < 1) frame = requestAnimationFrame(step)
  }
  frame = requestAnimationFrame(step)
}, { immediate: true })

let resizeObserver = null

onMounted(() => {
  window.addEventListener('resize', update)
  window.addEventListener('scroll', update, true)
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(update)
    resizeObserver.observe(containerRef.value)
  }
  update()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', update)
  window.removeEventListener('scroll', update, true)
  resizeObserver?.disconnect()
  contentObserver?.disconnect()
  if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(frame)
})

const layout = computed(() => {
  if (!current.value) return null
  const { placement, tx, ty, bx, by, w, h } = current.value
  const r = Math.min(props.borderRadius, Math.min(w, h) / 2)
  const half = props.tailBaseWidth / 2

  const [vertical, horizontal] = placement.split('-')
  // The tail attaches to the box wall facing the tip, nearer to the tip's side.
  const tailSide = horizontal === 'left' ? 'right' : 'left'
  const fraction = vertical === 'top' ? 0.65 : 0.35
  const attachY = by + Math.max(r + half, Math.min(h - r - half, h * fraction))

  const rightTail = tailSide === 'right'
    ? `V ${attachY - half} L ${tx} ${ty} L ${bx + w} ${attachY + half} `
    : ''
  const leftTail = tailSide === 'left'
    ? `V ${attachY + half} L ${tx} ${ty} L ${bx} ${attachY - half} `
    : ''

  const path =
    `M ${bx + r} ${by} ` +
    `H ${bx + w - r} ` +
    `A ${r} ${r} 0 0 1 ${bx + w} ${by + r} ` +
    rightTail +
    `V ${by + h - r} ` +
    `A ${r} ${r} 0 0 1 ${bx + w - r} ${by + h} ` +
    `H ${bx + r} ` +
    `A ${r} ${r} 0 0 1 ${bx} ${by + h - r} ` +
    leftTail +
    `V ${by + r} ` +
    `A ${r} ${r} 0 0 1 ${bx + r} ${by} Z`

  return { boxX: bx, boxY: by, boxW: w, boxH: h, path, placement }
})

const padding = computed(() =>
  typeof props.padding === 'number' ? `${props.padding}px` : props.padding
)

defineExpose({ update, layout })
</script>

<template>
  <div
    ref="containerRef"
    class="vue-pointing-bubble"
    :data-placement="layout?.placement"
    :style="{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible', zIndex }"
  >
    <svg
      v-if="layout"
      class="vue-pointing-bubble__svg"
      :style="{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }"
    >
      <defs v-if="shadow">
        <filter :id="filterId" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000000" flood-opacity="0.25" />
        </filter>
      </defs>
      <path
        class="vue-pointing-bubble__path"
        :d="layout.path"
        :fill="fillColor"
        :stroke="strokeColor"
        :stroke-width="strokeWidth"
        stroke-linejoin="round"
        stroke-linecap="round"
        :filter="shadow ? `url(#${filterId})` : undefined"
      />
    </svg>

    <!-- Rendered (hidden) before the layout is known, so the content can be measured first. -->
    <div
      v-if="tip"
      class="vue-pointing-bubble__content"
      :style="{
        position: 'absolute',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        overflow: 'hidden',
        pointerEvents: layout ? 'auto' : 'none',
        visibility: layout ? 'visible' : 'hidden',
        left: (layout?.boxX ?? 0) + 'px',
        top: (layout?.boxY ?? 0) + 'px',
        width: layout ? layout.boxW + 'px' : 'auto',
        height: layout ? layout.boxH + 'px' : 'auto'
      }"
    >
      <div
        ref="contentRef"
        class="vue-pointing-bubble__inner"
        :style="{
          boxSizing: 'border-box',
          flexShrink: 0,
          padding,
          width: boxWidth != null ? boxWidth + 'px' : 'max-content',
          maxWidth: boxWidth != null ? 'none' : maxWidth + 'px'
        }"
      >
        <slot :placement="layout?.placement" :tip="tip">
          <p :style="{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1e293b' }">Callout content</p>
        </slot>
      </div>
    </div>
  </div>
</template>
