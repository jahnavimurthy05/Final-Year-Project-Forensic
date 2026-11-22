import { useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function GravityStarsBackground() {
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
      initStars();
    };
    window.addEventListener('resize', handleResize);

    const isDark = theme === 'dark';

    // Particle physics
    const numStars = Math.min(160, Math.floor((width * height) / 8000));
    let stars = [];

    const initStars = () => {
      stars = [];
      for (let i = 0; i < numStars; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          radius: Math.random() * 1.8 + 0.8,
          mass: Math.random() * 2 + 1,
          color: isDark
            ? Math.random() > 0.3 ? '#14b8a6' : '#00d2ff'
            : Math.random() > 0.3 ? '#0d9488' : '#0284c7',
          baseAlpha: Math.random() * 0.5 + 0.3,
        });
      }
    };
    initStars();

    const mouse = { x: -1000, y: -1000, isDown: false, active: false };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    const handleMouseDown = () => {
      mouse.isDown = true;
    };

    const handleMouseUp = () => {
      mouse.isDown = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Render constellation connections
      ctx.lineWidth = 0.5;
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const dx = stars[i].x - stars[j].x;
          const dy = stars[i].y - stars[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 90) {
            const alpha = (1 - dist / 90) * (isDark ? 0.2 : 0.12);
            ctx.strokeStyle = isDark ? `rgba(20, 184, 166, ${alpha})` : `rgba(13, 148, 136, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(stars[i].x, stars[i].y);
            ctx.lineTo(stars[j].x, stars[j].y);
            ctx.stroke();
          }
        }
      }

      // Update & Render Stars
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];

        // Gravitational force from mouse
        if (mouse.active) {
          const dx = mouse.x - s.x;
          const dy = mouse.y - s.y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);

          if (dist > 15 && dist < 350) {
            // Attraction or Repulsion (when mouse click is down)
            const forceMagnitude = (mouse.isDown ? -800 : 350) / (distSq + 500);
            const fx = (dx / dist) * forceMagnitude;
            const fy = (dy / dist) * forceMagnitude;
            s.vx += fx / s.mass;
            s.vy += fy / s.mass;
          }
        }

        // Apply friction / drag
        s.vx *= 0.985;
        s.vy *= 0.985;

        // Position update
        s.x += s.vx;
        s.y += s.vy;

        // Bounce from boundaries
        if (s.x < 0) { s.x = 0; s.vx *= -1; }
        if (s.x > width) { s.x = width; s.vx *= -1; }
        if (s.y < 0) { s.y = 0; s.vy *= -1; }
        if (s.y > height) { s.y = height; s.vy *= -1; }

        // Draw star
        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.baseAlpha;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();

        // Optional star glow
        if (isDark && s.radius > 1.8) {
          ctx.shadowColor = s.color;
          ctx.shadowBlur = 6;
        }
      }

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1.0;

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: theme === 'dark' ? 0.75 : 0.55 }}
    />
  );
}
