/**
 * Compute fixed viewport coordinates for an anchored popover menu so it flips
 * upward when space below (above the bottom player dock) is insufficient and
 * stays clamped horizontally & vertically within the safe viewport bounds.
 */
export function computePopoverPosition({
  triggerRect,
  popoverWidth = 276,
  popoverHeight = 300,
  viewportWidth = 1440,
  viewportHeight = 900,
  dockTop = null,
  headerBottom = 0,
  gap = 6,
  margin = 8,
  dockClearance = 12,
}) {
  const width = Math.min(popoverWidth, Math.max(200, viewportWidth - margin * 2));
  const safeTop = Math.max(margin, headerBottom > 0 ? headerBottom + margin : margin);
  const effectiveDockTop =
    typeof dockTop === 'number' && dockTop > 0 ? dockTop : viewportHeight;
  const safeBottom = Math.max(
    safeTop + 140,
    Math.min(viewportHeight - margin, effectiveDockTop - dockClearance)
  );

  const spaceBelow = Math.max(0, safeBottom - triggerRect.bottom - gap);
  const spaceAbove = Math.max(0, triggerRect.top - safeTop - gap);

  // Flip upward when space below is tight and space above is larger
  const openUpward = spaceBelow < popoverHeight && spaceAbove > spaceBelow;
  const placement = openUpward ? 'top' : 'bottom';

  const availableHeight = openUpward ? spaceAbove : spaceBelow;
  const maxAllowed = Math.max(150, Math.floor(availableHeight));
  const maxHeight = Math.min(Math.max(popoverHeight, 150), maxAllowed);

  let top = openUpward
    ? triggerRect.top - gap - maxHeight
    : triggerRect.bottom + gap;

  top = Math.max(safeTop, Math.min(safeBottom - maxHeight, top));

  // Align right edge to trigger by default, then clamp horizontally within viewport
  let left = triggerRect.right - width;
  left = Math.max(margin, Math.min(viewportWidth - width - margin, left));

  return {
    top: Math.round(top),
    left: Math.round(left),
    width: Math.round(width),
    maxHeight,
    placement,
  };
}
