// =============================================================================
// WebGL2-Post-Processor — Spike für Gate G2 (Roadmap Punkt 4)
// -----------------------------------------------------------------------------
// ZWECK: Validieren, ob ein WebGL-Post-Pass (Bloom) auf iOS-Safari (iPhone 14
// Pro) flüssig läuft (60 fps, Speicher unkritisch). BEWUSST KEIN PixiJS — ein
// minimaler eigener WebGL2-Pass beantwortet dieselbe Frage ohne ~400 KB Bundle.
//
// ARCHITEKTUR (additiv, isoliert, abschaltbar):
//   - Das Spiel rendert UNVERÄNDERT auf sein 2D-Canvas (die Quelle).
//   - Dieser Processor besitzt ein eigenes WebGL2-Canvas (Overlay).
//   - Pro Frame: 2D-Canvas → Textur → Bright-Pass (½ Auflösung) → separabler
//     Gauss-Blur (H/V) → additives Composite mit dem Original → sichtbar.
//   - Schlägt irgendetwas fehl (kein WebGL2, Shader-Fehler, Kontextverlust),
//     meldet `available=false`; der Aufrufer bleibt dann bei reinem Canvas-2D.
//
// Diese Datei hat KEINE Abhängigkeiten und berührt die 2D-Pipeline nicht.
// =============================================================================

const QUAD_VS = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

// Bright-Pass: nur Bereiche oberhalb einer Luminanz-Schwelle behalten, weich.
const BRIGHT_FS = `#version 300 es
precision mediump float;
in vec2 v_uv;
uniform sampler2D u_src;
uniform float u_threshold;
out vec4 o;
void main() {
  vec3 c = texture(u_src, v_uv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float k = smoothstep(u_threshold, u_threshold + 0.25, l);
  o = vec4(c * k, 1.0);
}`;

// Separabler 9-Tap-Gauss. Richtung als uniform (texelweise H oder V).
const BLUR_FS = `#version 300 es
precision mediump float;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_dir;      // (texelW,0) horizontal | (0,texelH) vertikal
out vec4 o;
void main() {
  float w0 = 0.227027;
  float w1 = 0.316216;
  float w2 = 0.070270;
  float w3 = 0.008216;
  vec3 sum = texture(u_tex, v_uv).rgb * w0;
  sum += texture(u_tex, v_uv + u_dir * 1.0).rgb * w1;
  sum += texture(u_tex, v_uv - u_dir * 1.0).rgb * w1;
  sum += texture(u_tex, v_uv + u_dir * 2.5).rgb * w2;
  sum += texture(u_tex, v_uv - u_dir * 2.5).rgb * w2;
  sum += texture(u_tex, v_uv + u_dir * 4.5).rgb * w3;
  sum += texture(u_tex, v_uv - u_dir * 4.5).rgb * w3;
  o = vec4(sum, 1.0);
}`;

// Composite: Original + Bloom*Intensität (additiv).
const COMPOSITE_FS = `#version 300 es
precision mediump float;
in vec2 v_uv;
uniform sampler2D u_src;
uniform sampler2D u_bloom;
uniform float u_intensity;
out vec4 o;
void main() {
  vec3 base = texture(u_src, v_uv).rgb;
  vec3 bloom = texture(u_bloom, v_uv).rgb;
  o = vec4(base + bloom * u_intensity, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn('[webgl_post] Shader-Fehler:', gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function link(gl: WebGL2RenderingContext, vs: WebGLShader, fs: WebGLShader): WebGLProgram | null {
  const p = gl.createProgram();
  if (!p) return null;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.bindAttribLocation(p, 0, 'a_pos');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.warn('[webgl_post] Link-Fehler:', gl.getProgramInfoLog(p));
    return null;
  }
  return p;
}

interface Fbo { fb: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number; }

export class WebGLPostProcessor {
  readonly available: boolean = false;
  private gl: WebGL2RenderingContext | null = null;
  private canvas: HTMLCanvasElement;
  private progBright: WebGLProgram | null = null;
  private progBlur: WebGLProgram | null = null;
  private progComposite: WebGLProgram | null = null;
  private quad: WebGLBuffer | null = null;
  private srcTex: WebGLTexture | null = null;
  private fboA: Fbo | null = null;
  private fboB: Fbo | null = null;
  // P1-4: Uniform-Locations EINMAL beim Linken auflösen statt pro Frame
  // (getUniformLocation ist ein GL-Roundtrip; hier 8× pro Frame vermeidbar).
  private uL: {
    brightSrc: WebGLUniformLocation | null; brightThr: WebGLUniformLocation | null;
    blurTex: WebGLUniformLocation | null; blurDir: WebGLUniformLocation | null;
    compSrc: WebGLUniformLocation | null; compBloom: WebGLUniformLocation | null;
    compInt: WebGLUniformLocation | null;
  } | null = null;
  private dispW = 0;
  private dispH = 0;
  /** Bloom-Stärke und Schwelle — dezent justiert nach iPhone-Validierung
   *  (Gate G2): weniger additiver Beitrag (war 0.85) und höhere Schwelle
   *  (war 0.62), damit nur wirklich helle Stellen blühen und das Gesamtbild
   *  nicht aufgehellt wirkt. */
  intensity = 0.5;
  threshold = 0.72;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      alpha: false, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: false, preserveDrawingBuffer: false,
    }) as WebGL2RenderingContext | null;
    if (!gl) {
      return;
    }
    this.gl = gl;

    const vs = compile(gl, gl.VERTEX_SHADER, QUAD_VS);
    const fsBright = compile(gl, gl.FRAGMENT_SHADER, BRIGHT_FS);
    const fsBlur = compile(gl, gl.FRAGMENT_SHADER, BLUR_FS);
    const fsComp = compile(gl, gl.FRAGMENT_SHADER, COMPOSITE_FS);
    if (!vs || !fsBright || !fsBlur || !fsComp) return;
    this.progBright = link(gl, vs, fsBright);
    this.progBlur = link(gl, vs, fsBlur);
    this.progComposite = link(gl, vs, fsComp);
    if (!this.progBright || !this.progBlur || !this.progComposite) return;

    // Uniform-Locations einmalig cachen (P1-4).
    this.uL = {
      brightSrc: gl.getUniformLocation(this.progBright, 'u_src'),
      brightThr: gl.getUniformLocation(this.progBright, 'u_threshold'),
      blurTex: gl.getUniformLocation(this.progBlur, 'u_tex'),
      blurDir: gl.getUniformLocation(this.progBlur, 'u_dir'),
      compSrc: gl.getUniformLocation(this.progComposite, 'u_src'),
      compBloom: gl.getUniformLocation(this.progComposite, 'u_bloom'),
      compInt: gl.getUniformLocation(this.progComposite, 'u_intensity'),
    };

    // Fullscreen-Quad (zwei Dreiecke).
    this.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
    ]), gl.STATIC_DRAW);

    // Quelltextur (wird pro Frame aus dem 2D-Canvas befüllt).
    this.srcTex = this.makeTex();

    (this as { available: boolean }).available = true;
  }

  private makeTex(): WebGLTexture | null {
    const gl = this.gl!;
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  private makeFbo(w: number, h: number): Fbo | null {
    const gl = this.gl!;
    const tex = this.makeTex()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fb, tex, w, h };
  }

  /** Backing-Store des WebGL-Canvas + Half-Res-FBOs an Anzeigegröße anpassen. */
  resize(displayW: number, displayH: number, dpr: number) {
    if (!this.available || !this.gl) return;
    const gl = this.gl;
    const bw = Math.max(1, Math.round(displayW * dpr));
    const bh = Math.max(1, Math.round(displayH * dpr));
    if (bw === this.dispW && bh === this.dispH) return;
    this.dispW = bw; this.dispH = bh;
    this.canvas.width = bw;
    this.canvas.height = bh;
    this.canvas.style.width = `${displayW}px`;
    this.canvas.style.height = `${displayH}px`;
    const hw = Math.max(1, bw >> 1);
    const hh = Math.max(1, bh >> 1);
    if (this.fboA) { gl.deleteFramebuffer(this.fboA.fb); gl.deleteTexture(this.fboA.tex); }
    if (this.fboB) { gl.deleteFramebuffer(this.fboB.fb); gl.deleteTexture(this.fboB.tex); }
    this.fboA = this.makeFbo(hw, hh);
    this.fboB = this.makeFbo(hw, hh);
  }

  private drawQuad() {
    const gl = this.gl!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /** Kompletter Bloom-Pass: 2D-Canvas (Quelle) → Bildschirm. */
  render(source: HTMLCanvasElement) {
    if (!this.available || !this.gl || !this.fboA || !this.fboB) return;
    const gl = this.gl;
    const pBright = this.progBright, pBlur = this.progBlur, pComp = this.progComposite;
    if (!pBright || !pBlur || !pComp || !this.uL) return;
    const uL = this.uL;

    // Quelle hochladen.
    gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

    // 1) Bright-Pass → fboA (half-res).
    gl.useProgram(pBright);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboA.fb);
    gl.viewport(0, 0, this.fboA.w, this.fboA.h);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
    gl.uniform1i(uL.brightSrc, 0);
    gl.uniform1f(uL.brightThr, this.threshold);
    this.drawQuad();

    // 2) Blur horizontal (fboA → fboB) und vertikal (fboB → fboA).
    gl.useProgram(pBlur);
    const texelW = 1 / this.fboA.w;
    const texelH = 1 / this.fboA.h;
    // H
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboB.fb);
    gl.viewport(0, 0, this.fboB.w, this.fboB.h);
    gl.bindTexture(gl.TEXTURE_2D, this.fboA.tex);
    gl.uniform1i(uL.blurTex, 0);
    gl.uniform2f(uL.blurDir, texelW, 0);
    this.drawQuad();
    // V
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboA.fb);
    gl.viewport(0, 0, this.fboA.w, this.fboA.h);
    gl.bindTexture(gl.TEXTURE_2D, this.fboB.tex);
    gl.uniform2f(uL.blurDir, 0, texelH);
    this.drawQuad();

    // 3) Composite → Bildschirm.
    gl.useProgram(pComp);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.dispW, this.dispH);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
    gl.uniform1i(uL.compSrc, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.fboA.tex);
    gl.uniform1i(uL.compBloom, 1);
    gl.uniform1f(uL.compInt, this.intensity);
    this.drawQuad();
  }

  dispose() {
    const gl = this.gl;
    if (!gl) return;
    if (this.fboA) { gl.deleteFramebuffer(this.fboA.fb); gl.deleteTexture(this.fboA.tex); }
    if (this.fboB) { gl.deleteFramebuffer(this.fboB.fb); gl.deleteTexture(this.fboB.tex); }
    if (this.srcTex) gl.deleteTexture(this.srcTex);
    if (this.quad) gl.deleteBuffer(this.quad);
    if (this.progBright) gl.deleteProgram(this.progBright);
    if (this.progBlur) gl.deleteProgram(this.progBlur);
    if (this.progComposite) gl.deleteProgram(this.progComposite);
    this.fboA = this.fboB = null;
  }
}
