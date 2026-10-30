const main = document.querySelector('main');
try {
  const response = await fetch('/api/config', { credentials: 'same-origin' });
  if (!response.ok) throw new Error('Configuration unavailable');
  const config = await response.json();
  if (config.demo === true) await import('./demo-app.mjs');
  else if (config.demo === false) {
    const { startLive } = await import('./live-app.mjs');
    await startLive(config);
  } else throw new Error('Unknown mode');
} catch {
  main.innerHTML = '<section class="content-section"><h1>Estate is temporarily unavailable.</h1><p>Please refresh in a moment. No sample listings have been substituted for live inventory.</p></section>';
}
