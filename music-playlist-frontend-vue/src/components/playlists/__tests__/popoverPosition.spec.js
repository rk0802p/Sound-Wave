import { describe, it, expect } from 'vitest';
import { computePopoverPosition } from '../../../utils/popoverPosition';

describe('computePopoverPosition (AddToPlaylistMenu dock & viewport collision)', () => {
  it('opens downward when sufficient space exists below the trigger above the dock', () => {
    const pos = computePopoverPosition({
      triggerRect: { top: 200, bottom: 230, left: 600, right: 630 },
      popoverWidth: 276,
      popoverHeight: 300,
      viewportWidth: 1440,
      viewportHeight: 900,
      dockTop: 812,
      headerBottom: 68,
    });

    expect(pos.placement).toBe('bottom');
    expect(pos.top).toBe(236);
    expect(pos.top + 300).toBeLessThanOrEqual(800);
    expect(pos.left).toBe(630 - 276);
  });

  it('flips upward when trigger is near the bottom player dock so menu never clips behind dock', () => {
    // Dock starts at y=812; trigger is right above dock at bottom=795
    const pos = computePopoverPosition({
      triggerRect: { top: 765, bottom: 795, left: 800, right: 830 },
      popoverWidth: 276,
      popoverHeight: 300,
      viewportWidth: 1440,
      viewportHeight: 900,
      dockTop: 812,
      headerBottom: 68,
    });

    expect(pos.placement).toBe('top');
    expect(pos.top + pos.maxHeight).toBeLessThanOrEqual(765);
    expect(pos.top).toBeGreaterThanOrEqual(76);
  });

  it('clamps horizontally inside narrow mobile viewports (390px)', () => {
    const pos = computePopoverPosition({
      triggerRect: { top: 600, bottom: 630, left: 20, right: 48 },
      popoverWidth: 276,
      popoverHeight: 300,
      viewportWidth: 390,
      viewportHeight: 844,
      dockTop: 752,
      headerBottom: 68,
    });

    expect(pos.left).toBeGreaterThanOrEqual(8);
    expect(pos.left + pos.width).toBeLessThanOrEqual(382);
  });
});
