<script lang="ts">
  import { gsap } from "gsap";

  interface Props {
    id: string;
    initialX: number;
    initialY: number;
    onComplete?: (() => void) | undefined;
  }

  let { id, initialX, initialY, onComplete }: Props = $props();

  let followerEl = $state<HTMLDivElement | undefined>(undefined);
  let initialized = $state(false);

  const FOLLOW_TWEEN_DURATION = 0.65;
  const FOLLOW_TWEEN_EASE = "power3.out";
  const SHOW_TWEEN_DURATION = 0.3;
  const HIDE_TWEEN_DURATION = 0.3;
  const RESET_ROTATION_DURATION = 0.5;
  const DROP_SPIN_DURATION = 0.75;

  const initialize = (x: number, y: number) => {
    if (!followerEl) return;
    gsap.set(followerEl, {
      x,
      y,
      xPercent: -50,
      yPercent: -50,
      opacity: 0,
      scale: 0,
      rotation: 0,
    });
  };

  const show = (onComplete?: () => void) => {
    if (!followerEl) return;
    gsap.to(followerEl, {
      duration: SHOW_TWEEN_DURATION,
      opacity: 1,
      scale: 1,
      ease: "power2.out",
      onComplete,
    });
  };

  const hide = (onComplete?: () => void) => {
    if (!followerEl) {
      if (onComplete) onComplete();
      return;
    }
    gsap.to(followerEl, {
      duration: HIDE_TWEEN_DURATION,
      opacity: 0,
      scale: 0,
      rotation: 0,
      ease: "power2.in",
      onComplete,
    });
  };

  const updatePosition = (x: number, y: number, rotation: number) => {
    if (!followerEl) return;
    gsap.to(followerEl, {
      duration: FOLLOW_TWEEN_DURATION,
      x,
      y,
      rotation,
      ease: FOLLOW_TWEEN_EASE,
      overwrite: "auto",
    });
  };

  const resetRotation = () => {
    if (!followerEl) return;
    gsap.to(followerEl, {
      duration: RESET_ROTATION_DURATION,
      rotation: 0,
      ease: "power2.out",
    });
  };

  const animateToCenterAndDrop = (
    startX: number,
    startY: number,
    onComplete?: () => void
  ) => {
    if (typeof window === 'undefined' || !followerEl) {
      if (onComplete) onComplete();
      return;
    }

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    animateToPositionAndDrop(startX, startY, centerX, centerY, onComplete);
  };

  const animateToPositionAndDrop = (
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    onComplete?: () => void
  ) => {
    if (typeof window === 'undefined' || !followerEl) {
      if (onComplete) onComplete();
      return;
    }

    const distance = Math.sqrt(
      Math.pow(targetX - startX, 2) + Math.pow(targetY - startY, 2)
    );
    const duration = Math.min(1.5, distance / 500);

    // Random rotation 50% +360 degrees, 50% -360 degrees
    const rotation = Math.random() < 0.5 ? 360 : -360;

    // Move toward target position with one full spin
    gsap.to(followerEl, {
      duration,
      x: targetX,
      y: targetY,
      rotation: "+=" + rotation,
      ease: "sine.inOut",
      onComplete: () => {
        // Final drop animation - scale down without additional rotation
        if (followerEl) {
          gsap.to(followerEl, {
            duration: DROP_SPIN_DURATION,
            scale: 0,
            opacity: 0,
            ease: "power2.in",
            onComplete: () => {
              if (onComplete) onComplete();
            },
          });
        } else {
          // Component was removed, but still call onComplete to avoid hanging
          if (onComplete) onComplete();
        }
      },
    });
  };

  // Expose methods to parent
  export const api = {
    initialize,
    show,
    hide,
    updatePosition,
    resetRotation,
    animateToCenterAndDrop,
    animateToPositionAndDrop,
  };

  // Initialize on mount using $effect
  $effect(() => {
    if (followerEl && typeof window !== 'undefined' && !initialized) {
      initialized = true;
      initialize(initialX, initialY);
      show();
    }
  });
</script>

<div
  bind:this={followerEl}
  class="pointer-events-none fixed top-0 left-0 z-20"
  style="opacity: 0; transform: scale(0);"
>
  <svg
    class="w-24 h-24 text-white/90 drop-shadow-lg"
    fill-rule="evenodd"
    clip-rule="evenodd"
    stroke-linejoin="round"
    stroke-miterlimit="2"
    viewBox="0 0 64 64"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    stroke="currentColor"
  >
    <path
      d="M50.485 18.068l-14.53-14.531c-.579-.579-1.34-1.01-2.148-1.282-.808-.272-1.666-.409-2.529-.409H14.167c-1.591 0-3.117.632-4.242 1.758-1.125 1.125-1.758 2.651-1.758 4.242v48.267c0 1.591.633 3.117 1.758 4.242 1.125 1.126 2.651 1.758 4.242 1.758h35.666c1.591 0 3.117-.632 4.242-1.758 1.126-1.125 1.758-2.651 1.758-4.242V22.793c0-1.765-.705-3.46-1.954-4.725z"
      stroke-width="3"
      stroke="#fff"
      fill="rgba(60, 60, 60, 0.7)"
    />
    <path
      d="M49.833 18.146H34.861c-1.591 0-2.883-1.291-2.883-2.883V.291"
      stroke-width="3"
      stroke="#fff"
      fill="none"
    />
  </svg>
</div>
