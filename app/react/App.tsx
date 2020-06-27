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
import useInterval from '@use-it/interval';
import boardFileData from '../data/board.bmp';
import c from './App.module.scss';

const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 1024;
const BOARD_WIDTH = 100;
const BOARD_HEIGHT = 100;
const FRAME_WIDTH = 64;
const FRAME_HEIGHT = 64;
const PIECE_WIDTH = CANVAS_WIDTH / FRAME_WIDTH;
const PIECE_HEIGHT = CANVAS_HEIGHT / FRAME_HEIGHT;

enum Direction {
  Up = 0,
  Right,
  Down,
  Left,
}

const directions = [
  Direction.Up,
  Direction.Right,
  Direction.Down,
  Direction.Left,
];

interface Coordinate {
  x: number;
  y: number;
}

interface Entity {
  x: number;
  y: number;
  direction: Direction;
  attacking?: boolean;
  moving?: boolean;
}

enum Piece {
  Empty = 0,
  Wall = 1 << 0,
}

type Board = Piece[][];

interface Game {
  step: number;
  player: Entity;
  monsters: Entity[];
  board: Board;
}

function getAttackingCoordinate(entity: Entity): Coordinate {
  const attackingCoordinate = {
    x: entity.x,
    y: entity.y,
  };

  switch (entity.direction) {
    case Direction.Up:
      attackingCoordinate.y -= 1;
      break;
    case Direction.Right:
      attackingCoordinate.x += 1;
      break;
    case Direction.Down:
      attackingCoordinate.y += 1;
      break;
    case Direction.Left:
      attackingCoordinate.x -= 1;
      break;
    default:
      // do nothing
      break;
  }

  return attackingCoordinate;
}

function moveEntity(entity: Entity, board: Board) {
  if (!entity.moving) {
    return entity;
  }

  const nextCoordinate = getAttackingCoordinate(entity);

  nextCoordinate.x = _.clamp(nextCoordinate.x, 0, BOARD_WIDTH - 1);
  nextCoordinate.y = _.clamp(nextCoordinate.y, 0, BOARD_HEIGHT - 1);

  if (board[nextCoordinate.y][nextCoordinate.x] === Piece.Empty) {
    return {
      ...entity,
      ...nextCoordinate,
    };
  }

  return entity;
}

function tick(game: Game): Game {
  const {
    step,
    player,
    board,
    monsters,
  } = game;

  const newGame = _.clone(game);

  newGame.player = moveEntity(player, board);

  // kill monsters
  if (player.attacking) {
    const sword = getAttackingCoordinate(player);
    newGame.monsters = _.reject(monsters, (monster) => monster.x === sword.x && monster.y === sword.y);
  }

  // move monsters
  if (step % 10 === 0) {
    newGame.monsters = newGame.monsters.map((monster) => {
      const newMonster = { ...monster, direction: _.sample(directions) };
      return moveEntity(newMonster, board);
    });
  }

  // step
  newGame.step += 1;

  return newGame;
}

function render(canvas: HTMLCanvasElement, game: Game): void {
  const { player, board, monsters } = game;

  const context = canvas.getContext('2d');

  const frameLeft = _.clamp(player.x - FRAME_WIDTH / 2, 0, BOARD_WIDTH - FRAME_WIDTH);
  const frameTop = _.clamp(player.y - FRAME_WIDTH / 2, 0, BOARD_HEIGHT - FRAME_HEIGHT);

  // clear buffer
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // render board
  context.fillStyle = 'black';
  for (let y = frameTop; y < frameTop + FRAME_HEIGHT; y += 1) {
    for (let x = frameLeft; x < frameLeft + FRAME_WIDTH; x += 1) {
      const piece = board[y][x];
      if (piece === Piece.Wall) {
        context.fillRect((x - frameLeft) * PIECE_WIDTH, (y - frameTop) * PIECE_HEIGHT, PIECE_WIDTH, PIECE_HEIGHT);
      }
    }
  }

  // render player
  context.fillStyle = 'green';
  context.fillRect((player.x - frameLeft) * PIECE_WIDTH, (player.y - frameTop) * PIECE_HEIGHT, PIECE_WIDTH, PIECE_HEIGHT);

  // render sword
  if (player.attacking) {
    const sword = getAttackingCoordinate(player);

    context.fillStyle = 'blue';
    context.fillRect((sword.x - frameLeft) * PIECE_WIDTH, (sword.y - frameTop) * PIECE_HEIGHT, PIECE_WIDTH, PIECE_HEIGHT);
  }

  // render monsters
  context.fillStyle = 'red';
  monsters.forEach((monster) => {
    context.fillRect(
      (monster.x - frameLeft) * PIECE_WIDTH,
      (monster.y - frameTop) * PIECE_HEIGHT,
      PIECE_WIDTH,
      PIECE_HEIGHT,
    );
  });
}

enum PieceFileColors {
  Empty = 0xffffffff,
  Wall = 0xff0000ff,
}

const initialBoard = new Array(BOARD_HEIGHT)
  .fill(undefined)
  .map(() => new Array(BOARD_WIDTH).fill(Piece.Empty));

export default function App() {
  const [game, setGame] = useState<Game>({
    step: 0,
    player: {
      x: 0,
      y: 0,
      direction: Direction.Up,
    },
    monsters: [
      {
        x: 0,
        y: 0,
        direction: Direction.Up,
        moving: true,
      },
    ],
    board: initialBoard,
  });

  const viewCanvasRef = useRef<HTMLCanvasElement>();

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const newPlayer = { ...game.player };

    switch (event.key) {
      case Keys.ArrowLeft:
      case Keys.ArrowUp:
      case Keys.ArrowRight:
      case Keys.ArrowDown:
        event.preventDefault();
        newPlayer.moving = true;
        break;
      case Keys.Space:
        event.preventDefault();
        break;
      default:
        // do nothing
        break;
    }

    switch (event.key) {
      case Keys.ArrowLeft:
        newPlayer.direction = Direction.Left;
        break;
      case Keys.ArrowUp:
        newPlayer.direction = Direction.Up;
        break;
      case Keys.ArrowRight:
        newPlayer.direction = Direction.Right;
        break;
      case Keys.ArrowDown:
        newPlayer.direction = Direction.Down;
        break;
      case Keys.Space:
        newPlayer.attacking = true;
        break;
      default:
        // do nothing
        break;
    }

    setGame({ ...game, player: newPlayer });
  }, [game]);

  useEventListener('keydown', handleKeyDown);

  useEventListener('keyup', (event: React.KeyboardEvent) => {
    const newPlayer = { ...game.player };

    switch (event.key) {
      case Keys.ArrowLeft:
      case Keys.ArrowUp:
      case Keys.ArrowRight:
      case Keys.ArrowDown:
        event.preventDefault();
        newPlayer.moving = false;
        break;
      case Keys.Space:
        event.preventDefault();
        newPlayer.attacking = false;
        break;
      default:
        // do nothing
        break;
    }

    setGame({ ...game, player: newPlayer });
  });

  useEffect(() => {
    const boardCopy = _.cloneDeep(game.board);

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

      setGame({
        ...game,
        board: boardCopy,
      });
    });
  }, []);

  useEffect(() => {
    render(viewCanvasRef.current, game);
  }, [game]);

  useInterval(() => setGame(tick(game)), 100);

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
