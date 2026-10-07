import PointingBubble from '../registry/ui/pointing-bubble/PointingBubble.vue'

export { PointingBubble, PointingBubble as Callout }

export default {
  install(app, options = {}) {
    app.component(options.name || 'PointingBubble', PointingBubble)
  }
}
