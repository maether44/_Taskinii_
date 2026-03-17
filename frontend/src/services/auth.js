import axios from "axios";

const API = "http://localhost:5000/api/auth";

export const login = (data) => axios.post(`${API}/login`, data);
export const register = (data) => axios.post(`${API}/register`, data);

export const saveToken = (token) => localStorage.setItem("token", token);
export const getToken = () => localStorage.getItem("token");
export const saveUser = (user) => localStorage.setItem("user", JSON.stringify(user));
export const getUser = () => JSON.parse(localStorage.getItem("user"));
export const logout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); };

export const isAuthenticated = () => !!getToken();

// Auto-attach token to every axios request
axios.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});