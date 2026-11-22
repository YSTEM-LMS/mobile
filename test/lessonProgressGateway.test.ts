import { AppError } from '../src/services/api/apiError';
import { createApiLessonProgressGateway } from '../src/features/lessons/api/ApiLessonProgressGateway';
import type { ApiClientInterface } from '../src/types/apiClient.types';

const createClient = (response: unknown = 0): ApiClientInterface => ({
  get: jest.fn().mockResolvedValue(response),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
});

describe('Lesson progress gateway', () => {
  it('reads the completed lesson count for a piece', async () => {
    const client = createClient(3);

    await expect(
      createApiLessonProgressGateway(client).getCompletedLessonCount(
        'The Fork & Mate',
      ),
    ).resolves.toBe(3);
    expect(client.get).toHaveBeenCalledWith(
      '/lessons/getCompletedLessonCount?piece=The+Fork+%26+Mate',
      { signal: undefined },
    );
  });

  it.each([
    [1, 0],
    [2, 1],
  ])(
    'maps content lesson %i to completion argument %i',
    async (lessonNumber, lessonNum) => {
      const client = createClient('Lesson progress updated');

      await createApiLessonProgressGateway(client).saveLessonCompletion({
        piece: 'knight',
        lessonNumber,
      });

      expect(client.get).toHaveBeenCalledWith(
        `/lessons/updateLessonCompletion?piece=knight&lessonNum=${lessonNum}`,
        { responseType: 'text', signal: undefined },
      );
    },
  );

  it('accepts a no-change response for an already completed lesson', async () => {
    const client = createClient(null);

    await expect(
      createApiLessonProgressGateway(client).saveLessonCompletion({
        piece: 'pawn',
        lessonNumber: 1,
      }),
    ).resolves.toBeUndefined();
  });

  it('reads back the saved count and does not advance duplicate completions', async () => {
    let completedLessonCount = 0;
    const client = createClient();
    (client.get as jest.Mock).mockImplementation(async (endpoint: string) => {
      const [path, query] = endpoint.split('?');
      const params = new URLSearchParams(query);

      if (path === '/lessons/getCompletedLessonCount') {
        return completedLessonCount;
      }
      if (path === '/lessons/updateLessonCompletion') {
        const nextCount = Number(params.get('lessonNum')) + 1;
        if (nextCount > completedLessonCount) {
          completedLessonCount = nextCount;
          return 'Lesson progress updated';
        }
        return null;
      }
      throw new Error(`Unexpected lesson progress endpoint: ${path}`);
    });

    const gateway = createApiLessonProgressGateway(client);
    await expect(gateway.getCompletedLessonCount('pawn')).resolves.toBe(0);
    await gateway.saveLessonCompletion({ piece: 'pawn', lessonNumber: 1 });
    await expect(gateway.getCompletedLessonCount('pawn')).resolves.toBe(1);
    await gateway.saveLessonCompletion({ piece: 'pawn', lessonNumber: 1 });
    await expect(gateway.getCompletedLessonCount('pawn')).resolves.toBe(1);
  });

  it('propagates failed saves as unsuccessful', async () => {
    const client = createClient();
    (client.get as jest.Mock).mockRejectedValue(
      new AppError('SESSION_EXPIRED', 'Your session has expired.'),
    );

    await expect(
      createApiLessonProgressGateway(client).saveLessonCompletion({
        piece: 'pawn',
        lessonNumber: 1,
      }),
    ).rejects.toMatchObject({
      code: 'SESSION_EXPIRED',
    });
  });

  it('rejects invalid progress responses', async () => {
    await expect(
      createApiLessonProgressGateway(createClient('3')).getCompletedLessonCount(
        'pawn',
      ),
    ).rejects.toMatchObject({
      name: 'AppError',
      code: 'INVALID_RESPONSE',
    });
  });

  it('rejects invalid lesson numbers before making a request', async () => {
    const client = createClient();

    await expect(
      createApiLessonProgressGateway(client).saveLessonCompletion({
        piece: 'pawn',
        lessonNumber: 0,
      }),
    ).rejects.toBeInstanceOf(AppError);
    expect(client.get).not.toHaveBeenCalled();
  });
});
