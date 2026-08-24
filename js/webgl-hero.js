// Optional, lightweight WebGL hero background. Skips entirely on
// prefers-reduced-motion, missing WebGL support, or if the OGL module fails
// to load — the hero looks and works fine without it either way.
export async function initWebglHero() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const testCtx = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!testCtx) return;

  let OGL;
  try {
    OGL = await import('https://cdn.jsdelivr.net/npm/ogl@1.0.6/src/index.js');
  } catch (err) {
    console.warn('WebGL hero effect skipped (OGL failed to load):', err);
    return;
  }

  const { Renderer, Program, Mesh, Triangle } = OGL;

  const renderer = new Renderer({ canvas, alpha: true, dpr: Math.min(window.devicePixelRatio, 2) });
  const gl = renderer.gl;

  const geometry = new Triangle(gl);

  const program = new Program(gl, {
    vertex: /* glsl */ `
      attribute vec2 uv;
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 0, 1);
      }
    `,
    fragment: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec2 uResolution;

      float noise(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
        vec2 uv = vUv;
        uv.x *= uResolution.x / uResolution.y;

        float t = uTime * 0.05;
        float n = noise(floor(uv * 40.0) + t);
        float glow = smoothstep(0.4, 0.9, 1.0 - distance(uv, vec2(0.75, 0.6)));

        vec3 accent = vec3(0.243, 1.0, 0.639);
        vec3 base = vec3(0.0);
        vec3 color = mix(base, accent, glow * 0.35 + n * 0.03);

        gl_FragColor = vec4(color, glow * 0.5 + n * 0.02);
      }
    `,
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: [canvas.clientWidth, canvas.clientHeight] },
    },
  });

  const mesh = new Mesh(gl, { geometry, program });

  function resize() {
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    program.uniforms.uResolution.value = [canvas.clientWidth, canvas.clientHeight];
  }
  window.addEventListener('resize', resize);
  resize();

  let rafId;
  function update(t) {
    program.uniforms.uTime.value = t * 0.001;
    renderer.render({ scene: mesh });
    rafId = requestAnimationFrame(update);
  }
  rafId = requestAnimationFrame(update);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
    } else {
      rafId = requestAnimationFrame(update);
    }
  });
}
