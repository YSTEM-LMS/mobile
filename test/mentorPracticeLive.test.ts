/**
 * @jest-environment node
 */
import {
  type MentorPracticeClient,
  type PracticeEvent,
  type PracticePair,
} from '@/features/play/services/MentorPracticeClient';
import { mentorPracticeWorkedExample } from '@/features/play/services/mentorPracticeFixtures';
import { createMentorPracticeClient } from '@/features/play/services/mentorPracticeSocketClient';

/**
 * Plays the worked example against a running chess server. Skipped unless
 * MENTOR_PRACTICE_LIVE_URL is set, for example:
 *
 *   MENTOR_PRACTICE_LIVE_URL=http://localhost:3001 npx jest test/mentorPracticeLive.test.ts
 *
 * See "Verification" in docs/mentor-practice-socket-contract.md.
 */
const LIVE_URL = process.env.MENTOR_PRACTICE_LIVE_URL;
const describeLive = LIVE_URL ? describe : describe.skip;

const { studentMove } = mentorPracticeWorkedExample;
const TIMEOUT_MS = 5_000;

/** Records one client's events and lets a test wait for the next one. */
function record(client: MentorPracticeClient) {
  const events: PracticeEvent[] = [];
  const waiters: (() => void)[] = [];
  client.subscribe((event) => {
    events.push(event);
    waiters.splice(0).forEach((wake) => wake());
  });

  async function waitFor(count: number): Promise<PracticeEvent[]> {
    const deadline = Date.now() + TIMEOUT_MS;
    while (events.length < count) {
      if (Date.now() > deadline) {
        throw new Error(
          `Timed out waiting for ${count} events; got ${JSON.stringify(events)}`,
        );
      }
      await new Promise<void>((wake) => {
        waiters.push(wake);
        setTimeout(wake, 100);
      });
    }
    return events;
  }

  return { events, waitFor };
}

describeLive('mentor practice against a live chess server', () => {
  // Unique usernames, so a leftover game on a shared server cannot collide.
  const suffix = Date.now().toString(36);
  const student = `live-student-${suffix}`;
  const mentor = `live-mentor-${suffix}`;
  const mentorPair: PracticePair = { student, mentor, role: 'mentor' };
  const studentPair: PracticePair = { student, mentor, role: 'student' };

  const clients: MentorPracticeClient[] = [];
  function newClient() {
    const client = createMentorPracticeClient({
      url: LIVE_URL,
      timeoutMs: TIMEOUT_MS,
    });
    clients.push(client);
    return client;
  }

  afterEach(() => {
    clients.splice(0).forEach((client) => client.leave());
  });

  it('plays the worked example: both devices see the same position', async () => {
    const mentorClient = newClient();
    const studentClient = newClient();
    const mentorEvents = record(mentorClient);
    const studentEvents = record(studentClient);

    // The first player to join gets black, whatever their role.
    await expect(mentorClient.join(mentorPair)).resolves.toEqual(
      mentorPracticeWorkedExample.mentorJoin.result,
    );
    await expect(studentClient.join(studentPair)).resolves.toEqual(
      mentorPracticeWorkedExample.studentJoin.result,
    );

    // An illegal move reaches only the sender, and the position is unchanged.
    studentClient.sendMove({ from: 'e2', to: 'e5' });
    await expect(studentEvents.waitFor(1)).resolves.toEqual([
      {
        type: 'move-rejected',
        message: 'Invalid move: {"from":"e2","to":"e5"}',
      },
    ]);

    studentClient.sendMove(studentMove.move);
    await expect(mentorEvents.waitFor(1)).resolves.toEqual([studentMove.event]);
    await expect(studentEvents.waitFor(2)).resolves.toEqual([
      expect.objectContaining({ type: 'move-rejected' }),
      studentMove.event,
    ]);

    // Leaving ends the game for the partner too.
    mentorClient.leave();
    await expect(studentEvents.waitFor(3)).resolves.toEqual([
      expect.anything(),
      expect.anything(),
      { type: 'ended' },
    ]);
  });
});
