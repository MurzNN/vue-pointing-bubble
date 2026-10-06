# vue-pointing-bubble

A Vue 3 callout for a speech bubble, speech balloon, popover with arrow,
annotated popover, or coachmark. The tail tip points **exactly** at an absolute
`(x, y)` coordinate or at the center of a DOM element.

The box and tail are drawn as one continuous SVG path, so there are no seams
between the bubble and its pointer, and the tip vertex lands on the target pixel
with zero offset.

**[Live demo](https://murznn.github.io/vue-pointing-bubble/)**

## Features

- Point at absolute coordinates (`{ x, y }`) or at a DOM element / component instance.
- Automatic quadrant placement that keeps the bubble inside the container and the visible viewport, a fixed quadrant, or a box positioned by your own CSS.
- Seamless single-path SVG outline with rounded corners and an optional drop shadow.
- Any content through the default slot. The bubble resizes to fit it.
- Style the bubble with regular `class` and `style`, including Tailwind CSS or UnoCSS utility classes: size, padding, position, background, border, corner radius, and `z-index`.
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

### Pointing at page coordinates

To point at absolute coordinates on the page, wrap the bubble in a layer that
covers the page. Because the layer is `position: absolute`, it takes no space in
the layout, so the page content stays where it is. Add `pointer-events: none` so the
layer doesn't block clicks on the elements under it.

```vue
<script setup>
import { PointingBubble } from 'vue-pointing-bubble'
</script>

<template>
  <div style="position: absolute; inset: 0; pointer-events: none">
    <PointingBubble :target="{ x: 320, y: 180 }">
      <strong>Look here!</strong>
      <p>The tail tip is exactly at (320, 180) on the page.</p>
    </PointingBubble>
  </div>
</template>
```

The coordinates are measured from the top-left corner of the document, the same way
as `event.pageX` and `event.pageY`, and the bubble scrolls together with the page.
This works only if none of the layer's ancestors is positioned. Otherwise, the
coordinates are measured from that ancestor. To be safe, render the layer with
`<Teleport to="body">`.

If you want viewport coordinates instead (`event.clientX` and `event.clientY`), with
the bubble staying in place while the page scrolls, use `position: fixed` for the
layer.

### Pointing at coordinates inside a container

To point at a spot inside a specific element, such as an image or a chart, put the
bubble into a positioned container. The coordinates are then measured from the
container's top-left corner, so they stay correct wherever the container is on the
page.

```vue
<template>
  <div style="position: relative; width: 600px">
    <img src="/floor-plan.png" width="600" height="400" alt="Floor plan">

    <PointingBubble :target="{ x: 420, y: 150 }">
      The kitchen is here.
    </PointingBubble>
  </div>
</template>
```

Here, `(420, 150)` is a point on the image. If the image moves, for example because
of text added above it, the bubble moves with it.

### Pointing at an element

Pass a template ref, either a DOM element or a component instance. The tip
attaches to the center of the element. This is the usual setup for a coachmark
or a popover with arrow next to a control.

```vue
<script setup>
import { ref } from 'vue'
import { PointingBubble } from 'vue-pointing-bubble'

const button = ref(null)
</script>

<template>
  <div style="position: relative; height: 400px">
    <button ref="button">Save</button>

    <PointingBubble :target="button" placement="bottom-right">
      Click here to save your changes.
    </PointingBubble>
  </div>
</template>
```

By default the tip lands on the element's center. To stop it at the element's
border instead, so it doesn't cover the button's label, add `target-anchor="edge"`:

```vue
<PointingBubble :target="button" target-anchor="edge">
  Click here to save your changes.
</PointingBubble>
```

With automatic placement, the tip then touches the middle of the element's top or
bottom edge, whichever faces the box. With `placement="manual"`, it touches the
point of the element's border nearest to the center of the box.

### Sizing and styling the box

`class`, `style`, and event listeners that you put on `<PointingBubble>` go to the
box with your content, the same way as on a regular `<div>`. The outline is drawn
around whatever size the box ends up with.

```vue
<PointingBubble :target="button" class="w-64 p-3 text-sm">
  Click here to save your changes.
</PointingBubble>
```

By default, the box fits its content, wraps the text at `max-width` (280px), and has
`padding` of 16px. A width, max-width, or padding that your classes or `style` set
replaces the corresponding default, so you never get double padding. One exception:
the component can't tell a zero padding from no padding at all, so to remove the
padding, use `:padding="0"` instead of a class like `p-0`.

If you give the box a fixed height, content that doesn't fit is clipped. Add
`overflow-auto` (or `overflow: auto`) to make it scrollable instead.

The bubble's look comes from CSS too. The component reads these properties from your
classes and `style`, and draws them on the outline, so they follow the tail as well:

| CSS                             | Effect on the bubble                        | Default   |
| ------------------------------- | ------------------------------------------- | --------- |
| `background-color`              | Fill color.                                 | `#f8fafc` |
| `border-width`, `border-color`  | Outline width and color.                    | `1.5px` `#475569` |
| `border-radius`                 | Corner radius.                              | `16px`    |
| `z-index`                       | Stacking order of the whole bubble.         | `30`      |

```vue
<PointingBubble :target="button" class="p-3 rounded-xl bg-yellow-100 border-2 border-yellow-600">
  Click here to save your changes.
</PointingBubble>

<!-- The same without a CSS framework -->
<PointingBubble
  :target="button"
  style="padding: 12px; border-radius: 12px; background: #fef9c3; border: 2px solid #ca8a04"
>
  Click here to save your changes.
</PointingBubble>
```

The outline covers the same area as a CSS border on a regular `<div>`, so `border-2`
looks the same as it would there. A few limitations apply:

- Only solid colors work. Gradients and background images are ignored, and all
  corners use the top-left radius.
- The shadow is controlled by the `shadow` prop, not by `box-shadow`.
- Variants of the bubble's own state, such as `hover:bg-…`, are not picked up.
  Variants that depend on the page work, such as `dark:`, media queries, and
  `group-hover:`. If they change without a re-render of the component, such as when
  you toggle dark mode, call `update()`.
- Zero values look the same as unset ones, so the default applies. For square corners,
  use a tiny radius like `rounded-[1px]`. To hide the outline, use a transparent
  border like `border border-transparent`.

### Placing the box yourself

By default, the box is placed next to the tip automatically. With
`placement="manual"`, you position the box yourself with `left` and `top`, set by
classes or by `style`, relative to the positioned parent. The tail still points
exactly at `target`, from whichever side of the box faces it. This works well for
an annotated popover on a diagram, or for labels the user can drag around.

```vue
<template>
  <div style="position: relative; height: 300px">
    <img ref="photo" src="/laptop.png" style="margin: 80px auto; display: block">

    <PointingBubble :target="photo" placement="manual" class="left-4 top-4 w-44">
      This label stays in the top-left corner.
    </PointingBubble>
  </div>
</template>
```

Any CSS unit works, for example `class="left-[7em] top-[5em]"` in Tailwind CSS, or
`class="left-7em top-5em"` in UnoCSS. Without a framework, use `style`:

```vue
<PointingBubble :target="photo" placement="manual" :style="{ left: x + 'px', top: y + 'px' }">
  Drag me around.
</PointingBubble>
```

You don't need a class like `absolute`, because the box is always absolutely
positioned. Without `left` and `top`, it sits in the top-left corner of the parent.
The width works as in automatic mode: the box fits its content and wraps at
`max-width` unless you set a width. In manual mode, the box itself doesn't glide
when you move it, only the tail does. If the box moves without a resize or a change
of its classes or style, such as during a CSS transition, call `update()`.

### A box without a tail

Leave out `target`, or set it to `null`, to draw just the box, with the same
look and no tail. The box is positioned like in manual mode, by its `left` and
`top`. This is handy for a step that doesn't point at anything, such as the
welcome step of a guided tour:

```vue
<PointingBubble :target="step.element" class="left-8 top-8">
  {{ step.text }}
</PointingBubble>
```

When `target` changes from `null` to an element, a tail appears and the box moves
next to the element, and back again when it changes to `null`. To hide the bubble
completely, use `v-if`.

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
  <div style="position: absolute; inset: 0; pointer-events: none">
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
| `target`             | `{ x, y }` \| `Element` \| component  | `null`      | What the tip points at. Coordinates are relative to the positioned parent. Elements are pointed at their center, or at their border with `targetAnchor="edge"`. When `null`, only the box is drawn, without a tail, positioned by its `left` and `top` CSS like with `placement="manual"`. Use `v-if` to hide the bubble entirely. |
| `placement`          | `'auto'` \| `'top-left'` \| `'top-right'` \| `'bottom-left'` \| `'bottom-right'` \| `'manual'` | `'auto'` | Where the box sits relative to the tip. `auto` chooses the quadrant facing the center of the container. It flips to the other side if the bubble would go outside the viewport, such as after scrolling, and fits on the other side. `manual` leaves the position to the `left` and `top` that you set with `class` or `style`. The tail then grows from whichever side of the box faces the tip. |
| `targetAnchor`       | `'center'` \| `'edge'`                | `'center'`  | For element targets, where the tip lands. `center` is the element's center. `edge` is the element's border facing the box: the middle of the top or bottom edge with automatic placement, or the nearest border point with `manual` placement. Ignored for coordinate targets. |
| `maxWidth`           | `number`                              | `280`       | Width in px at which content wraps, unless your `class` or `style` sets a width or max-width. |
| `tailLength`         | `number`                              | `45`        | Horizontal and vertical offset in px from the tip to the box corner. |
| `tailBaseWidth`      | `number`                              | `24`        | Width in px of the tail where it joins the box. |
| `padding`            | `number` \| `string`                  | `16`        | Padding of the box (a number means px), unless your `class` or `style` sets a padding. Mostly useful as `0`, which CSS can't express here. |
| `shadow`             | `boolean`                             | `true`      | Whether to render a drop shadow. |
| `transitionDuration` | `number`                              | `200`       | Duration in ms of the glide animation when the target, size, or placement changes. The bubble outline and its content move together. `0` disables it, and it is skipped when the user prefers reduced motion. Consider `0` while the target follows the mouse, such as during dragging. |

## Slots

| Slot      | Props                   | Description |
| --------- | ----------------------- | ----------- |
| `default` | `{ placement, tip }`    | Bubble content. `placement` is the resolved quadrant, `'manual'`, or `'none'` without a target, and `tip` is the tip position `{ x, y }` in container pixels, or `null` without a target. |

## Exposed methods

| Name       | Description |
| ---------- | ----------- |
| `update()` | Recomputes the tip position, remeasures the box, and rereads its CSS. Call it if the target element or a manually placed box moved, or the bubble's CSS changed, without a window resize, scroll, or re-render, such as after an animation or a theme switch. |

## Styling

The overlay elements have stable class names you can target from your own CSS:

- `.vue-pointing-bubble`: the overlay root. It has a `data-placement` attribute with the resolved quadrant.
- `.vue-pointing-bubble__svg`: the SVG layer.
- `.vue-pointing-bubble__path`: the bubble outline path.
- `.vue-pointing-bubble__content`: the wrapper that positions and clips the box in automatic placement.
- `.vue-pointing-bubble__inner`: the box with the slot content. It receives the `class`, `style`, and listeners from `<PointingBubble>`, and its size is what the outline is drawn around.

## Development

```bash
npm install
npm run dev:demo     # start the demo dev server with hot reload (`npm run dev` is an alias)
npm run build        # build the library into dist/
npm run build:demo   # build the demo into demo-dist/
npm run preview:demo # serve the built demo
```

The demo (`demo/Demo.vue`) imports the component straight from `src/`, so editing
either the demo or the component hot-reloads in the browser. It shows hover hints,
a guided tour with a coachmark, an annotated popover on a picture, and draggable
labels with custom box positions.

The demo is deployed to GitHub Pages by
[`.github/workflows/deploy-demo.yml`](.github/workflows/deploy-demo.yml) on every
push to `main`. To enable it, open **Settings → Pages** in the repository and
set **Source** to **GitHub Actions**.

## License

[MIT](LICENSE)
