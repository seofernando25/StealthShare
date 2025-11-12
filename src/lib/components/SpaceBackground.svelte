<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import {
    Scene,
    PerspectiveCamera,
    WebGPURenderer,
    BufferGeometry,
    Float32BufferAttribute,
    PointsMaterial,
    Points,
    PlaneGeometry,
    Mesh,
    Clock,
    MathUtils,
    CanvasTexture,
    RepeatWrapping,
    MeshBasicNodeMaterial,
    Vector2,
    Vector3,
    UniformNode,
  } from "three/webgpu";
  import {
    uniform,
    texture,
    screenUV,
    vec2,
    vec3,
    float,
    int,
    mix,
    cos,
    sin,
    atan,
    length,
    log,
    exp,
    pow,
    abs,
    mul,
    add,
    sub,
  div,
  Loop,
  Fn,
  } from "three/tsl";
  type Vec2Node = ReturnType<typeof vec2>;
import { Pane } from "tweakpane";

const SHOW_FIDDLE = false;

type SpeedBindingApi = {
  on(
    eventName: "change",
    handler: (event: { value: number }) => void,
  ): void;
  dispose(): void;
};

type PaneWithBinding = Pane & {
  addBinding<T extends Record<string, unknown>, K extends keyof T>(
    obj: T,
    key: K,
    params?: {
      label?: string;
      min?: number;
      max?: number;
      step?: number;
    },
  ): SpeedBindingApi;
};

interface Props {
  speed?: number;
}

let { speed = 0.1 }: Props = $props();
const paneParams = {
  speed,
  galaxyColor: { r: 194, g: 191, b: 197 },
  bulbColor: { r: 222, g: 248, b: 250 },
  bulbBlackColor: { r: 0, g: 0, b: 0 },
  skyColor: { r: 1, g: 1, b: 2 },
};

let container: HTMLDivElement | undefined;
let holeMaterial: MeshBasicNodeMaterial | undefined;
let pane: Pane | undefined;
let paneContainer: HTMLDivElement | undefined;
let speedBinding: SpeedBindingApi | undefined;
let galaxyColorBinding: any;
let bulbColorBinding: any;
let bulbBlackColorBinding: any;
let skyColorBinding: any;

let _uSpeedRef: UniformNode<number> | undefined;
let _uGalaxyColorRef: UniformNode<Vector3> | undefined;
let _uBulbColorRef: UniformNode<Vector3> | undefined;
let _uBulbBlackColorRef: UniformNode<Vector3> | undefined;
let _uSkyColorRef: UniformNode<Vector3> | undefined;
$effect(() => {
  if (_uSpeedRef) {
    _uSpeedRef.value = speed;
  }
  paneParams.speed = speed;
  
  // Update color uniforms
  if (_uGalaxyColorRef) {
    _uGalaxyColorRef.value = new Vector3(
      paneParams.galaxyColor.r / 255,
      paneParams.galaxyColor.g / 255,
      paneParams.galaxyColor.b / 255
    );
  }
  if (_uBulbColorRef) {
    _uBulbColorRef.value = new Vector3(
      paneParams.bulbColor.r / 255,
      paneParams.bulbColor.g / 255,
      paneParams.bulbColor.b / 255
    );
  }
  if (_uBulbBlackColorRef) {
    _uBulbBlackColorRef.value = new Vector3(
      paneParams.bulbBlackColor.r / 255,
      paneParams.bulbBlackColor.g / 255,
      paneParams.bulbBlackColor.b / 255
    );
  }
  if (_uSkyColorRef) {
    _uSkyColorRef.value = new Vector3(
      paneParams.skyColor.r / 255,
      paneParams.skyColor.g / 255,
      paneParams.skyColor.b / 255
    );
  }
});

onMount( () => {

  if (!container) {
    return;
  }

  const scene = new Scene();
  const camera = new PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.z = 1.5;

    const renderer = new WebGPURenderer({
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.position = "fixed";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.zIndex = "0";
    renderer.domElement.style.display = "block";
    container.appendChild(renderer.domElement);

    const clock = new Clock();

    const starGeometry = new BufferGeometry();
    const starVertices: number[] = [];
    const starCount = 500;
    for (let i = 0; i < starCount; i += 1) {
      const x = (Math.random() - 0.5) * 200;
      const y = (Math.random() - 0.5) * 200;
      const z = -Math.random() * 200;
      starVertices.push(x, y, z);
    }
    starGeometry.setAttribute(
      "position",
      new Float32BufferAttribute(starVertices, 3),
    );

    const starMaterial = new PointsMaterial({
      color: 0xffffff,
      size: 0.07,
      transparent: true,
      opacity: 0.65,
    });

    const stars = new Points(starGeometry, starMaterial);
    scene.add(stars);

    function createNoiseTexture(size: number) {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Unable to acquire 2D context");
      }

      const imageData = ctx.createImageData(size, size);
      const { data } = imageData;
      for (let i = 0; i < data.length; i += 4) {
        const v = Math.floor(Math.random() * 256);
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = 255;
      }
      ctx.putImageData(imageData, 0, 0);
      return new CanvasTexture(canvas);
    }

    const noiseTexture1 = createNoiseTexture(256);
    const noiseTexture2 = createNoiseTexture(256);
    noiseTexture1.wrapS = noiseTexture1.wrapT = RepeatWrapping;
    noiseTexture2.wrapS = noiseTexture2.wrapT = RepeatWrapping;

    // Constants
    const RETICULATION = 3.0;
    const NB_ARMS = 5.0;
    const COMPR = 0.1;
    const GALAXY_R = 1.0 / 2.0;
    const BULB_R = 1.0 / 2.5;
    const BULB_BLACK_R = 1.0 / 4.0;

    // Uniforms
    const uTime = uniform(0.0);
    const uResolution = uniform(vec2(window.innerWidth, window.innerHeight));
    const uSpeed = uniform(speed);
    _uSpeedRef = uSpeed;
    
    // Color uniforms (initialized with default values)
    const uGalaxyColor = uniform(
      vec3(
        paneParams.galaxyColor.r / 255,
        paneParams.galaxyColor.g / 255,
        paneParams.galaxyColor.b / 255
      )
    );
    _uGalaxyColorRef = uGalaxyColor;
    
    const uBulbColor = uniform(
      vec3(
        paneParams.bulbColor.r / 255,
        paneParams.bulbColor.g / 255,
        paneParams.bulbColor.b / 255
      )
    );
    _uBulbColorRef = uBulbColor;
    
    const uBulbBlackColor = uniform(
      vec3(
        paneParams.bulbBlackColor.r / 255,
        paneParams.bulbBlackColor.g / 255,
        paneParams.bulbBlackColor.b / 255
      )
    );
    _uBulbBlackColorRef = uBulbBlackColor;
    
    const uSkyColor = uniform(
      vec3(
        paneParams.skyColor.r / 255,
        paneParams.skyColor.g / 255,
        paneParams.skyColor.b / 255
      )
    );
    _uSkyColorRef = uSkyColor;

    // Textures
    const iChannel0 = texture(noiseTexture1);
    const iChannel1 = texture(noiseTexture2);

    // Compute noise inline using TSL Loop
    const computeNoise = Fn((inputs: { uv: Vec2Node }) => {
      const { uv } = inputs;
      const a = mul(-1.0, mul(uSpeed, uTime));
      const co = cos(a);
      const si = sin(a);
      const negSi = mul(-1.0, si);
      
      const v = float(0.0).toVar();
      const s = float(1.0).toVar();
      const currentUV = uv.toVar();

      Loop(int(7), () => {
        // Manual 2D rotation: [cos, -sin; sin, cos]
        const rotX = add(mul(co, currentUV.x), mul(negSi, currentUV.y));
        const rotY = add(mul(si, currentUV.x), mul(co, currentUV.y));
        currentUV.assign(vec2(rotX, rotY));
        
        const n = iChannel0.sample(mul(currentUV, s)).r;
        const b = sub(1.0, abs(sub(mul(2.0, n), 1.0)));
        v.addAssign(div(pow(b, RETICULATION), s));
        s.mulAssign(2.0);
      });

      return div(v, 2.0);
    });

    const galaxyColor = Fn(() => {
      // Get screen coordinates
      const fragCoord = screenUV.mul(uResolution);
      const aspect = div(uResolution.x, uResolution.y);
      const screenUVScaled = sub(
        div(fragCoord, uResolution.y),
        vec2(mul(0.5, aspect), 0.5)
      );

      // Calculate polar coordinates
      const rho = length(screenUVScaled);
      const ang = atan(screenUVScaled.y, screenUVScaled.x);
      const shear = mul(2.0, log(rho));
      const c = cos(shear);
      const s_val = sin(shear);
      const negSVal = mul(-1.0, s_val);

      // Galaxy profile
      const r_galaxy = div(rho, GALAXY_R);
      const dens = exp(mul(-1.0, mul(r_galaxy, r_galaxy))).toVar();
      const r_bulb = div(rho, BULB_R);
      const bulb = exp(mul(-1.0, mul(r_bulb, r_bulb)));
      const r_bulb_black = div(rho, BULB_BLACK_R);
      const bulb_black = exp(mul(-1.0, mul(r_bulb_black, r_bulb_black)));

      // Spiral arms
      const phase = mul(NB_ARMS, sub(ang, shear));
      const ang_modified = add(
        sub(ang, mul(COMPR, cos(phase))),
        mul(uSpeed, uTime)
      );
      const uv_spiral = mul(rho, vec2(cos(ang_modified), sin(ang_modified)));

      const spires = add(1.0, mul(NB_ARMS, mul(COMPR, sin(phase))));
      dens.mulAssign(mul(0.7, spires));

      // Gas texture
      const rotatedSpiral = vec2(
        add(mul(c, uv_spiral.x), mul(negSVal, uv_spiral.y)),
        add(mul(s_val, uv_spiral.x), mul(c, uv_spiral.y))
      );
      const gaz = computeNoise({ uv: mul(0.108, rotatedSpiral) });
      const gaz_trsp = pow(sub(1.0, mul(gaz, dens)), 2.0);

      // Stars calculation
      const ratio = div(mul(0.8, uResolution.y), 256.0);
      const stars1 = iChannel1.sample(add(mul(ratio, uv_spiral), 0.5)).r;
      const stars2 = iChannel0.sample(add(mul(ratio, uv_spiral), 0.5)).r;
      const starsValue = pow(
        sub(1.0, mul(sub(1.0, stars1), sub(1.0, stars2))),
        5.0
      );

      // Final color mixing
      let col = mix(
        uSkyColor,
        add(mul(gaz_trsp, mul(1.7, uGalaxyColor)), mul(1.2, starsValue)),
        dens
      );
      col = mix(col, mul(2.0, uBulbColor), mul(1.2, bulb));
      col = mix(col, mul(1.2, uBulbBlackColor), mul(2.0, bulb_black));

      return col;
    });

    // Create material
    const holeGeometry = new PlaneGeometry(1, 1);
    const colorNode = galaxyColor();
    holeMaterial = new MeshBasicNodeMaterial({
      colorNode,
    });

    const holeMesh = new Mesh(holeGeometry, holeMaterial);
    scene.add(holeMesh);

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      uResolution.value = new Vector2(window.innerWidth, window.innerHeight);

      const distance = camera.position.z - holeMesh.position.z;
      const vFov = MathUtils.degToRad(camera.fov);
      const visibleHeight = 2 * Math.tan(vFov / 2) * distance;
      const visibleWidth = visibleHeight * camera.aspect;
      holeMesh.scale.set(visibleWidth, visibleHeight, 1);
    }

    let animationFrame = 0;
    function animate() {
      animationFrame = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
     
      uTime.value = elapsedTime;
      stars.rotation.y += 0.0002;
      stars.rotation.x += 0.0001;
      renderer.render(scene, camera);
    }

    const cleanupFns: Array<() => void> = [];

   


   

    window.addEventListener("resize", onWindowResize);
    cleanupFns.push(() => window.removeEventListener("resize", onWindowResize));

    if (SHOW_FIDDLE) {
      paneContainer = document.createElement("div");
      paneContainer.style.position = "fixed";
      paneContainer.style.top = "1.5rem";
      paneContainer.style.right = "1.5rem";
      paneContainer.style.zIndex = "50";
      paneContainer.style.maxWidth = "240px";
      document.body.appendChild(paneContainer);

      pane = new Pane({
        container: paneContainer,
        title: "Galaxy Fiddle",
      });

      speedBinding = (pane as PaneWithBinding).addBinding(paneParams, "speed", {
        label: "Speed",
        min: 0.01,
        max: 0.6,
        step: 0.01,
      });
      speedBinding?.on("change", (event) => {
        speed = event.value;
      });

      // Add color bindings
      galaxyColorBinding = (pane as PaneWithBinding).addBinding(paneParams, "galaxyColor", {
        label: "Galaxy Color",
      });
      galaxyColorBinding?.on("change", () => {
        if (_uGalaxyColorRef) {
          _uGalaxyColorRef.value = new Vector3(
            paneParams.galaxyColor.r / 255,
            paneParams.galaxyColor.g / 255,
            paneParams.galaxyColor.b / 255
          );
        }
      });

      bulbColorBinding = (pane as PaneWithBinding).addBinding(paneParams, "bulbColor", {
        label: "Bulb Color",
      });
      bulbColorBinding?.on("change", () => {
        if (_uBulbColorRef) {
          _uBulbColorRef.value = new Vector3(
            paneParams.bulbColor.r / 255,
            paneParams.bulbColor.g / 255,
            paneParams.bulbColor.b / 255
          );
        }
      });

      bulbBlackColorBinding = (pane as PaneWithBinding).addBinding(paneParams, "bulbBlackColor", {
        label: "Bulb Black",
      });
      bulbBlackColorBinding?.on("change", () => {
        if (_uBulbBlackColorRef) {
          _uBulbBlackColorRef.value = new Vector3(
            paneParams.bulbBlackColor.r / 255,
            paneParams.bulbBlackColor.g / 255,
            paneParams.bulbBlackColor.b / 255
          );
        }
      });

      skyColorBinding = (pane as PaneWithBinding).addBinding(paneParams, "skyColor", {
        label: "Sky Color",
      });
      skyColorBinding?.on("change", () => {
        if (_uSkyColorRef) {
          _uSkyColorRef.value = new Vector3(
            paneParams.skyColor.r / 255,
            paneParams.skyColor.g / 255,
            paneParams.skyColor.b / 255
          );
        }
      });

      cleanupFns.push(() => {
        speedBinding?.dispose();
        speedBinding = undefined;
        galaxyColorBinding?.dispose();
        galaxyColorBinding = undefined;
        bulbColorBinding?.dispose();
        bulbColorBinding = undefined;
        bulbBlackColorBinding?.dispose();
        bulbBlackColorBinding = undefined;
        skyColorBinding?.dispose();
        skyColorBinding = undefined;
        pane?.dispose();
        pane = undefined;
        paneContainer?.remove();
        paneContainer = undefined;
      });
    }

    renderer.init().then(() => {
      onWindowResize();
      animate();
    });


    return () => {
      cleanupFns.forEach((fn) => fn());
      cancelAnimationFrame(animationFrame);
      renderer.dispose();
      starGeometry.dispose();
      holeGeometry.dispose();
      if (holeMaterial) {
        holeMaterial.dispose();
      }
      noiseTexture1.dispose();
      noiseTexture2.dispose();
      renderer.domElement.remove();
    };
  });

 
</script>

<div class="space-background" bind:this={container} aria-hidden="true"></div>


