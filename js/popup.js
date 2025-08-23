// captcha-breaker-extension/js/popup.js

/**
 * @fileoverview This script handles the logic for the extension's popup page,
 * allowing users to configure the captcha solver API URL and API key.
 */

// Import the captcha solver API functions (assuming it's available in the service worker context)
// In Manifest V3, service workers run in a different context, so direct import might not work
// We'll need to ensure captchaSolverApi.js is loaded in the popup context.
// For this exercise, we'll assume the functions are available or will be made available.
// In a real MV3 extension, you'd typically include the script in popup.html directly.
// For now, we'll access chrome.runtime.getBackgroundPage to interact with background script.

document.addEventListener('DOMContentLoaded', async () => {
  const apiUrlInput = document.getElementById('apiUrl');
  const apiKeyInput = document.getElementById('apiKey');
  const solverConfigForm = document.getElementById('solverConfigForm');
  const statusDiv = document.getElementById('status');
  const solveNowButton = document.getElementById('solveNowButton');

  /**
   * Displays a status message in the popup.
   * @param {string} message - The message to display.
   * @param {string} type - The type of message ('success' or 'error').
   */
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = type;
    setTimeout(() => {
      statusDiv.textContent = '';
      statusDiv.className = '';
    }, 3000);
  }

  /**
   * Loads the saved configuration and populates the form fields.
   */
  async function loadConfig() {
    // We need to get the config from the background script or directly from storage
    // since captchaSolverApi.js might not be directly accessible here.
    chrome.storage.sync.get(['captchaSolverConfig'], (result) => {
      const config = result.captchaSolverConfig || { apiUrl: 'http://localhost:8000/ocr', apiKey: '' };
      apiUrlInput.value = config.apiUrl;
      apiKeyInput.value = config.apiKey;
    });
  }

  /**
   * Saves the configuration from the form fields.
   * @param {Event} event - The form submission event.
   */
  solverConfigForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const newConfig = {
      apiUrl: apiUrlInput.value.trim(),
      apiKey: apiKeyInput.value.trim()
    };

    chrome.storage.sync.set({ captchaSolverConfig: newConfig }, () => {
      showStatus('Settings saved successfully!', 'success');
    });
  });

  /**
   * Sends a message to the content script of the active tab to find and solve a captcha.
   */
  solveNowButton.addEventListener('click', async () => {
    solveNowButton.disabled = true;
    solveNowButton.textContent = 'Solving...';
    showStatus('Attempting to solve captcha on current page...', '');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'findAndSolveCaptcha' });
        if (response && response.status === 'completed') {
          showStatus('Captcha solving initiated on page.', 'success');
        } else {
          showStatus('Failed to initiate captcha solving on page.', 'error');
        }
      } else {
        showStatus('No active tab found.', 'error');
      }
    } catch (error) {
      console.error('Error sending message to content script:', error);
      showStatus('Error: ' + error.message, 'error');
    } finally {
      solveNowButton.disabled = false;
      solveNowButton.textContent = 'Solve Captcha Now';
    }
  });

  // Load configuration when the popup is opened
  loadConfig();
});
