import { get, writable, type Writable } from "svelte/store";
import { fileFollowerManager, type FollowerInstance } from "./fileFollowerManager";
import type FileFollower from "./components/FileFollower.svelte";

type FollowerOffsets = {
  offsetX: number;
  offsetY: number;
};

type FollowerConfig = {
  id: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
};

const DEFAULT_DRAG_OFFSET_RATIO = 0.05;
const DEFAULT_TARGET_OFFSET_RATIO = 0.1;

const randomOffset = (range: number) => (Math.random() * 2 - 1) * range;

export interface DragVisualManager {
  activeFollowers: Writable<Map<string, FollowerInstance>>;
  registerComponent: (id: string, component: FileFollower) => void;
  handleDragEnter: (event: DragEvent) => void;
  handleDragOver: (event: DragEvent) => void;
  handleDragLeave: (event: DragEvent) => void;
  handleDrop: (event: DragEvent) => Promise<FileList | null>;
  simulateSelectionAnimation: (startX: number, startY: number, count: number) => Promise<void>;
  cleanup: () => void;
}

export function createDragVisualManager(): DragVisualManager {
  const activeFollowers = writable<Map<string, FollowerInstance>>(new Map());
  let currentDragFollowerIds: string[] = [];
  const followerOffsets = new Map<string, FollowerOffsets>();
  const registeredComponents = new Set<string>();
  const pendingResolvers = new Map<string, Array<() => void>>();
  let lastPointerPosition: { x: number; y: number } | null = null;

  const updateActiveFollowers = (updater: (map: Map<string, FollowerInstance>) => Map<string, FollowerInstance>) => {
    activeFollowers.update((map) => updater(map));
  };



  const registerPendingResolver = (id: string, resolver: () => void) => {
    const existing = pendingResolvers.get(id);
    if (existing) {
      existing.push(resolver);
    } else {
      pendingResolvers.set(id, [resolver]);
    }
  };

  const resolvePendingResolvers = (id: string) => {
    const resolvers = pendingResolvers.get(id);
    if (!resolvers) return;
    resolvers.forEach((resolve) => resolve());
    pendingResolvers.delete(id);
  };

  const waitForFollowerReady = (id: string): Promise<void> => {
    const follower = fileFollowerManager.getFollower(id);
    if (follower?.component && follower.api) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      registerPendingResolver(id, resolve);
    });
  };

  const createFollower = (
    x: number,
    y: number,
    options: { trackDrag?: boolean; offsetX?: number; offsetY?: number } = {},
  ): string | undefined => {
    const id = fileFollowerManager.createFollower(x, y);
    const instance = fileFollowerManager.getFollower(id);
    if (!instance) {
      return undefined;
    }

    if (options.trackDrag) {
      currentDragFollowerIds.push(id);
      followerOffsets.set(id, {
        offsetX: options.offsetX ?? 0,
        offsetY: options.offsetY ?? 0,
      });
    }

    updateActiveFollowers((map) => {
      const next = new Map(map);
      next.set(id, instance);
      return next;
    });

    return id;
  };

  const hideFollower = (id: string) => {
    fileFollowerManager.hideFollower(id);
  };

  const hideFollowers = (ids: string[]) => {
    ids.forEach((id) => hideFollower(id));
    currentDragFollowerIds = currentDragFollowerIds.filter((id) => !ids.includes(id));
  };

  const clearCurrentDragState = () => {
    followerOffsets.clear();
    currentDragFollowerIds = [];
    lastPointerPosition = null;
  };

  const ensureFollowersForCount = async (
    count: number,
    originX: number,
    originY: number,
    options: { trackDrag?: boolean } = {},
  ) => {
    let followerIds = [...currentDragFollowerIds];

    if (followerIds.length === 0) {
      for (let i = 0; i < count; i++) {
        const offsetX = randomOffset(dropOffset());
        const offsetY = randomOffset(dropOffset());
        const id = createFollower(originX + offsetX, originY + offsetY, {
          trackDrag: options.trackDrag,
          offsetX,
          offsetY,
        });
        if (id) {
          await waitForFollowerReady(id);
          followerIds.push(id);
        }
      }
    } else {
      if (followerIds.length > count) {
        const extras = followerIds.slice(count);
        hideFollowers(extras);
        followerIds = followerIds.slice(0, count);
      } else if (followerIds.length < count) {
        const missing = count - followerIds.length;
        for (let i = 0; i < missing; i++) {
          const offsetX = randomOffset(dropOffset());
          const offsetY = randomOffset(dropOffset());
          const id = createFollower(originX + offsetX, originY + offsetY, {
            trackDrag: options.trackDrag,
            offsetX,
            offsetY,
          });
          if (id) {
            await waitForFollowerReady(id);
            followerIds.push(id);
          }
        }
      }
    }

    if (!options.trackDrag) {
      clearCurrentDragState();
    }

    return followerIds;
  };

  const buildFollowerConfigs = (
    followerIds: string[],
    fallbackX: number,
    fallbackY: number,
    targetOriginX: number,
    targetOriginY: number,
    fileCount: number,
  ): FollowerConfig[] =>
    followerIds.map((id) => {
      const follower = fileFollowerManager.getFollower(id);
      const startX = follower?.x ?? fallbackX;
      const startY = follower?.y ?? fallbackY;

      if (fileCount === 1) {
        return {
          id,
          startX,
          startY,
          targetX: targetOriginX,
          targetY: targetOriginY,
        };
      }

      const finalOffsetX = randomOffset(targetOffset());
      const finalOffsetY = randomOffset(targetOffset());

      return {
        id,
        startX,
        startY,
        targetX: targetOriginX + finalOffsetX,
        targetY: targetOriginY + finalOffsetY,
      };
    });

  const animateFollowerConfigs = async (configs: FollowerConfig[], fileCount: number) => {
    await Promise.all(
      configs.map(({ id, startX, startY, targetX, targetY }) => {
        return new Promise<void>((resolve) => {
          const done = () => {
            // The animation in FileFollower.svelte now handles the fade-out completely
            // The cleanup will be handled by the component's own lifecycle
            resolve();
          };

          if (fileCount === 1) {
            fileFollowerManager.animateToCenterAndDrop(id, startX, startY, done);
          } else {
            fileFollowerManager.animateToPositionAndDrop(id, startX, startY, targetX, targetY, done);
          }
        });
      }),
    );
  };

  const dropOffset = () =>
    Math.max(window.innerWidth, window.innerHeight) * DEFAULT_DRAG_OFFSET_RATIO;

  const targetOffset = () =>
    Math.max(window.innerWidth, window.innerHeight) * DEFAULT_TARGET_OFFSET_RATIO;

  const handleDragEnter = (event: DragEvent) => {
    if (typeof window === "undefined") return;
    event.preventDefault();

    const pointerX = event.clientX || window.innerWidth / 2;
    const pointerY = event.clientY || window.innerHeight / 2;
    lastPointerPosition = { x: pointerX, y: pointerY };

    hideFollowers([...currentDragFollowerIds]);
    clearCurrentDragState();

    const itemCount = event.dataTransfer?.items?.length ?? 1;
    const followerCount = Math.max(1, itemCount);
    const spread = dropOffset();

    for (let i = 0; i < followerCount; i++) {
      const offsetX = followerCount === 1 ? 0 : randomOffset(spread);
      const offsetY = followerCount === 1 ? 0 : randomOffset(spread);
      createFollower(pointerX + offsetX, pointerY + offsetY, {
        trackDrag: true,
        offsetX,
        offsetY,
      });
    }
  };

  const handleDragOver = (event: DragEvent) => {
    if (typeof window === "undefined") return;
    if (currentDragFollowerIds.length === 0) return;

    event.preventDefault();

    const pointerX = event.clientX;
    const pointerY = event.clientY;

    let rotation = 0;
    if (lastPointerPosition) {
      const deltaX = pointerX - lastPointerPosition.x;
      const deltaY = pointerY - lastPointerPosition.y;
      if (deltaX !== 0 || deltaY !== 0) {
        const angleRad = Math.atan2(deltaX, -deltaY);
        const angleDeg = angleRad * (180 / Math.PI);
        rotation = Math.max(-15, Math.min(15, angleDeg * 0.3));
      }
    }
    lastPointerPosition = { x: pointerX, y: pointerY };

    currentDragFollowerIds.forEach((id) => {
      const offset = followerOffsets.get(id) ?? { offsetX: 0, offsetY: 0 };
      fileFollowerManager.updateFollowerPosition(id, pointerX + offset.offsetX, pointerY + offset.offsetY, {
        rotation,
      });
    });
  };

  const handleDragLeave = (event: DragEvent) => {
    if (typeof window === "undefined") return;
    if (event.relatedTarget !== null) return;

    hideFollowers([...currentDragFollowerIds]);
    clearCurrentDragState();
  };

  const handleDrop = async (event: DragEvent): Promise<FileList | null> => {
    if (typeof window === "undefined") return null;
    const files = event.dataTransfer?.files;
    event.preventDefault();

    if (!files || files.length === 0) {
      hideFollowers([...currentDragFollowerIds]);
      clearCurrentDragState();
      return null;
    }

    const fileCount = files.length;
    const dropX = event.clientX || window.innerWidth / 2;
    const dropY = event.clientY || window.innerHeight / 2;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    const followerIds = await ensureFollowersForCount(fileCount, dropX, dropY);
    const configs = buildFollowerConfigs(followerIds, dropX, dropY, centerX, centerY, fileCount);

    animateFollowerConfigs(configs, fileCount);
    clearCurrentDragState();
    return files;
  };

  const simulateSelectionAnimation = async (startX: number, startY: number, count: number): Promise<void> => {
    if (typeof window === "undefined") return;

    const fileCount = Math.max(1, count);
    const followerIds = await ensureFollowersForCount(fileCount, startX, startY);
    const configs = buildFollowerConfigs(
      followerIds,
      startX,
      startY,
      window.innerWidth / 2,
      window.innerHeight / 2,
      fileCount,
    );

    await animateFollowerConfigs(configs, fileCount);

    clearCurrentDragState();
  };

  const registerComponent = (id: string, component: FileFollower) => {
    if (registeredComponents.has(id)) return;
    const follower = fileFollowerManager.getFollower(id);
    if (!follower || !component?.api) return;

    fileFollowerManager.registerFollower(id, component, component.api);
    registeredComponents.add(id);

    updateActiveFollowers((map) => {
      const next = new Map(map);
      const instance = next.get(id);
      if (instance) {
        instance.component = component;
        instance.api = component.api;
      }
      return next;
    });

    resolvePendingResolvers(id);
  };

  const cleanup = () => {
    const ids = Array.from(get(activeFollowers).keys());
    hideFollowers(ids);
    pendingResolvers.clear();
    clearCurrentDragState();
  };

  return {
    activeFollowers,
    registerComponent,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    simulateSelectionAnimation,
    cleanup,
  };
}
