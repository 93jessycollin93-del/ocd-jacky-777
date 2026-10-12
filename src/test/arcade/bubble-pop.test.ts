import { describe, it, expect } from "vitest";
import { LEVELS } from "@/arcade/games/bubble-pop/levels";
import {
  COLS, LOSE_ROW, ROW_H, ROWS, addTopRow, boardFromRows, centerOf, clampAngle, colorsOnBoard, countBubbles, emptyBoard,
  endlessStage, fallPoints, findFloating, hasLost, isCleared, land, launch, neighbors, newEndless, newLevelState, parityOf, pickColor,
  popPoints, reflectX, refillEndless, resolveLanding, rowLen, sameColorGroup, snapCell, stepShot, swapQueue, trace, type BubbleState,
} from "@/arcade/games/bubble-pop/logic";
import { mulberry32 } from "@/kit-free-rng-placeholder";
