import '@testing-library/react-native';
import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);
jest.mock('react-native-worklets', () =>
  require('react-native-worklets/lib/module/mock'),
);

process.env.EXPO_PUBLIC_APP_ENV ??= 'development';
process.env.EXPO_PUBLIC_API_BASE_URL ??= 'http://10.0.2.2:8000';
process.env.EXPO_PUBLIC_CHESS_SOCKET_URL ??= 'http://10.0.2.2:3001';
process.env.EXPO_PUBLIC_STOCKFISH_SOCKET_URL ??= 'http://10.0.2.2:8080';
