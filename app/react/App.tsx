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
import spriteFileData from '../data/sprites.bmp';
import c from './App.module.scss';

const BOARD_WIDTH = 100;
const BOARD_HEIGHT = 100;
const FRAME_WIDTH = 64;
const FRAME_HEIGHT = 64;
const PIECE_WIDTH = 16;
const PIECE_HEIGHT = 16;
const CANVAS_WIDTH = FRAME_WIDTH * PIECE_WIDTH;
const CANVAS_HEIGHT = FRAME_HEIGHT * PIECE_HEIGHT;

const SPRITE_PLAYER = {
  x: 0,
  y: 0,
};

const SPRITE_MONSTER = {
  x: 1,
  y: 0,
};

const SPRITE_SWORD = {
  x: 2,
  y: 0,
};

const SPRITE_WALL = {
  x: 3,
  y: 0,
};

const SPRITE_PLAYER_LEFT = 0 * PIECE_WIDTH;
const SPRITE_PLAYER_TOP = 0 * PIECE_HEIGHT;
const SPRITE_MONSTER_LEFT = 1 * PIECE_WIDTH;
const SPRITE_MONSTER_TOP = 0 * PIECE_HEIGHT;
const SPRITE_SWORD_LEFT = 2 * PIECE_WIDTH;
const SPRITE_SWORD_TOP = 0 * PIECE_HEIGHT;
const SPRITE_WALL_LEFT = 3 * PIECE_WIDTH;
const SPRITE_WALL_TOP = 0 * PIECE_HEIGHT;

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

interface Entity extends Coordinate {
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
  board?: Board;
}

interface RenderContext {
  context: CanvasRenderingContext2D,
  sprites: HTMLImageElement,
  frame: Coordinate,
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

function moveEntity(game: Game, entity: Entity) {
  if (!entity.moving) {
    return entity;
  }

  const nextCoordinate = getAttackingCoordinate(entity);

  nextCoordinate.x = _.clamp(nextCoordinate.x, 0, BOARD_WIDTH - 1);
  nextCoordinate.y = _.clamp(nextCoordinate.y, 0, BOARD_HEIGHT - 1);

  const isPieceEmpty = game.board[nextCoordinate.y][nextCoordinate.x] === Piece.Empty;
  const isPiecePlayer = game.player.x === nextCoordinate.x && game.player.y === nextCoordinate.y;
  const isPieceMonster = game.monsters.some((monster) => nextCoordinate.x === monster.x && nextCoordinate.y === monster.y);

  if (isPieceEmpty && !isPiecePlayer && !isPieceMonster) {
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

  if (!board) {
    return game;
  }

  const newGame = _.clone(game);

  newGame.player = moveEntity(game, player);

  // kill monsters
  if (player.attacking) {
    const sword = getAttackingCoordinate(player);
    newGame.monsters = _.reject(monsters, (monster) => monster.x === sword.x && monster.y === sword.y);
  }

  // move monsters
  if (step % 10 === 0) {
    newGame.monsters = newGame.monsters.map((monster) => moveEntity(game, {
      ...monster,
      direction: _.sample(directions),
    }));
  }

  // step
  newGame.step += 1;

  return newGame;
}

function renderSprite(
  context: RenderContext,
  sprite: Coordinate,
  destination: Coordinate,
): void {
  context.context.drawImage(
    context.sprites,
    sprite.x * PIECE_WIDTH,
    sprite.y * PIECE_WIDTH,
    PIECE_WIDTH,
    PIECE_HEIGHT,
    (destination.x - context.frame.x) * PIECE_WIDTH,
    (destination.y - context.frame.y) * PIECE_HEIGHT,
    PIECE_WIDTH,
    PIECE_HEIGHT,
  );
}

function renderBoard(context: RenderContext, board: Board) {
  for (let { y } = context.frame; y < context.frame.y + FRAME_HEIGHT; y += 1) {
    for (let { x } = context.frame; x < context.frame.x + FRAME_WIDTH; x += 1) {
      const piece = board[y][x];

      if (piece === Piece.Wall) {
        renderSprite(context, SPRITE_WALL, { x, y });
      }
    }
  }
}

function render(
  canvas: HTMLCanvasElement,
  game: Game,
  sprites?: HTMLImageElement,
): void {
  if (!sprites) {
    return;
  }

  if (!game.board) {
    return;
  }

  const { player, board, monsters } = game;

  const context = {
    context: canvas.getContext('2d'),
    frame: {
      x: _.clamp(player.x - FRAME_WIDTH / 2, 0, BOARD_WIDTH - FRAME_WIDTH),
      y: _.clamp(player.y - FRAME_WIDTH / 2, 0, BOARD_HEIGHT - FRAME_HEIGHT),
    },
    sprites,
  };

  // clear buffer
  context.context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  renderBoard(context, board);
  renderSprite(context, SPRITE_PLAYER, player);

  monsters.forEach((monster) => {
    renderSprite(context, SPRITE_MONSTER, monster);
  });

  if (player.attacking) {
    renderSprite(context, SPRITE_SWORD, getAttackingCoordinate(player));
  }

  // render sword
  // if (player.attacking) {
  //   const sword = getAttackingCoordinate(player);

  //   context.fillStyle = 'blue';
  //   context.fillRect((sword.x - frameLeft) * PIECE_WIDTH, (sword.y - frameTop) * PIECE_HEIGHT, PIECE_WIDTH, PIECE_HEIGHT);
  // }

  // render monsters
  // context.fillStyle = 'red';
}

enum PieceFileColors {
  Empty = 0xffffffff,
  Wall = 0xff0000ff,
}

export default function App() {
  const [game, setGame] = useState<Game>({
    step: 0,
    player: {
      x: 5,
      y: 5,
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
  });

  const [sprites, setSprites] = useState<HTMLImageElement | undefined>();

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
    const board = new Array(BOARD_HEIGHT)
      .fill(undefined)
      .map(() => new Array(BOARD_WIDTH));

    jimp.read(boardFileData).then((image) => {
      for (let x = 0; x < image.bitmap.width; x += 1) {
        for (let y = 0; y < image.bitmap.height; y += 1) {
          const color = image.getPixelColor(x, y);
          switch (color) {
            case PieceFileColors.Wall:
              board[y][x] = Piece.Wall;
              break;
            default:
              board[y][x] = Piece.Empty;
              // do nothing
              break;
          }
        }
      }

      setGame({
        ...game,
        board,
      });
    });
  }, []);

  useEffect(() => {
    render(viewCanvasRef.current, game, sprites);
  }, [viewCanvasRef, game, sprites]);

  useInterval(() => setGame(tick(game)), 100);

  useEffect(() => {
    const image = new Image(1024, 1024);
    image.src = spriteFileData;
    image.onload = () => setSprites(image);
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
