// 水面：顶点波浪 + 菲涅尔着色 + 河道流水漂移
import * as THREE from '../lib/three.module.js';
import { WORLD_SIZE, flowFactor } from './terrain.js?v=16';

export class Water {
  constructor(scene) {
    this.scene = scene;
    const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 150, 150);
    geo.rotateX(-Math.PI / 2);
    // 流速遮罩：江河道 1 / 湖泊 0
    const pos = geo.attributes.position;
    const flow = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) flow[i] = flowFactor(pos.getX(i), pos.getZ(i));
    geo.setAttribute('aFlow', new THREE.BufferAttribute(flow, 1));

    this.uniforms = {
      uTime: { value: 0 },
      uAmp: { value: 0.08 },
      uSky: { value: new THREE.Color(0x9ec4e0) },
      uSun: { value: new THREE.Vector3(0.4, 0.8, 0.2) },
      uSunColor: { value: new THREE.Color(0xfff2d8) },
      uSunI: { value: 1.2 },
      uDeep: { value: new THREE.Color(0x1e4a42) },
      uShallow: { value: new THREE.Color(0x4a8a78) },
      uNight: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: `
        attribute float aFlow;
        uniform float uTime; uniform float uAmp;
        varying vec3 vPos; varying float vFlow; varying vec3 vNrm;
        void main() {
          vec3 p = position;
          float t = uTime + aFlow * p.z * 0.10;
          float w1 = sin(p.x*0.5 + t*1.3), w2 = sin(p.z*0.4 + t*1.05), w3 = sin((p.x+p.z)*0.23 + t*0.7);
          p.y += uAmp * (w1 + w2 + w3) / 3.0;
          float dx = uAmp * (0.5*cos(p.x*0.5 + t*1.3) + 0.23*cos((p.x+p.z)*0.23 + t*0.7)) / 3.0;
          float dz = uAmp * (0.4*cos(p.z*0.4 + t*1.05) + 0.23*cos((p.x+p.z)*0.23 + t*0.7)) / 3.0;
          vNrm = normalize(vec3(-dx*6.0, 1.0, -dz*6.0));
          vPos = (modelMatrix * vec4(p, 1.0)).xyz;
          vFlow = aFlow;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 uSky; uniform vec3 uSun; uniform vec3 uSunColor; uniform float uSunI;
        uniform vec3 uDeep; uniform vec3 uShallow; uniform float uNight;
        varying vec3 vPos; varying float vFlow; varying vec3 vNrm;
        void main() {
          vec3 V = normalize(cameraPosition - vPos);
          vec3 N = normalize(vNrm);
          float fres = pow(1.0 - max(dot(N, V), 0.0), 2.4);
          vec3 base = mix(uDeep, uShallow, 0.35 + 0.3 * vFlow);
          vec3 col = mix(base, uSky, 0.10 + fres * 0.72);
          vec3 R = reflect(-normalize(uSun), N);
          float spec = pow(max(dot(R, V), 0.0), 90.0) * uSunI;
          col += uSunColor * spec;
          col = mix(col, col * 0.35, uNight * 0.8);
          gl_FragColor = vec4(col, 0.86);
        }`,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.renderOrder = 5;
    scene.add(this.mesh);
  }
  update(t, amp, skyColor, sunDir, sunColor, sunI, nightFactor) {
    const u = this.uniforms;
    u.uTime.value = t;
    u.uAmp.value = amp;
    u.uSky.value.copy(skyColor);
    u.uSun.value.copy(sunDir);
    u.uSunColor.value.copy(sunColor);
    u.uSunI.value = sunI;
    u.uNight.value = nightFactor;
  }
}
