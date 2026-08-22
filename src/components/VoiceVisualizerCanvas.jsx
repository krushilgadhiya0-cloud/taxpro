import React, { useRef, useEffect } from 'react';

export default function VoiceVisualizerCanvas({ 
  isListening, 
  isSpeaking, 
  audioStream = null,
  size = 140 
}) {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);

  // Initialize Web Audio API Analyser if stream provided
  useEffect(() => {
    if (!audioStream) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      const source = audioCtx.createMediaStreamSource(audioStream);
      source.connect(analyser);

      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      sourceRef.current = source;
    } catch (e) {
      console.warn('[Visualizer AudioContext Warning]:', e.message);
    }

    return () => {
      if (sourceRef.current) {
        try { sourceRef.current.disconnect(); } catch (e) {}
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try { audioCtxRef.current.close(); } catch (e) {}
      }
    };
  }, [audioStream]);

  // Main Canvas Render Loop (60 FPS Siri & Gemini Fluid Chromatic Orb)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let phase = 0;
    let particles = [];

    // Initialize 24 ambient starlight particles
    for (let i = 0; i < 24; i++) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        radius: 28 + Math.random() * 25,
        speed: 0.008 + Math.random() * 0.015,
        size: 1 + Math.random() * 1.8,
        alpha: 0.2 + Math.random() * 0.6,
        color: ['#00F2FE', '#EC4899', '#6366F1', '#10B981', '#FFB800'][i % 5]
      });
    }

    const render = () => {
      phase += 0.04;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseRadius = size * 0.24;

      // Determine live audio energy / volume
      let volume = 0;
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        volume = (sum / dataArray.length / 255) * 1.6;
      } else if (isListening) {
        volume = 0.35 + Math.sin(phase * 2.5) * 0.25;
      } else if (isSpeaking) {
        volume = 0.5 + Math.cos(phase * 3.2) * 0.35;
      } else {
        volume = 0.06 + Math.sin(phase) * 0.04;
      }

      volume = Math.min(1.2, Math.max(0.04, volume));

      // 1. Siri / Gemini Chromatic Aurora Atmosphere (Radial Glow)
      const glowRadius = baseRadius + 36 + volume * 30;
      const auraGradient = ctx.createRadialGradient(
        centerX, centerY, 4,
        centerX, centerY, glowRadius
      );

      if (isListening) {
        auraGradient.addColorStop(0, 'rgba(0, 242, 254, 0.45)');
        auraGradient.addColorStop(0.35, 'rgba(99, 102, 241, 0.3)');
        auraGradient.addColorStop(0.7, 'rgba(236, 72, 153, 0.15)');
        auraGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (isSpeaking) {
        auraGradient.addColorStop(0, 'rgba(16, 185, 129, 0.45)');
        auraGradient.addColorStop(0.35, 'rgba(0, 242, 254, 0.3)');
        auraGradient.addColorStop(0.7, 'rgba(124, 58, 237, 0.15)');
        auraGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        auraGradient.addColorStop(0, 'rgba(0, 242, 254, 0.18)');
        auraGradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.08)');
        auraGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }

      ctx.fillStyle = auraGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Orbiting Gemini Sparkle Constellation
      particles.forEach((p) => {
        p.angle += p.speed * (1 + volume * 2);
        const dist = p.radius + volume * 18;
        const px = centerX + Math.cos(p.angle) * dist;
        const py = centerY + Math.sin(p.angle) * dist;

        ctx.beginPath();
        ctx.arc(px, py, p.size * (1 + volume * 0.6), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.min(1, p.alpha * (isListening || isSpeaking ? 1.4 : 0.6));
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;
      });

      // 3. Multi-Layered Morphing Harmonic Waveform Fluid Blobs
      const layerCount = isListening || isSpeaking ? 3 : 2;
      const colors = isListening
        ? ['#00F2FE', '#6366F1', '#EC4899']
        : (isSpeaking ? ['#10B981', '#00F2FE', '#8B5CF6'] : ['#00F2FE', '#3B82F6']);

      for (let layer = layerCount - 1; layer >= 0; layer--) {
        ctx.beginPath();
        const numPoints = 48;
        const layerRadius = baseRadius + layer * 5 + volume * 14;

        for (let i = 0; i <= numPoints; i++) {
          const angle = (i / numPoints) * Math.PI * 2;
          const harmonicFreq = 3 + layer * 2;
          const harmonicAmp = (4 + layer * 3) * volume;
          const wave = Math.sin(angle * harmonicFreq + phase * (layer % 2 === 0 ? 1.5 : -1.5)) * harmonicAmp;
          const r = layerRadius + wave;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.closePath();

        // Layer fill & stroke with chromatic gradient
        const grad = ctx.createLinearGradient(
          centerX - layerRadius, centerY - layerRadius,
          centerX + layerRadius, centerY + layerRadius
        );
        grad.addColorStop(0, colors[layer % colors.length]);
        grad.addColorStop(1, colors[(layer + 1) % colors.length]);

        ctx.strokeStyle = colors[layer % colors.length];
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.7 - layer * 0.15;
        ctx.stroke();

        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.12 - layer * 0.03;
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // 4. Center High-Density Glowing Core (Siri Organic Fluid Orb)
      const coreR = Math.max(12, baseRadius * 0.7 + volume * 9);
      const coreGrad = ctx.createRadialGradient(
        centerX - coreR * 0.35, centerY - coreR * 0.35, 2,
        centerX, centerY, coreR
      );

      if (isListening) {
        coreGrad.addColorStop(0, '#FFFFFF');
        coreGrad.addColorStop(0.3, '#00F2FE');
        coreGrad.addColorStop(0.7, '#6366F1');
        coreGrad.addColorStop(1, '#EC4899');
      } else if (isSpeaking) {
        coreGrad.addColorStop(0, '#FFFFFF');
        coreGrad.addColorStop(0.3, '#10B981');
        coreGrad.addColorStop(0.7, '#00F2FE');
        coreGrad.addColorStop(1, '#3B82F6');
      } else {
        coreGrad.addColorStop(0, '#E0F7FA');
        coreGrad.addColorStop(0.4, '#00F2FE');
        coreGrad.addColorStop(0.8, '#3B82F6');
        coreGrad.addColorStop(1, '#1E1B4B');
      }

      ctx.beginPath();
      // Add subtle fluid deformation to center core
      const corePoints = 36;
      for (let i = 0; i <= corePoints; i++) {
        const angle = (i / corePoints) * Math.PI * 2;
        const wave = Math.sin(angle * 4 + phase * 2) * (2.5 * volume);
        const r = coreR + wave;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      ctx.shadowColor = isListening ? '#00F2FE' : (isSpeaking ? '#10B981' : '#3B82F6');
      ctx.shadowBlur = 20 + volume * 15;
      ctx.fillStyle = coreGrad;
      ctx.fill();
      ctx.shadowBlur = 0;

      // 5. Specular Glass Arc Reflection on top
      ctx.beginPath();
      ctx.ellipse(
        centerX - coreR * 0.25, 
        centerY - coreR * 0.35, 
        coreR * 0.45, 
        coreR * 0.22, 
        -Math.PI / 6, 
        0, 
        Math.PI * 2
      );
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fill();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isListening, isSpeaking, size]);

  return (
    <div className="relative flex items-center justify-center select-none pointer-events-none">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="w-full h-full max-w-[160px] max-h-[160px] drop-shadow-2xl"
      />
    </div>
  );
}
