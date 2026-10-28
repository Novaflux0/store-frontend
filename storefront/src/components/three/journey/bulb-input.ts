/**
 * Shared state between the hero's DOM (the bulb's anchor and drag area, see
 * `BulbStage.tsx`) and the 3D bulb in the journey canvas. The canvas sits behind the
 * page and receives no pointer events, so the hero forwards drags here and the scene
 * consumes them once per frame. One instance per page.
 */
export class BulbInput {
  /** Where the bulb sits above the hand; the scene maps its box into the 3D view. */
  anchor: HTMLElement | null = null;
  dragging = false;
  private pendingX = 0;
  private pendingY = 0;

  attach(element: HTMLElement | null): void {
    this.anchor = element;
  }

  grab(): void {
    this.dragging = true;
    this.pendingX = 0;
    this.pendingY = 0;
  }

  move(dx: number, dy: number): void {
    if (!this.dragging) return;
    this.pendingX += dx;
    this.pendingY += dy;
  }

  release(): void {
    this.dragging = false;
  }

  /** Pixels dragged since the last frame, then reset. */
  consume(): { readonly dx: number; readonly dy: number } {
    const moved = { dx: this.pendingX, dy: this.pendingY };
    this.pendingX = 0;
    this.pendingY = 0;
    return moved;
  }
}

export const bulbInput = new BulbInput();
