/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipForward, SkipBack, Volume2, Music, Trophy, Gamepad2, RefreshCw, Activity, Cpu, Layers, Radio } from 'lucide-react';

// --- Types ---

interface Track {
  id: number;
  title: string;
  artist: string;
  url: string;
  color: string;
}

interface Point {
  x: number;
  y: number;
}

// --- Constants ---

const TRACKS: Track[] = [
  {
    id: 1,
    title: "PULSE_MODULATION_01",
    artist: "CORE_DYNAMICS",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    color: "var(--color-hw-accent-cyan)"
  },
  {
    id: 2,
    title: "GRID_RESONANCE",
    artist: "NEURAL_LABS",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    color: "var(--color-hw-accent-magenta)"
  },
  {
    id: 3,
    title: "VOID_SYNTHESIS",
    artist: "SPECTRAL_AUDIO",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    color: "var(--color-hw-accent-cyan)"
  }
];

const GRID_SIZE = 20;
const INITIAL_SNAKE: Point[] = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
const INITIAL_DIRECTION: Point = { x: 0, y: -1 };
const GAME_SPEED = 90;

// --- Components ---

export default function App() {
  // Music State
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Game State
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Point>(INITIAL_DIRECTION);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const lastDirectionRef = useRef<Point>(INITIAL_DIRECTION);

  const currentTrack = TRACKS[currentTrackIndex];

  // --- Music Logic ---

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIndex]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  
  const nextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
  };

  const prevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  // --- Game Logic ---

  const getRandomFood = useCallback((currentSnake: Point[]): Point => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      const isOnSnake = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
      if (!isOnSnake) break;
    }
    return newFood;
  }, []);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    lastDirectionRef.current = INITIAL_DIRECTION;
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    setFood(getRandomFood(INITIAL_SNAKE));
  };

  const moveSnake = useCallback(() => {
    if (gameOver || !gameStarted) return;

    setSnake((prevSnake) => {
      const head = prevSnake[0];
      const newHead = {
        x: (head.x + direction.x + GRID_SIZE) % GRID_SIZE,
        y: (head.y + direction.y + GRID_SIZE) % GRID_SIZE
      };

      // Check collision with self
      if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setGameOver(true);
        setGameStarted(false);
        if (score > highScore) setHighScore(score);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Check food
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => s + 10);
        setFood(getRandomFood(newSnake));
      } else {
        newSnake.pop();
      }

      lastDirectionRef.current = direction;
      return newSnake;
    });
  }, [direction, food, gameOver, gameStarted, getRandomFood, highScore, score]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameStarted && !gameOver && e.key === ' ') {
        resetGame();
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          if (lastDirectionRef.current.y !== 1) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
          if (lastDirectionRef.current.y !== -1) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
          if (lastDirectionRef.current.x !== 1) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
          if (lastDirectionRef.current.x !== -1) setDirection({ x: 1, y: 0 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStarted, gameOver]);

  useEffect(() => {
    if (gameStarted && !gameOver) {
      gameLoopRef.current = window.setInterval(moveSnake, GAME_SPEED);
    } else {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameStarted, gameOver, moveSnake]);

  // --- Rendering Logic ---

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = canvas.width / GRID_SIZE;

    // Background
    ctx.fillStyle = '#151619';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvas.width, i * cellSize);
      ctx.stroke();
    }

    // Food
    ctx.fillStyle = '#FF00FF';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#FF00FF';
    ctx.beginPath();
    ctx.arc(
      food.x * cellSize + cellSize / 2,
      food.y * cellSize + cellSize / 2,
      cellSize / 3,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // Snake
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      ctx.fillStyle = isHead ? '#00FFFF' : '#008888';
      
      const x = segment.x * cellSize + 2;
      const y = segment.y * cellSize + 2;
      const size = cellSize - 4;

      ctx.beginPath();
      ctx.roundRect(x, y, size, size, 4);
      ctx.fill();
    });

  }, [snake, food]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-[var(--color-hw-bg)]">
      
      {/* Main Hardware Widget */}
      <div className="hw-widget w-full max-w-5xl overflow-hidden flex flex-col lg:flex-row">
        
        {/* Left Sidebar: System Status */}
        <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-white/10 p-6 space-y-8">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-[var(--color-hw-accent-cyan)] shadow-[0_0_8px_var(--color-hw-accent-cyan)]' : 'bg-white/20'}`} />
            <span className="hw-label">System Active</span>
          </div>

          <div className="space-y-6">
            <div>
              <p className="hw-label mb-2">Session Score</p>
              <p className="hw-value text-3xl font-medium">{score.toString().padStart(4, '0')}</p>
            </div>
            <div>
              <p className="hw-label mb-2">Peak Resonance</p>
              <p className="hw-value text-xl text-[var(--color-hw-accent-magenta)]">{highScore.toString().padStart(4, '0')}</p>
            </div>
          </div>

          <div className="pt-8 space-y-4">
            <div className="flex items-center gap-2 text-[var(--color-hw-text-secondary)]">
              <Cpu size={14} />
              <span className="hw-label">Processor</span>
            </div>
            <div className="space-y-1">
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  animate={{ width: isPlaying ? '60%' : '10%' }}
                  className="h-full bg-[var(--color-hw-accent-cyan)]"
                />
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  animate={{ width: gameStarted ? '45%' : '5%' }}
                  className="h-full bg-[var(--color-hw-accent-magenta)]"
                />
              </div>
            </div>
          </div>

          <div className="mt-auto pt-8">
            <div className="flex items-center gap-2 text-[var(--color-hw-text-secondary)] mb-4">
              <Gamepad2 size={14} />
              <span className="hw-label">Input Map</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['↑', '↓', '←', '→'].map(key => (
                <div key={key} className="h-8 border border-white/10 rounded flex items-center justify-center text-[var(--color-hw-text-secondary)] font-mono text-xs">
                  {key}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Simulation Grid */}
        <div className="flex-grow p-8 flex flex-col items-center justify-center bg-black/20">
          <div className="relative p-4 border border-white/10 rounded-2xl bg-black/40 shadow-inner">
            <div className="absolute top-2 left-4 flex gap-1">
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <div className="w-1 h-1 rounded-full bg-white/20" />
            </div>
            
            <canvas 
              ref={canvasRef}
              width={400}
              height={400}
              className="rounded-lg shadow-2xl w-full max-w-[400px] aspect-square"
            />

            <AnimatePresence>
              {!gameStarted && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-4 bg-[var(--color-hw-card)]/90 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center p-8 text-center"
                >
                  <Layers className="text-[var(--color-hw-accent-cyan)] mb-4" size={32} />
                  <h2 className="text-white font-medium mb-2 tracking-tight">
                    {gameOver ? 'Simulation Terminated' : 'Ready for Initialization'}
                  </h2>
                  <p className="text-[var(--color-hw-text-secondary)] text-xs mb-8 max-w-[200px]">
                    {gameOver ? 'Critical collision detected in grid sector.' : 'Neural link established. Awaiting user execution.'}
                  </p>
                  
                  <button 
                    onClick={resetGame}
                    className="px-6 py-2 bg-white text-black rounded-full font-medium text-xs hover:scale-105 transition-transform flex items-center gap-2"
                  >
                    <RefreshCw size={14} />
                    {gameOver ? 'Restart Simulation' : 'Execute Program'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="mt-6 flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="hw-label">Grid Size</span>
              <span className="hw-value text-[10px]">20x20</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="hw-label">Latency</span>
              <span className="hw-value text-[10px]">90ms</span>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Audio Engine */}
        <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-white/10 p-8 flex flex-col">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-2">
              <Radio size={16} className="text-[var(--color-hw-accent-magenta)]" />
              <span className="hw-label">Audio Engine</span>
            </div>
            <span className="font-mono text-[9px] text-[var(--color-hw-accent-magenta)] animate-pulse">LIVE</span>
          </div>

          <div className="flex-grow flex flex-col items-center justify-center">
            <div className="relative w-48 h-48 flex items-center justify-center">
              {/* Dashed Radial Tracks */}
              <div className="absolute inset-0 radial-track opacity-20" />
              <div className="absolute inset-4 radial-track opacity-40" />
              <div className="absolute inset-8 radial-track opacity-60" />
              
              <motion.div 
                animate={isPlaying ? { rotate: 360 } : {}}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className="w-24 h-24 rounded-full border border-white/10 flex items-center justify-center bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md"
              >
                <Music size={32} className="text-white/80" />
              </motion.div>

              {/* Active Glows */}
              {isPlaying && (
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-full border border-[var(--color-hw-accent-magenta)] blur-md"
                />
              )}
            </div>

            <div className="mt-12 text-center space-y-1">
              <h3 className="text-white font-medium tracking-tight">{currentTrack.title}</h3>
              <p className="hw-label text-[9px]">{currentTrack.artist}</p>
            </div>
          </div>

          <div className="mt-auto pt-12 space-y-8">
            <div className="flex items-center justify-between px-4">
              <button onClick={prevTrack} className="text-[var(--color-hw-text-secondary)] hover:text-white transition-colors">
                <SkipBack size={20} />
              </button>
              <button 
                onClick={togglePlay}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isPlaying ? 'bg-[var(--color-hw-accent-cyan)] text-black shadow-[0_0_20px_rgba(0,255,255,0.4)]' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
              </button>
              <button onClick={nextTrack} className="text-[var(--color-hw-text-secondary)] hover:text-white transition-colors">
                <SkipForward size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between hw-label">
                <span>Output Level</span>
                <span className="text-white">65%</span>
              </div>
              <div className="flex items-center gap-3">
                <Volume2 size={14} className="text-[var(--color-hw-text-secondary)]" />
                <div className="flex-grow h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="w-2/3 h-full bg-[var(--color-hw-accent-magenta)]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-8 flex items-center gap-4">
        <span className="hw-label opacity-30">Build v2.5.0</span>
        <div className="w-1 h-1 rounded-full bg-black/10" />
        <span className="hw-label opacity-30">Neural Core Active</span>
      </footer>

      <audio 
        ref={audioRef}
        src={currentTrack.url}
        onEnded={nextTrack}
      />
    </div>
  );
}
