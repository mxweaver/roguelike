/* eslint-disable no-bitwise */
import React, {
  useEffect,
  useRef,
  useState,
} from 'react';
import { Keys } from 'keyboard-cat';
import { initial } from 'lodash';
import c from './App.module.scss';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 600;
const BOARD_WIDTH = 100;
const BOARD_HEIGHT = 100;
const PIECE_WIDTH = CANVAS_WIDTH / BOARD_WIDTH;
const PIECE_HEIGHT = CANVAS_HEIGHT / BOARD_HEIGHT;

enum Piece {
  Empty = 0,
  Wall = 1 << 0,
}

const initialBoard = new Array(BOARD_HEIGHT)
  .fill(undefined)
  .map(() => new Array(BOARD_WIDTH).fill(Piece.Empty));

for (let y = 10; y <= 20; y += 1) {
  for (let x = 10; x <= 20; x += 1) {
    if (x === 10 || x === 20 || y === 10 || y === 20) {
      initialBoard[y][x] = Piece.Wall;
    }
  }
}

initialBoard[10][15] = Piece.Empty;

export default function App() {
  const [player, setPlayer] = useState({
    x: 0,
    y: 0,
  });

  const [board, setBoard] = useState(initialBoard);

  const viewCanvasRef = useRef<HTMLCanvasElement>();

  const handleKeyDown = (event: KeyboardEvent) => {
    let deltaX = 0;
    let deltaY = 0;

    switch (event.key) {
      case Keys.ArrowLeft:
        event.preventDefault();
        deltaX = -1;
        break;
      case Keys.ArrowUp:
        event.preventDefault();
        deltaY = -1;
        break;
      case Keys.ArrowRight:
        event.preventDefault();
        deltaX = 1;
        break;
      case Keys.ArrowDown:
        event.preventDefault();
        deltaY = 1;
        break;
      default:
        // do nothing
        break;
    }

    const newX = player.x + deltaX;
    const newY = player.y + deltaY;

    if (
      newX >= 0 && newX <= BOARD_WIDTH
      && newY >= 0 && newY <= BOARD_HEIGHT
      && board[newY][newX] === Piece.Empty
    ) {
      setPlayer({
        x: newX,
        y: newY,
      });
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [player]);

  useEffect(() => {
    const context = viewCanvasRef.current.getContext('2d');

    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    context.fillStyle = 'green';
    board.forEach((row, y) => {
      row.forEach((piece, x) => {
        if (piece === Piece.Wall) {
          context.fillRect(x * PIECE_WIDTH, y * PIECE_HEIGHT, PIECE_WIDTH, PIECE_HEIGHT);
        }
      });
    });

    context.fillStyle = 'black';
    context.fillRect(player.x * PIECE_WIDTH, player.y * PIECE_HEIGHT, PIECE_WIDTH, PIECE_HEIGHT);
  }, [player, board]);

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
