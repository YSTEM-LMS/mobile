import { renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { tokenStore } from '@/services/storage/TokenStore';

export async function renderAnonymous(initialUrl = '/') {
  jest.spyOn(tokenStore, 'getToken').mockResolvedValue(null);

  const renderedRouter = renderRouter('./app', { initialUrl });

  await waitFor(() => {
    expect(screen.getByText('Welcome back')).toBeOnTheScreen();
  });

  return renderedRouter;
}
