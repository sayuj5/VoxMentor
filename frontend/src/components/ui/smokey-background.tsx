/**
 * SmokeyBackground — WebGL animated dark navy/indigo/cyan background.
 * Reacts subtly to mouse position. Falls back to CSS gradient if WebGL unavailable.
 * Properly cleans up RAF and WebGL resources on unmount.
 */
import { useEffect, useRef } from 'react';

const VERT_SRC = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAG_SRC = `
precision mediump float;
uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;

// Smooth noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1,0)), f.x),
    mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
    f.y
  );
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.1 + vec2(1.3, 2.7);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 mouse = u_mouse / u_resolution;

  // Slow drift + subtle mouse influence
  vec2 p = uv * 2.5;
  p += vec2(u_time * 0.04, u_time * 0.025);
  p += (mouse - 0.5) * 0.3;

  float n  = fbm(p);
  float n2 = fbm(p + vec2(n * 1.2, n * 0.8) + vec2(1.7, 9.2));
  float n3 = fbm(p + vec2(n2 * 1.0, n2 * 0.6) + vec2(8.3, 2.8));

  // Deep navy base
  vec3 base   = vec3(0.027, 0.043, 0.082);
  // Indigo/brand mids
  vec3 mid    = vec3(0.094, 0.118, 0.275);
  // Cyan accent
  vec3 accent = vec3(0.051, 0.278, 0.502);

  vec3 col = base;
  col = mix(col, mid,    smoothstep(0.3, 0.7, n));
  col = mix(col, accent, smoothstep(0.55, 0.85, n2) * 0.35);
  col = mix(col, mid,    smoothstep(0.45, 0.75, n3) * 0.2);

  // Subtle vignette
  vec2 vig = uv * (1.0 - uv.yx);
  float v = pow(vig.x * vig.y * 16.0, 0.4);
  col *= v * 0.6 + 0.4;

  gl_FragColor = vec4(col, 1.0);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('[SmokeyBG] shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function SmokeyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef  = useRef<[number, number]>([0, 0]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) {
      // WebGL unavailable — CSS gradient fallback via className
      return;
    }

    // Compile program
    const vert = compileShader(gl, gl.VERTEX_SHADER,   VERT_SRC);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vert || !frag) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[SmokeyBG] program link error:', gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // Full-screen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes  = gl.getUniformLocation(prog, 'u_resolution');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');

    let rafId: number;
    const start = performance.now();

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const render = () => {
      resize();
      const t = (performance.now() - start) / 1000;
      gl.uniform1f(uTime,  t);
      gl.uniform2f(uRes,   canvas.width, canvas.height);
      gl.uniform2f(uMouse, mouseRef.current[0], canvas.height - mouseRef.current[1]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafId = requestAnimationFrame(render);
    };
    render();

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = [e.clientX, e.clientY];
    };
    window.addEventListener('mousemove', onMouseMove);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouseMove);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
    };
  }, []);

  return (
    <>
      {/* WebGL canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="fixed inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
      />
      {/* CSS fallback shown when canvas is not rendered or WebGL unavailable */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          background:
            'radial-gradient(ellipse 80% 60% at 20% 40%, #0d1a4a 0%, transparent 60%),' +
            'radial-gradient(ellipse 60% 50% at 80% 70%, #0a1f3d 0%, transparent 55%),' +
            'radial-gradient(ellipse 50% 40% at 50% 20%, #111c42 0%, transparent 50%),' +
            'linear-gradient(135deg, #070b14 0%, #0c1225 100%)',
        }}
      />
    </>
  );
}
