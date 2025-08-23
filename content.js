// captcha-breaker-extension/content.js

/**
 * @fileoverview This content script runs on all web pages to detect captchas,
 * capture their images, send them to the background script for solving, and
 * then fill the captcha input field with the solution.
 */

/**
 * Converts an image element to a data URL.
 * @param {HTMLImageElement} img - The image element to convert.
 * @returns {Promise<string>} A promise that resolves with the data URL of the image.
 */
function getImageDataUrl(img) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return reject(new Error('Could not get 2D context from canvas.'));
    }

    // Draw the image onto the canvas
    ctx.drawImage(img, 0, 0);

    try {
      // Attempt to get data URL, handling potential cross-origin issues
      const dataUrl = canvas.toDataURL('image/png');
      resolve(dataUrl);
    } catch (error) {
      console.warn('Could not get data URL directly, attempting to fetch image for cross-origin:', error);
      // If cross-origin, try fetching the image first
      fetch(img.src)
        .then(response => response.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
        .catch(reject);
    }
  });
}

/**
 * Attempts to find a captcha image and its associated input field on the page.
 * This is a heuristic-based approach and may need refinement for specific sites.
 * @returns {Promise<{image: HTMLImageElement, input: HTMLInputElement}|null>} A promise that resolves with an object
 *   containing the captcha image and its input field, or null if not found.
 */
async function findCaptcha() {
  // Common selectors for captcha images and input fields
  const captchaImageSelectors = [
    'img[title*="captcha"]',
    'img[src*="captcha"]',
    'img[alt*="captcha"]',
    'img[id*="captcha"]',
    'img[class*="captcha"]',
    'img[aria-label*="captcha"]'
  ];

  const captchaInputSelectors = [
    'input[id*="captcha"]',
    'input[name*="captcha"]',
    'input[class*="captcha"]',
    'input[placeholder*="captcha"]',
    'input[aria-label*="captcha"]',
    'input[type="text"][maxlength="6"]', // Common for 4-6 digit captchas
    'input[type="text"][pattern="[a-zA-Z0-9]{4,6}"]'
  ];

  let captchaImage = null;
  for (const selector of captchaImageSelectors) {
    captchaImage = document.querySelector(selector);
    if (captchaImage) break;
  }

  if (!captchaImage) {
    console.log('No captcha image found using common selectors.');
    return null;
  }

  let captchaInput = null;
  // Try to find an input field near the captcha image
  const parent = captchaImage.closest('form') || document.body;
  for (const selector of captchaInputSelectors) {
    const inputs = Array.from(parent.querySelectorAll(selector));
    // Prioritize inputs that are visually close to the image
    inputs.sort((a, b) => {
      const imgRect = captchaImage.getBoundingClientRect();
      const aRect = a.getBoundingClientRect();
      const bRect = b.getBoundingClientRect();
      const distA = Math.sqrt(Math.pow(imgRect.x - aRect.x, 2) + Math.pow(imgRect.y - aRect.y, 2));
      const distB = Math.sqrt(Math.pow(imgRect.x - bRect.x, 2) + Math.pow(imgRect.y - bRect.y, 2));
      return distA - distB;
    });
    if (inputs.length > 0) {
      captchaInput = inputs[0];
      break;
    }
  }

  if (!captchaInput) {
    console.log('No associated captcha input field found.');
    return null;
  }

  return { image: captchaImage, input: captchaInput };
}

/**
 * Main function to run the captcha breaking logic.
 */
async function runCaptchaBreaker() {
  console.log('Captcha Breaker content script running...');
  const captchaElements = await findCaptcha();

  if (captchaElements) {
    const { image, input } = captchaElements;
    console.log('Found captcha image:', image);
    console.log('Found captcha input:', input);

    try {
      const imageDataUrl = await getImageDataUrl(image);
      console.log('Sending captcha image to background script for solving...');
      const response = await chrome.runtime.sendMessage({
        action: 'solveCaptcha',
        imageDataUrl: imageDataUrl
      });

      if (response && response.solution) {
        console.log('Captcha solved:', response.solution);
        input.value = response.solution;
        // Dispatch input event to trigger any form validation
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (response && response.error) {
        console.error('Error from background script:', response.error);
      }
    } catch (error) {
      console.error('Failed to process captcha:', error);
    }
  } else {
    console.log('No captcha found on this page.');
  }
}

// Run the captcha breaker when the page loads
// Use a slight delay to ensure all elements are rendered
window.addEventListener('load', () => {
  setTimeout(runCaptchaBreaker, 1000);
});

// Listen for messages from the background script (e.g., to re-run on demand)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'findAndSolveCaptcha') {
    runCaptchaBreaker().then(() => sendResponse({ status: 'completed' }));
    return true; // Indicate that sendResponse will be called asynchronously
  }
});
