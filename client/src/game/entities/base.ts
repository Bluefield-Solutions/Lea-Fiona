import { Direction, EntityType } from '../constants';

export interface AABB {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class Entity {
  x: number;
  y: number;
  width: number;
  height: number;
  velX = 0;
  velY = 0;
  type: EntityType;
  alive = true;
  frame = 0;
  direction: Direction = Direction.RIGHT;
  onGround = false;
  hitFlash = 0; // >0: kurzes weißes Treffer-Aufblitzen (Frames)

  constructor(x: number, y: number, width: number, height: number, type: EntityType) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;
  }

  get bounds(): AABB {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  update(_dt: number) {
    this.frame++;
    if (this.hitFlash > 0) this.hitFlash--;
  }

  intersects(other: Entity): boolean {
    return (
      this.x < other.x + other.width &&
      this.x + this.width > other.x &&
      this.y < other.y + other.height &&
      this.y + this.height > other.y
    );
  }

  intersectsAABB(box: AABB): boolean {
    return (
      this.x < box.x + box.width &&
      this.x + this.width > box.x &&
      this.y < box.y + box.height &&
      this.y + this.height > box.y
    );
  }
}
