import * as THREE from "three";

const AshShader = {
  uniforms: {
    uTime: { value: 0 },
  },
  vertexShader: `
    attribute float aSeed;
    attribute float aSize;
    uniform float uTime;
    varying float vOpacity;
    varying float vWarmth;
    void main() {
      float cycle = fract(uTime * 0.022 + aSeed);
      vec3 drifted = position;
      drifted.y += cycle * 13.0;
      drifted.x += sin(uTime * 0.08 + aSeed * 18.0) * 1.6;
      drifted.z += cos(uTime * 0.06 + aSeed * 15.0) * 1.8;
      vec4 viewPosition = modelViewMatrix * vec4(drifted, 1.0);
      float distanceToCamera = max(1.0, -viewPosition.z);
      gl_PointSize = clamp(aSize * (28.0 / distanceToCamera), 1.0, 24.0);
      gl_Position = projectionMatrix * viewPosition;
      float nearFade = 1.0 - smoothstep(110.0, 190.0, distanceToCamera);
      float pulse = 0.5 + 0.5 * sin(cycle * 6.28318);
      vOpacity = (0.035 + pulse * 0.045) * nearFade;
      vWarmth = fract(aSeed * 7.13);
    }
  `,
  fragmentShader: `
    varying float vOpacity;
    varying float vWarmth;
    void main() {
      float radius = length(gl_PointCoord - vec2(0.5));
      float softEdge = 1.0 - smoothstep(0.04, 0.5, radius);
      if (softEdge <= 0.001) discard;
      vec3 coolAsh = vec3(0.28, 0.42, 0.46);
      vec3 warmAsh = vec3(0.48, 0.35, 0.25);
      vec3 color = mix(coolAsh, warmAsh, vWarmth * 0.6);
      gl_FragColor = vec4(color, softEdge * vOpacity);
    }
  `,
};

export function createCityAsh(count: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    const seed = (i * 0.61803398875) % 1;
    const angle = seed * Math.PI * 2;
    const radius = 24 + ((i * 47) % 126);
    const offset = i * 3;
    positions[offset] = Math.cos(angle) * radius;
    positions[offset + 1] = 0.8 + ((i * 29) % 100) * 0.12;
    positions[offset + 2] = Math.sin(angle) * radius;
    seeds[i] = seed;
    sizes[i] = 8 + ((i * 13) % 13);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(AshShader.uniforms),
    vertexShader: AshShader.vertexShader,
    fragmentShader: AshShader.fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
  });
  const ash = new THREE.Points(geometry, material);
  ash.name = "nod-atmospheric-ash";
  ash.frustumCulled = false;
  return ash;
}
