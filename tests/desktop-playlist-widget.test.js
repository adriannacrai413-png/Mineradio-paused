'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const widgetHtml = fs.readFileSync(path.join(root, 'public', 'desktop-playlist-widget.html'), 'utf8');
const bridgeJs = fs.readFileSync(
  path.join(root, 'public', 'js', 'modules', '10-shell', '06-desktop-widget-bridge.js'),
  'utf8',
);
const mainJs = fs.readFileSync(path.join(root, 'desktop', 'main.js'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

test('widget has a dedicated lyrics page and compact fallback', () => {
  for (const marker of [
    'id="lyrics-view"',
    'id="lyrics-scroll"',
    'id="lyrics-back"',
    'id="lyrics-progress-fill"',
    'widget-panel-lyrics',
    'widget-forced-compact',
  ]) {
    assert.ok(widgetHtml.includes(marker), `missing widget marker: ${marker}`);
  }
  assert.match(widgetHtml, /html\.widget-forced-compact\.widget-panel-lyrics[\s\S]*?lyrics-view/);
});

test('widget lyrics support translation and word timing without HTML interpolation', () => {
  assert.match(widgetHtml, /lyric\.translation/);
  assert.match(widgetHtml, /lyric\.words/);
  assert.match(widgetHtml, /textContent\s*=\s*word\.text/);
  assert.match(bridgeJs, /translation\s*=\s*l\.translation/);
  assert.match(bridgeJs, /Array\.isArray\(l\.words\)/);
});

test('widget playlist surface has liquid-glass playback transitions', () => {
  for (const marker of [
    'class="playbar-controls"',
    'class="compact-empty"',
    'widget-no-track',
    'class="playbar-track"',
    'id="playbar-cover"',
    'id="playbar-title"',
    'id="playbar-artist"',
    'cover-swap',
    'widget-row-in',
    '.row.playing',
    'setCoverElement',
  ]) {
    assert.ok(widgetHtml.includes(marker), `missing widget polish marker: ${marker}`);
  }
  assert.match(widgetHtml, /row\.style\.setProperty\(['"]--row-index['"]/);
  assert.match(widgetHtml, /setCoverElement\(\$\(['"]playbar-cover['"]\)/);
  assert.match(widgetHtml, /grid-template-columns:\s*minmax\(0,1fr\) auto minmax\(0,1fr\)/);
});

test('widget typography and like feedback stay readable and stateful', () => {
  for (const marker of [
    'Segoe UI Variable',
    '-webkit-font-smoothing: antialiased',
    'heart-like-pop',
    'heart-unlike',
    'aria-pressed',
    'likeKey',
    'animateLikeButton',
  ]) {
    assert.ok(widgetHtml.includes(marker), `missing widget readability marker: ${marker}`);
  }
  assert.match(widgetHtml, /<button class="like[^>]*aria-pressed=/);
  assert.match(widgetHtml, /class="like-btn"[^>]*id="btn-like"/);
  assert.match(widgetHtml, /queueLikeEffect\(state\.current, nextLiked\)/);
});

test('widget window state is bounded and mode-specific', () => {
  assert.match(mainJs, /PLAYLIST_WIDGET_MINI_TRIGGER_HEIGHT\s*=\s*180/);
  assert.match(mainJs, /PLAYLIST_WIDGET_MINI_HEIGHT\s*=\s*140/);
  assert.match(mainJs, /playlistWidgetExpandedBounds/);
  assert.match(mainJs, /playlistWidgetCompactBounds/);
  assert.match(mainJs, /setMaximumSize\(720, PLAYLIST_WIDGET_MINI_HEIGHT\)/);
  assert.match(mainJs, /playlist-widget-bounds\.json/);
});

test('widget IPC handlers validate their sender', () => {
  assert.match(mainJs, /function isTrustedPlaylistWidgetIpc\(event\)/);
  for (const channel of [
    'mineradio-widget-set-enabled',
    'mineradio-widget-push-state',
    'mineradio-widget-action',
    'mineradio-widget-request-state',
    'mineradio-widget-toggle-size',
  ]) {
    const start = mainJs.indexOf(`ipcMain.handle('${channel}'`);
    assert.ok(start >= 0, `missing IPC handler: ${channel}`);
    const body = mainJs.slice(start, start + 520);
    assert.match(body, /UNTRUSTED_SENDER/);
  }
});

test('release identity is isolated from the original Mineradio install', () => {
  assert.equal(packageJson.productName, 'Mineradio2');
  assert.equal(packageJson.version, '2.3.0');
  assert.equal(packageJson.build.appId, 'com.mineradio2.desktop');
  assert.equal(packageJson.build.win.executableName, 'Mineradio2');
  assert.equal(packageJson.build.nsis.shortcutName, 'Mineradio2');
});
