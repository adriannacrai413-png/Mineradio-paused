// Desktop playlist widget bridge — runs inside the main window renderer.
(function () {
  if (!window.desktopWindow || !window.desktopWindow.setPlaylistWidgetEnabled) return;

  var widgetEnabled = false;
  var lastStateJson = '';
  var pushTimer = null;
  var playbackTimer = null;
  var lastDetailKey = '';

  function likedFlag(song) {
    try {
      if (!song || typeof songAccountStateKey !== 'function') return false;
      var key = songAccountStateKey(song);
      return !!(key && likedSongMap[key]);
    } catch (e) { return false; }
  }

  function songCover(s) {
    return (s && (s.cover || s.picUrl || s.pic || s.albumPic)) || '';
  }
  function songName(s) { return (s && s.name) || (s && s.songName) || ''; }
  function songArtist(s) { return (s && s.artist) || (s && s.artists) || ''; }

  function normalizeSong(s) {
    return {
      name: songName(s),
      artist: songArtist(s),
      cover: songCover(s),
      liked: likedFlag(s)
    };
  }

  function lyricSnapshot() {
    var lines = (typeof lyricsLines !== 'undefined' && Array.isArray(lyricsLines)) ? lyricsLines : [];
    var now = (typeof audio !== 'undefined' && audio) ? Number(audio.currentTime || 0) : 0;
    var activeIndex = -1;
    var progress = 0;
    for (var i = 0; i < lines.length; i++) {
      var start = Number(lines[i] && (lines[i].t != null ? lines[i].t : lines[i].time)) || 0;
      if (start <= now) activeIndex = i;
      else break;
    }
    if (activeIndex >= 0 && activeIndex < lines.length) {
      var currentStart = Number(lines[activeIndex].t != null ? lines[activeIndex].t : lines[activeIndex].time) || 0;
      var nextLine = lines[activeIndex + 1];
      var nextStart = nextLine ? Number(nextLine.t != null ? nextLine.t : nextLine.time) : 0;
      if (nextStart > currentStart) progress = Math.max(0, Math.min(1, (now - currentStart) / (nextStart - currentStart)));
    }
    var palette = (typeof stageLyrics !== 'undefined' && stageLyrics && stageLyrics.palette) ? stageLyrics.palette : {};
    return {
      lines: lines.slice(0, 200).map(function (l) {
        var translation = l.translation || l.trans || l.translationText || '';
        if (translation && typeof translation === 'object') translation = translation.text || '';
        var words = Array.isArray(l.words) ? l.words.slice(0, 160).map(function (word) {
          return {
            t: Number(word && (word.t != null ? word.t : word.time)) || 0,
            d: Math.max(0.06, Number(word && (word.d != null ? word.d : word.duration)) || 0.06),
            text: word && word.text ? String(word.text) : ''
          };
        }).filter(function (word) { return word.text; }) : [];
        return {
          time: Number(l.t != null ? l.t : l.time) || 0,
          text: l.text || '',
          translation: String(translation || ''),
          words: words
        };
      }),
      activeIndex: activeIndex,
      progress: progress,
      palette: {
        primary: palette.primary || '#f6fdff',
        highlight: palette.highlight || '#fff0b8',
        glow: palette.glow || '#9cffdf'
      }
    };
  }

  function snapshot() {
    var song = (typeof currentCoverSong === 'function') ? currentCoverSong() : null;
    var list = (typeof playQueue !== 'undefined' && playQueue) ? playQueue : [];
    var pls = (typeof userPlaylists !== 'undefined' && userPlaylists) ? userPlaylists : [];
    var lyric = lyricSnapshot();
    var detailTracks = (typeof playlistPanelDetailState !== 'undefined' && playlistPanelDetailState.tracks)
      ? playlistPanelDetailState.tracks.slice(0, 80).map(normalizeSong) : [];
    return {
      current: song ? {
        name: songName(song), artist: songArtist(song),
        cover: songCover(song), liked: likedFlag(song)
      } : null,
      playing: !!playing,
      playingIndex: (typeof currentIdx !== 'undefined') ? currentIdx : -1,
      currentTime: (typeof audio !== 'undefined' && audio) ? (audio.currentTime || 0) : 0,
      duration: (typeof audio !== 'undefined' && audio) ? (audio.duration || 0) : 0,
      queue: list.slice(0, 80).map(normalizeSong),
      playlists: pls.slice(0, 80).map(function (pl) {
        var provider = (typeof playlistAccountProvider === 'function') ? playlistAccountProvider(pl) : (pl.provider || '');
        return {
          id: pl.id || '', name: pl.name || '', cover: pl.cover || pl.picUrl || '',
          count: pl.trackCount || (pl.tracks && pl.tracks.length) || 0,
          provider: provider
        };
      }),
      detailTracks: detailTracks,
      lyrics: lyric.lines,
      lyricActiveIndex: lyric.activeIndex,
      lyricProgress: lyric.progress,
      lyricPalette: lyric.palette
    };
  }

  function pushNow() {
    if (!widgetEnabled) return;
    try {
      var s = snapshot();
      var json = JSON.stringify(s);
      if (json === lastStateJson) return;
      lastStateJson = json;
      // Cache to localStorage so widget can show last state on cold start
      try { localStorage.setItem('mineradio-widget-cache', json); } catch (e) {}
      window.desktopWindow.pushPlaylistWidgetState(s);
    } catch (e) { /* noop */ }
  }

  // On load, push cached state immediately if main data isn't ready yet
  try {
    var cached = localStorage.getItem('mineradio-widget-cache');
    if (cached) {
      lastStateJson = '';
      // Don't immediately push to widget yet — wait for enable. But store it.
    }
  } catch (e) {}

  function startPolling() {
    if (pushTimer) return;
    pushTimer = setInterval(pushNow, 1200);
    playbackTimer = setInterval(pushNow, 120);
  }
  function stopPolling() {
    if (pushTimer) { clearInterval(pushTimer); pushTimer = null; }
    if (playbackTimer) { clearInterval(playbackTimer); playbackTimer = null; }
  }

  function updateEntryIcon() {
    var btn = document.getElementById('playlist-widget-btn');
    if (btn) btn.classList.toggle('on', widgetEnabled);
  }

  function setWidgetEnabled(on) {
    widgetEnabled = !!on;
    window.desktopWindow.setPlaylistWidgetEnabled(widgetEnabled);
    updateEntryIcon();
    if (widgetEnabled) {
      lastStateJson = ''; pushNow(); startPolling();
    } else {
      stopPolling();
    }
  }

  window.togglePlaylistWidget = function () { setWidgetEnabled(!widgetEnabled); };

  window.desktopWindow.onPlaylistWidgetAction(function (action) {
    if (!action) return;
    switch (action.type) {
      case 'toggle-play':
        if (typeof togglePlay === 'function') togglePlay();
        setTimeout(pushNow, 300); break;
      case 'next':
        if (typeof nextTrack === 'function') nextTrack(true);
        setTimeout(pushNow, 600); break;
      case 'prev':
        if (typeof prevTrack === 'function') prevTrack(true);
        setTimeout(pushNow, 600); break;
      case 'play-index':
        if (typeof playQueueAt === 'function') playQueueAt(action.index, {});
        setTimeout(pushNow, 600); break;
      case 'like-index':
        if (typeof toggleLikeQueueIndex === 'function') toggleLikeQueueIndex(action.index);
        setTimeout(pushNow, 400); break;
      case 'like-current':
        if (typeof toggleLikeCurrent === 'function') toggleLikeCurrent();
        setTimeout(pushNow, 400); break;
      case 'next-up-index': {
        if (typeof playQueue !== 'undefined' && playQueue && action.index >= 0 && action.index < playQueue.length) {
          var song = playQueue[action.index];
          var insertAt = (typeof currentIdx !== 'undefined' ? currentIdx : 0) + 1;
          if (action.index !== insertAt && action.index !== insertAt - 1) {
            playQueue.splice(action.index, 1);
            playQueue.splice(insertAt > action.index ? insertAt - 1 : insertAt, 0, song);
            if (typeof syncQueueUI === 'function') syncQueueUI();
          }
        }
        setTimeout(pushNow, 300); break;
      }
      case 'next-up-detail-track': {
        if (typeof playlistPanelDetailState !== 'undefined' && playlistPanelDetailState.tracks) {
          var t = playlistPanelDetailState.tracks[action.index];
          if (t && typeof playQueue !== 'undefined' && playQueue) {
            var insertPos = (typeof currentIdx !== 'undefined' ? currentIdx : 0) + 1;
            playQueue.splice(insertPos, 0, t);
            if (typeof syncQueueUI === 'function') syncQueueUI();
          }
        }
        setTimeout(pushNow, 300); break;
      }
      case 'open-playlist':
        if (typeof openPlaylistPanelDetail === 'function') {
          openPlaylistPanelDetail(action.provider || '', String(action.pid || ''), action.title || '');
          // Poll for tracks loading
          lastDetailKey = action.pid + ':' + Date.now();
          var pollKey = lastDetailKey;
          var tries = 0;
          var pollTimer = setInterval(function () {
            if (pollKey !== lastDetailKey) { clearInterval(pollTimer); return; }
            tries++;
            var tracks = (typeof playlistPanelDetailState !== 'undefined') ? playlistPanelDetailState.tracks : [];
            if (tracks && tracks.length > 0 || tries > 20) {
              clearInterval(pollTimer);
              lastStateJson = ''; pushNow();
            }
          }, 500);
        }
        break;
      case 'play-detail-track':
        if (typeof playPlaylistPanelDetailTrack === 'function') {
          playPlaylistPanelDetailTrack(action.index);
        }
        setTimeout(pushNow, 600); break;
      case 'like-detail-track':
        if (typeof playlistPanelDetailState !== 'undefined' && playlistPanelDetailState.tracks) {
          var t = playlistPanelDetailState.tracks[action.index];
          if (t && typeof toggleLikeSong === 'function') toggleLikeSong(t);
        }
        setTimeout(pushNow, 400); break;
      case 'toggle-widget-size':
        if (window.desktopWindow && typeof window.desktopWindow.togglePlaylistWidgetSize === 'function') {
          window.desktopWindow.togglePlaylistWidgetSize();
        }
        break;
    }
  });

  window.desktopWindow.onPlaylistWidgetRequestState(function () {
    lastStateJson = ''; pushNow();
  });

  window.desktopWindow.onPlaylistWidgetEnabledState(function (s) {
    widgetEnabled = !!(s && s.enabled);
    updateEntryIcon();
    if (widgetEnabled) { lastStateJson = ''; pushNow(); startPolling(); }
    else { stopPolling(); }
  });

  window.pushPlaylistWidgetState = pushNow;
})();
