import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach Bearer token automatically if stored
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cinesphere_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const getHomeContent = async () => {
  const response = await apiClient.get('/home_content');
  return response.data;
};

export const getTrendingMovies = async (limit = 16) => {
  const response = await apiClient.get('/movies/trending', { params: { limit } });
  return response.data;
};

export const searchMovies = async (query, limit = 20) => {
  const response = await apiClient.get('/movies/search', { params: { q: query, limit } });
  return response.data;
};

export const getMovieDetail = async (movieId) => {
  const response = await apiClient.get(`/movies/${movieId}`);
  return response.data;
};

export const getMoviesByGenre = async (genreName, limit = 12) => {
  const response = await apiClient.get(`/movies/genre/${genreName}`, { params: { limit } });
  return response.data;
};

export const getAllGenres = async () => {
  const response = await apiClient.get('/movies/genres');
  return response.data;
};

export const getRecommendations = async (movieId, mode = 'hybrid', contentWeight = 0.6, genre = 'All', minRating = 0.0, limit = 10) => {
  const response = await apiClient.get(`/recommendations/${movieId}`, {
    params: {
      mode,
      content_weight: contentWeight,
      genre,
      min_rating: minRating,
      limit,
    },
  });
  return response.data;
};

export const sendChatMessage = async (message, history = []) => {
  const response = await apiClient.post('/chat', { message, history });
  return response.data;
};

export default apiClient;
