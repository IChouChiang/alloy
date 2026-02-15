type CanvasToolbarProps = {
  zoomPercent: number
  onZoomOut: () => void
  onZoomIn: () => void
  onCenterAt100: () => void
}

export function CanvasToolbar({
  zoomPercent,
  onZoomOut,
  onZoomIn,
  onCenterAt100,
}: CanvasToolbarProps) {
  return (
    <div className="canvas-toolbar">
      <button className="zoom-btn" onClick={onZoomOut} type="button" aria-label="Zoom out">-</button>
      <span className="zoom-text">{zoomPercent}%</span>
      <button className="zoom-btn" onClick={onZoomIn} type="button" aria-label="Zoom in">+</button>
      <button className="zoom-btn zoom-center" onClick={onCenterAt100} type="button" aria-label="Center at 100%">100%</button>
    </div>
  )
}
