"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  color: string;
};

const PARTICLE_COUNT = 100;

function createParticle(width: number, height: number): Particle {
  return {
    x: Math.random() * width,
    y: height + Math.random() * 50,
    size: Math.random() * 4 + 2,
    speedX: (Math.random() - 0.5) * 0.45,
    speedY: Math.random() * 0.7 + 0.35,
    opacity: Math.random() * 0.55 + 0.3,
    color: Math.random() > 0.55 ? "#D4A574" : "#F5F0E8",
  };
}

export function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  const burstParticles = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const burst = Array.from({ length: 20 }, () => ({
      ...createParticle(canvas.width, canvas.height),
      x: canvas.width / 2,
      y: canvas.height / 2,
      speedX: (Math.random() - 0.5) * 3,
      speedY: (Math.random() - 0.5) * 3,
      opacity: 1,
    }));

    particlesRef.current.push(...burst);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
        createParticle(canvas.width, canvas.height),
      );
    };

    const resetParticle = (particle: Particle) => {
      Object.assign(particle, createParticle(canvas.width, canvas.height));
    };

    const animate = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const charBottom = canvas.height / 2;

      particlesRef.current.forEach((particle) => {
        particle.y -= particle.speedY;
        particle.x += particle.speedX;

        const charDx = centerX - particle.x;
        const charDy = charBottom - particle.y;
        const charDistance = Math.sqrt(charDx * charDx + charDy * charDy);

        if (charDistance < 150 && particle.y > charBottom - 50) {
          particle.x += charDx * 0.002;
          particle.y += charDy * 0.002;
        }

        const mouseDx = mouseRef.current.x - particle.x;
        const mouseDy = mouseRef.current.y - particle.y;
        const mouseDistance = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);

        if (mouseDistance < 100) {
          particle.x += mouseDx * 0.01;
          particle.y += mouseDy * 0.01;
        }

        if (particle.y < -10 || particle.opacity <= 0) {
          resetParticle(particle);
        }

        context.globalAlpha = particle.opacity;
        context.fillStyle = particle.color;
        context.fillRect(
          Math.round(particle.x),
          Math.round(particle.y),
          Math.round(particle.size),
          Math.round(particle.size),
        );
      });

      context.globalAlpha = 1;
      animationFrame = requestAnimationFrame(animate);
    };

    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current = { x: event.clientX, y: event.clientY };
    };

    resize();
    animate();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("xuan:burst", burstParticles);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("xuan:burst", burstParticles);
    };
  }, []);

  return <canvas ref={canvasRef} className="xuan-particles" />;
}

export function emitParticleBurst() {
  window.dispatchEvent(new Event("xuan:burst"));
}
