import api from './api'

export const routesService = {
  async getAll() {
    const response = await api.get('/rutas')
    return response.data
  },

  async create(routeData) {
    const response = await api.post('/rutas', routeData)
    return response.data
  }
}
