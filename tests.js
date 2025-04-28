const BASE_URL = 'http://localhost:4000';
let userToken, adminToken;

async function runTests() {
  try {
    // Register users
    console.log('Registering test users...');
    await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'testuser1', password: 'password123', role: 'student' })
    });

    await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'adminuser1', password: 'adminpass', role: 'admin' })
    });

    // Login users
    console.log('Logging in...');
    const userLogin = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'testuser1', password: 'password123' })
    }).then(res => res.json());

    userToken = userLogin.token;
    console.log('User token obtained:', userToken ? 'Yes' : 'No');

    const adminLogin = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'adminuser1', password: 'adminpass' })
    }).then(res => res.json());

    adminToken = adminLogin.token;
    console.log('Admin token obtained:', adminToken ? 'Yes' : 'No');

    // Create a room
    console.log('Creating a room...');
    const roomResult = await fetch(`${BASE_URL}/api/admin/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ roomId: 'testroom1', description: 'Test Room' })
    }).then(res => res.json());

    console.log('Room created:', roomResult.success);

    // Compile code
    console.log('Compiling code...');
    const compileResult = await fetch(`${BASE_URL}/api/compile-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        nickname: 'testprogram1',
        code: '#include <iostream>\nint main() { return 0; }',
        room: 'testroom1'
      })
    }).then(res => res.json());

    console.log('Code compiled:', compileResult.success);

    // Get user profile
    console.log('Getting user profile...');
    const profileResult = await fetch(`${BASE_URL}/api/profile`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    }).then(res => res.json());

    console.log('User profile retrieved:', profileResult.user ? 'Yes' : 'No');

    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTests();
