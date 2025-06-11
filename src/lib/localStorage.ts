// Local Storage Utility for Health Score App
// This module provides functions to save and load app data to/from localStorage

interface AppData {
  metrics: any[];
  scoreGroups: any[];
  customFields: any[];
  merchants: any[];
  selectedColumns: string[];
  dataSubmissions: any[];
  settings: {
    appName: string;
    lastSaved: string;
    version: string;
  };
}

const STORAGE_KEY = 'health-score-app-data';
const SETTINGS_KEY = 'health-score-app-settings';

// Default settings
const defaultSettings = {
  appName: 'Health Score App',
  lastSaved: '',
  version: '1.0.0'
};

/**
 * Save all app data to localStorage
 */
export const saveToLocalStorage = (data: Partial<AppData>): boolean => {
  try {
    const currentData = loadFromLocalStorage();
    const updatedData: AppData = {
      ...currentData,
      ...data,
      settings: {
        ...currentData.settings,
        ...data.settings,
        lastSaved: new Date().toISOString()
      }
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
    return true;
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    return false;
  }
};

/**
 * Load all app data from localStorage
 */
export const loadFromLocalStorage = (): AppData => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      return {
        metrics: parsedData.metrics || [],
        scoreGroups: parsedData.scoreGroups || [],
        customFields: parsedData.customFields || [],
        merchants: parsedData.merchants || [],
        selectedColumns: parsedData.selectedColumns || [],
        dataSubmissions: parsedData.dataSubmissions || [],
        settings: { ...defaultSettings, ...parsedData.settings }
      };
    }
  } catch (error) {
    console.error('Error loading from localStorage:', error);
  }
  
  // Return default empty data if nothing stored or error occurred
  return {
    metrics: [],
    scoreGroups: [],
    customFields: [],
    merchants: [],
    selectedColumns: [],
    dataSubmissions: [],
    settings: defaultSettings
  };
};

/**
 * Save specific data type to localStorage
 */
export const saveDataType = (key: keyof AppData, data: any): boolean => {
  try {
    const currentData = loadFromLocalStorage();
    currentData[key] = data;
    return saveToLocalStorage(currentData);
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
    return false;
  }
};

/**
 * Save app settings to localStorage
 */
export const saveSettings = (settings: Partial<AppData['settings']>): boolean => {
  try {
    const currentSettings = loadSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
    return saveDataType('settings', updatedSettings);
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
};

/**
 * Load app settings from localStorage
 */
export const loadSettings = (): AppData['settings'] => {
  try {
    const storedSettings = localStorage.getItem(SETTINGS_KEY);
    if (storedSettings) {
      return { ...defaultSettings, ...JSON.parse(storedSettings) };
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  return defaultSettings;
};

/**
 * Clear all app data from localStorage
 */
export const clearLocalStorage = (): boolean => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SETTINGS_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
};

/**
 * Check if data exists in localStorage
 */
export const hasStoredData = (): boolean => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    return storedData !== null && storedData !== '';
  } catch (error) {
    console.error('Error checking localStorage:', error);
    return false;
  }
};

/**
 * Get storage usage information
 */
export const getStorageInfo = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const settings = localStorage.getItem(SETTINGS_KEY);
    
    return {
      hasData: data !== null,
      dataSize: data ? new Blob([data]).size : 0,
      settingsSize: settings ? new Blob([settings]).size : 0,
      lastSaved: loadSettings().lastSaved,
      totalSize: (data ? new Blob([data]).size : 0) + (settings ? new Blob([settings]).size : 0)
    };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return {
      hasData: false,
      dataSize: 0,
      settingsSize: 0,
      lastSaved: '',
      totalSize: 0
    };
  }
};

/**
 * Export data as JSON for backup
 */
export const exportData = (): string => {
  const data = loadFromLocalStorage();
  return JSON.stringify(data, null, 2);
};

/**
 * Import data from JSON backup
 */
export const importData = (jsonData: string): boolean => {
  try {
    const data = JSON.parse(jsonData);
    return saveToLocalStorage(data);
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
}; 