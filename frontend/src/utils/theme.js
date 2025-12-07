// src/utils/theme.js
// 简单的主题管理：支持 'light' 和 'dark'

export const THEME_KEY = 'app_theme';

export const getStoredTheme = () => {
  try {
    return localStorage.getItem(THEME_KEY) || 'light';
  } catch (e) {
    return 'light';
  }
};

export const applyTheme = (theme) => {
  try {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('theme-dark');
    } else {
      root.classList.remove('theme-dark');
    }
  } catch (e) {
    console.error('applyTheme error:', e);
  }
};

export const setStoredTheme = (theme) => {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {}
  applyTheme(theme);
};

export const initTheme = () => {
  const t = getStoredTheme();
  applyTheme(t);
  return t;
};
