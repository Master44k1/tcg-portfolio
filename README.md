# Sealed Portfolio

Web-App (PWA) für PC und Handy: Sealed-TCG-Produkte (Displays, ETBs, Boxen …) per Barcode
scannen oder suchen, ins Portfolio legen und mit aktuellen Cardmarket-Preisen bewerten.

## Funktionen
- Barcode-Scan mit der Handy- oder Laptop-Kamera (EAN/UPC). Beim ersten Scan ordnest du den
  Barcode einmal einem Produkt zu, danach wird er automatisch erkannt.
- Suche im Cardmarket-Katalog aller Sealed-Produkte.
- Portfolio mit Menge, Kaufpreis, Kaufdatum, Wert, Gewinn/Verlust und Wertverlauf.
- Bewertung wahlweise nach Trendpreis, Ø 7/30 Tage, Ø Verkaufspreis oder Ab-Preis.
- Installierbar (auf dem Handy „Zum Startbildschirm hinzufügen“), funktioniert offline mit den
  zuletzt geladenen Preisen.
- Export/Import als JSON, um das Portfolio zwischen Geräten zu übertragen.

## Woher kommen die Preise?
Cardmarket veröffentlicht täglich einen öffentlichen Produktkatalog und Preis-Guide
(`downloads.s3.cardmarket.com/productCatalog/...`). Die GitHub Action in
`.github/workflows/deploy.yml` lädt beide einmal täglich, filtert auf Sealed-Produkte und
veröffentlicht die App mit den Daten auf GitHub Pages. Es braucht keinen API-Schlüssel und
keinen Server.

## Einrichten (einmalig)
1. Repository auf GitHub anlegen und diesen Code pushen.
2. Unter **Settings → Pages → Build and deployment → Source** „GitHub Actions“ wählen.
3. Die Action läuft bei jedem Push und täglich um 06:30 UTC. Die App liegt dann unter
   `https://<benutzer>.github.io/<repo>/`.

Weitere Spiele: in der Workflow-Datei `GAMES` ergänzen (Cardmarket `idGame`: 1 Magic,
3 Yu-Gi-Oh!, 6 Pokémon).

## Lokal entwickeln
```bash
npm install
npm run data:sample   # Beispieldaten, oder `npm run data` für echte Cardmarket-Daten
npm run dev
```

## Grenzen
- Preise sind tagesaktuell (Stand des Cardmarket-Preis-Guides), nicht live.
- Das Portfolio wird lokal im Browser gespeichert. Für mehrere Geräte Export/Import nutzen.
- eBay-Verkaufsdaten sind noch nicht eingebaut (die eBay Marketplace Insights API braucht eine
  Freigabe durch eBay).
