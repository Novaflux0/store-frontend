import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// findBy*/waitFor default to 1 s. On a cold CI runner under coverage, the first
// form test also pays for the lazily loaded validation schema, which can take longer.
configure({ asyncUtilTimeout: 5_000 });

afterEach(() => {
  cleanup();
});
