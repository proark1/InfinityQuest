
import React, { useEffect, useRef } from 'react';
import { WeatherType } from '../types';

interface LivingBackgroundProps {
  biome?: string;
  weather?: WeatherType;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
  type: 'dust' | 'ember' | 'snow' | 'firefly' | 'rain' | 'ash';
}

const LivingBackground: React.FC<LivingBackgroundProps> = ({ biome = 'Unknown', weather = 'Clear' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    let particles: Particle[] = [];
    
    // Determine visuals based on WEATHER first, then BIOME
    const getEnvironmentConfig = (b: string, w: string) => {
       const lowerB = b.toLowerCase();
       
       if (w === 'Rain' || w === 'Storm') return 'rain';
       if (w === 'Ash') return 'ash';
       if (w === 'Snow') return 'snow';
       if (w === 'Fog') return 'fog';

       if (lowerB.includes('forest') || lowerB.includes('jungle')) return 'forest';
       if (lowerB.includes('dungeon') || lowerB.includes('crypt') || lowerB.includes('volcano')) return 'dungeon';
       if (lowerB.includes('mountain') || lowerB.includes('snow')) return 'snow';
       return 'default';
    };

    const envType = getEnvironmentConfig(biome, weather);

    const createParticle = (): Particle => {
       const w = canvas.width;
       const h = canvas.height;
       
       if (envType === 'rain') {
          return {
             x: Math.random() * w,
             y: -20,
             vx: (Math.random() - 0.5) * 2,
             vy: Math.random() * 15 + 15, // Fast fall
             size: Math.random() * 2 + 20, // Long streak
             alpha: 0.4,
             life: 100,
             maxLife: 100,
             color: 'rgba(150, 180, 255, 0.6)',
             type: 'rain'
          };
       } else if (envType === 'ash') {
          return {
             x: Math.random() * w,
             y: -10,
             vx: (Math.random() - 0.5) * 2,
             vy: Math.random() * 2 + 1,
             size: Math.random() * 3 + 1,
             alpha: Math.random() * 0.8,
             life: 300,
             maxLife: 300,
             color: 'rgba(100, 100, 100, 0.8)',
             type: 'ash'
          };
       } else if (envType === 'forest') {
          return {
             x: Math.random() * w,
             y: Math.random() * h,
             vx: (Math.random() - 0.5) * 0.5,
             vy: (Math.random() - 0.5) * 0.5,
             size: Math.random() * 2 + 1,
             alpha: 0,
             life: 0,
             maxLife: Math.random() * 200 + 100,
             color: `rgb(${Math.random()*50 + 100}, 255, ${Math.random()*50})`,
             type: 'firefly'
          };
       } else if (envType === 'dungeon') {
          return {
             x: Math.random() * w,
             y: h + 10,
             vx: (Math.random() - 0.5) * 0.5,
             vy: -Math.random() * 1.5 - 0.5,
             size: Math.random() * 3 + 1,
             alpha: 1,
             life: Math.random() * 100 + 50,
             maxLife: 100,
             color: `rgb(255, ${Math.random()*100}, 0)`,
             type: 'ember'
          };
       } else if (envType === 'snow') {
          return {
             x: Math.random() * w,
             y: -10,
             vx: (Math.random() - 0.5) * 1 + 1,
             vy: Math.random() * 2 + 1,
             size: Math.random() * 2 + 1,
             alpha: Math.random() * 0.5 + 0.3,
             life: 1000,
             maxLife: 1000,
             color: 'rgba(255, 255, 255, 0.8)',
             type: 'snow'
          };
       } else {
          // Default Dust
          return {
             x: Math.random() * w,
             y: Math.random() * h,
             vx: (Math.random() - 0.5) * 0.2,
             vy: (Math.random() - 0.5) * 0.2,
             size: Math.random() * 1.5,
             alpha: Math.random() * 0.3,
             life: Math.random() * 300,
             maxLife: 300,
             color: 'rgba(200, 200, 255, 0.5)',
             type: 'dust'
          };
       }
    };

    // Initial population
    const popSize = envType === 'rain' ? 100 : 50;
    for(let i=0; i<popSize; i++) particles.push(createParticle());

    const update = () => {
       ctx.clearRect(0, 0, canvas.width, canvas.height);
       
       // Background Overlay based on weather/biome
       const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
       if (envType === 'rain' || weather === 'Storm') {
           gradient.addColorStop(0, 'rgba(0, 10, 30, 0.2)');
           gradient.addColorStop(1, 'rgba(0, 20, 40, 0.4)');
           // Storm flash
           if (weather === 'Storm' && Math.random() < 0.005) {
               ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
               ctx.fillRect(0,0,canvas.width,canvas.height);
           }
       } else if (envType === 'dungeon') {
          gradient.addColorStop(0, 'rgba(20, 0, 0, 0)');
          gradient.addColorStop(1, 'rgba(50, 10, 0, 0.3)');
       } else if (envType === 'forest') {
          gradient.addColorStop(0, 'rgba(0, 20, 0, 0.1)');
          gradient.addColorStop(1, 'rgba(0, 40, 10, 0.2)');
       } else {
          gradient.addColorStop(0, 'rgba(0,0,0,0)');
          gradient.addColorStop(1, 'rgba(0,0,0,0)');
       }
       ctx.fillStyle = gradient;
       ctx.fillRect(0, 0, canvas.width, canvas.height);

       // Replenish
       if (particles.length < popSize) {
           particles.push(createParticle());
       }

       particles.forEach((p, i) => {
          p.x += p.vx;
          p.y += p.vy;
          p.life--;

          if (p.type === 'rain') {
             // Rain renders as lines
             ctx.strokeStyle = p.color;
             ctx.lineWidth = 1;
             ctx.beginPath();
             ctx.moveTo(p.x, p.y);
             ctx.lineTo(p.x + p.vx * 2, p.y + p.size);
             ctx.stroke();
             if (p.y > canvas.height) particles[i] = createParticle();
          } else {
             // Standard Particles
             if (p.type === 'firefly') {
                p.life++;
                if (p.life < 50) p.alpha += 0.02;
                else if (p.life > p.maxLife - 50) p.alpha -= 0.02;
                if (p.life > p.maxLife) particles[i] = createParticle();
             } else if (p.type === 'ember') {
                p.alpha = p.life / 100;
                p.size *= 0.99;
                if (p.life <= 0) particles[i] = createParticle();
             } else if (p.type === 'snow' || p.type === 'ash') {
                if (p.y > canvas.height) {
                   p.y = -10;
                   p.x = Math.random() * canvas.width;
                }
             } else {
                if (p.life <= 0) particles[i] = createParticle();
             }

             // Render other particles (circles)
             ctx.beginPath();
             ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
             ctx.fillStyle = p.color;
             ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
             ctx.fill();
             ctx.globalAlpha = 1;
          }
       });

       animationRef.current = requestAnimationFrame(update);
    };

    update();

    return () => {
       window.removeEventListener('resize', resize);
       if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [biome, weather]);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

export default React.memo(LivingBackground);
