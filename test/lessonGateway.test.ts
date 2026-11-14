import { AppError } from '../src/services/api/apiError';
import { createApiLessonGateway } from '../src/features/lessons/api/ApiLessonGateway';
import { createFakeLessonGateway } from '../src/features/lessons/api/fakeLessonGateway';
import { sanitizedLessonResponseFixture } from '../src/features/lessons/api/lesson.fixtures';
import type { ApiClientInterface } from '../src/types/apiClient.types';

const request = {
  piece: 'The Fork Use the fork, Luke',
  lessonNumber: 2,
};

const createClient = (
  response: unknown = sanitizedLessonResponseFixture,
): ApiClientInterface => ({
  get: jest.fn().mockResolvedValue(response),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
});

describe('Lesson Gateway', () => {
  it('uses the endpoint and encodes query parameters', async () => {
    const client = createClient();
    await createApiLessonGateway(client).getLesson({
      piece: 'The Fork & Mate',
      lessonNumber: 2,
    });
    expect(client.get).toHaveBeenCalledWith(
      '/lessons/getLesson?piece=The+Fork+%26+Mate&lessonNum=2',
      { signal: undefined },
    );
  });

  it('accepts and maps structured Goal response fields', async () => {
    await expect(
      createApiLessonGateway(createClient()).getLesson(request),
    ).resolves.toEqual({
      startFen: 'sanitized-fen',
      name: 'Sanitized lesson',
      info: 'Sanitized lesson instructions.',
      solution: 'e2e4',
      goal: { type: 'CAPTURE', min: 1 },
      opponentConstraints: [
        { type: 'AVOID_CAPTURING' },
        { type: 'AVOID_SQUARES', squares: ['a1'] },
      ],
      maxMoves: 10,
      moves: [{ from: 'e2', to: 'e4', piece: 'p' }],
    });
  });

  it('has a functioning fake gateway without a server', async () => {
    await expect(
      createFakeLessonGateway().getLesson(request),
    ).resolves.toMatchObject({
      name: 'Sanitized lesson',
    });
  });

  describe('Error Handling', () => {
    it('throws a controlled error for invalid responses', async () => {
      await expect(
        createApiLessonGateway(
          createClient({ startFen: 'missing fields' }),
        ).getLesson(request),
      ).rejects.toMatchObject({
        name: 'AppError',
        code: 'INVALID_RESPONSE',
        message: 'Lesson data was not in the expected format',
      });
    });

    it('safely handles request failures', async () => {
      const client = createClient();
      (client.get as jest.Mock).mockRejectedValue(
        new AppError('NETWORK_ERROR', 'Unable to connect to the server.'),
      );

      await expect(
        createApiLessonGateway(client).getLesson(request),
      ).rejects.toMatchObject({
        name: 'AppError',
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to the server.',
      });
    });
  });
});
