const MAX_ROTATION = 15;
const FALLBACK_FRAME_MS = 16;

const scheduleFrame = (callback: () => void) => {
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(callback);
  } else {
    setTimeout(callback, FALLBACK_FRAME_MS);
  }
};

import FileFollower from "./components/FileFollower.svelte";

export interface FollowerInstance {
  id: string;
  x: number;
  y: number;
  prevX: number;
  dragoverTimer: number | undefined;
  component: FileFollower;
  api: {
    initialize: (x: number, y: number) => void;
    show: (onComplete?: () => void) => void;
    hide: (onComplete?: () => void) => void;
    updatePosition: (x: number, y: number, rotation: number) => void;
    resetRotation: () => void;
    animateToCenterAndDrop: (startX: number, startY: number, onComplete?: () => void) => void;
    animateToPositionAndDrop: (startX: number, startY: number, targetX: number, targetY: number, onComplete?: () => void) => void;
  };
}

class FileFollowerManager {
  private followers = new Map<string, FollowerInstance>();
  private nextId = 0;

  createFollower(x: number, y: number): string {
    const id = `follower-${this.nextId++}`;
    
    // Create follower instance (will be managed by parent component)
    const follower: FollowerInstance = {
      id,
      x,
      y,
      prevX: x,
      dragoverTimer: undefined,
      component: null as any, // Will be set by parent
      api: null as any, // Will be set by parent
    };

    this.followers.set(id, follower);
    return id;
  }

  registerFollower(id: string, component: FileFollower, api: FollowerInstance["api"]) {
    const follower = this.followers.get(id);
    if (follower) {
      follower.component = component;
      follower.api = api;
    }
  }

  getFollower(id: string): FollowerInstance | undefined {
    return this.followers.get(id);
  }

  getAllFollowers(): FollowerInstance[] {
    return Array.from(this.followers.values());
  }

  updateFollowerPosition(
    id: string,
    x: number,
    y: number,
    options: {
      rotation?: number;
    } = {},
  ) {
    const follower = this.followers.get(id);
    if (!follower) return;
    if (!follower.api) return;

    const deltaX = follower.prevX === follower.x ? 0 : x - follower.prevX;
    follower.prevX = x;
    follower.x = x;
    follower.y = y;

    const rot =
      options.rotation !== undefined
        ? clamp(options.rotation, -MAX_ROTATION, MAX_ROTATION)
        : clamp(deltaX * 1.5, -MAX_ROTATION, MAX_ROTATION);

    follower.api.updatePosition(x, y, rot);

    // Clear existing timer
    if (follower.dragoverTimer !== undefined) {
      window.clearTimeout(follower.dragoverTimer);
    }

    // Set timer to reset rotation when mouse stops
    follower.dragoverTimer = window.setTimeout(() => {
      follower.api.resetRotation();
      follower.dragoverTimer = undefined;
    }, 100);
  }

  removeFollower(id: string) {
    const follower = this.followers.get(id);
    if (follower) {
      if (follower.dragoverTimer !== undefined) {
        window.clearTimeout(follower.dragoverTimer);
      }
      this.followers.delete(id);
    }
  }

  hideFollower(id: string, onRemoved?: () => void) {
    const follower = this.followers.get(id);
    if (follower) {
      if (follower.dragoverTimer !== undefined) {
        window.clearTimeout(follower.dragoverTimer);
        follower.dragoverTimer = undefined;
      }
      follower.api.hide(() => {
        // Let the hide animation complete fully before removing
        // The animation itself handles the fade-out, so we don't need to remove immediately
        if (onRemoved) onRemoved();
      });
    }
  }

  animateToCenterAndDrop(id: string, startX: number, startY: number, onComplete?: () => void) {
    const follower = this.followers.get(id);
    if (!follower) {
      if (onComplete) onComplete();
      return;
    }
    if (!follower.api) {
      scheduleFrame(() => this.animateToCenterAndDrop(id, startX, startY, onComplete));
      return;
    }

    // Clear dragover timer
    if (follower.dragoverTimer !== undefined) {
      window.clearTimeout(follower.dragoverTimer);
      follower.dragoverTimer = undefined;
    }

    follower.api.animateToCenterAndDrop(startX, startY, () => {
      // Remove immediately since hide animation already handles the fade out
      this.removeFollower(id);
      if (onComplete) onComplete();
    });
  }

  animateToPositionAndDrop(
    id: string,
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    onComplete?: () => void
  ) {
    const follower = this.followers.get(id);
    if (!follower) {
      if (onComplete) onComplete();
      return;
    }
    if (!follower.api) {
      scheduleFrame(() => this.animateToPositionAndDrop(id, startX, startY, targetX, targetY, onComplete));
      return;
    }

    // Clear dragover timer
    if (follower.dragoverTimer !== undefined) {
      window.clearTimeout(follower.dragoverTimer);
      follower.dragoverTimer = undefined;
    }

    follower.api.animateToPositionAndDrop(startX, startY, targetX, targetY, () => {
      // Remove immediately since hide animation already handles the fade out
      this.removeFollower(id);
      if (onComplete) onComplete();
    });
  }
}

export const fileFollowerManager = new FileFollowerManager();


function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
