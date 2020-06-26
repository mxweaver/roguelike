import React, {
  useRef,
  useEffect,
} from 'react';
import { Keys } from 'keyboard-cat';
import c from './App.module.scss';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 600;

export default function App() {
  const viewCanvasRef = useRef<HTMLCanvasElement>();

  const handleKeyDown = (event: KeyboardEvent) => {
    let delta: number[] | null = null;

    switch (event.key) {
      case Keys.ArrowLeft:
        event.preventDefault();
        delta = [-1, 0];
        break;
      case Keys.ArrowUp:
        event.preventDefault();
        delta = [0, -1];
        break;
      case Keys.ArrowRight:
        event.preventDefault();
        delta = [1, 0];
        break;
      case Keys.ArrowDown:
        event.preventDefault();
        delta = [0, 1];
        break;
      default:
        // do nothing
        break;
    }

    if (delta !== null) {
      // move character
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={c.container}>
      <div className={c.inner}>
        <canvas
          ref={viewCanvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
        />
      </div>
    </div>
  );
}
