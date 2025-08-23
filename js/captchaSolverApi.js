// captcha-breaker-extension/js/captchaSolverApi.js

/**
 * @fileoverview This file provides an API client for interacting with a captcha solver service.
 * It abstracts the details of making HTTP requests to the solver API.
 */

/**
 * Configuration for the captcha solver API.
 * @typedef {object} CaptchaSolverConfig
 * @property {string} apiUrl - The base URL of the captcha solver API.
 * @property {string} apiKey - The API key for authentication (if required by the solver).
 */

/**
 * Default configuration for the captcha solver API.
 * This can be overridden by user settings.
 * @type {CaptchaSolverConfig}
 */
const DEFAULT_SOLVER_CONFIG = {
  apiUrl: 'http://localhost:8000/ocr', // Example API endpoint
  apiKey: '' // No API key by default, assume some solvers don't need it
};

/**
 * Fetches the current captcha solver configuration from storage.
 * If no configuration is found, it returns the default configuration.
 * @returns {Promise<CaptchaSolverConfig>} A promise that resolves with the solver configuration.
 */
async function getSolverConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['captchaSolverConfig'], (result) => {
      resolve(result.captchaSolverConfig || DEFAULT_SOLVER_CONFIG);
    });
  });
}

/**
 * Saves the provided captcha solver configuration to storage.
 * @param {CaptchaSolverConfig} config - The configuration to save.
 * @returns {Promise<void>} A promise that resolves when the configuration is saved.
 */
async function saveSolverConfig(config) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ captchaSolverConfig: config }, () => {
      resolve();
    });
  });
}

/**
 * Solves a captcha by sending the image data to the configured captcha solver API.
 * @param {string} imageDataUrl - The base64 encoded data URL of the captcha image (e.g., "data:image/png;base64,...").
 * @returns {Promise<string>} A promise that resolves with the solved captcha text.
 * @throws {Error} If the API request fails or returns an error.
 */
async function solveCaptcha(imageDataUrl) {
  const config = await getSolverConfig();
  const { apiUrl, apiKey } = config;

  if (!apiUrl) {
    throw new Error('Captcha solver API URL is not configured.');
  }

  try {
    const body = new FormData();
    body.append('image', imageDataUrl);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        ...(apiKey && { 'X-API-Key': apiKey }) // Add API key if available
      },
      body,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Captcha solver API error: ${errorData.message || 'Unknown error'}`);
    }

    const data = await response.json();
    if (!data || !data.data) {
      throw new Error('Captcha solver API did not return a valid solution.');
    }

    return data.data;
  } catch (error) {
    console.error('Error solving captcha:', error);
    throw error;
  }
}
