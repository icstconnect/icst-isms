import { registerCapabilities } from '@reticlehq/react';

if (import.meta.env.DEV) {
  registerCapabilities({
    testids: [
      'login-btn',
      'email-input',
      'role-select',
      'search-roll-input',
      'query-result-btn',
      'marks-grid',
      'attendance-btn',
      'score-input',
      'save-marks-btn'
    ],
    signals: [
      'auth:login',
      'marks:save',
      'student:register'
    ],
    stores: [],
  });
}
