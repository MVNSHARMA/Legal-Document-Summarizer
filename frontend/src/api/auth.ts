import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ─── Token helpers ────────────────────────────────────────────────────────────
const TOKEN_KEY = "lex_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  google_id: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────
export async function registerUser(
  email: string,
  password: string,
  fullName: string
): Promise<TokenResponse> {
  const { data } = await axios.post<TokenResponse>(`${API_BASE_URL}/api/auth/register`, {
    email,
    password,
    full_name: fullName,
  });
  setToken(data.access_token);
  return data;
}

export async function loginUser(
  email: string,
  password: string
): Promise<TokenResponse> {
  const { data } = await axios.post<TokenResponse>(`${API_BASE_URL}/api/auth/login`, {
    email,
    password,
  });
  setToken(data.access_token);
  return data;
}

export function googleLogin(): void {
  // Full-page redirect — backend handles the OAuth flow
  window.location.href = `${API_BASE_URL}/api/auth/google`;
}

export async function getCurrentUser(token: string): Promise<AuthUser> {
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const response = await fetch(`${API_BASE}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to get user: ${response.status}`);
  }
  return response.json();
}

export async function updateProfile(
  token: string,
  fullName: string
): Promise<AuthUser> {
  const { data } = await axios.put<AuthUser>(
    `${API_BASE_URL}/api/auth/profile`,
    { full_name: fullName },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return data;
}

export async function updatePassword(
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await axios.put(
    `${API_BASE_URL}/api/auth/password`,
    { current_password: currentPassword, new_password: newPassword },
    { headers: { Authorization: `Bearer ${token}` } },
  );
}

export async function deleteAccount(token: string): Promise<void> {
  await axios.delete(`${API_BASE_URL}/api/auth/account`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
