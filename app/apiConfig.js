// src/apiConfig.js

let API_BASE_URL = 'http://localhost:5000'

if (process.env.NODE_ENV === 'production') {
  // API_BASE_URL = 'https://voice-server.pavelcherkashin.com'
}

export { API_BASE_URL }
