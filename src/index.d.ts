import type { DefineComponent, Plugin, ComponentPublicInstance } from 'vue'

export type PointingBubblePlacement =
  | 'auto'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'

export interface PointingBubblePoint {
  x: number
  y: number
}

export type PointingBubbleTarget =
  | PointingBubblePoint
  | Element
  | ComponentPublicInstance
  | null

export interface PointingBubbleProps {
  target?: PointingBubbleTarget
  preferredPlacement?: PointingBubblePlacement
  boxWidth?: number | null
  boxHeight?: number | null
  maxWidth?: number
  tailLength?: number
  tailBaseWidth?: number
  fillColor?: string
  strokeColor?: string
  strokeWidth?: number
  borderRadius?: number
  padding?: number | string
  shadow?: boolean
  zIndex?: number | string
  transitionDuration?: number
}

export declare const PointingBubble: DefineComponent<PointingBubbleProps>
export declare const Callout: typeof PointingBubble

export interface PointingBubblePluginOptions {
  name?: string
}

declare const plugin: Plugin<[PointingBubblePluginOptions?]>
export default plugin
