// __tests__/users.e2e.test.js
require('dotenv').config({ override: true })

const request = require('supertest')
const app = require('../app')        // seu Express exportado em app.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

beforeAll(async () => {
  // limpa a tabela antes de rodar os testes
  await prisma.user.deleteMany()
})

afterAll(async () => {
  // fecha conexão com o banco
  await prisma.$disconnect()
})

describe('Users API (e2e)', () => {
  let userId

  it('GET /users → []', async () => {
    const res = await request(app).get('/users')
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual([])
  })

  it('POST /users validação Zod', async () => {
    const res = await request(app)
      .post('/users')
      .send({ name: 'Al', email: 'x' })
    expect(res.statusCode).toBe(400)
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        'Nome precisa ter ao menos 3 caracteres',
        'E-mail inválido'
      ])
    )
  })

  it('POST /users → cria com sucesso', async () => {
    const res = await request(app)
      .post('/users')
      .send({ name: 'Maria Silva', email: 'maria@exemplo.com' })
    expect(res.statusCode).toBe(201)
    expect(res.body).toHaveProperty('id')
    userId = res.body.id
  })

  it('GET /users/:id → encontra pelo ID', async () => {
    const res = await request(app).get(`/users/${userId}`)
    expect(res.statusCode).toBe(200)
    expect(res.body).toHaveProperty('email', 'maria@exemplo.com')
  })

  it('PUT /users/:id → atualiza com sucesso', async () => {
    const res = await request(app)
      .put(`/users/${userId}`)
      .send({ name: 'Maria Atualizada', email: 'maria2@exemplo.com' })
    expect(res.statusCode).toBe(200)
    expect(res.body).toHaveProperty('name', 'Maria Atualizada')
  })

  it('DELETE /users/:id → remove com sucesso', async () => {
    const res = await request(app).delete(`/users/${userId}`)
    expect(res.statusCode).toBe(204)
  })
})
