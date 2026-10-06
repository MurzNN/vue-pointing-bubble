<script>
let uid = 0

const ANIMATED_KEYS = ['tx', 'ty', 'bx', 'by', 'w', 'h']
// In manual mode CSS owns the box, so only the tail glides.
const MANUAL_ANIMATED_KEYS = ['tx', 'ty']
// Look of the bubble when CSS on the component doesn't set it.
const DEFAULTS = { fill: '#f8fafc', stroke: '#475569', strokeWidth: 1.5, radius: '16px', zIndex: 30 }
</script>

<script setup>
/**
 * Precision Vue 3 callout ("pointing bubble") component.
 * Draws the box and its tail as a single continuous SVG path, so the tip vertex
 * lands exactly on the target coordinate (x, y) or on the center of a target element.
 */
import { ref, computed, watch, onMounted, onUpdated, onBeforeUnmount } from 'vue'

// `class`, `style`, and listeners go to the box, not to the full-size overlay.
defineOptions({ inheritAttrs: false })

const props = defineProps({
  // DOM element, component instance, or { x, y } relative to the positioned parent.
  target: {
    type: [Object, typeof Element !== 'undefined' ? Element : Object],
    default: null
  },
  // 'auto' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'manual'
  // In 'manual' mode the box is positioned by CSS (left/top) on the component.
  placement: {
    type: String,
    default: 'auto',
    validator: (v) => ['auto', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'manual'].includes(v)
  },
  // For element targets: 'center' points at the element's center, 'edge' at its border facing the box.
  targetAnchor: {
    type: String,
    default: 'center',
    validator: (v) => ['center', 'edge'].includes(v)
  },
  // Content wraps at this width (px) unless CSS on the component sets a width or max-width.
  maxWidth: { type: Number, default: 280 },
  // Distance from the box edge to the tip.
  tailLength: { type: Number, default: 45 },
  // Width of the tail where it attaches to the box.
  tailBaseWidth: { type: Number, default: 24 },
  // Used unless CSS on the component sets a padding.
  padding: { type: [Number, String], default: 16 },
  shadow: { type: Boolean, default: true },
  // Duration in ms of the move animation when the target changes; 0 disables it.
  transitionDuration: { type: Number, default: 200 }
})

const filterId = `vue-pointing-bubble-shadow-${++uid}`
const containerRef = ref(null)
const contentRef = ref(null)
const probeRef = ref(null)
const tip = ref(null)
// Target element rect relative to the container; null for coordinate targets.
const targetRect = ref(null)
const measured = ref(null)
// What the component's own class/style set: sizing that the defaults must not override,
// and the background, border, radius, and z-index that are moved to the SVG outline and the overlay.
const userStyle = ref({
  width: false,
  maxWidth: false,
  padding: false,
  fill: null,
  stroke: null,
  strokeWidth: 0,
  radius: null,
  zIndex: null
})
const manual = computed(() => props.placement === 'manual')
// Without a target only the box is drawn, positioned by its CSS like in manual mode.
const boxOnly = computed(() => !props.target)
const cssPositioned = computed(() => manual.value || boxOnly.value)
// Container rect relative to the viewport, plus the viewport size.
const frameRect = ref({ left: 0, top: 0, width: 0, height: 0, viewportWidth: 0, viewportHeight: 0 })

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
    targetRect.value = null
    measure()
    return
  }

  const containerRect = container.getBoundingClientRect()
  frameRect.value = {
    left: containerRect.left,
    top: containerRect.top,
    width: containerRect.width,
    height: containerRect.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight
  }

  const el = resolveElement(props.target)
  if (el) {
    const r = el.getBoundingClientRect()
    const rect = {
      left: r.left - containerRect.left,
      top: r.top - containerRect.top,
      right: r.right - containerRect.left,
      bottom: r.bottom - containerRect.top
    }
    if (!sameKeys(rect, targetRect.value)) targetRect.value = rect
    tip.value = { x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 }
  } else if (typeof props.target.x === 'number' && typeof props.target.y === 'number') {
    targetRect.value = null
    tip.value = { x: props.target.x, y: props.target.y }
  }
  measure()
}

watch(() => [props.target, props.target?.x, props.target?.y], update, { flush: 'post' })

const sameKeys = (a, b) => !!a && !!b && Object.keys(a).every((k) => a[k] === b[k])

const measure = () => {
  // The probe carries the same class/style without any inline defaults. A hidden element reports
  // computed values, so `width: auto` and `max-width: none` mean the user's CSS didn't set them.
  const probe = probeRef.value
  if (probe && typeof getComputedStyle !== 'undefined') {
    const s = getComputedStyle(probe)
    const borderWidth = parseFloat(s.borderTopWidth) || 0
    const next = {
      width: s.width !== 'auto',
      maxWidth: s.maxWidth !== 'none',
      padding: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].some((v) => parseFloat(v) !== 0),
      fill: s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent' ? s.backgroundColor : null,
      stroke: borderWidth ? s.borderTopColor : null,
      strokeWidth: borderWidth,
      radius: parseFloat(s.borderTopLeftRadius) ? s.borderTopLeftRadius.split(' ')[0] : null,
      zIndex: s.zIndex !== 'auto' ? s.zIndex : null
    }
    if (!sameKeys(next, userStyle.value)) userStyle.value = next
  }

  const el = contentRef.value
  const next = el ? { x: el.offsetLeft, y: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight } : null
  if (!sameKeys(next, measured.value)) measured.value = next
}

// Catches changes of the component's class/style, which are not reactive in the script.
onUpdated(measure)

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
  const m = measured.value
  if (!m?.width || !m?.height) return null
  const { width: w, height: h } = m
  if (boxOnly.value) return { placement: 'none', tx: null, ty: null, bx: m.x, by: m.y, w, h }
  if (!tip.value) return null
  const { x: tx, y: ty } = tip.value
  const tLen = props.tailLength
  const f = frameRect.value
  const rect = props.targetAnchor === 'edge' ? targetRect.value : null

  if (manual.value) {
    if (rect) {
      // The point of the element's border nearest to the box center, unless that center is over the element.
      const cx = m.x + w / 2
      const cy = m.y + h / 2
      const inside = cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom
      if (!inside) {
        const ex = Math.min(rect.right, Math.max(rect.left, cx))
        const ey = Math.min(rect.bottom, Math.max(rect.top, cy))
        return { placement: 'manual', tx: ex, ty: ey, bx: m.x, by: m.y, w, h }
      }
    }
    return { placement: 'manual', tx, ty, bx: m.x, by: m.y, w, h }
  }

  // With the edge anchor the tip moves to the middle of the element's top or bottom edge, facing the box.
  const tipYFor = (vertical) => (rect ? (vertical === 'top' ? rect.top : rect.bottom) : ty)

  let placement = props.placement
  if (placement === 'auto') {
    let vertical = ty > (f.height || 600) / 2 ? 'top' : 'bottom'
    let horizontal = tx > (f.width || 800) / 2 ? 'left' : 'right'

    // Flip to the other side if the bubble would leave the viewport and fits there.
    if (f.viewportHeight) {
      const fitsAbove = f.top + tipYFor('top') - h - tLen >= 0
      const fitsBelow = f.top + tipYFor('bottom') + h + tLen <= f.viewportHeight
      if (vertical === 'top' && !fitsAbove && fitsBelow) vertical = 'bottom'
      else if (vertical === 'bottom' && !fitsBelow && fitsAbove) vertical = 'top'
    }
    if (f.viewportWidth) {
      const vx = f.left + tx
      const fitsLeft = vx - w - tLen >= 0
      const fitsRight = vx + w + tLen <= f.viewportWidth
      if (horizontal === 'left' && !fitsLeft && fitsRight) horizontal = 'right'
      else if (horizontal === 'right' && !fitsRight && fitsLeft) horizontal = 'left'
    }

    placement = `${vertical}-${horizontal}`
  }

  const [vertical, horizontal] = placement.split('-')
  const tipY = tipYFor(vertical)
  return {
    placement,
    tx,
    ty: tipY,
    bx: horizontal === 'left' ? tx - w - tLen : tx + tLen,
    by: vertical === 'top' ? tipY - h - tLen : tipY + tLen,
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
  const tailless = to?.placement === 'none' || from?.placement === 'none'
  if (!to || !from || tailless || duration <= 0 || typeof requestAnimationFrame === 'undefined' || prefersReducedMotion()) {
    current.value = to
    return
  }

  const start = performance.now()
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration)
    const eased = 1 - Math.pow(1 - t, 3)
    const next = { ...to }
    const keys = to.placement === 'manual' ? MANUAL_ANIMATED_KEYS : ANIMATED_KEYS
    for (const key of keys) next[key] = from[key] + (to[key] - from[key]) * eased
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

const look = computed(() => {
  const u = userStyle.value
  return {
    fill: u.fill ?? DEFAULTS.fill,
    stroke: u.stroke ?? DEFAULTS.stroke,
    strokeWidth: u.stroke ? u.strokeWidth : DEFAULTS.strokeWidth,
    // A CSS border is painted inside the box, so the outline is inset by half its width to cover the same area.
    inset: u.stroke ? u.strokeWidth / 2 : 0,
    radius: u.radius ?? DEFAULTS.radius,
    zIndex: u.zIndex ?? DEFAULTS.zIndex
  }
})

const layout = computed(() => {
  if (!current.value) return null
  const { placement, tx, ty } = current.value
  const { inset, radius } = look.value
  const box = current.value
  const bx = box.bx + inset
  const by = box.by + inset
  const w = box.w - inset * 2
  const h = box.h - inset * 2
  const outerRadius = radius.endsWith('%') ? (parseFloat(radius) / 100) * Math.min(box.w, box.h) : parseFloat(radius)
  const r = Math.max(0, Math.min(outerRadius - inset, Math.min(w, h) / 2))
  const half = props.tailBaseWidth / 2

  // `side` is the box wall the tail grows from, `attach` the center of its base along that wall.
  let side = null
  let attach = 0
  if (placement === 'none') {
    // No target, no tail.
  } else if (placement === 'manual') {
    // Use the wall facing the tip, attaching as close to the tip as the rounded corners allow.
    const clamp = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)))
    const dx = Math.max(bx - tx, tx - (bx + w), 0)
    const dy = Math.max(by - ty, ty - (by + h), 0)
    if (dx > 0 && dx >= dy) {
      side = tx < bx ? 'left' : 'right'
      attach = clamp(ty, by + r + half, by + h - r - half)
    } else if (dy > 0) {
      side = ty < by ? 'top' : 'bottom'
      attach = clamp(tx, bx + r + half, bx + w - r - half)
    }
  } else {
    const [vertical, horizontal] = placement.split('-')
    side = horizontal === 'left' ? 'right' : 'left'
    const fraction = vertical === 'top' ? 0.65 : 0.35
    attach = by + Math.max(r + half, Math.min(h - r - half, h * fraction))
  }

  const tail = (s, segment) => (side === s ? segment : '')

  const path =
    `M ${bx + r} ${by} ` +
    tail('top', `H ${attach - half} L ${tx} ${ty} L ${attach + half} ${by} `) +
    `H ${bx + w - r} ` +
    `A ${r} ${r} 0 0 1 ${bx + w} ${by + r} ` +
    tail('right', `V ${attach - half} L ${tx} ${ty} L ${bx + w} ${attach + half} `) +
    `V ${by + h - r} ` +
    `A ${r} ${r} 0 0 1 ${bx + w - r} ${by + h} ` +
    tail('bottom', `H ${attach + half} L ${tx} ${ty} L ${attach - half} ${by + h} `) +
    `H ${bx + r} ` +
    `A ${r} ${r} 0 0 1 ${bx} ${by + h - r} ` +
    tail('left', `V ${attach + half} L ${tx} ${ty} L ${bx} ${attach - half} `) +
    `V ${by + r} ` +
    `A ${r} ${r} 0 0 1 ${bx + r} ${by} Z`

  // Shadow filter region in px, with enough margin for the blur and its vertical offset.
  const margin = 48
  const px = tx ?? bx
  const py = ty ?? by
  const shadowRegion = {
    x: Math.min(bx, px) - margin,
    y: Math.min(by, py) - margin,
    width: Math.max(bx + w, px) - Math.min(bx, px) + margin * 2,
    height: Math.max(by + h, py) - Math.min(by, py) + margin * 2
  }

  return { boxX: box.bx, boxY: box.by, boxW: box.w, boxH: box.h, path, placement, shadowRegion }
})

const contentStyle = computed(() => {
  const shown = { pointerEvents: layout.value ? 'auto' : 'none', visibility: layout.value ? 'visible' : 'hidden' }
  // In manual and box-only modes the box is positioned by its own CSS relative to the overlay.
  if (cssPositioned.value) return { display: 'contents', ...shown }
  const l = layout.value
  return {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    overflow: 'hidden',
    ...shown,
    left: (l?.boxX ?? 0) + 'px',
    top: (l?.boxY ?? 0) + 'px',
    width: l ? l.boxW + 'px' : 'auto',
    height: l ? l.boxH + 'px' : 'auto'
  }
})

// Keys are only added when set: merged with the user's `style`, even an undefined key would win.
const innerStyle = computed(() => {
  const u = userStyle.value
  // The SVG outline paints the background, border, and shadow, so the box itself stays see-through.
  const style = {
    boxSizing: 'border-box',
    flexShrink: 0,
    background: 'transparent',
    borderColor: 'transparent',
    boxShadow: 'none'
  }
  if (cssPositioned.value) style.position = 'absolute'
  if (!u.width) style.width = 'max-content'
  if (!u.width && !u.maxWidth) style.maxWidth = props.maxWidth + 'px'
  if (!u.padding) style.padding = typeof props.padding === 'number' ? `${props.padding}px` : props.padding
  return style
})

defineExpose({ update, layout })
</script>

<template>
  <div
    ref="containerRef"
    class="vue-pointing-bubble"
    :data-placement="layout?.placement"
    :style="{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible', zIndex: look.zIndex }"
  >
    <svg
      v-if="layout"
      class="vue-pointing-bubble__svg"
      :style="{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }"
    >
      <defs v-if="shadow">
        <filter :id="filterId" filterUnits="userSpaceOnUse" v-bind="layout.shadowRegion">
          <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000000" flood-opacity="0.25" />
        </filter>
      </defs>
      <path
        class="vue-pointing-bubble__path"
        :d="layout.path"
        :fill="look.fill"
        :stroke="look.stroke"
        :stroke-width="look.strokeWidth"
        stroke-linejoin="round"
        stroke-linecap="round"
        :filter="shadow ? `url(#${filterId})` : undefined"
      />
    </svg>

    <div
      ref="probeRef"
      class="vue-pointing-bubble__inner"
      aria-hidden="true"
      :class="$attrs.class"
      :style="[$attrs.style, { display: 'none', position: 'absolute' }]"
    />

    <!-- Rendered (hidden) before the layout is known, so the content can be measured first. -->
    <div v-if="tip || boxOnly" class="vue-pointing-bubble__content" :style="contentStyle">
      <div ref="contentRef" class="vue-pointing-bubble__inner" v-bind="$attrs" :style="innerStyle">
        <slot :placement="layout?.placement" :tip="geometry?.tx != null ? { x: geometry.tx, y: geometry.ty } : tip">
          <p :style="{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1e293b' }">Callout content</p>
        </slot>
      </div>
    </div>
  </div>
</template>
