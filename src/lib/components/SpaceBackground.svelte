<script lang="ts">
  import { onMount } from "svelte";

  interface Props {
    speed?: number;
  }

  let { speed = 0.1 }: Props = $props();

  // Color constants
  const GALAXY_COL = { r: 194 / 255, g: 191 / 255, b: 197 / 255 };
  const BULB_COL = { r: 222 / 255, g: 248 / 255, b: 250 / 255 };
  const BULB_BLACK_COL = { r: 0, g: 0, b: 0 };
  const SKY_COL = { r: 1 / 255, g: 1 / 255, b: 2 / 255 };

  const vertexShader = `
    attribute vec2 aPosition;
    varying vec2 vUv;

    void main() {
      vUv = aPosition * 0.5 + 0.5; // Convert from [-1,1] to [0,1]
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const fragmentShader = `
    precision highp float;

    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uSpeed;
    uniform sampler2D iChannel0;
    uniform sampler2D iChannel1;
    uniform vec3 uGalaxyColor;
    uniform vec3 uBulbColor;
    uniform vec3 uBulbBlackColor;
    uniform vec3 uSkyColor;

    varying vec2 vUv;

    const float RETICULATION = 3.0;
    const float NB_ARMS = 5.0;
    const float COMPR = 0.1;
    const float GALAXY_R = 1.0 / 2.0;
    const float BULB_R = 1.0 / 2.5;
    const float BULB_BLACK_R = 1.0 / 4.0;
    const float Pi = 3.1415927;

    float tex(vec2 uv) {
      float n = texture2D(iChannel0, uv).r;
      return 1.0 - abs(2.0 * n - 1.0);
    }

    float noise(vec2 uv) {
      float v = 0.0;
      float a = -uSpeed * uTime;
      float co = cos(a);
      float si = sin(a);
      mat2 M = mat2(co, -si, si, co);
      
      const int L = 7;
      float s = 1.0;
      vec2 currentUV = uv;
      
      for (int i = 0; i < L; i++) {
        currentUV = M * currentUV;
        float b = tex(currentUV * s);
        v += (1.0 / s) * pow(b, RETICULATION);
        s *= 2.0;
      }
      
      return v / 2.0;
    }

    void main() {
      vec2 iResolution = uResolution;
      vec2 fragCoord = vUv * iResolution;
      
      float aspect = iResolution.x / iResolution.y;
      vec2 uv = fragCoord / iResolution.y;
      uv -= vec2(0.5 * aspect, 0.5);
      
      vec3 col;
      
      float rho = length(uv);
      float ang = atan(uv.y, uv.x);
      float shear = 2.0 * log(rho);
      float c = cos(shear);
      float s = sin(shear);
      mat2 R = mat2(c, -s, s, c);
      
      float r = rho / GALAXY_R;
      float dens = exp(-r * r);
      r = rho / BULB_R;
      float bulb = exp(-r * r);
      r = rho / BULB_BLACK_R;
      float bulb_black = exp(-r * r);
      
      float phase = NB_ARMS * (ang - shear);
      ang = ang - COMPR * cos(phase) + uSpeed * uTime;
      vec2 uv_spiral = rho * vec2(cos(ang), sin(ang));
      
      float spires = 1.0 + NB_ARMS * COMPR * sin(phase);
      dens *= 0.7 * spires;
      
      float gaz = noise(0.108 * R * uv_spiral);
      float gaz_trsp = pow(1.0 - gaz * dens, 2.0);
      
      float ratio = 0.8 * iResolution.y / 256.0;
      float stars1 = texture2D(iChannel1, ratio * uv_spiral + 0.5).r;
      float stars2 = texture2D(iChannel0, ratio * uv_spiral + 0.5).r;
      float stars = pow(1.0 - (1.0 - stars1) * (1.0 - stars2), 5.0);
      
      col = mix(uSkyColor,
                gaz_trsp * (1.7 * uGalaxyColor) + 1.2 * stars,
                dens);
      col = mix(col, 2.0 * uBulbColor, 1.2 * bulb);
      col = mix(col, 1.2 * uBulbBlackColor, 2.0 * bulb_black);
      
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  let container: HTMLDivElement | undefined;
  let gl: WebGLRenderingContext | null = null;
  let program: WebGLProgram | null = null;
  let animationFrame: number = 0;
  let startTime: number = 0;

  function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }

  function createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
    const program = gl.createProgram();
    if (!program) return null;
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program linking error:", gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    
    return program;
  }

  function createNoiseTexture(gl: WebGLRenderingContext, size: number): WebGLTexture | null {
    const texture = gl.createTexture();
    if (!texture) return null;
    
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    const imageData = new Uint8Array(size * size * 4);
    for (let i = 0; i < imageData.length; i += 4) {
      const v = Math.floor(Math.random() * 256);
      imageData[i] = v;
      imageData[i + 1] = v;
      imageData[i + 2] = v;
      imageData[i + 3] = 255;
    }
    
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, imageData);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    return texture;
  }

  onMount(() => {
    if (!container) return;

    const canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.inset = "0";
    canvas.style.zIndex = "0";
    canvas.style.display = "block";
    container.appendChild(canvas);

    gl = canvas.getContext("webgl");
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    // Create shaders
    const vs = createShader(gl, gl.VERTEX_SHADER, vertexShader);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShader);
    if (!vs || !fs) return;

    // Create program
    program = createProgram(gl, vs, fs);
    if (!program) return;

    // Create fullscreen quad
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]), gl.STATIC_DRAW);

    // Create noise textures
    const noiseTexture1 = createNoiseTexture(gl, 256);
    const noiseTexture2 = createNoiseTexture(gl, 256);
    if (!noiseTexture1 || !noiseTexture2) return;

    // Get attribute and uniform locations
    const positionLocation = gl.getAttribLocation(program, "aPosition");
    const timeLocation = gl.getUniformLocation(program, "uTime");
    const resolutionLocation = gl.getUniformLocation(program, "uResolution");
    const speedLocation = gl.getUniformLocation(program, "uSpeed");
    const galaxyColorLocation = gl.getUniformLocation(program, "uGalaxyColor");
    const bulbColorLocation = gl.getUniformLocation(program, "uBulbColor");
    const bulbBlackColorLocation = gl.getUniformLocation(program, "uBulbBlackColor");
    const skyColorLocation = gl.getUniformLocation(program, "uSkyColor");
    const iChannel0Location = gl.getUniformLocation(program, "iChannel0");
    const iChannel1Location = gl.getUniformLocation(program, "iChannel1");

    function resize() {
      if (!gl || !canvas) return;
      
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    function animate() {
      if (!gl || !program) return;
      
      animationFrame = requestAnimationFrame(animate);
      
      const currentTime = (Date.now() - startTime) / 1000;
      
      gl.useProgram(program);
      
      // Set up attributes
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      
      // Set uniforms
      gl.uniform1f(timeLocation, currentTime);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(speedLocation, speed);
      gl.uniform3f(galaxyColorLocation, GALAXY_COL.r, GALAXY_COL.g, GALAXY_COL.b);
      gl.uniform3f(bulbColorLocation, BULB_COL.r, BULB_COL.g, BULB_COL.b);
      gl.uniform3f(bulbBlackColorLocation, BULB_BLACK_COL.r, BULB_BLACK_COL.g, BULB_BLACK_COL.b);
      gl.uniform3f(skyColorLocation, SKY_COL.r, SKY_COL.g, SKY_COL.b);
      
      // Set textures
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, noiseTexture1);
      gl.uniform1i(iChannel0Location, 0);
      
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, noiseTexture2);
      gl.uniform1i(iChannel1Location, 1);
      
      // Draw
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    startTime = Date.now();
    resize();
    window.addEventListener("resize", resize);
    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      if (gl) {
        gl.deleteProgram(program);
        gl.deleteTexture(noiseTexture1);
        gl.deleteTexture(noiseTexture2);
        gl.deleteBuffer(positionBuffer);
      }
      canvas.remove();
    };
  });
</script>

<div class="space-background" bind:this={container} aria-hidden="true"></div>
