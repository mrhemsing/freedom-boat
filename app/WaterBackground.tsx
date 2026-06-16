"use client";

import { useEffect, useRef } from 'react';

type WaterBackgroundProps = {
  intensity?: number;
  speed?: number;
  fps?: number;
  maxDpr?: number;
};

export default function WaterBackground({
  intensity = 0.45,
  speed = 0.4,
  fps = 30,
  maxDpr = 1.75
}: WaterBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReduced =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const gl = canvas.getContext('webgl', {
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      powerPreference: 'low-power'
    });

    if (!gl) return;

    const VERT = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

    const FRAG = `
precision highp float;

varying vec2 v_uv;
uniform vec2 u_res;
uniform float u_time;
uniform float u_intensity;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = v_uv;
  vec2 p = uv;
  p.x *= u_res.x / u_res.y;

  float t = u_time * 0.04;
  vec2 flow = vec2(t * 0.6, t * 0.15);

  vec2 q = vec2(
    fbm(p * 2.0 + flow),
    fbm(p * 2.0 + flow + vec2(5.2, 1.3))
  );
  vec2 r = vec2(
    fbm(p * 2.0 + 1.5 * q + vec2(1.7, 9.2) + flow * 0.5),
    fbm(p * 2.0 + 1.5 * q + vec2(8.3, 2.8) + flow * 0.5)
  );
  float n = fbm(p * 2.0 + 1.5 * r);

  vec3 deep = vec3(0.035, 0.066, 0.121);
  vec3 mid = vec3(0.086, 0.137, 0.227);
  vec3 col = mix(deep, mid, smoothstep(0.2, 0.8, n));

  float caustic = smoothstep(0.62, 0.92, fbm(r * 3.0 + flow * 2.0));
  vec3 glint = vec3(0.25, 0.55, 0.60);
  col += glint * caustic * 0.06 * u_intensity;

  float center = smoothstep(0.15, 0.7, length(uv - 0.5));
  col *= mix(0.82, 1.0, center);

  col += vec3(0.02, 0.03, 0.05) * smoothstep(0.0, 0.5, uv.y);
  col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;

  gl_FragColor = vec4(col, 1.0);
}`;

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;

      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn('WaterBackground shader error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }

      return shader;
    };

    const vertexShader = compile(gl.VERTEX_SHADER, VERT);
    const fragmentShader = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('WaterBackground link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return;
    }

    gl.useProgram(program);

    const buffer = gl.createBuffer();
    if (!buffer) {
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const resolutionLocation = gl.getUniformLocation(program, 'u_res');
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const intensityLocation = gl.getUniformLocation(program, 'u_intensity');

    if (!resolutionLocation || !timeLocation || !intensityLocation) {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return;
    }

    gl.uniform1f(intensityLocation, intensity);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }

      gl.uniform2f(resolutionLocation, width, height);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    const start = performance.now();
    const frameInterval = 1000 / fps;
    let last = 0;
    let raf = 0;
    let running = true;

    const render = (now: number) => {
      if (!running) return;

      raf = requestAnimationFrame(render);
      if (now - last < frameInterval) return;

      last = now;
      gl.uniform1f(timeLocation, ((now - start) / 1000) * speed);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const drawOnce = () => {
      gl.uniform1f(timeLocation, 12);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
        return;
      }

      if (!prefersReduced) {
        running = true;
        last = 0;
        raf = requestAnimationFrame(render);
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    if (prefersReduced) {
      running = false;
      drawOnce();
    } else {
      raf = requestAnimationFrame(render);
    }

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      resizeObserver.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, [fps, intensity, maxDpr, speed]);

  return <canvas ref={canvasRef} className="waterBackgroundCanvas" aria-hidden="true" />;
}
