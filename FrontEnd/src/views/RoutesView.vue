<template>
  <div class="routes-container">
    <div class="page-header">
      <h1>Rutas Sugeridas</h1>
      <p class="subtitle">Explora las rutas turisticas creadas por la comunidad</p>
    </div>

    <div class="content-section">
      <div class="routes-panel">
        <div class="panel-header">
          <h3>Rutas Disponibles</h3>
          <span class="route-count">{{ routes.length }} rutas</span>
        </div>

        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Cargando rutas...</p>
        </div>

        <div v-else-if="routes.length === 0" class="empty-state">
          <p>No hay rutas disponibles</p>
        </div>

        <div v-else class="routes-list">
          <div
            v-for="route in routes"
            :key="route.id"
            class="route-card"
            :class="{ 'active': selectedRoute?.id === route.id }"
            @click="selectRoute(route)"
          >
            <div class="route-header">
              <h4>{{ route.nombre }}</h4>
              <span class="distance-badge">
                {{ route.longitudKm?.toFixed(2) || '0.00' }} km
              </span>
            </div>
            <p class="route-description">{{ truncateText(route.descripcion, 100) }}</p>
            <div class="route-meta">
              <span class="author">Por: {{ route.nombreUsuario }}</span>
              <span class="date">{{ formatDate(route.fechaCreacion) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="map-section">
        <div v-if="!isMapReady" class="map-loading">
          <div class="spinner"></div>
          <p>Cargando mapa...</p>
        </div>

        <l-map
          v-if="isMapReady"
          ref="mapRef"
          :zoom="zoom"
          :center="center"
          :options="mapOptions"
          class="leaflet-map"
        >
          <l-tile-layer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          <!-- Mostrar todas las rutas en gris claro -->
          <l-polyline
            v-for="route in routes"
            :key="'route-bg-' + route.id"
            :lat-lngs="getRouteCoordinates(route)"
            :options="route.id === selectedRoute?.id ? selectedRouteOptions : defaultRouteOptions"
            @click="selectRoute(route)"
          />

          <!-- Marcadores de inicio y fin de la ruta seleccionada -->
          <template v-if="selectedRoute && selectedRouteCoords.length > 0">
            <l-marker
              :lat-lng="selectedRouteCoords[0]"
              :icon="startIcon"
            >
              <l-popup>
                <div class="marker-popup">
                  <strong>Inicio</strong>
                  <p>{{ selectedRoute.nombre }}</p>
                </div>
              </l-popup>
            </l-marker>

            <l-marker
              :lat-lng="selectedRouteCoords[selectedRouteCoords.length - 1]"
              :icon="endIcon"
            >
              <l-popup>
                <div class="marker-popup">
                  <strong>Fin</strong>
                  <p>{{ selectedRoute.nombre }}</p>
                </div>
              </l-popup>
            </l-marker>
          </template>
        </l-map>

        <!-- Panel de info de ruta seleccionada -->
        <div v-if="selectedRoute" class="route-info-overlay">
          <div class="route-info-card">
            <button class="close-btn" @click="clearSelection">&times;</button>
            <h3>{{ selectedRoute.nombre }}</h3>
            <p class="description">{{ selectedRoute.descripcion }}</p>
            <div class="stats">
              <div class="stat">
                <span class="stat-value">{{ selectedRoute.longitudKm?.toFixed(2) || '0.00' }}</span>
                <span class="stat-label">Kilometros</span>
              </div>
              <div class="stat">
                <span class="stat-value">{{ selectedRouteCoords.length }}</span>
                <span class="stat-label">Puntos</span>
              </div>
            </div>
            <div class="author-info">
              <span>Creada por <strong>{{ selectedRoute.nombreUsuario }}</strong></span>
              <span class="date">{{ formatDate(selectedRoute.fechaCreacion) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Mensaje de error -->
    <div v-if="error" class="error-message">
      <p>{{ error }}</p>
      <button @click="error = null" class="btn btn-secondary">Cerrar</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { LMap, LTileLayer, LPolyline, LMarker, LPopup } from '@vue-leaflet/vue-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { routesService } from '@/services/routesService'

const mapRef = ref(null)
const zoom = ref(13)
const center = ref([-33.4489, -70.6693])
const isMapReady = ref(false)

const routes = ref([])
const selectedRoute = ref(null)
const loading = ref(false)
const error = ref(null)

const mapOptions = {
  zoomControl: true,
  attributionControl: true,
  scrollWheelZoom: true
}

const defaultRouteOptions = {
  color: '#95a5a6',
  weight: 4,
  opacity: 0.6
}

const selectedRouteOptions = {
  color: '#e74c3c',
  weight: 6,
  opacity: 1
}

const startIcon = L.divIcon({
  html: `<div style="
    background-color: #27ae60;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: bold;
    color: white;
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  ">A</div>`,
  className: 'route-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
})

const endIcon = L.divIcon({
  html: `<div style="
    background-color: #e74c3c;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: bold;
    color: white;
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  ">B</div>`,
  className: 'route-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
})

const selectedRouteCoords = computed(() => {
  if (!selectedRoute.value) return []
  return getRouteCoordinates(selectedRoute.value)
})

const getRouteCoordinates = (route) => {
  if (!route.geoJson) return []

  try {
    const geoJson = JSON.parse(route.geoJson)
    // GeoJSON coordinates are [lon, lat], Leaflet needs [lat, lon]
    if (geoJson.type === 'LineString' && geoJson.coordinates) {
      return geoJson.coordinates.map(coord => [coord[1], coord[0]])
    }
  } catch (e) {
    console.error('Error parsing geoJson:', e)
  }
  return []
}

const selectRoute = (route) => {
  selectedRoute.value = route

  const coords = getRouteCoordinates(route)
  if (coords.length > 0 && mapRef.value?.leafletObject) {
    const bounds = L.latLngBounds(coords)
    mapRef.value.leafletObject.fitBounds(bounds, { padding: [50, 50] })
  }
}

const clearSelection = () => {
  selectedRoute.value = null
}

const truncateText = (text, maxLength) => {
  if (!text) return 'Sin descripcion'
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const loadRoutes = async () => {
  loading.value = true
  error.value = null

  try {
    routes.value = await routesService.getAll()

    // Auto-select first route if available
    if (routes.value.length > 0) {
      selectRoute(routes.value[0])
    }
  } catch (err) {
    console.error('Error loading routes:', err)
    error.value = 'Error al cargar las rutas. Intenta nuevamente.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await nextTick()
  setTimeout(() => {
    isMapReady.value = true
  }, 100)

  loadRoutes()
})
</script>

<style scoped>
.routes-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #7f8c8d;
  font-size: 1.1rem;
}

.content-section {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 1.5rem;
  min-height: 600px;
}

.routes-panel {
  background: #f8f9fa;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem;
  background: #2c3e50;
  color: white;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.route-count {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
}

.routes-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.route-card {
  background: white;
  border-radius: 10px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.route-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.route-card.active {
  border-color: #e74c3c;
  background: #fef5f5;
}

.route-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.route-header h4 {
  margin: 0;
  color: #2c3e50;
  font-size: 1rem;
  flex: 1;
}

.distance-badge {
  background: #3498db;
  color: white;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}

.route-description {
  color: #7f8c8d;
  font-size: 0.85rem;
  margin: 0 0 0.75rem;
  line-height: 1.4;
}

.route-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #95a5a6;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #7f8c8d;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.map-section {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
  min-height: 600px;
}

.leaflet-map {
  height: 100%;
  width: 100%;
  min-height: 600px;
}

.map-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 600px;
  background: #f8f9fa;
}

.route-info-overlay {
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  right: 1rem;
  z-index: 1000;
  pointer-events: none;
}

.route-info-card {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-width: 400px;
  pointer-events: auto;
  position: relative;
}

.close-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #95a5a6;
  cursor: pointer;
  line-height: 1;
}

.close-btn:hover {
  color: #e74c3c;
}

.route-info-card h3 {
  margin: 0 0 0.5rem;
  color: #2c3e50;
  padding-right: 2rem;
}

.route-info-card .description {
  color: #7f8c8d;
  font-size: 0.9rem;
  margin: 0 0 1rem;
  line-height: 1.5;
}

.stats {
  display: flex;
  gap: 2rem;
  margin-bottom: 1rem;
}

.stat {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #e74c3c;
}

.stat-label {
  font-size: 0.8rem;
  color: #95a5a6;
  text-transform: uppercase;
}

.author-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #7f8c8d;
  padding-top: 0.75rem;
  border-top: 1px solid #eee;
}

.marker-popup {
  text-align: center;
}

.marker-popup strong {
  display: block;
  margin-bottom: 0.25rem;
}

.marker-popup p {
  margin: 0;
  color: #7f8c8d;
  font-size: 0.85rem;
}

.error-message {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  background: #e74c3c;
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 2000;
}

.error-message p {
  margin: 0;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.3);
}

@media (max-width: 900px) {
  .content-section {
    grid-template-columns: 1fr;
  }

  .routes-panel {
    order: 2;
    max-height: 400px;
  }

  .map-section {
    order: 1;
    min-height: 400px;
  }

  .leaflet-map {
    min-height: 400px;
  }
}

@media (max-width: 600px) {
  .routes-container {
    padding: 1rem;
  }

  .route-info-overlay {
    left: 0.5rem;
    right: 0.5rem;
    bottom: 0.5rem;
  }
}
</style>
