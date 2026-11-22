import { useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

const GLYPHS = ['A', 'T', 'C', 'G', '0', '1', 'X', 'Y', 'SNP', 'STR', '9', '7', 'λ', 'Ω', 'β', '§', 'Δ', '::'];

export default function GlyphBackground() {
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
      initGrid();
    };
    window.addEventListener('resize', handleResize);

    const isDark = theme === 'dark';

    // Ambient floating glow orbs
    const orbs = [
      { x: width * 0.2, y: height * 0.3, vx: 0.3, vy: 0.2, r: 240, color: isDark ? 'rgba(20, 184, 166, 0.08)' : 'rgba(20, 184, 166, 0.04)' },
      { x: width * 0.8, y: height * 0.7, vx: -0.2, vy: 0.3, r: 300, color: isDark ? 'rgba(0, 210, 255, 0.07)' : 'rgba(2, 132, 199, 0.04)' },
      { x: width * 0.5, y: height * 0.5, vx: 0.2, vy: -0.25, r: 200, color: isDark ? 'rgba(147, 51, 234, 0.06)' : 'rgba(147, 51, 234, 0.03)' },
    ];

    // Grid of Glyphs
    const cellSize = 32;
    let grid = [];

    const initGrid = () => {
      grid = [];
      const cols = Math.ceil(width / cellSize) + 1;
      const rows = Math.ceil(height / cellSize) + 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          grid.push({
            x: c * cellSize,
            y: r * cellSize,
            char: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
            intensity: 0,
            baseAlpha: Math.random() * 0.12 + 0.03,
            glow: 0,
            offsetX: 0,
            offsetY: 0,
          });
        }
      }
    };
    initGrid();

    // Mouse tracking & Trail
    const mouse = { x: -1000, y: -1000, active: false };
    const mouseTrail = [];

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
      mouseTrail.push({ x: e.clientX, y: e.clientY, life: 1.0 });
      if (mouseTrail.length > 25) mouseTrail.shift();
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    // Click Ripple Waves
    const ripples = [];
    const handleClick = (e) => {
      ripples.push({
        x: e.clientX,
        y: e.clientY,
        radius: 0,
        maxRadius: Math.max(width, height) * 0.45,
        speed: 6.5,
        alpha: 1.0,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('click', handleClick);

    // Render loop
    let lastTime = 0;
    const render = (time) => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw drifting ambient glows
      orbs.forEach((orb) => {
        orb.x += orb.vx;
        orb.y += orb.vy;
        if (orb.x < 0 || orb.x > width) orb.vx *= -1;
        if (orb.y < 0 || orb.y > height) orb.vy *= -1;

        const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
        grad.addColorStop(0, orb.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Update Mouse Trail decay
      for (let i = mouseTrail.length - 1; i >= 0; i--) {
        mouseTrail[i].life -= 0.04;
        if (mouseTrail[i].life <= 0) mouseTrail.splice(i, 1);
      }

      // 3. Update Ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rip = ripples[i];
        rip.radius += rip.speed;
        rip.alpha -= 0.012;

        // Draw visual wave ring
        ctx.strokeStyle = isDark
          ? `rgba(0, 210, 255, ${rip.alpha * 0.4})`
          : `rgba(20, 184, 166, ${rip.alpha * 0.3})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
        ctx.stroke();

        if (rip.alpha <= 0 || rip.radius > rip.maxRadius) {
          ripples.splice(i, 1);
        }
      }

      // 4. Render & Wake Up Glyphs
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const cursorRadius = 130;
      const cursorRadiusSq = cursorRadius * cursorRadius;

      for (let i = 0; i < grid.length; i++) {
        const cell = grid[i];

        // Check distance to current mouse
        let distSq = Infinity;
        if (mouse.active) {
          const dx = cell.x - mouse.x;
          const dy = cell.y - mouse.y;
          distSq = dx * dx + dy * dy;
        }

        // Mouse wake-up
        if (distSq < cursorRadiusSq) {
          const factor = 1 - Math.sqrt(distSq) / cursorRadius;
          cell.intensity = Math.max(cell.intensity, factor * 0.95);
        }

        // Trail wake-up
        for (let t = 0; t < mouseTrail.length; t++) {
          const p = mouseTrail[t];
          const tdx = cell.x - p.x;
          const tdy = cell.y - p.y;
          if (tdx * tdx + tdy * tdy < 3600) {
            cell.intensity = Math.max(cell.intensity, p.life * 0.6);
          }
        }

        // Ripple reaction
        for (let r = 0; r < ripples.length; r++) {
          const rip = ripples[r];
          const rdx = cell.x - rip.x;
          const rdy = cell.y - rip.y;
          const dist = Math.sqrt(rdx * rdx + rdy * rdy);
          const diff = Math.abs(dist - rip.radius);
          if (diff < 40) {
            const rippleForce = (1 - diff / 40) * rip.alpha;
            cell.intensity = Math.max(cell.intensity, rippleForce);
            const angle = Math.atan2(rdy, rdx);
            cell.offsetX = Math.cos(angle) * rippleForce * 8;
            cell.offsetY = Math.sin(angle) * rippleForce * 8;
          }
        }

        // Cool down
        cell.intensity *= 0.94;
        cell.offsetX *= 0.88;
        cell.offsetY *= 0.88;

        // Occasional glyph character mutate
        if (Math.random() < 0.001) {
          cell.char = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }

        // Color computation
        if (isDark) {
          if (cell.intensity > 0.15) {
            ctx.fillStyle = `rgba(20, 184, 166, ${Math.min(1, cell.intensity)})`;
            ctx.shadowColor = '#00d2ff';
            ctx.shadowBlur = cell.intensity * 8;
          } else {
            ctx.fillStyle = `rgba(148, 163, 184, ${cell.baseAlpha})`;
            ctx.shadowBlur = 0;
          }
        } else {
          if (cell.intensity > 0.15) {
            ctx.fillStyle = `rgba(13, 148, 136, ${Math.min(1, cell.intensity * 1.2)})`;
            ctx.shadowColor = '#0284c7';
            ctx.shadowBlur = cell.intensity * 6;
          } else {
            ctx.fillStyle = `rgba(100, 116, 139, ${cell.baseAlpha * 1.2})`;
            ctx.shadowBlur = 0;
          }
        }

        ctx.fillText(cell.char, cell.x + cell.offsetX, cell.y + cell.offsetY);
      }

      ctx.shadowBlur = 0;
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: theme === 'dark' ? 0.85 : 0.65 }}
    />
  );
}
