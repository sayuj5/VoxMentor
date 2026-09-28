import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshTransmissionMaterial, Sparkles, Center } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { ShinyButton } from './shiny-button';

function PrismGeometry({ isMobile }: { isMobile: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Custom geometry for a communication-themed crystal
  const geometry = useMemo(() => {
    return new THREE.IcosahedronGeometry(isMobile ? 1.5 : 2, 0); // Faceted crystal look
  }, [isMobile]);

  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.getElapsedTime();
      meshRef.current.rotation.y = t * 0.2;
      meshRef.current.rotation.z = t * 0.1;
      
      // Pointer interaction
      meshRef.current.position.x = THREE.MathUtils.lerp(
        meshRef.current.position.x, 
        (state.pointer.x * state.viewport.width) / 10, 
        0.05
      );
      meshRef.current.position.y = THREE.MathUtils.lerp(
        meshRef.current.position.y, 
        (state.pointer.y * state.viewport.height) / 10, 
        0.05
      );
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef} geometry={geometry}>
        <MeshTransmissionMaterial 
          backside 
          samples={isMobile ? 3 : 6}
          thickness={1.5} 
          chromaticAberration={0.06} 
          anisotropy={0.2} 
          distortion={0.1} 
          distortionScale={0.3} 
          temporalDistortion={0.1} 
          iridescence={1}
          iridescenceIOR={1}
          iridescenceThicknessRange={[0, 1400]}
          color="#3a52ea"
          attenuationDistance={1}
          attenuationColor="#4d6ef5"
        />
      </mesh>
    </Float>
  );
}

export function PrismHero() {
  const [inView, setInView] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-[600px] md:h-[700px] flex items-center justify-center overflow-hidden">
      {/* 3D Background */}
      <div className="absolute inset-0 z-0 opacity-80" style={{ pointerEvents: 'none' }}>
        {inView && !prefersReducedMotion && (
          <Canvas camera={{ position: [0, 0, 8], fov: 45 }} dpr={[1, isMobile ? 1.5 : 2]}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 10]} intensity={1} color="#4d6ef5" />
            <directionalLight position={[-10, -10, -10]} intensity={0.5} color="#273187" />
            <Center>
              <PrismGeometry isMobile={isMobile} />
            </Center>
            {!isMobile && (
              <Sparkles 
                count={50} 
                scale={10} 
                size={2} 
                speed={0.2} 
                opacity={0.5} 
                color="#7090fa" 
              />
            )}
          </Canvas>
        )}
      </div>

      {/* Hero Content Overlay */}
      <div className="relative z-10 container mx-auto px-4 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-brand-500/30 bg-brand-500/10 backdrop-blur-sm text-brand-300 text-xs font-semibold tracking-wide uppercase">
            <span>AI Voice Career Mentor</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Practice Conversations.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-brand-500">
              Build Real Confidence.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-surface-muted mb-10 max-w-2xl mx-auto leading-relaxed">
            VoxMentor helps students and job seekers practice interviews, improve communication, learn through conversation, and build confidence with a real-time AI voice mentor.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <ShinyButton 
              onClick={() => window.location.href = '/session/new'}
              className="w-full sm:w-auto text-lg"
              fullWidth={false}
              style={{ pointerEvents: 'auto' }}
            >
              Start Practicing
            </ShinyButton>
            <a 
              href="#practice-modes" 
              className="btn-secondary w-full sm:w-auto text-lg px-8 py-4"
              style={{ pointerEvents: 'auto' }}
            >
              Explore VoxMentor
            </a>
          </div>

          <div className="mt-12 pt-8 border-t border-surface-border/50 flex flex-wrap justify-center gap-6 md:gap-12 text-xs font-semibold text-surface-muted/80 uppercase tracking-widest">
            <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span> Real-Time Voice AI</span>
            <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-brand-400"></span> Adaptive Conversations</span>
            <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-brand-300"></span> Personalized Feedback</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
