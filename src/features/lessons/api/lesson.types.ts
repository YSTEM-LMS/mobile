export type PieceSymbol = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export type Move = {
  from: string;
  to: string;
  promotion?: string;
  piece?: string;
  captured?: string;
  flags?: string;
  computerMove?: boolean;
  username?: string;
  credentials?: string;
};

export type AtomicGoal =
  | { type: 'PROMOTION'; min?: number; piece?: 'q' | 'r' | 'b' | 'n' }
  | {
      type: 'CAPTURE';
      min?: number;
      piece?: 'p' | 'n' | 'b' | 'r' | 'q';
      square?: string;
    }
  | { type: 'CHECKMATE' }
  | { type: 'PAWN_DOUBLE_PUSH'; min?: number }
  | { type: 'ALL_PAWNS_MOVED' }
  | { type: 'MATERIAL_ADVANTAGE'; threshold: number }
  | { type: 'SURVIVE'; moves: number };

export type Goal =
  | AtomicGoal
  | { type: 'AND'; goals: Goal[] }
  | { type: 'OR'; goals: Goal[] }
  | { type: 'SEQUENCE'; goals: AtomicGoal[] };

export type OpponentConstraint =
  | { type: 'AVOID_SQUARES'; squares: string[] }
  | { type: 'AVOID_CAPTURING'; pieces?: PieceSymbol[] }
  | { type: 'AVOID_CHECKING' }
  | { type: 'ONLY_MOVE_PIECES'; pieces: PieceSymbol[] }
  | { type: 'STAY_IN_AREA'; minRank?: number; maxRank?: number }
  | { type: 'DONT_MOVE_FROM'; squares: string[] };

export type Lesson = {
  startFen: string;
  name: string;
  info: string;
  solution: string | null;
  goal: Goal | null;
  opponentConstraints: OpponentConstraint[] | null;
  maxMoves: number | null;
  moves: Move[] | null;
};

export type LessonRequest = {
  piece: string;
  lessonNumber: number;
};

export type LessonRequestOptions = {
  signal?: AbortSignal;
};
