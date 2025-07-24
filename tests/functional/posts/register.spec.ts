import { test } from '@japa/runner'

interface RegisterResponse {
  id: string;
  email_address: string;
  first_name: string;
  last_name: string | null;
}

interface ValidationIssue {
  code: string;
  path: string[];
  message: string;
  params: {
    rule: string;
    field: { name: string };
  };
}

test.group('Posts register', () => {
  test('should register user with valid data', async ({ assert, client }) => {
    const response = await client
      .post('/auth/register')
      .json({
        email_address: 'jane@example.com',
        password: 'securePassword123',
        confirm_password: 'securePassword123',
        first_name: 'Jane',
        last_name: 'Smith',
      })

    // Better type assertion with validation
    response.assertStatus(200)
    const body = response.body().data as RegisterResponse

    assert.exists(body.id)
    assert.equal(body.email_address, 'jane@example.com')
    assert.equal(body.first_name, 'Jane')
    assert.equal(body.last_name, 'Smith')
  })

  test('should fail when email is missing', async ({ assert, client }) => {
    const response = await client
      .post('/auth/register')
      .json({
        password: 'password',
        confirm_password: 'password',
        first_name: 'John',
        last_name: 'Doe',
      })

    const body = response.body()
    assert.equal(body.type, 'exception')
    assert.equal(body.status, 422)
    assert.equal(body.exception, 'E_VALIDATION')

    const emailError = body.data.issues.find((issue: ValidationIssue) => issue.path.includes('email_address'))
    assert.exists(emailError)
    assert.equal(emailError.message, 'The email_address field must be defined')
  })

  test('should fail when passwords do not match', async ({ assert, client }) => {
    const response = await client
      .post('/auth/register')
      .json({
        email_address: 'john2@example.com',
        password: 'password1',
        confirm_password: 'password2',
        first_name: 'John',
        last_name: 'Doe',
      })

    const body = response.body()
    assert.equal(body.type, 'exception')
    assert.equal(body.status, 422)
    assert.equal(body.exception, 'E_VALIDATION')

    const passwordError = body.data.issues.find((issue: ValidationIssue) => issue.path.includes('password'))
    assert.exists(passwordError)
    assert.equal(passwordError.message, 'The password field and confirm_password field must be the same')
  })

  test('should fail when first_name is empty', async ({ assert, client }) => {
    const response = await client
      .post('/auth/register')
      .json({
        email_address: 'john3@example.com',
        password: 'password',
        confirm_password: 'password',
        first_name: '',
        last_name: 'Doe',
      })

    const body = response.body()
    assert.equal(body.type, 'exception')
    assert.equal(body.status, 422)
    assert.equal(body.exception, 'E_VALIDATION')

    const firstNameError = body.data.issues.find((issue: ValidationIssue) => issue.path.includes('first_name'))
    assert.exists(firstNameError)
    assert.equal(firstNameError.message, 'The first_name field must be defined')
  })

  test('should allow nullable last_name', async ({ assert, client }) => {
    const response = await client
      .post('/auth/register')
      .json({
        email_address: 'john4@example.com',
        password: 'password',
        confirm_password: 'password',
        first_name: 'John',
        last_name: null,
      })

    response.assertStatus(200)
    const body = response.body().data as RegisterResponse
    assert.exists(body.id)
    assert.equal(body.last_name, null)
  })
})
