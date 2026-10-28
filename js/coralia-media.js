/* Coralia localized media captions.
   Video and audio subtitle cues live in subtitles/{es,en}.json.
   Each cue is [startMs, endMs, speaker, text]. */
(function () {
  const language = () => localStorage.getItem('coralia_language') || document.documentElement.lang || 'es';
  const timeText = ms => {
    const safe = Math.max(0, Math.floor(ms));
    const h = String(Math.floor(safe / 3600000)).padStart(2, '0');
    const m = String(Math.floor((safe % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((safe % 60000) / 1000)).padStart(2, '0');
    return h + ':' + m + ':' + s + '.' + String(safe % 1000).padStart(3, '0');
  };
  const isEffect = speaker => ['EFECTO','EFFECT','EFECT','SFX'].includes(String(speaker || '').toUpperCase());
  const speakerColor = speaker => {
    const key = String(speaker || '').toUpperCase();
    if (key === 'VELA' || key === 'VELLA') return '#8ee6a5';
    if (key === 'FRENZY') return '#9bd9ff';
    if (key === 'MOVISTAR') return '#c7b4ff';
    if (key === 'PSYCO') return '#d8b4fe';
    if (isEffect(key)) return '#b9c8cf';
    return '#e2edf3';
  };
  const captionText = cue => {
    const speaker = cue[2] && !isEffect(cue[2]) ? cue[2] + ': ' : '';
    return speaker + cue[3];
  };
  function renderCaption(panel, cue) {
    panel.replaceChildren();
    if (!cue) return;
    const speaker = cue[2] || '';
    const color = speakerColor(speaker);
    panel.style.borderLeftColor = color;
    if (speaker && !isEffect(speaker)) {
      const label = document.createElement('span');
      label.textContent = speaker + ': ';
      label.style.cssText = 'font-weight:700;color:' + color + ';';
      panel.appendChild(label);
    }
    const line = document.createElement('span');
    line.textContent = cue[3] || '';
    line.style.color = color;
    panel.appendChild(line);
  }
  const captionVtt = cue => {
    const speaker = cue[2] || '';
    const safeText = captionText(cue).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const voice = isEffect(speaker) ? 'Effect' : speaker.replace(/[^a-zA-Z0-9 _-]/g, '');
    return '<v ' + voice + '>' + safeText + '</v>';
  };
  async function loadCues(id, lang) {
    const response = await fetch('subtitles/' + lang + '.json');
    if (!response.ok) throw new Error('No se pudo cargar el archivo de subtítulos: ' + lang);
    const data = await response.json();
    const entry = data[id];
    if (!entry || !Array.isArray(entry.cues)) throw new Error('Subtítulos no encontrados: ' + id + ' (' + lang + ')');
    return entry.cues;
  }
  function ensureCaptionPanel(media) {
    let panel = media.parentElement && media.parentElement.querySelector(':scope > .coralia-audio-subtitles');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'coralia-audio-subtitles';
      panel.setAttribute('role', 'status');
      panel.setAttribute('aria-live', 'polite');
      panel.style.cssText = 'box-sizing:border-box;width:100%;min-height:2.6em;margin-top:8px;padding:8px 10px;background:rgba(16,26,37,.58);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);color:#e2edf3;border-left:2px solid rgba(121,169,182,.8);font:12px/1.55 Tahoma,Arial,sans-serif;white-space:normal;';
      media.insertAdjacentElement('afterend', panel);
    }
    return panel;
  }
  async function configureAudio(audio, subtitleId, lang) {
    const cues = await loadCues(subtitleId, lang);
    const panel = ensureCaptionPanel(audio);
    const languageLabel = lang === 'en' ? 'English subtitles' : 'Subtítulos en español';
    panel.dataset.language = lang;
    panel.textContent = languageLabel + (lang === 'en' ? ' · Play the audio to see captions.' : ' · Reproduce el audio para ver los subtítulos.');
    if (audio.dataset.coraliaCaptionListener === 'true') {
      audio.removeEventListener('timeupdate', audio._coraliaCaptionUpdate);
      audio.removeEventListener('seeked', audio._coraliaCaptionUpdate);
      audio.removeEventListener('ended', audio._coraliaCaptionEnd);
    }
    const update = () => {
      const now = audio.currentTime * 1000;
      const cue = cues.find(item => now >= item[0] && now < item[1]);
      if (cue) renderCaption(panel, cue);
      else {
        panel.style.borderLeftColor = 'rgba(121,169,182,.8)';
        panel.textContent = audio.paused ? languageLabel + (lang === 'en' ? ' · Play the audio to see captions.' : ' · Reproduce el audio para ver los subtítulos.') : '';
      }
    };
    const end = () => { panel.style.borderLeftColor = 'rgba(121,169,182,.8)'; panel.textContent = languageLabel + (lang === 'en' ? ' · End of recording.' : ' · Fin de la grabación.'); };
    audio._coraliaCaptionUpdate = update;
    audio._coraliaCaptionEnd = end;
    audio.addEventListener('timeupdate', update);
    audio.addEventListener('seeked', update);
    audio.addEventListener('ended', end);
    audio.dataset.coraliaCaptionListener = 'true';
    audio.dataset.coraliaConfigured = 'true';
    update();
    return { subtitleId, language: lang, cueCount: cues.length };
  }
  async function configureVideo(video, videoId, lang) {
    const response = await fetch('media/videos.json');
    if (!response.ok) throw new Error('No se pudo cargar media/videos.json');
    const manifest = await response.json();
    const entry = manifest.videos && manifest.videos[videoId];
    if (!entry) throw new Error('VHS no registrado: ' + videoId);
    const actualLang = entry[lang] ? lang : 'es';
    const source = entry[actualLang];
    video.pause();
    video.replaceChildren();
    const sourceNode = document.createElement('source');
    sourceNode.src = source.src;
    video.appendChild(sourceNode);
    video.dataset.language = actualLang;
    video.load();
    if (source.subtitles) {
      const subtitleResponse = await fetch(source.subtitles);
      if (subtitleResponse.ok) {
        const subtitleData = await subtitleResponse.json();
        const cues = subtitleData.cues || [];
        const vtt = 'WEBVTT\\n\\nSTYLE\\n::cue { background-color: rgba(0, 0, 0, 0.42); }\\n::cue(v[voice="Vela"]), ::cue(v[voice="Vella"]) { color: #8ee6a5; }\\n::cue(v[voice="Frenzy"]) { color: #9bd9ff; }\\n::cue(v[voice="Movistar"]) { color: #c7b4ff; }\\n::cue(v[voice="Psyco"]) { color: #d8b4fe; }\\n::cue(v[voice="Effect"]) { color: #b9c8cf; }\\n\\n' + cues.map((cue, index) =>
          (index + 1) + '\\n' + timeText(cue[0]) + ' --> ' + timeText(cue[1]) + '\\n' +
          captionVtt(cue)
        ).join('\\n\\n');
        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = actualLang === 'es' ? 'Español' : 'English';
        track.srclang = actualLang;
        track.default = true;
        track.src = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt;charset=utf-8' }));
        video.appendChild(track);
      }
    }
    return { videoId, language: actualLang, source: source.src };
  }
  function initializeMedia(root = document) {
    root.querySelectorAll('audio[data-localized-audio]').forEach(audio => {
      if (audio.dataset.coraliaConfigured === 'true') return;
      audio.dataset.coraliaConfigured = 'loading';
      configureAudio(audio, audio.dataset.localizedAudio, language()).catch(error => {
        audio.dataset.coraliaConfigured = 'false';
        console.warn('No se pudieron preparar los subtítulos del audio:', error);
        const panel = ensureCaptionPanel(audio);
        panel.textContent = language() === 'en'
          ? 'Subtitles could not be loaded. Reload the page and try again.'
          : 'No se pudieron cargar los subtítulos. Recarga la página e inténtalo de nuevo.';
      });
    });
    root.querySelectorAll('video[data-localized-video]').forEach(video => {
      if (video.dataset.coraliaConfigured === 'true') return;
      video.dataset.coraliaConfigured = 'true';
      configureVideo(video, video.dataset.localizedVideo, language()).catch(error => {
        video.dataset.coraliaConfigured = 'false';
        console.warn('No se pudo preparar el VHS localizado:', error);
      });
    });
  }
  window.CoraliaMedia = { configureAudio, configureVideo, initializeMedia, initializeVideos: initializeMedia };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initializeMedia());
  else initializeMedia();
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
    if (node.nodeType === 1) initializeMedia(node.matches && node.matches('audio,video') ? node.parentNode || document : node);
  }))).observe(document.documentElement, { childList: true, subtree: true });
})();