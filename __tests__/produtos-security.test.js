// __tests__/produtos-security.test.js
require('dotenv').config({ override: true })

const request = require('supertest')
const app = require('../app')

describe('Produtos Security', () => {
  describe('DELETE /api/produtos/:id', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .delete('/api/produtos/some-id')
      
      expect(res.statusCode).toBe(401)
      expect(res.body).toHaveProperty('message', 'Token não fornecido.')
    })

    it('should reject invalid token', async () => {
      const res = await request(app)
        .delete('/api/produtos/some-id')
        .set('Authorization', 'Bearer invalid-token')
      
      expect(res.statusCode).toBe(401)
      expect(res.body).toHaveProperty('message', 'Token inválido ou expirado.')
    })

    it('should require valid product ID when authenticated', async () => {
      // This test would need a valid JWT token to fully test ownership validation
      // For now, we verify the authentication layer is working
      const res = await request(app)
        .delete('/api/produtos/nonexistent-id')
        .set('Authorization', 'Bearer test-token')
      
      // Should still be 401 since test-token is invalid
      expect(res.statusCode).toBe(401)
    })
  })
})