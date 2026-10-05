# vue-pointing-bubble

A Vue 3 callout (speech bubble) component whose tail tip points **exactly** at an
absolute `(x, y)` coordinate or at the center of a DOM element.

The box and tail are drawn as one continuous SVG path, so there are no seams
between the bubble and its pointer, and the tip vertex lands on the target pixel
with zero offset.

**[Live demo](https://murznn.github.io/vue-pointing-bubble/)**

## Features

- Point at absolute coordinates (`{ x, y }`) or at a DOM element / component instance.
- Automatic quadrant placement (the bubble flips away from the nearest edges), or a fixed placement.
- Seamless single-path SVG outline with rounded corners and an optional drop shadow.
- Any content through the default slot. The bubble resizes to fit it, or you can set a fixed size.
- Glides smoothly to a new target, and to a new size when its content changes.
- Follows window resize, scrolling, and container resize.
- No CSS file to import and no dependency on Tailwind or any other CSS framework.
- Ships as an ES module, a UMD bundle for `<script>` tags, and the raw `.vue` SFC. Includes TypeScript declarations.

## Installation

```bash
npm install vue-pointing-bubble
```

You can also install it straight from GitHub:

```bash
npm install github:MurzNN/vue-pointing-bubble
```

Vue `^3.3` is a peer dependency.

## Usage

The component fills its nearest **positioned** ancestor (`position: relative`,
`absolute`, or `fixed`) with an overlay. Coordinates are measured relative to
that ancestor.

### Pointing at coordinates

```vue
<script setup>
import { PointingBubble } from 'vue-pointing-bubble'
</script>

<template>
  <div style="position: relative; height: 400px">
    <PointingBubble :target="{ x: 320, y: 180 }">
      <strong>Look here!</strong>
      <p>The tail tip is exactly at (320, 180).</p>
    </PointingBubble>
  </div>
</template>
```

### Pointing at an element

Pass a template ref, either a DOM element or a component instance. The tip
attaches to the center of the element.

```vue
<script setup>
import { ref } from 'vue'
import { PointingBubble } from 'vue-pointing-bubble'

const button = ref(null)
</script>

<template>
  <div style="position: relative; height: 400px">
    <button ref="button">Save</button>

    <PointingBubble :target="button" preferred-placement="bottom-right">
      Click here to save your changes.
    </PointingBubble>
  </div>
</template>
```

### Global registration

```js
import { createApp } from 'vue'
import VuePointingBubble from 'vue-pointing-bubble'
import App from './App.vue'

createApp(App)
  .use(VuePointingBubble) // registers <PointingBubble>
  // .use(VuePointingBubble, { name: 'Callout' }) // or under a custom name
  .mount('#app')
```

The component is also exported under the alias `Callout`:

```js
import { Callout } from 'vue-pointing-bubble'
```

### Using the raw SFC

If you prefer to compile the component with your own build pipeline:

```js
import PointingBubble from 'vue-pointing-bubble/PointingBubble.vue'
```

### Without a build step (CDN)

```html
<script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
<script src="https://unpkg.com/vue-pointing-bubble"></script>

<div id="app">
  <div style="position: relative; height: 400px">
    <pointing-bubble :target="{ x: 200, y: 120 }">Hello!</pointing-bubble>
  </div>
</div>

<script>
  Vue.createApp({})
    .component('PointingBubble', VuePointingBubble.PointingBubble)
    .mount('#app')
</script>
```

## Props

| Prop                 | Type                                  | Default     | Description |
| -------------------- | ------------------------------------- | ----------- | ----------- |
| `target`             | `{ x, y }` \| `Element` \| component  | `null`      | What the tip points at. Coordinates are relative to the positioned parent. Elements are pointed at their center. Nothing is rendered when `null`. |
| `preferredPlacement` | `'auto'` \| `'top-left'` \| `'top-right'` \| `'bottom-left'` \| `'bottom-right'` | `'auto'` | Where the box sits relative to the tip. `auto` chooses the quadrant facing the center of the container. |
| `boxWidth`           | `number` \| `null`                    | `null`      | Fixed box width in px. If `null`, the width fits the content, up to `maxWidth`. |
| `boxHeight`          | `number` \| `null`                    | `null`      | Fixed box height in px. If `null`, the height fits the content. Content taller than a fixed height is clipped. |
| `maxWidth`           | `number`                              | `280`       | Width in px at which content wraps when `boxWidth` is `null`. |
| `tailLength`         | `number`                              | `45`        | Horizontal and vertical offset in px from the tip to the box corner. |
| `tailBaseWidth`      | `number`                              | `24`        | Width in px of the tail where it joins the box. |
| `fillColor`          | `string`                              | `'#f8fafc'` | Bubble fill color. |
| `strokeColor`        | `string`                              | `'#475569'` | Outline color. |
| `strokeWidth`        | `number`                              | `1.5`       | Outline width in px. |
| `borderRadius`       | `number`                              | `16`        | Corner radius in px. |
| `padding`            | `number` \| `string`                  | `16`        | Inner padding of the content area (a number means px). |
| `shadow`             | `boolean`                             | `true`      | Whether to render a drop shadow. |
| `zIndex`             | `number` \| `string`                  | `30`        | `z-index` of the overlay. |
| `transitionDuration` | `number`                              | `200`       | Duration in ms of the glide animation when the target, size, or placement changes. The bubble outline and its content move together. `0` disables it, and it is skipped when the user prefers reduced motion. Consider `0` while the target follows the mouse, such as during dragging. |

## Slots

| Slot      | Props                   | Description |
| --------- | ----------------------- | ----------- |
| `default` | `{ placement, tip }`    | Bubble content. `placement` is the resolved quadrant and `tip` is the tip position `{ x, y }` in container pixels. |

## Exposed methods

| Name       | Description |
| ---------- | ----------- |
| `update()` | Recomputes the tip position. Call it if the target element moved without a window resize or scroll, such as after an animation. |

## Styling

The overlay elements have stable class names you can target from your own CSS:

- `.vue-pointing-bubble`: the overlay root. It has a `data-placement` attribute with the resolved quadrant.
- `.vue-pointing-bubble__svg`: the SVG layer.
- `.vue-pointing-bubble__path`: the bubble outline path.
- `.vue-pointing-bubble__content`: the HTML box positioned inside the bubble outline.
- `.vue-pointing-bubble__inner`: the padded wrapper around the slot content. Its size is what the bubble measures for auto-sizing.

## Development

```bash
npm install
npm run dev:demo     # start the demo dev server with hot reload (`npm run dev` is an alias)
npm run build        # build the library into dist/
npm run build:demo   # build the demo into demo-dist/
npm run preview:demo # serve the built demo
```

The demo (`demo/Demo.vue`) imports the component straight from `src/`, so editing
either the demo or the component hot-reloads in the browser. It shows three typical
use cases: hover hints, a guided tour, and annotating a picture by coordinates.

The demo is deployed to GitHub Pages by
[`.github/workflows/deploy-demo.yml`](.github/workflows/deploy-demo.yml) on every
push to `main`. To enable it, open **Settings → Pages** in the repository and
set **Source** to **GitHub Actions**.

## License

[MIT](LICENSE)
