// __tests__/cors.test.js
require('dotenv').config({ override: true })

const request = require('supertest')
const app = require('../app')

describe('CORS Configuration', () => {
  it('should allow requests from app.calculaaibr.com', async () => {
    const res = await request(app)
      .options('/api/health')
      .set('Origin', 'https://app.calculaaibr.com')
      .set('Access-Control-Request-Method', 'GET')
    
    expect(res.statusCode).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe('https://app.calculaaibr.com')
    expect(res.headers['access-control-allow-credentials']).toBe('true')
  })

  it('should allow requests from localhost for development', async () => {
    const res = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET')
    
    expect(res.statusCode).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173')
  })

  it('should allow requests from vercel.app subdomains', async () => {
    const res = await request(app)
      .options('/api/health')
      .set('Origin', 'https://my-app-preview.vercel.app')
      .set('Access-Control-Request-Method', 'GET')
    
    expect(res.statusCode).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe('https://my-app-preview.vercel.app')
  })

  it('should reject requests from unauthorized origins', async () => {
    const res = await request(app)
      .options('/api/health')
      .set('Origin', 'https://malicious-site.com')
      .set('Access-Control-Request-Method', 'GET')
    
    expect(res.statusCode).toBe(204)
    // Should not have access-control-allow-origin header for unauthorized origin
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })
})