import { Vector2, type Camera, type Scene, type WebGLRenderer } from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null },
    uAmount: { value: 0.00105 },
    uVignette: { value: 0.12 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uAmount;
    uniform float uVignette;
    varying vec2 vUv;
    void main() {
      vec2 lens = vUv * 2.0 - 1.0;
      float edge = smoothstep(0.18, 1.4, length(lens));
      vec2 offset = lens * uAmount * edge;
      vec2 redUv = clamp(vUv + offset, vec2(0.001), vec2(0.999));
      vec2 blueUv = clamp(vUv - offset, vec2(0.001), vec2(0.999));
      vec3 color = vec3(
        texture2D(tDiffuse, redUv).r,
        texture2D(tDiffuse, vUv).g,
        texture2D(tDiffuse, blueUv).b
      );
      float vignette = 1.0 - uVignette * smoothstep(0.22, 1.4, length(lens));
      gl_FragColor = vec4(color * vignette, 1.0);
    }
  `,
};

export class NodPostProcessing {
  private composer: EffectComposer;
  private viewPass: RenderPass;
  private bloomPass: UnrealBloomPass;
  private aberrationPass: ShaderPass;
  private outputPass: OutputPass;

  constructor(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: Camera,
    viewScene: Scene,
    viewCamera: Camera,
    touch: boolean,
  ) {
    this.composer = new EffectComposer(renderer);

    const scenePass = new RenderPass(scene, camera);
    this.viewPass = new RenderPass(viewScene, viewCamera);
    this.viewPass.clear = false;
    this.viewPass.clearDepth = true;

    this.bloomPass = new UnrealBloomPass(
      new Vector2(1, 1),
      touch ? 0.34 : 0.48,
      0.38,
      0.76,
    );
    this.aberrationPass = new ShaderPass(ChromaticAberrationShader);
    if (touch) this.aberrationPass.uniforms.uAmount!.value = 0.00045;
    this.outputPass = new OutputPass();

    this.composer.addPass(scenePass);
    this.composer.addPass(this.viewPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.aberrationPass);
    this.composer.addPass(this.outputPass);
  }

  setViewModelEnabled(enabled: boolean) {
    this.viewPass.enabled = enabled;
  }

  render() {
    this.composer.render();
  }

  setSize(width: number, height: number) {
    this.composer.setSize(width, height);
  }

  dispose() {
    this.composer.dispose();
    this.bloomPass.dispose();
    this.aberrationPass.dispose();
    this.outputPass.dispose();
  }
}
