/**
 * Theme Switcher for Business Tourism Web Application
 * Provides functionality to toggle between light and dark themes
 */

// Theme configuration
const themes = {
  light: {
    primary: '#1a73e8',    // Professional blue
    secondary: '#34a853',  // Success green
    accent: '#fbbc04',     // Warning yellow
    error: '#ea4335',      // Error red
    textPrimary: '#202124',// Dark gray for text
    textSecondary: '#5f6368', // Medium gray for secondary text
    borderColor: '#dadce0',// Light gray for borders
    backgroundLight: '#f8f9fa', // Very light gray for backgrounds
    backgroundMain: '#ffffff', // White background
    cardBackground: '#ffffff',
    shadowColor: 'rgba(0, 0, 0, 0.1)'
  },
  dark: {
    primary: '#8ab4f8',    // Lighter blue for dark mode
    secondary: '#81c995',  // Lighter green for dark mode
    accent: '#fdd663',     // Lighter yellow for dark mode
    error: '#f28b82',      // Lighter red for dark mode
    textPrimary: '#e8eaed',// Light gray for text in dark mode
    textSecondary: '#9aa0a6', // Medium gray for secondary text in dark mode
    borderColor: '#3c4043',// Dark gray for borders in dark mode
    backgroundLight: '#202124', // Dark gray for backgrounds
    backgroundMain: '#1e1e1e', // Dark background
    cardBackground: '#2d2d2d',
    shadowColor: 'rgba(0, 0, 0, 0.3)'
  }
};

// Current theme state
let currentTheme = 'light';

/**
 * Initialize the theme switcher
 */
function initThemeSwitcher() {
  // Check for saved theme preference
  const savedTheme = localStorage.getItem('businessTourismTheme');
  if (savedTheme) {
    currentTheme = savedTheme;
  } else {
    // Check for system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      currentTheme = 'dark';
    }
  }
  
  // Apply the initial theme
  applyTheme(currentTheme);
  
  // Add event listener to theme toggle button
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
    updateThemeToggleIcon(currentTheme);
  }
  
  // Listen for system theme changes
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem('businessTourismTheme')) {
        const newTheme = e.matches ? 'dark' : 'light';
        applyTheme(newTheme);
        updateThemeToggleIcon(newTheme);
      }
    });
  }
}

/**
 * Toggle between light and dark themes
 */
function toggleTheme() {
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(newTheme);
  localStorage.setItem('businessTourismTheme', newTheme);
  updateThemeToggleIcon(newTheme);
}

/**
 * Apply the specified theme to the document
 * @param {string} theme - The theme to apply ('light' or 'dark')
 */
function applyTheme(theme) {
  currentTheme = theme;
  const themeColors = themes[theme];
  
  // Apply theme colors to CSS variables
  document.documentElement.style.setProperty('--primary-color', themeColors.primary);
  document.documentElement.style.setProperty('--secondary-color', themeColors.secondary);
  document.documentElement.style.setProperty('--accent-color', themeColors.accent);
  document.documentElement.style.setProperty('--error-color', themeColors.error);
  document.documentElement.style.setProperty('--text-primary', themeColors.textPrimary);
  document.documentElement.style.setProperty('--text-secondary', themeColors.textSecondary);
  document.documentElement.style.setProperty('--border-color', themeColors.borderColor);
  document.documentElement.style.setProperty('--background-light', themeColors.backgroundLight);
  document.documentElement.style.setProperty('--background-main', themeColors.backgroundMain);
  document.documentElement.style.setProperty('--card-background', themeColors.cardBackground);
  document.documentElement.style.setProperty('--shadow-color', themeColors.shadowColor);
  
  // Add/remove dark class from body
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
  }
  
  // Dispatch theme change event
  document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
}

/**
 * Update the theme toggle button icon based on current theme
 * @param {string} theme - The current theme ('light' or 'dark')
 */
function updateThemeToggleIcon(theme) {
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) {
    const iconElement = themeToggleBtn.querySelector('i');
    if (iconElement) {
      // Remove existing classes
      iconElement.classList.remove('fa-sun', 'fa-moon');
      // Add appropriate icon class
      iconElement.classList.add(theme === 'light' ? 'fa-moon' : 'fa-sun');
    }
    
    // Update tooltip/aria-label
    themeToggleBtn.setAttribute('aria-label', `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`);
    themeToggleBtn.setAttribute('title', `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`);
  }
}

// Initialize theme switcher when DOM is loaded
document.addEventListener('DOMContentLoaded', initThemeSwitcher);

// Export functions for use in other modules
window.themeSwitcher = {
  toggle: toggleTheme,
  apply: applyTheme,
  getCurrentTheme: () => currentTheme
};