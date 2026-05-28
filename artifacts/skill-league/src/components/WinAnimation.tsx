import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  shape: 'circle' | 'rect';
}

const COLORS = ['#FFD700', '#FF3A5E', '#3AB4FF', '#2EE87A', '#B44FFF', '#FFD93D', '#FF9B3A'];

function createParticle(id: number, cx: number, cy: number): Particle {
  const angle = Math.random() * Math.PI * 2;
  const speed = 3 + Math.random() * 6;
  return {
    id,
    x: cx,
    y: cy,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 4 + Math.random() * 8,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 4,
    life: 1,
    maxLife: 60 + Math.floor(Math.random() * 40),
    shape: Math.random() > 0.5 ? 'circle' : 'rect',
  };
}

interface WinAnimationProps {
  show: boolean;
  label?: string;
}

export default function WinAnimation({ show, label = 'VICTORY!' }: WinAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const counterRef = useRef(0);

  useEffect(() => {
    if (!show) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      particlesRef.current = [];
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const cx = canvas.width / 2;
    const cy = canvas.height * 0.3;

    for (let i = 0; i < 120; i++) {
      particlesRef.current.push(createParticle(counterRef.current++, cx + (Math.random() - 0.5) * 200, cy));
    }

    let burst = 0;
    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      burst++;
      if (burst % 20 === 0 && burst < 100) {
        for (let i = 0; i < 40; i++) {
          particlesRef.current.push(
            createParticle(counterRef.current++, cx + (Math.random() - 0.5) * 300, cy + (Math.random() - 0.5) * 100),
          );
        }
      }

      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      for (const p of particlesRef.current) {
        p.x  += p.vx;
        p.y  += p.vy;
        p.vy += 0.18;
        p.vx *= 0.99;
        p.life = Math.max(0, p.life - 1 / p.maxLife);

        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.life * Math.PI * 4);
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
        }
      }

      ctx.globalAlpha = 1;
      if (particlesRef.current.length > 0 || burst < 120) {
        rafRef.current = requestAnimationFrame(loop);
      }
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <>
          <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-50"
            style={{ width: '100vw', height: '100vh' }}
          />
          <motion.div
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="text-center">
              <div
                className="text-6xl font-black uppercase tracking-wider"
                style={{
                  color: '#FFD700',
                  textShadow: '0 0 40px #FFD70088, 0 4px 20px rgba(0,0,0,0.8)',
                }}
              >
                {label}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
