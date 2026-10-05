import React, { useEffect, useRef } from 'react';
import { Theme } from '../hooks/useTheme';

interface ParticleSystemProps {
  theme: Theme;
}

interface Particle {
  x: number;
  y: number;
  speedX: number;
  speedY: number;
  size: number;
  color: string;
  opacity: number;
  glowIntensity: number;
}

const ParticleSystem: React.FC<ParticleSystemProps> = ({ theme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const lastTimeRef = useRef<number>(0);

  // Cores cyberpunk vibrantes
  const lightColors = [
    '#6366F1', // Indigo elegante
    '#8B5CF6', // Violet sofisticado
    '#A855F7', // Purple premium
    '#EC4899', // Pink vibrante
    '#F59E0B', // Amber dourado
    '#10B981', // Emerald suave
    '#06B6D4', // Cyan refinado
    '#EF4444', // Red elegante
  ];

  const darkColors = [
    '#00FFFF', // Bright Cyan
    '#FF00FF', // Bright Magenta
    '#00FF00', // Bright Green
    '#FFFF00', // Bright Yellow
    '#FF6600', // Bright Orange
    '#9966FF', // Bright Purple
    '#FF3399', // Bright Pink
    '#66FF99', // Bright Light Green
  ];

  const colors = theme === 'dark' ? darkColors : lightColors;

  const random = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  const createParticle = (canvasWidth: number): Particle => {
    return {
      x: random(0, canvasWidth),
      y: -20,
      speedX: random(-0.5, 0.5),
      speedY: random(1, 3),
      size: random(2, 6),
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: 1,
      glowIntensity: random(0.3, 0.8),
    };
  };

  const updateParticle = (particle: Particle, deltaTime: number): void => {
    particle.x += particle.speedX * deltaTime * 0.1;
    particle.y += particle.speedY * deltaTime * 0.1;
    particle.opacity -= 0.008 * deltaTime * 0.1;
    
    // Adiciona um leve movimento lateral
    particle.x += Math.sin(particle.y * 0.01) * 0.2;
  };

  const drawParticle = (ctx: CanvasRenderingContext2D, particle: Particle): void => {
    ctx.save();
    
    // Efeito de glow
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = particle.size * particle.glowIntensity * 3;
    
    // Desenha a partícula principal
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = particle.opacity;
    ctx.fill();
    
    // Adiciona um núcleo mais brilhante
    ctx.shadowBlur = particle.size * particle.glowIntensity;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = particle.opacity * 0.8;
    ctx.fill();
    
    ctx.restore();
  };

  const animate = (currentTime: number): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const deltaTime = currentTime - lastTimeRef.current;
    lastTimeRef.current = currentTime;

    // Limpa o canvas com um fade suave
    ctx.fillStyle = theme === 'dark' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(248, 250, 252, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Atualiza e desenha partículas
    particlesRef.current = particlesRef.current.filter(particle => {
      updateParticle(particle, deltaTime);
      
      if (particle.opacity > 0 && particle.y < canvas.height + 50) {
        drawParticle(ctx, particle);
        return true;
      }
      return false;
    });

    // Adiciona novas partículas
    if (Math.random() < (theme === 'dark' ? 0.4 : 0.2)) {
      particlesRef.current.push(createParticle(canvas.width));
    }

    animationRef.current = requestAnimationFrame(animate);
  };

  const resizeCanvas = (): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    resizeCanvas();
    
    const handleResize = () => resizeCanvas();
    window.addEventListener('resize', handleResize);

    // Inicia a animação
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ 
        mixBlendMode: theme === 'dark' ? 'screen' : 'normal',
        opacity: theme === 'dark' ? 0.8 : 0.3
      }}
    />
  );
};

export default ParticleSystem;