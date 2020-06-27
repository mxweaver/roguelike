/* eslint-disable no-bitwise */
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import _ from 'lodash';
import { Keys } from 'keyboard-cat';
import jimp from 'jimp';
import useEventListener from '@use-it/event-listener';
import boardFileData from '../data/board.bmp';
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

enum PieceFileColors {
  Empty = 0xffffffff,
  Wall = 0xff0000ff,
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

  const movePlayer = useCallback((deltaX: number, deltaY: number): void => {
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
  }, [player]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case Keys.ArrowLeft:
      case Keys.ArrowUp:
      case Keys.ArrowRight:
      case Keys.ArrowDown:
        event.preventDefault();
        break;
      default:
        // do nothing
        break;
    }

    switch (event.key) {
      case Keys.ArrowLeft:
        movePlayer(-1, 0);
        break;
      case Keys.ArrowUp:
        movePlayer(0, -1);
        break;
      case Keys.ArrowRight:
        movePlayer(1, 0);
        break;
      case Keys.ArrowDown:
        movePlayer(0, 1);
        break;
      default:
        // do nothing
        break;
    }
  }, [movePlayer]);

  useEventListener('keydown', handleKeyDown);

  useEffect(() => {
    const boardCopy = _.cloneDeep(board);

    jimp.read(boardFileData).then((image) => {
      for (let x = 0; x < image.bitmap.width; x += 1) {
        for (let y = 0; y < image.bitmap.height; y += 1) {
          const color = image.getPixelColor(x, y);
          switch (color) {
            case PieceFileColors.Wall:
              boardCopy[y][x] = Piece.Wall;
              break;
            default:
              // do nothing
              break;
          }
        }
      }

      setBoard(boardCopy);
    });
  }, []);

  console.log(board);

  useEffect(() => {
    const context = viewCanvasRef.current.getContext('2d');

    // clear buffer
    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // render board
    context.fillStyle = 'black';
    board.forEach((row, y) => {
      row.forEach((piece, x) => {
        if (piece === Piece.Wall) {
          context.fillRect(x * PIECE_WIDTH, y * PIECE_HEIGHT, PIECE_WIDTH, PIECE_HEIGHT);
        }
      });
    });

    // render player
    context.fillStyle = 'green';
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
