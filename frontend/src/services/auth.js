const TOKEN_KEY = "erp_token";
const FORCE_CHANGE_PASSWORD_KEY = "erp_force_change_password";

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(FORCE_CHANGE_PASSWORD_KEY);
}

export function isLoggedIn() {
  return !!getToken();
}

export function setMustChangePassword(value) {
  localStorage.setItem(FORCE_CHANGE_PASSWORD_KEY, value ? "true" : "false");
}

export function getMustChangePassword() {
  return localStorage.getItem(FORCE_CHANGE_PASSWORD_KEY) === "true";
}

export function clearMustChangePassword() {
  localStorage.removeItem(FORCE_CHANGE_PASSWORD_KEY);
}