import { useEffect, useRef, useState } from 'react';

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];

async function makeDetector() {
  // Native API (Chrome/Android), sonst WebAssembly-Ersatz (iOS Safari, Firefox)
  if ('BarcodeDetector' in window) {
    try {
      const supported = await window.BarcodeDetector.getSupportedFormats();
      if (supported.includes('ean_13')) return new window.BarcodeDetector({ formats: FORMATS.filter((f) => supported.includes(f)) });
    } catch {
      /* fällt auf Ersatz zurück */
    }
  }
  const { BarcodeDetector } = await import('barcode-detector/ponyfill');
  return new BarcodeDetector({ formats: FORMATS });
}

export default function Scanner({ onResult, onClose }) {
  const video = useRef(null);
  const [error, setError] = useState('');
  const [manual, setManual] = useState('');

  useEffect(() => {
    let stream;
    let timer;
    let stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
          audio: false,
        });
        if (stopped) return;
        video.current.srcObject = stream;
        await video.current.play();
        const detector = await makeDetector();
        const tick = async () => {
          if (stopped) return;
          try {
            const codes = await detector.detect(video.current);
            if (codes.length) {
              navigator.vibrate?.(80);
              onResult(codes[0].rawValue);
              return;
            }
          } catch {
            /* nächster Versuch */
          }
          timer = setTimeout(tick, 200);
        };
        tick();
      } catch (e) {
        setError(
          e?.name === 'NotAllowedError'
            ? 'Kamerazugriff wurde abgelehnt. Erlaube die Kamera in den Browser-Einstellungen oder gib den Barcode unten ein.'
            : 'Keine Kamera gefunden. Gib den Barcode unten ein.',
        );
      }
    })();
    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult]);

  return (
    <div className="scanner">
      <div className="scanner-view">
        {error ? <p className="scanner-error">{error}</p> : <video ref={video} playsInline muted />}
        {!error && <div className="scanner-frame" />}
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          const code = manual.replace(/\D/g, '');
          if (code) onResult(code);
        }}
      >
        <input inputMode="numeric" placeholder="Barcode manuell eingeben" value={manual} onChange={(e) => setManual(e.target.value)} />
        <button type="submit">OK</button>
      </form>
      <button className="ghost" onClick={onClose}>Abbrechen</button>
    </div>
  );
}
