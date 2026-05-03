import type { GeoJSON } from 'geojson'

export const AIRPORTS_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [12.6561, 55.6181] }, properties: { icao: 'EKCH', iata: 'CPH', name: 'Kastrup (CPH)' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [9.1518, 55.7403] }, properties: { icao: 'EKBI', iata: 'BLL', name: 'Billund (BLL)' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [9.8492, 57.0928] }, properties: { icao: 'EKYT', iata: 'AAL', name: 'Aalborg (AAL)' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [10.3309, 55.4769] }, properties: { icao: 'EKOD', iata: 'ODE', name: 'Odense (ODE)' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [14.7596, 55.0636] }, properties: { icao: 'EKRN', iata: 'RNN', name: 'Bornholm (RNN)' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [8.5534, 55.5259] }, properties: { icao: 'EKEB', iata: 'EBJ', name: 'Esbjerg (EBJ)' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [10.6193, 56.3001] }, properties: { icao: 'EKAH', iata: 'AAR', name: 'Aarhus (AAR)' } },
  ],
}
