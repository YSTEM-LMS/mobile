import { env } from '@/config/env';
import { createApiClient, REQUEST_TIMEOUT_MS } from '@/services/api/apiClient';
import { tokenStore } from '@/services/storage/TokenStore';

import { createApiLessonGateway } from './ApiLessonGateway';
import type { LessonGateway } from './lesson.gateway';

const client = createApiClient({
  baseUrl: env.apiBaseUrl,
  timeoutMs: REQUEST_TIMEOUT_MS,
  tokenProvider: () => tokenStore.getToken(),
});

const apiGateway = createApiLessonGateway(client);
let override: LessonGateway | null = null;

export function setLessonGatewayForTests(gateway: LessonGateway | null) {
  override = gateway;
}

export const lessonGateway: LessonGateway = {
  getLesson: (request, options) =>
    (override ?? apiGateway).getLesson(request, options),
};
