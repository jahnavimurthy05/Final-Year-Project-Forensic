import { useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function ForensicDoodles() {
  const canvasRef = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initDoodles();
    };
    window.addEventListener('resize', handleResize);

    const isLight = theme === 'light';

    // Forensic Doodle Types
    const DOODLE_TYPES = [
      'dna_helix',
      'fingerprint',
      'microscope',
      'flask',
      'chromosome',
      'molecule',
      'target_reticle',
      'iris_scan',
      'evidence_tag',
      'base_pair',
      'caliper',
    ];

    let doodles = [];
    const numDoodles = Math.min(36, Math.max(18, Math.floor((width * height) / 36000)));

    const initDoodles = () => {
      doodles = [];
      for (let i = 0; i < numDoodles; i++) {
        doodles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          size: Math.random() * 16 + 26, // 26px - 42px
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.008,
          type: DOODLE_TYPES[Math.floor(Math.random() * DOODLE_TYPES.length)],
          baseAlpha: isLight ? Math.random() * 0.18 + 0.14 : Math.random() * 0.12 + 0.06,
          // Color variety: forensic teal, navy blue, slate, and amber
          colorIdx: Math.floor(Math.random() * 3),
        });
      }
    };
    initDoodles();

    // Mouse parallax
    const mouse = { x: width / 2, y: height / 2, active: false };
    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // ── Vector Doodle Drawing Functions ────────────────────────────────────────

    // 1. DNA Double Helix
    const drawDnaHelix = (ctx, s) => {
      ctx.beginPath();
      for (let t = -s / 2; t <= s / 2; t += 4) {
        const y1 = Math.sin(t * 0.18) * (s * 0.35);
        const y2 = -y1;
        if (t === -s / 2) {
          ctx.moveTo(t, y1);
        } else {
          ctx.lineTo(t, y1);
        }
      }
      ctx.stroke();

      ctx.beginPath();
      for (let t = -s / 2; t <= s / 2; t += 4) {
        const y2 = -Math.sin(t * 0.18) * (s * 0.35);
        if (t === -s / 2) {
          ctx.moveTo(t, y2);
        } else {
          ctx.lineTo(t, y2);
        }
      }
      ctx.stroke();

      // Rungs
      for (let t = -s / 2 + 6; t < s / 2; t += 10) {
        const y1 = Math.sin(t * 0.18) * (s * 0.35);
        const y2 = -y1;
        ctx.beginPath();
        ctx.moveTo(t, y1);
        ctx.lineTo(t, y2);
        ctx.stroke();
      }
    };

    // 2. Fingerprint Whorl Loop
    const drawFingerprint = (ctx, s) => {
      const r = s * 0.45;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.ellipse(0, 0, (r * i) / 3, (r * i * 1.35) / 3, 0.2, 0, Math.PI * 1.85);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, r * 0.1, r * 0.15, 0, Math.PI * 1.5);
      ctx.stroke();
    };

    // 3. Microscope
    const drawMicroscope = (ctx, s) => {
      const h = s * 0.45;
      // Base
      ctx.beginPath();
      ctx.moveTo(-h * 0.8, h);
      ctx.lineTo(h * 0.8, h);
      ctx.stroke();
      // Arm
      ctx.beginPath();
      ctx.arc(h * 0.3, 0, h * 0.6, Math.PI * 0.6, Math.PI * 1.5);
      ctx.stroke();
      // Stage
      ctx.beginPath();
      ctx.moveTo(-h * 0.5, h * 0.3);
      ctx.lineTo(h * 0.4, h * 0.3);
      ctx.stroke();
      // Eyepiece tube
      ctx.beginPath();
      ctx.moveTo(-h * 0.2, -h * 0.8);
      ctx.lineTo(0, -h * 0.2);
      ctx.stroke();
      // Objective lens
      ctx.beginPath();
      ctx.rect(-h * 0.1, -h * 0.1, h * 0.2, h * 0.25);
      ctx.stroke();
    };

    // 4. Laboratory Flask
    const drawFlask = (ctx, s) => {
      const r = s * 0.4;
      ctx.beginPath();
      // Neck
      ctx.moveTo(-r * 0.25, -r);
      ctx.lineTo(-r * 0.25, -r * 0.3);
      // Body
      ctx.lineTo(-r * 0.85, r);
      ctx.lineTo(r * 0.85, r);
      ctx.lineTo(r * 0.25, -r * 0.3);
      ctx.lineTo(r * 0.25, -r);
      ctx.closePath();
      ctx.stroke();

      // Liquid level
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, r * 0.4);
      ctx.lineTo(r * 0.6, r * 0.4);
      ctx.stroke();

      // Small bubble
      ctx.beginPath();
      ctx.arc(-r * 0.1, r * 0.65, 2, 0, Math.PI * 2);
      ctx.stroke();
    };

    // 5. Chromosome X
    const drawChromosome = (ctx, s) => {
      const r = s * 0.4;
      // Left arm
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, -r);
      ctx.bezierCurveTo(-r * 0.1, -r * 0.3, -r * 0.1, r * 0.3, -r * 0.7, r);
      ctx.stroke();
      // Right arm
      ctx.beginPath();
      ctx.moveTo(r * 0.7, -r);
      ctx.bezierCurveTo(r * 0.1, -r * 0.3, r * 0.1, r * 0.3, r * 0.7, r);
      ctx.stroke();
      // Centromere connection bands
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, -r * 0.1);
      ctx.lineTo(r * 0.2, -r * 0.1);
      ctx.moveTo(-r * 0.2, r * 0.1);
      ctx.lineTo(r * 0.2, r * 0.1);
      ctx.stroke();
    };

    // 6. Benzene / Chemical Molecule
    const drawMolecule = (ctx, s) => {
      const r = s * 0.35;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();

      // Inner bond ring or double bond
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
      ctx.stroke();
    };

    // 7. Target Reticle / Biometric Scan Frame
    const drawTargetReticle = (ctx, s) => {
      const r = s * 0.4;
      const corner = r * 0.35;
      // Corner brackets [ ]
      ctx.beginPath();
      // Top-left
      ctx.moveTo(-r, -r + corner);
      ctx.lineTo(-r, -r);
      ctx.lineTo(-r + corner, -r);
      // Top-right
      ctx.moveTo(r - corner, -r);
      ctx.lineTo(r, -r);
      ctx.lineTo(r, -r + corner);
      // Bottom-left
      ctx.moveTo(-r, r - corner);
      ctx.lineTo(-r, r);
      ctx.lineTo(-r + corner, r);
      // Bottom-right
      ctx.moveTo(r - corner, r);
      ctx.lineTo(r, r);
      ctx.lineTo(r, r - corner);
      ctx.stroke();

      // Center crosshair tick
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, 0);
      ctx.lineTo(r * 0.2, 0);
      ctx.moveTo(0, -r * 0.2);
      ctx.lineTo(0, r * 0.2);
      ctx.stroke();
    };

    // 8. Iris / Eye Biometric Scanner
    const drawIrisScan = (ctx, s) => {
      const r = s * 0.45;
      // Eye contour
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.quadraticCurveTo(0, -r * 0.7, r, 0);
      ctx.quadraticCurveTo(0, r * 0.7, -r, 0);
      ctx.stroke();
      // Iris circle
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
      ctx.stroke();
      // Pupil dot
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    };

    // 9. Forensic Evidence Tag #
    const drawEvidenceTag = (ctx, s) => {
      const w = s * 0.45;
      const h = s * 0.3;
      ctx.beginPath();
      ctx.rect(-w, -h, w * 2, h * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(-w * 0.6, 0, 2.5, 0, Math.PI * 2);
      ctx.stroke();

      // Number lines
      ctx.beginPath();
      ctx.moveTo(-w * 0.2, -h * 0.3);
      ctx.lineTo(w * 0.6, -h * 0.3);
      ctx.moveTo(-w * 0.2, h * 0.3);
      ctx.lineTo(w * 0.4, h * 0.3);
      ctx.stroke();
    };

    // 10. Base Pair Nodes (A - T / G - C)
    const drawBasePair = (ctx, s) => {
      const r = s * 0.35;
      ctx.beginPath();
      ctx.arc(-r, 0, r * 0.4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(r, 0, r * 0.4, 0, Math.PI * 2);
      ctx.stroke();

      // Connection bond line
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, 0);
      ctx.lineTo(r * 0.6, 0);
      ctx.stroke();
    };

    // 11. Forensic Caliper
    const drawCaliper = (ctx, s) => {
      const r = s * 0.4;
      ctx.beginPath();
      ctx.arc(0, -r * 0.5, r * 0.5, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.45, 0);
      ctx.lineTo(-r * 0.1, r * 0.8);
      ctx.moveTo(r * 0.45, 0);
      ctx.lineTo(r * 0.1, r * 0.8);
      ctx.stroke();
    };

    // ── Main Render Loop ────────────────────────────────────────────────────────

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Colors adapted for Light theme (slate/teal/sky/amber tones) and Dark theme
      const colors = isLight
        ? [
            'rgba(13, 148, 136,',  // teal-600
            'rgba(2, 132, 199,',   // sky-600
            'rgba(71, 85, 105,',   // slate-600
          ]
        : [
            'rgba(20, 184, 166,',  // teal-400
            'rgba(0, 210, 255,',   // cyan-400
            'rgba(148, 163, 184,', // slate-400
          ];

      ctx.lineWidth = isLight ? 1.6 : 1.3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < doodles.length; i++) {
        const d = doodles[i];

        // Motion physics
        d.x += d.vx;
        d.y += d.vy;
        d.rotation += d.vRot;

        // Mouse gentle evasion / parallax
        if (mouse.active) {
          const dx = mouse.x - d.x;
          const dy = mouse.y - d.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120 && dist > 5) {
            d.x -= (dx / dist) * 0.4;
            d.y -= (dy / dist) * 0.4;
          }
        }

        // Screen wrap-around
        if (d.x < -60) d.x = width + 60;
        if (d.x > width + 60) d.x = -60;
        if (d.y < -60) d.y = height + 60;
        if (d.y > height + 60) d.y = -60;

        // Apply transformations
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.rotation);

        const colorBase = colors[d.colorIdx];
        ctx.strokeStyle = `${colorBase} ${d.baseAlpha})`;
        ctx.fillStyle = `${colorBase} ${d.baseAlpha * 0.7})`;

        // Render matching doodle type
        switch (d.type) {
          case 'dna_helix':
            drawDnaHelix(ctx, d.size);
            break;
          case 'fingerprint':
            drawFingerprint(ctx, d.size);
            break;
          case 'microscope':
            drawMicroscope(ctx, d.size);
            break;
          case 'flask':
            drawFlask(ctx, d.size);
            break;
          case 'chromosome':
            drawChromosome(ctx, d.size);
            break;
          case 'molecule':
            drawMolecule(ctx, d.size);
            break;
          case 'target_reticle':
            drawTargetReticle(ctx, d.size);
            break;
          case 'iris_scan':
            drawIrisScan(ctx, d.size);
            break;
          case 'evidence_tag':
            drawEvidenceTag(ctx, d.size);
            break;
          case 'base_pair':
            drawBasePair(ctx, d.size);
            break;
          case 'caliper':
          default:
            drawCaliper(ctx, d.size);
            break;
        }

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-500"
      style={{ opacity: theme === 'light' ? 0.95 : 0.45 }}
    />
  );
}
