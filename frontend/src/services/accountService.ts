import axios, { AxiosError } from 'axios';
import { LoginCredentials } from './apiService';
import axiosInstance from '@/utils/axiosInstance';
import handleError from '@/utils/errorHandling';

const API_URL = import.meta.env.VITE_API_URL;

export const loginUser = async (credentials: LoginCredentials): Promise<any> => {
  try {
    const response = await axiosInstance.post('/login', credentials);
    return response.data;
  } catch (error) {
    handleError(error, 'Login failed');
  }
};

/** Clear token cookie and user from localStorage. Optionally calls backend. Caller should navigate to /login. */
export const logout = async () => {
  document.cookie = 'token=; Max-Age=0; path=/';
  localStorage.removeItem('user');
  try {
    await axios.post(`${API_URL}/logout`, {}, { withCredentials: true });
  } catch (error) {
    console.error('Logout API failed:', error);
  }
};


