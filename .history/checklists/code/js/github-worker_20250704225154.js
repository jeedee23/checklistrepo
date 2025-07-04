/**
 * GitHub Worker for file uploads
 * Handles file uploads to GitHub repository using the proxy worker
 */

self.addEventListener('message', async function(e) {
  const { action, path, content, message } = e.data;
  
  if (action === 'uploadFile') {
    try {
      const response = await fetch('https://fields-proxy.johan-351.workers.dev', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'createFile',
          path: path,
          content: content,
          message: message
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        self.postMessage({
          success: true,
          download_url: result.download_url,
          path: path
        });
      } else {
        const error = await response.text();
        self.postMessage({
          success: false,
          error: error
        });
      }
    } catch (error) {
      self.postMessage({
        success: false,
        error: error.message
      });
    }
  }
});
