import { runAllTests } from './test-terminal-africa.js';

// Replace with a real listing ID or order/tracking values
runAllTests('089079ec-b5b6-4a1d-82fa-aced6ff5fbda').catch(err => {
  console.error('Error running tests:', err);
});