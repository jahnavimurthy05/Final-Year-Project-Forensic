import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { Orbit, Eye, RefreshCw, Sparkles, X } from 'lucide-react';

export default function ParticleFaceMorph({ imageUrl, title = 'Forensic 3D Particle Morph', onClose = null }) {
  const mountRef = useRef(null);
  const [morphProgress, setMorphProgress] = useState(1.0); // 0 = Globe, 1 = Photo
  const [isAutoMorphing, setIsAutoMorphing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const sceneRef = useRef(null);
  const materialRef = useRef(null);
  const rendererRef = useRef(null);
  const meshRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 450;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 220;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    let animationFrameId;

    // Load Image & Sample Particles
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      const sampleWidth = 72;
      const sampleHeight = 88;
      const numParticles = sampleWidth * sampleHeight;

      // Temporary offscreen canvas to sample pixel colors
      const canvas = document.createElement('canvas');
      canvas.width = sampleWidth;
      canvas.height = sampleHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight);
      const imgData = ctx.getImageData(0, 0, sampleWidth, sampleHeight).data;

      // Attribute Arrays
      const positionsPhoto = new Float32Array(numParticles * 3);
      const positionsGlobe = new Float32Array(numParticles * 3);
      const colors = new Float32Array(numParticles * 3);

      const sphereRadius = 60;
      let pIdx = 0;

      for (let y = 0; y < sampleHeight; y++) {
        for (let x = 0; x < sampleWidth; x++) {
          const pixelIdx = (y * sampleWidth + x) * 4;
          const r = imgData[pixelIdx] / 255;
          const g = imgData[pixelIdx + 1] / 255;
          const b = imgData[pixelIdx + 2] / 255;

          // 1. Photo Positions (centered planar grid)
          positionsPhoto[pIdx * 3] = (x - sampleWidth / 2) * 1.8;
          positionsPhoto[pIdx * 3 + 1] = -(y - sampleHeight / 2) * 1.8;
          positionsPhoto[pIdx * 3 + 2] = 0;

          // 2. Globe Sphere Positions (Fibonacci / spherical mapping)
          const phi = Math.acos(-1 + (2 * pIdx) / numParticles);
          const theta = Math.sqrt(numParticles * Math.PI) * phi;
          positionsGlobe[pIdx * 3] = sphereRadius * Math.cos(theta) * Math.sin(phi);
          positionsGlobe[pIdx * 3 + 1] = sphereRadius * Math.sin(theta) * Math.sin(phi);
          positionsGlobe[pIdx * 3 + 2] = sphereRadius * Math.cos(phi);

          // 3. Colors
          colors[pIdx * 3] = r;
          colors[pIdx * 3 + 1] = g;
          colors[pIdx * 3 + 2] = b;

          pIdx++;
        }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positionsPhoto), 3));
      geometry.setAttribute('aPosPhoto', new THREE.BufferAttribute(positionsPhoto, 3));
      geometry.setAttribute('aPosGlobe', new THREE.BufferAttribute(positionsGlobe, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      // Custom TSL-style Shader Material simulating uniform morphing
      const customMaterial = new THREE.ShaderMaterial({
        vertexShader: `
          uniform float uMorph;
          uniform float uTime;
          attribute vec3 aPosPhoto;
          attribute vec3 aPosGlobe;
          attribute vec3 color;
          varying vec3 vColor;

          void main() {
            vColor = color;
            // Smooth spherical-to-planar interpolation with organic wave jitter
            vec3 blended = mix(aPosGlobe, aPosPhoto, uMorph);
            
            // Add subtle biometric particle vibration during transition
            float wave = sin(uTime * 3.0 + blended.x * 0.05) * (1.0 - uMorph) * 1.5;
            blended.z += wave;

            vec4 mvPosition = modelViewMatrix * vec4(blended, 1.0);
            gl_PointSize = mix(2.8, 2.2, uMorph) * (150.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          void main() {
            // Soft circular particle shape
            vec2 coord = gl_PointCoord - vec2(0.5);
            if (length(coord) > 0.5) discard;
            gl_FragColor = vec4(vColor, 0.95);
          }
        `,
        uniforms: {
          uMorph: { value: 1.0 },
          uTime: { value: 0.0 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      materialRef.current = customMaterial;

      const particlesMesh = new THREE.Points(geometry, customMaterial);
      meshRef.current = particlesMesh;
      scene.add(particlesMesh);

      setIsLoading(false);
    };

    // Render loop
    let clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      if (materialRef.current) {
        materialRef.current.uniforms.uTime.value = elapsed;
      }

      if (meshRef.current) {
        // Rotate globe when not fully in photo mode
        const currentMorph = materialRef.current?.uniforms.uMorph.value ?? 1.0;
        if (currentMorph < 0.9) {
          meshRef.current.rotation.y += 0.008 * (1.0 - currentMorph);
          meshRef.current.rotation.x = Math.sin(elapsed * 0.5) * 0.15 * (1.0 - currentMorph);
        } else {
          // Gently align back to frontal portrait
          meshRef.current.rotation.y *= 0.92;
          meshRef.current.rotation.x *= 0.92;
        }
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    // Mouse drag interaction
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const handleMouseDown = (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
      if (!isDragging || !meshRef.current) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      meshRef.current.rotation.y += deltaX * 0.01;
      meshRef.current.rotation.x += deltaY * 0.01;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (container) container.innerHTML = '';
    };
  }, [imageUrl]);

  // Sync morph progress to shader uniform
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uMorph.value = morphProgress;
    }
  }, [morphProgress]);

  // Auto-morph toggle animation
  useEffect(() => {
    if (!isAutoMorphing) return;
    const interval = setInterval(() => {
      setMorphProgress((prev) => (prev > 0.5 ? 0.0 : 1.0));
    }, 3000);
    return () => clearInterval(interval);
  }, [isAutoMorphing]);

  return (
    <div className="relative w-full flex flex-col items-center bg-slate-950/80 rounded-2xl border border-teal-500/30 p-4 shadow-2xl backdrop-blur-xl">
      {/* Top Header */}
      <div className="w-full flex justify-between items-center mb-2 px-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span className="text-xs font-mono font-bold tracking-wider text-teal-300 uppercase">
            {title}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 3D Canvas Mount Point */}
      <div
        ref={mountRef}
        className="w-full h-80 sm:h-96 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing relative flex items-center justify-center bg-radial from-slate-900 to-black"
      >
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/80 z-20">
            <RefreshCw className="w-6 h-6 text-teal-400 animate-spin" />
            <span className="text-xs font-mono text-gray-400">Extracting 6,336 facial particle coordinates...</span>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="w-full mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 px-2 pt-2 border-t border-slate-800">
        {/* Toggle Mode Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMorphProgress(morphProgress > 0.5 ? 0.0 : 1.0)}
            className="px-3 py-1.5 rounded-lg border border-teal-500/40 bg-teal-500/10 text-teal-300 text-xs font-mono hover:bg-teal-500/20 transition-all flex items-center gap-1.5"
          >
            {morphProgress > 0.5 ? <Orbit className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>Morph: {morphProgress > 0.5 ? 'Genetic Globe' : 'Face Composite'}</span>
          </button>

          <button
            onClick={() => setIsAutoMorphing(!isAutoMorphing)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all ${
              isAutoMorphing
                ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300 shadow-[0_0_10px_rgba(0,210,255,0.3)]'
                : 'border-slate-700 bg-slate-900/60 text-gray-400 hover:text-white'
            }`}
          >
            Loop
          </button>
        </div>

        {/* Morph Slider */}
        <div className="flex items-center gap-2 w-full sm:w-48">
          <span className="text-[10px] font-mono text-gray-400">Sphere</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={morphProgress}
            onChange={(e) => {
              setIsAutoMorphing(false);
              setMorphProgress(parseFloat(e.target.value));
            }}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
          />
          <span className="text-[10px] font-mono text-teal-300 font-bold">Face</span>
        </div>
      </div>
    </div>
  );
}
