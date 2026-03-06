import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

export const getMe = () => api.get('/auth/me')
export const logout = () => api.post('/auth/logout')
export const getGenres = () => api.get('/quiz/genres')
export const getUserPlaylists = () => api.get('/quiz/playlists')
export const startQuiz = (params) => api.get('/quiz/start', { params })
export const submitAnswer = (data) => api.post('/quiz/answer', data)
export const getHistory = () => api.get('/history/')
export const clearHistory = () => api.delete('/history/clear')

export default api
