# Captura automática de cédula en Kiosko — compatible con cualquier móvil

## Causas encontradas (revisando el código actual)

1. **Exige un movimiento previo que en el móvil casi nunca ocurre.** La captura solo se "arma" si antes detecta un movimiento fuerte (diferencia > 12). Si la cédula ya está frente a la cámara cuando ésta arranca, o el móvil está fijo en un soporte, nunca se arma y se queda para siempre en "Mantén la cédula quieta…". En el PC funcionó porque la cédula se acercó con la mano después de abrir la cámara.
2. **El enfoque y la exposición automática del iPhone generan "falso movimiento".** Mientras el iPhone ajusta luz/enfoque, el cuadro cambia levemente; con el límite tan estricto (< 5) el contador de estabilidad se reinicia una y otra vez.
3. **La imagen se deforma al analizarla.** En vertical el iPhone entrega video 1080×1920, pero se reduce a 160×100 (horizontal), aplastándolo; la nitidez medida baja y no supera el umbral fijo (35), que además fue calibrado con la cámara 4K del PC.
4. **No se fuerza enfoque continuo** ni se elige la cámara trasera principal en iPhones con varias lentes (el 15 Pro Max puede abrir el gran angular, que desenfoca de cerca).
5. **Foto completa a 1920 px y calidad 0,85**: en móviles lentos hace la lectura más pesada de lo necesario.

## Qué se cambiará

- **Sin movimiento previo obligatorio:** se captura en cuanto haya estabilidad y nitidez, haya o no movimiento antes. Tras cada lectura se espera a que la imagen cambie (cédula retirada) para no repetir la misma.
- **Umbrales adaptativos:** la nitidez se compara contra lo que esa cámara logra en los primeros segundos (no un número fijo), y la tolerancia de movimiento se amplía para absorber los ajustes de luz/enfoque.
- **Análisis sin deformar:** el cuadro de análisis respeta la proporción real del video y se concentra en la zona central de la guía.
- **Cámara mejor configurada:** cámara trasera, enfoque continuo y exposición continua cuando el móvil lo soporte; resolución pedida según el dispositivo.
- **Respaldo garantizado:** si en ~4 segundos no logra la captura automática, toma la foto igualmente con el mejor cuadro visto (el más nítido), y el botón "Capturar ahora" queda siempre visible en Kiosko.
- **Foto optimizada:** se reduce a ~1600 px de ancho y se comprime antes de enviarla, para que la lectura sea rápida en datos móviles.
- **Indicador visual** en pantalla (barra de "estabilidad/nitidez") para que el operador sepa cuánto falta.

## Verificación

- Pruebas internas simulando cámara en vertical, cámara fija desde el inicio y ajuste de luz, confirmando que la captura se dispara.
- La prueba definitiva debe hacerse en tus iPhone XR y 15 Pro Max tras publicar (no puedo usar una cámara real de iPhone desde aquí).

## Detalles técnicos

- `src/components/cedula/CedulaScanner.tsx`: eliminar `armed` como requisito; bucle con `requestVideoFrameCallback` cuando exista (fallback intervalo 300 ms); canvas de análisis con proporción de `videoWidth/videoHeight` y recorte central; baseline de nitidez (percentil de los primeros ~10 cuadros, umbral = 0,6× baseline, mínimo bajo); movimiento < 8 con media móvil; mantener mejor cuadro y timeout de 4 s; "re-armar" tras lectura cuando motion > umbral o cambia la escena.
- `getUserMedia`: `facingMode: { ideal: 'environment' }`, `width ideal 1920`, luego `track.applyConstraints({ advanced: [{ focusMode: 'continuous', exposureMode: 'continuous' }] })` si `getCapabilities` lo soporta; esperar `loadedmetadata` + `video.play()` explícito (iOS).
- `captureFrame`: escalar a máx. 1600 px, JPEG 0,8.
- `src/lib/frameQuality.ts`: soporte para región de interés; nueva prueba unitaria de la lógica de disparo (estable sin movimiento previo → dispara).
