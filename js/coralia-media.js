/* Coralia localized video helper.
   Video entries live in media/videos.json; subtitle cues live in per-video JSON.
   Each cue is [startMs, endMs, speaker, text]. */
(function () {
  async function configureVideo(video, videoId, language) {
    const manifestResponse = await fetch('media/videos.json');
    if (!manifestResponse.ok) throw new Error('No se pudo cargar media/videos.json');
    const manifest = await manifestResponse.json();
    const entry = manifest.videos && manifest.videos[videoId];
    if (!entry) throw new Error('VHS no registrado: ' + videoId);
    const lang = entry[language] ? language : 'es';
    const source = entry[lang];
    video.pause();
    video.replaceChildren();
    const sourceNode = document.createElement('source');
    sourceNode.src = source.src;
    video.appendChild(sourceNode);
    video.dataset.language = lang;
    video.load();

    video.querySelectorAll('track').forEach(track => track.remove());
    if (source.subtitles) {
      const subtitleResponse = await fetch(source.subtitles);
      if (subtitleResponse.ok) {
        const subtitleData = await subtitleResponse.json();
        const cues = subtitleData.cues || [];
        const vttTime = ms => {
          const safe = Math.max(0, Math.floor(ms));
          const h = String(Math.floor(safe / 3600000)).padStart(2, '0');
          const m = String(Math.floor((safe % 3600000) / 60000)).padStart(2, '0');
          const s = String(Math.floor((safe % 60000) / 1000)).padStart(2, '0');
          const msPart = String(safe % 1000).padStart(3, '0');
          return h + ':' + m + ':' + s + '.' + msPart;
        };
        const vtt = 'WEBVTT\n\n' + cues.map((cue, index) =>
          (index + 1) + '\n' + vttTime(cue[0]) + ' --> ' + vttTime(cue[1]) + '\n' +
          ((cue[2] && cue[2] !== 'EFECTO') ? cue[2] + ': ' : '') + cue[3]
        ).join('\n\n');
        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = lang === 'es' ? 'Español' : 'English';
        track.srclang = lang;
        track.default = true;
        track.src = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt;charset=utf-8' }));
        video.appendChild(track);
      }
    }
    return { videoId, language: lang, source: source.src };
  }
  function initializeVideos(root = document) {
    root.querySelectorAll('video[data-localized-video]').forEach(video => {
      if (video.dataset.coraliaConfigured === 'true') return;
      video.dataset.coraliaConfigured = 'true';
      const lang = localStorage.getItem('coralia_language') || document.documentElement.lang || 'es';
      configureVideo(video, video.dataset.localizedVideo, lang).catch(error => {
        console.warn('No se pudo preparar el VHS localizado:', error);
      });
    });
  }
  window.CoraliaMedia = { configureVideo, initializeVideos };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initializeVideos());
  } else {
    initializeVideos();
  }
  new MutationObserver(records => records.forEach(record => {
    record.addedNodes.forEach(node => {
      if (node.nodeType === 1) {
        if (node.matches && node.matches('video[data-localized-video]')) initializeVideos(node.parentNode || document);
        else initializeVideos(node);
      }
    });
  })).observe(document.documentElement, { childList: true, subtree: true });
})();
