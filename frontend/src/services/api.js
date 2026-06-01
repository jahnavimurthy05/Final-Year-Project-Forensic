import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const generateSyntheticDna = async () => {
  try {
    const response = await api.get('/generate-synthetic-dna');
    return response.data;
  } catch (error) {
    console.error('Error generating DNA:', error);
    throw error;
  }
};

export const generateFaceVariations = async (traits) => {
  try {
    const response = await api.post('/generate-face', { traits });
    return response.data;
  } catch (error) {
    console.error('Error generating faces:', error);
    throw error;
  }
};

// Auth services (mock implementations)
export const loginUser = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const registerUser = async (username, email, password) => {
  try {
    const response = await api.post('/auth/register', { username, email, password });
    return response.data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

export default api;
