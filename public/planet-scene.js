/**
 * Burgundy Cosmos / a small, self-contained WebGL 1 scene.
 *
 * The silhouette and light remain in world space while a spherical material
 * rotates around its Y axis. The generated map is sampled on a sphere, so its
 * longitudinal seam and poles are continuous; it is not a rotating flat disc.
 * No external graphics library, remote asset or build step is required.
 */

const VERTEX_SHADER = `
  attribute vec2 aPosition;
  varying vec2 vUv;
  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  varying vec2 vUv;
  uniform vec2 uResolution;
  uniform sampler2D uSurface;
  uniform float uRotation;
  uniform float uExternalMap;
  uniform vec2 uPointer;
  uniform float uScroll;
  const float PI = 3.14159265359;

  mat3 rotateY(float a) {
    float c = cos(a), s = sin(a);
    return mat3(c, 0., -s, 0., 1., 0., s, 0., c);
  }

  vec2 sphereUV(vec3 p) {
    return vec2(atan(p.z, p.x) / (2. * PI) + .5,
                asin(clamp(p.y, -1., 1.)) / PI + .5);
  }

  vec3 materialAt(vec3 normal) {
    return texture2D(uSurface, sphereUV(normal)).rgb;
  }

  float elevation(vec3 normal) {
    vec3 texel = materialAt(normal);
    return mix(texel.g, dot(texel, vec3(.299, .587, .114)), uExternalMap);
  }

  void main() {
    float shortest = min(uResolution.x, uResolution.y);
    vec2 screen = (gl_FragCoord.xy - .5 * uResolution) / shortest;
    vec3 origin = vec3(uPointer * .025, 3.5);
    origin.y -= uScroll * .025;
    vec3 ray = normalize(vec3(screen * 2.5, -3.7));
    float b = dot(origin, ray);
    float discriminant = b * b - dot(origin, origin) + 1.;
    if (discriminant <= 0.) {
      gl_FragColor = vec4(0.);
      return;
    }

    float distanceToSurface = -b - sqrt(discriminant);
    vec3 position = origin + distanceToSurface * ray;
    vec3 geometricNormal = normalize(position);
    mat3 rotation = rotateY(uRotation);
    vec3 materialNormal = rotation * geometricNormal;
    vec3 surface = materialAt(materialNormal);

    // A small finite-difference bump follows the spherical material. Its basis
    // is built in world space, avoiding a moving light or a rotating highlight.
    vec3 tangent = normalize(cross(vec3(0., 1., .001), geometricNormal));
    vec3 bitangent = normalize(cross(geometricNormal, tangent));
    float epsilon = .0025;
    float h = elevation(materialNormal);
    float dx = elevation(rotation * normalize(geometricNormal + tangent * epsilon)) - h;
    float dy = elevation(rotation * normalize(geometricNormal + bitangent * epsilon)) - h;
    vec3 normal = normalize(geometricNormal - tangent * dx * 7.5 - bitangent * dy * 7.5);

    vec3 light = normalize(vec3(.94, .55, -.54));
    vec3 view = -ray;
    float diffuse = max(dot(normal, light), 0.);
    float geometricDiffuse = max(dot(geometricNormal, light), 0.);
    // Keep bumps from creating bright isolated pixels on the unlit hemisphere.
    diffuse *= smoothstep(-.035, .12, dot(geometricNormal, light));

    float variation = smoothstep(.16, .86, surface.r);
    vec3 albedo = mix(vec3(.024, .008, .013), vec3(.111, .035, .047), variation);
    albedo *= mix(.72, 1.12, surface.b);
    // Optional local rock photograph supplies detail but keeps the art-directed
    // burgundy palette and the same physical lighting as the procedural map.
    float externalLuminance = dot(surface, vec3(.299, .587, .114));
    vec3 externalAlbedo = vec3(.11, .036, .049) * (.35 + externalLuminance * 1.2);
    albedo = mix(albedo, externalAlbedo, uExternalMap);

    vec3 warmLight = vec3(1., .73, .67);
    vec3 color = albedo * warmLight * pow(diffuse, 1.14) * 1.45;
    color += vec3(.00062, .00031, .00055) * (.55 + surface.r * .45);
    float specular = pow(max(dot(normal, normalize(light + view)), 0.), 28.);
    color += warmLight * specular * .006 * geometricDiffuse;

    float fresnel = pow(1. - max(dot(geometricNormal, view), 0.), 12.);
    float illuminatedEdge = pow(geometricDiffuse, .62);
    color += vec3(.32, .115, .105) * fresnel * illuminatedEdge * .33;
    // Convert the modest linear light values to display space, then dither by
    // less than one level to avoid visible gradients in this very dark scene.
    color = pow(max(color, vec3(0.)), vec3(1. / 2.2));
    float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    color += (dither - .5) / 255.;
    float coverage = smoothstep(0., 5. / shortest, discriminant);
    gl_FragColor = vec4(color, coverage);
  }
`;

function clamp(value, low = 0, high = 1) {
  return Math.min(high, Math.max(low, value));
}

function hash3(x, y, z) {
  let value = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function noise3(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  let fx = x - ix, fy = y - iy, fz = z - iz;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  fz = fz * fz * (3 - 2 * fz);
  const a = hash3(ix, iy, iz), b = hash3(ix + 1, iy, iz);
  const c = hash3(ix, iy + 1, iz), d = hash3(ix + 1, iy + 1, iz);
  const e = hash3(ix, iy, iz + 1), f = hash3(ix + 1, iy, iz + 1);
  const g = hash3(ix, iy + 1, iz + 1), h = hash3(ix + 1, iy + 1, iz + 1);
  const near = (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
  const far = (e + (f - e) * fx) * (1 - fy) + (g + (h - g) * fx) * fy;
  return near + (far - near) * fz;
}

/** Deterministic, seamless spherical height/albedo map; generated only once. */
function makeRockMap(width) {
  const height = width / 2;
  const pixels = new Uint8Array(width * height * 4);
  const cosLongitude = new Float32Array(width);
  const sinLongitude = new Float32Array(width);
  for (let x = 0; x < width; x += 1) {
    const angle = (x / width - .5) * Math.PI * 2;
    cosLongitude[x] = Math.cos(angle);
    sinLongitude[x] = Math.sin(angle);
  }
  for (let y = 0; y < height; y += 1) {
    const latitude = (y / (height - 1) - .5) * Math.PI;
    const cosLatitude = Math.cos(latitude), py = Math.sin(latitude);
    for (let x = 0; x < width; x += 1) {
      const px = cosLongitude[x] * cosLatitude, pz = sinLongitude[x] * cosLatitude;
      const continental = noise3(px * 3.1 + 13, py * 3.1 + 31, pz * 3.1 + 7);
      const middle = noise3(px * 12.8 + 4, py * 12.8 + 17, pz * 12.8 + 22);
      const ridge = 1 - Math.abs(noise3(px * 35 + 27, py * 35 + 8, pz * 35 + 3) * 2 - 1);
      const grain = noise3(px * 91 + 11, py * 91 + 19, pz * 91 + 6);
      const fine = noise3(px * 209 + 9, py * 209 + 2, pz * 209 + 29);
      const cracks = clamp((ridge - .66) * 2.8);
      const value = continental * .4 + middle * .28 + ridge * .15 + grain * .11 + fine * .06;
      const elevation = .31 + continental * .18 + middle * .16 + ridge * .12 + grain * .13 + fine * .1;
      const offset = (y * width + x) * 4;
      pixels[offset] = Math.round(clamp(value * 1.16 - cracks * .075) * 255);
      pixels[offset + 1] = Math.round(clamp(elevation) * 255);
      pixels[offset + 2] = Math.round(clamp(.24 + middle * .47 + grain * .23 - cracks * .1) * 255);
      pixels[offset + 3] = 255;
    }
  }

  // Shallow impact marks at several scales, retaining an eroded rock surface
  // rather than a polished marble/noise gradient. Wrap in longitude.
  for (let crater = 0; crater < 72; crater += 1) {
    const centerX = hash3(crater, 87, 19) * width;
    const centerY = height * (.15 + hash3(crater, 31, 47) * .7);
    const radius = width * (.0025 + Math.pow(hash3(crater, 15, 5), 2.7) * .018);
    const stretch = 1 / Math.max(.3, Math.cos((centerY / height - .5) * Math.PI));
    const extentX = Math.ceil(radius * stretch * 1.35), extentY = Math.ceil(radius * 1.35);
    for (let dy = -extentY; dy <= extentY; dy += 1) {
      const y = Math.round(centerY + dy);
      if (y < 0 || y >= height) continue;
      for (let dx = -extentX; dx <= extentX; dx += 1) {
        const distance = Math.hypot(dx / stretch, dy) / radius;
        if (distance > 1.35) continue;
        const x = ((Math.round(centerX + dx) % width) + width) % width;
        const offset = (y * width + x) * 4;
        const rim = Math.exp(-Math.pow((distance - .91) * 8, 2));
        const basin = Math.max(0, 1 - Math.pow(distance / .91, 2));
        pixels[offset] = clamp(pixels[offset] + rim * 7 - basin * 13, 0, 255);
        pixels[offset + 1] = clamp(pixels[offset + 1] + rim * 17 - basin * 19, 0, 255);
      }
    }
  }
  return { width, height, pixels };
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Unable to allocate shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    throw new Error('Unable to compile planet shader');
  }
  return shader;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{textureUrl?: string | false, visibilityTarget?: Element, hero?: Element,
 *   reducedMotion?: boolean, paused?: boolean, maxPixels?: number,
 *   rotationSpeed?: number, textureSize?: 512 | 1024}} options
 * @returns {Promise<null | {dispose: Function, setPointer: Function, setScroll: Function, setPaused: Function}>}
 */
export async function mountPlanetScene(canvas, options = {}) {
  if (!canvas || typeof canvas.getContext !== 'function') return null;
  let gl;
  try {
    gl = canvas.getContext('webgl', {
      alpha: true, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: false, preserveDrawingBuffer: false,
      powerPreference: 'low-power', failIfMajorPerformanceCaveat: true,
    });
  } catch {
    canvas.dataset.failed = 'true';
    return null;
  }
  if (!gl) {
    canvas.dataset.failed = 'true';
    return null;
  }

  let program, vertexShader, fragmentShader, buffer, texture;
  try {
    vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    program = gl.createProgram();
    if (!program) throw new Error('Unable to allocate planet program');
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Unable to link planet program');
    gl.useProgram(program);
    buffer = gl.createBuffer();
    if (!buffer) throw new Error('Unable to allocate planet geometry');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const location = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    texture = gl.createTexture();
    if (!texture) throw new Error('Unable to allocate planet material');
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const smallScreen = window.matchMedia('(max-width: 640px)').matches;
    const map = makeRockMap(options.textureSize || (smallScreen ? 512 : 1024));
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, map.width, map.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, map.pixels);
  } catch {
    if (texture) gl.deleteTexture(texture);
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    if (vertexShader) gl.deleteShader(vertexShader);
    if (fragmentShader) gl.deleteShader(fragmentShader);
    canvas.dataset.failed = 'true';
    return null;
  }

  const uniforms = Object.fromEntries(['uResolution', 'uSurface', 'uRotation', 'uExternalMap', 'uPointer', 'uScroll']
    .map((name) => [name, gl.getUniformLocation(program, name)]));
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let disposed = false, contextLost = false, inView = true, frame = 0;
  let reducedMotion = motionQuery.matches || Boolean(options.reducedMotion);
  let manualPaused = Boolean(options.paused), previousTime = 0, rotation = -.32;
  let pointerX = 0, pointerY = 0, targetX = 0, targetY = 0, scroll = 0;
  let externalMap = false;
  const rotationSpeed = Number.isFinite(options.rotationSpeed) ? options.rotationSpeed : .012;

  function draw(time = performance.now(), force = false) {
    frame = 0;
    if (disposed || contextLost || document.hidden || (!inView && !force)) return;
    const elapsed = previousTime ? Math.min((time - previousTime) / 1000, .06) : 0;
    previousTime = time;
    const still = reducedMotion || manualPaused;
    if (!still) {
      rotation += elapsed * rotationSpeed;
      const easing = 1 - Math.exp(-elapsed * 3.3);
      pointerX += (targetX - pointerX) * easing;
      pointerY += (targetY - pointerY) * easing;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uniforms.uSurface, 0);
    gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.uRotation, rotation);
    gl.uniform1f(uniforms.uExternalMap, externalMap ? 1 : 0);
    gl.uniform2f(uniforms.uPointer, still ? 0 : pointerX, still ? 0 : pointerY);
    gl.uniform1f(uniforms.uScroll, still ? 0 : scroll);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    canvas.dataset.ready = 'true';
    if (!still && inView) frame = requestAnimationFrame(draw);
  }

  function restart() {
    if (disposed || contextLost || document.hidden || !inView || frame) return;
    previousTime = 0;
    frame = requestAnimationFrame(draw);
  }

  function pause() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
  }

  function resize() {
    if (disposed || contextLost) return;
    const bounds = canvas.getBoundingClientRect();
    const mobile = window.matchMedia('(max-width: 640px)').matches;
    let ratio = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5);
    const maxPixels = Math.max(160000, options.maxPixels || 1300000);
    const cssPixels = Math.max(1, bounds.width * bounds.height);
    ratio = Math.min(ratio, Math.sqrt(maxPixels / cssPixels));
    const width = Math.max(2, Math.round(bounds.width * ratio));
    const height = Math.max(2, Math.round(bounds.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    restart();
  }

  function onVisibility() {
    if (document.hidden) pause();
    else restart();
  }

  function onMotionChange(event) {
    reducedMotion = event.matches;
    pause();
    restart();
  }

  function onContextLost(event) {
    event.preventDefault();
    contextLost = true;
    pause();
    canvas.dataset.failed = 'true';
    delete canvas.dataset.ready;
  }

  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  const intersectionObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver((entries) => {
    inView = entries[0]?.isIntersecting ?? true;
    if (inView) restart();
    else pause();
  }, { threshold: 0 }) : null;
  resizeObserver?.observe(canvas);
  intersectionObserver?.observe(options.visibilityTarget || options.hero || canvas);
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  canvas.addEventListener('webglcontextlost', onContextLost);
  if (motionQuery.addEventListener) motionQuery.addEventListener('change', onMotionChange);
  else motionQuery.addListener(onMotionChange);

  // Texture enhancement is optional and never delays the first rendered frame.
  // Pass a same-origin path such as /assets/planet-texture.webp to enable this;
  // an absent, invalid or unavailable file leaves the generated map in place.
  const image = new Image();
  const textureUrl = options.textureUrl || false;
  image.onload = () => {
    if (disposed || contextLost) return;
    try {
      // WebGL 1 repeating textures require power-of-two dimensions. Resampling
      // just this optional material prevents incomplete-texture black spheres.
      const source = document.createElement('canvas');
      source.width = 1024;
      source.height = 512;
      const context = source.getContext('2d');
      if (!context) return;
      context.drawImage(image, 0, 0, source.width, source.height);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      externalMap = true;
      restart();
    } catch {
      // Keep the existing procedural map if an external material cannot load.
    }
  };
  image.onerror = () => {};
  if (textureUrl) image.src = textureUrl;
  delete canvas.dataset.failed;
  resize();

  return {
    setPointer(x, y) {
      if (reducedMotion || manualPaused || disposed) return;
      targetX = clamp(Number(x) || 0, -1, 1);
      targetY = clamp(Number(y) || 0, -1, 1);
    },
    setScroll(progress) {
      if (disposed) return;
      scroll = clamp(Number(progress) || 0);
    },
    setPaused(paused) {
      if (disposed) return;
      manualPaused = Boolean(paused);
      pause();
      restart();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      pause();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      if (motionQuery.removeEventListener) motionQuery.removeEventListener('change', onMotionChange);
      else motionQuery.removeListener(onMotionChange);
      image.onload = null;
      image.onerror = null;
      if (!contextLost) {
        gl.deleteTexture(texture);
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
      }
      delete canvas.dataset.ready;
    },
  };
}
