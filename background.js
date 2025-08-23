// captcha-breaker-extension/background.js

/**
 * @fileoverview This background script handles messages from the content script
 * and acts as an intermediary to the captcha solver API. It also manages
 * extension state and settings.
 */

// Import the captcha solver API functions (assuming it's available in the service worker context)
// In Manifest V3, service workers run in a different context, so direct import might not work
// We'll need to ensure captchaSolverApi.js is loaded in the service worker.
// For now, we'll assume the functions are available or will be made available via importScripts in a real scenario.
// For this exercise, we'll simulate the import by defining a placeholder for solveCaptcha if it's not globally available.

// In a real MV3 extension, you'd typically import scripts like this:
importScripts('js/captchaSolverApi.js');

/**
 * Handles messages from other parts of the extension (e.g., content scripts, popup).
 * @param {object} request - The message request.
 * @param {object} sender - The sender of the message.
 * @param {function} sendResponse - Function to send a response back.
 * @returns {boolean} True if sendResponse will be called asynchronously.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'solveCaptcha') {
    const { imageDataUrl } = request;
    console.log('Background script received request to solve captcha.');

    // Call the solveCaptcha function from captchaSolverApi.js
    solveCaptcha(imageDataUrl)
      .then(solution => {
        console.log('Captcha solved by API:', solution);
        sendResponse({ solution: solution });
      })
      .catch(error => {
        console.error('Failed to solve captcha via API:', error);
        sendResponse({ error: error.message });
      });

    return true; // Indicate that sendResponse will be called asynchronously
  }
});

console.log('Captcha Breaker background script loaded.');
