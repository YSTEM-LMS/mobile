import { z } from 'zod';
import type { Goal } from './lesson.types';

const pieceSymbolSchema = z.enum(['p', 'n', 'b', 'r', 'q', 'k']);

const moveSchema = z
  .object({
    from: z.string().min(1),
    to: z.string().min(1),
    promotion: z.string().optional(),
    piece: z.string().optional(),
    captured: z.string().optional(),
    flags: z.string().optional(),
    computerMove: z.boolean().optional(),
    username: z.string().optional(),
    credentials: z.string().optional(),
  })
  .passthrough();

const opponentConstraintSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('AVOID_SQUARES'), squares: z.array(z.string()) }),
  z.object({
    type: z.literal('AVOID_CAPTURING'),
    pieces: z.array(pieceSymbolSchema).optional(),
  }),
  z.object({ type: z.literal('AVOID_CHECKING') }),
  z.object({
    type: z.literal('ONLY_MOVE_PIECES'),
    pieces: z.array(pieceSymbolSchema),
  }),
  z.object({
    type: z.literal('STAY_IN_AREA'),
    minRank: z.number().optional(),
    maxRank: z.number().optional(),
  }),
  z.object({ type: z.literal('DONT_MOVE_FROM'), squares: z.array(z.string()) }),
]);

const atomicGoalSchema = z.union([
  z.object({
    type: z.literal('PROMOTION'),
    min: z.number().optional(),
    piece: z.enum(['q', 'r', 'b', 'n']).optional(),
  }),
  z.object({
    type: z.literal('CAPTURE'),
    min: z.number().optional(),
    piece: z.enum(['p', 'n', 'b', 'r', 'q']).optional(),
    square: z.string().optional(),
  }),
  z.object({ type: z.literal('CHECKMATE') }),
  z.object({ type: z.literal('PAWN_DOUBLE_PUSH'), min: z.number().optional() }),
  z.object({ type: z.literal('ALL_PAWNS_MOVED') }),
  z.object({ type: z.literal('MATERIAL_ADVANTAGE'), threshold: z.number() }),
  z.object({ type: z.literal('SURVIVE'), moves: z.number() }),
]);

const goalSchema: z.ZodType<Goal> = z.lazy(() =>
  z.union([
    atomicGoalSchema,
    z.object({ type: z.literal('AND'), goals: z.array(goalSchema) }),
    z.object({ type: z.literal('OR'), goals: z.array(goalSchema) }),
    z.object({ type: z.literal('SEQUENCE'), goals: z.array(atomicGoalSchema) }),
  ]),
);

export const LessonRequestSchema = z.object({
  piece: z.string().trim().min(1),
  lessonNumber: z.number().int().positive(),
});

export const LessonResponseSchema = z.object({
  startFen: z.string().trim().min(1),
  name: z.string().trim().min(1),
  info: z.string(),
  solution: z.string().nullish(),
  // The backend seed uses a number, while the website's typed lesson model
  // uses structured goals. Accept both until YSTEM confirms production data.
  goal: z.union([z.number(), goalSchema]).nullish(),
  opponentConstraints: z.array(opponentConstraintSchema).nullish(),
  maxMoves: z.number().int().nonnegative().nullish(),
  moves: z.array(moveSchema).nullish(),
});

export type LessonResponse = z.infer<typeof LessonResponseSchema>;
