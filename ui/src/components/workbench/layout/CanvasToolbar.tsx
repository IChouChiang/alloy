/** Props for canvas zoom/pan quick actions. */
type CanvasToolbarProps = {
  /** Current zoom value shown as percentage. */
  zoomPercent: number
  /** Callback to decrease zoom level. */
  onZoomOut: () => void
  /** Callback to increase zoom level. */
  onZoomIn: () => void
  /** Callback to reset to 100% and center content. */
  onCenterAt100: () => void
  /** Callback to fit all cards in current viewport. */
  onFitView: () => void
}

/** Compact toolbar for zoom controls in the canvas viewport. */
export function CanvasToolbar({
  zoomPercent,
  onZoomOut,
  onZoomIn,
  onCenterAt100,
  onFitView,
}: CanvasToolbarProps) {
  return (
    <div className="canvas-toolbar">
      <button className="zoom-btn" onClick={onZoomOut} type="button" aria-label="Zoom out">-</button>
      <span className="zoom-text">{zoomPercent}%</span>
      <button className="zoom-btn" onClick={onZoomIn} type="button" aria-label="Zoom in">+</button>
      <button className="zoom-btn zoom-center" onClick={onCenterAt100} type="button" aria-label="Center at 100%">100%</button>
      <button className="zoom-btn zoom-center" onClick={onFitView} type="button" aria-label="Fit all cards">Fit</button>
    </div>
  )
}
