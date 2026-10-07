<script>
// Default look of the box. `:where()` has zero specificity, so any class or style set on the component wins.
const CSS = `:where(.vue-pointing-bubble__inner) {
  box-sizing: border-box;
  width: var(--vpb-width, max-content);
  max-width: var(--vpb-max-width);
  padding: var(--vpb-padding);
  background: #f8fafc;
  border: 1.5px solid #475569;
  border-radius: 16px;
}`
const SHADOW = 'drop-shadow(0 8px 10px rgba(0, 0, 0, 0.25))'
const DEFAULT_Z_INDEX = 30
// In manual mode CSS owns the box, so only the tail glides.
const ANIMATED_KEYS = ['tx', 'ty', 'bx', 'by']
const MANUAL_ANIMATED_KEYS = ['tx', 'ty']

const injectStyles = () => {
  if (typeof document === 'undefined' || document.getElementById('vue-pointing-bubble-styles')) return
  const style = document.createElement('style')
  style.id = 'vue-pointing-bubble-styles'
  style.textContent = CSS
  document.head.prepend(style)
}
</script>

<script setup>
/**
 * Precision Vue 3 callout ("pointing bubble") component.
 * The box is a regular element styled with CSS; an SVG tail is drawn from its wall,
 * so the tip lands exactly on the target coordinate (x, y) or on a target element.
 * Without a target, only the box is rendered, in the normal document flow.
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

injectStyles()

const rootRef = ref(null)
const boxRef = ref(null)
const tip = ref(null)
// Target element rect relative to the root; null for coordinate targets.
const targetRect = ref(null)
// Size and look of the box, read from the rendered element.
const box = ref(null)
// Root rect relative to the viewport, plus the viewport size.
const frameRect = ref({ left: 0, top: 0, width: 0, height: 0, viewportWidth: 0, viewportHeight: 0 })
const manual = computed(() => props.placement === 'manual')

const sameKeys = (a, b) => !!a && !!b && Object.keys(a).every((k) => a[k] === b[k])

const resolveElement = (t) => {
  if (typeof Element === 'undefined' || !t) return null
  if (t instanceof Element) return t
  if (t.$el instanceof Element) return t.$el
  return null
}

const update = () => {
  const root = rootRef.value
  if (!props.target || !root) {
    tip.value = null
    return
  }

  const rootRect = root.getBoundingClientRect()
  frameRect.value = {
    left: rootRect.left,
    top: rootRect.top,
    width: rootRect.width,
    height: rootRect.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight
  }

  const el = resolveElement(props.target)
  if (el) {
    const r = el.getBoundingClientRect()
    const rect = {
      left: r.left - rootRect.left,
      top: r.top - rootRect.top,
      right: r.right - rootRect.left,
      bottom: r.bottom - rootRect.top
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

const measure = () => {
  const el = boxRef.value
  if (!el || !props.target) return
  const s = getComputedStyle(el)
  const next = {
    // The position only matters in manual mode, where CSS places the box.
    x: manual.value ? el.offsetLeft : 0,
    y: manual.value ? el.offsetTop : 0,
    width: el.offsetWidth,
    height: el.offsetHeight,
    fill: s.backgroundColor,
    stroke: s.borderTopColor,
    strokeWidth: parseFloat(s.borderTopWidth) || 0,
    radius: s.borderTopLeftRadius,
    zIndex: s.zIndex
  }
  if (!sameKeys(next, box.value)) box.value = next
}

// Catches changes of the component's class/style, which are not reactive in the script.
onUpdated(measure)

// Where the bubble should end up for the current tip, box size, and props.
const geometry = computed(() => {
  const m = box.value
  if (!tip.value || !m?.width || !m?.height) return null
  const { width: w, height: h } = m
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

// What is rendered right now; eases towards `geometry` so the tail and the box move together.
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
    resizeObserver.observe(rootRef.value)
    resizeObserver.observe(boxRef.value)
  }
  update()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', update)
  window.removeEventListener('scroll', update, true)
  resizeObserver?.disconnect()
  if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(frame)
})

// The tail: a triangle from the box wall facing the tip. Its base sits on the inner edge of the
// border, so its fill covers the border where it attaches; the base itself isn't stroked.
const tailPath = computed(() => {
  const c = current.value
  if (!c) return null
  const { placement, tx, ty, bx, by, w, h } = c
  const bw = box.value.strokeWidth
  const radius = box.value.radius
  const r = parseFloat(radius) * (radius.endsWith('%') ? Math.min(w, h) / 100 : 1) || 0
  const half = props.tailBaseWidth / 2
  const clamp = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)))

  let side = null
  let along = 0
  if (placement === 'manual') {
    const dx = Math.max(bx - tx, tx - (bx + w), 0)
    const dy = Math.max(by - ty, ty - (by + h), 0)
    if (dx > 0 && dx >= dy) {
      side = tx < bx ? 'left' : 'right'
      along = ty
    } else if (dy > 0) {
      side = ty < by ? 'top' : 'bottom'
      along = tx
    } else {
      return null
    }
  } else {
    const [vertical, horizontal] = placement.split('-')
    side = horizontal === 'left' ? 'right' : 'left'
    along = by + h * (vertical === 'top' ? 0.65 : 0.35)
  }

  if (side === 'left' || side === 'right') {
    const a = clamp(along, by + r + half, by + h - r - half)
    const x = side === 'left' ? bx + bw : bx + w - bw
    return `M ${x} ${a - half} L ${tx} ${ty} L ${x} ${a + half}`
  }
  const a = clamp(along, bx + r + half, bx + w - r - half)
  const y = side === 'top' ? by + bw : by + h - bw
  return `M ${a - half} ${y} L ${tx} ${ty} L ${a + half} ${y}`
})

const placement = computed(() => (props.target ? current.value?.placement : 'none'))

// Without a target the root is a plain block around the box, so opacity or transforms set on it apply to the box too.
const rootStyle = computed(() => {
  if (!props.target) return {}
  const z = box.value?.zIndex
  return {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: z && z !== 'auto' ? z : DEFAULT_Z_INDEX,
    filter: props.shadow ? SHADOW : undefined
  }
})

// Keys are only added when set: merged with the user's `style`, even an undefined key would win.
const boxStyle = computed(() => {
  const style = {
    '--vpb-max-width': props.maxWidth + 'px',
    '--vpb-padding': typeof props.padding === 'number' ? `${props.padding}px` : props.padding
  }
  if (!props.target) {
    // In the flow the box shrinks to its content but never overflows its parent.
    style['--vpb-width'] = 'fit-content'
    if (props.shadow) style.filter = SHADOW
    return style
  }
  const c = current.value
  Object.assign(style, { position: 'absolute', pointerEvents: 'auto', visibility: c ? 'visible' : 'hidden' })
  // In manual mode the box is positioned by its own CSS; otherwise next to the tip, ignoring margins.
  if (!manual.value) Object.assign(style, { left: (c?.bx ?? 0) + 'px', top: (c?.by ?? 0) + 'px', margin: 0 })
  return style
})

defineExpose({ update })
</script>

<template>
  <div ref="rootRef" class="vue-pointing-bubble" :data-placement="placement" :style="rootStyle">
    <div ref="boxRef" class="vue-pointing-bubble__inner" v-bind="$attrs" :style="boxStyle">
      <slot :placement="placement" :tip="geometry ? { x: geometry.tx, y: geometry.ty } : tip">
        <p :style="{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1e293b' }">Callout content</p>
      </slot>
    </div>
    <svg
      v-if="target && tailPath"
      class="vue-pointing-bubble__svg"
      :style="{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: box?.zIndex }"
    >
      <path
        class="vue-pointing-bubble__path"
        :d="tailPath"
        :fill="box.fill"
        :stroke="box.stroke"
        :stroke-width="box.strokeWidth"
        stroke-linejoin="round"
      />
    </svg>
  </div>
</template>
