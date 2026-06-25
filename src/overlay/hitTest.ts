export interface Point {
  x: number;
  y: number;
}

export interface PetBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StageSize {
  width: number;
  height: number;
}

export const TRASH_ZONE_SIZE = 120;
export const TRASH_ZONE_MARGIN = 24;

/** Bottom-right drop zone shown while a pet is being dragged. */
export function getTrashZone(bounds: StageSize) {
  return {
    x: Math.max(0, bounds.width - TRASH_ZONE_SIZE - TRASH_ZONE_MARGIN),
    y: Math.max(0, bounds.height - TRASH_ZONE_SIZE - TRASH_ZONE_MARGIN),
    width: TRASH_ZONE_SIZE,
    height: TRASH_ZONE_SIZE
  };
}

export function isPointInTrashZone(point: Point, bounds: StageSize) {
  const zone = getTrashZone(bounds);
  return (
    point.x >= zone.x && point.x <= zone.x + zone.width && point.y >= zone.y && point.y <= zone.y + zone.height
  );
}

export function findPetAtPoint(point: Point, boxes: PetBox[], padding = 0): string | null {
  for (let index = boxes.length - 1; index >= 0; index -= 1) {
    const box = boxes[index];
    const inside =
      point.x >= box.x - padding &&
      point.x <= box.x + box.width + padding &&
      point.y >= box.y - padding &&
      point.y <= box.y + box.height + padding;
    if (inside) {
      return box.id;
    }
  }
  return null;
}
