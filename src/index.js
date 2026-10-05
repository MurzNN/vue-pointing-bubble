import PointingBubble from './PointingBubble.vue'

export { PointingBubble, PointingBubble as Callout }

export default {
  install(app, options = {}) {
    app.component(options.name || 'PointingBubble', PointingBubble)
  }
}
