# Coralia — preparación de localización

Esta rama conserva intactos `main` y los archivos CSS originales. No reemplaces la versión publicada por estos borradores hasta probarlos.

## Archivos
- `index-i18n-prep.html`: Hub con selector de idioma y CSS original.
- `coralia-mail-i18n-prep.html`: interfaz de correo preparada para cargar las vistas desde JSON.
- `locales/es.json`: textos españoles, remitentes, asuntos, filas y vistas de los mensajes.
- `subtitles/es.json`: subtítulos de MOVISTAR VM 05 y Sin título.wav. Los tiempos de Sin título son estimados y deben revisarse contra el audio real.
- `media/videos.json`: rutas por idioma para los VHS del 31 de octubre.
- `js/coralia-media.js`: elige vídeo/subtítulos por idioma y genera WebVTT desde cues JSON.

## Agregar un mensaje
1. Añade su vista en `locales/es.json` dentro de `messages`, con una clave estable.
2. Añade remitente, asunto y fecha en `mailRows` o `dynamicRows`.
3. Registra la clave en `updates` para documentar la actualización.
4. La progresión actual todavía usa la lógica de JavaScript existente; una nueva tanda narrativa se conecta ahí una sola vez. No hace falta volver a extraer ni duplicar el texto.

## Agregar un VHS
1. Registra el id en `media/videos.json` con una ruta de vídeo y un JSON de subtítulos para español e inglés.
2. Cada JSON de subtítulos usa `cues: [[inicioMs, finMs, hablante, texto], ...]`.
3. Dentro de la vista del mensaje añade `<video controls data-localized-video="halloween-vhs-01"></video>`.
4. El helper escoge el vídeo y subtítulos según `coralia_language`. No hay que tocar CSS ni duplicar la vista.

## Estado
- El selector EN avisa que la traducción aún no está disponible: esta entrega contiene solo español, como pediste.
- Las rutas VHS son una plantilla; los archivos todavía no existen.
- No se han modificado los HTML originales ni los CSS de `main`.
