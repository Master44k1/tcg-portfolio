import { useEffect, useRef, useState } from 'react';
// WebAssembly-Datei selbst ausliefern (statt von einem CDN), damit der Scan auch offline geht
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];

let detectorPromise;
function getDetector() {
  // Native API (Chrome/Android), sonst WebAssembly-Ersatz (iPhone, Firefox, Desktop)
  detectorPromise ||= (async () => {
    if ('BarcodeDetector' in window) {
      try {
        const supported = await window.BarcodeDetector.getSupportedFormats();
        if (supported.includes('ean_13')) return new window.BarcodeDetector({ formats: FORMATS.filter((f) => supported.includes(f)) });
      } catch {
        /* Ersatz verwenden */
      }
    }
    const { BarcodeDetector, prepareZXingModule } = await import('barcode-detector/ponyfill');
    prepareZXingModule({
      overrides: { locateFile: (path, prefix) => (path.endsWith('.wasm') ? new URL(wasmUrl, location.href).href : prefix + path) },
    });
    return new BarcodeDetector({ formats: FORMATS });
  })();
  return detectorPromise;
}

export default function Scanner({ onResult, onClose, t }) {
  const video = useRef(null);
  const track = useRef(null);
  const [error, setError] = useState('');
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);
  const [torch, setTorch] = useState(null); // null = nicht unterstützt

  useEffect(() => {
    let stream;
    let timer;
    let stopped = false;
    getDetector(); // vorladen
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('none');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (stopped) return;
        track.current = stream.getVideoTracks()[0];
        try {
          const caps = track.current.getCapabilities?.() || {};
          if (caps.torch) setTorch(false);
          if (caps.focusMode?.includes('continuous')) await track.current.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
        } catch {
          /* optional */
        }
        video.current.srcObject = stream;
        await video.current.play();
        const detector = await getDetector();
        const tick = async () => {
          if (stopped) return;
          try {
            if (video.current.readyState >= 2) {
              const codes = await detector.detect(video.current);
              if (codes.length) {
                navigator.vibrate?.(80);
                onResult(codes[0].rawValue);
                return;
              }
            }
          } catch {
            /* nächster Versuch */
          }
          timer = setTimeout(tick, 150);
        };
        tick();
      } catch (e) {
        if (!stopped) setError(e?.name === 'NotAllowedError' ? 'cameraDenied' : 'noCamera');
      }
    })();
    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [onResult]);

  const toggleTorch = async () => {
    try {
      await track.current.applyConstraints({ advanced: [{ torch: !torch }] });
      setTorch(!torch);
    } catch {
      setTorch(null);
    }
  };

  const fromPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const detector = await getDetector();
      const bmp = await createImageBitmap(file);
      const codes = await detector.detect(bmp);
      if (codes.length) onResult(codes[0].rawValue);
      else setError('noBarcodeInPhoto');
    } catch {
      setError('noBarcodeInPhoto');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="scanner">
      <div className="scanner-view">
        {error && error !== 'noBarcodeInPhoto' ? (
          <p className="scanner-error">{t(error)}</p>
        ) : (
          <>
            <video ref={video} playsInline muted />
            <div className="scanner-frame" />
            <div className="scanner-hint">{t('scanHint')}</div>
            {torch !== null && (
              <button className={`torch ${torch ? 'on' : ''}`} onClick={toggleTorch}>{t('torch')}</button>
            )}
          </>
        )}
      </div>
      {error === 'noBarcodeInPhoto' && <div className="banner">{t(error)}</div>}
      <label className="button center">
        {busy ? '…' : t('photoOfBarcode')}
        <input type="file" accept="image/*" capture="environment" onChange={fromPhoto} hidden />
      </label>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          const code = manual.replace(/\D/g, '');
          if (code) onResult(code);
        }}
      >
        <input inputMode="numeric" placeholder={t('manualBarcode')} value={manual} onChange={(e) => setManual(e.target.value)} />
        <button type="submit">OK</button>
      </form>
      <button className="ghost" onClick={onClose}>{t('cancel')}</button>
    </div>
  );
}
