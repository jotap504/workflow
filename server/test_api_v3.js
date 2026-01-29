const jwt = require('jsonwebtoken');
const secret = 'supersecretkey';
const token = jwt.sign({ id: 1, username: 'admin', role: 'admin' }, secret);

async function test() {
    console.log('Testing with token for User 1 (Admin)');
    try {
        const res = await fetch('http://localhost:3000/api/notifications', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('--- /api/notifications ---');
        console.log('Status:', res.status);
        console.log('Body:', await res.text());

        const res2 = await fetch('http://localhost:3000/api/notifications/debug-info', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('\n--- /api/notifications/debug-info ---');
        console.log('Status:', res2.status);
        console.log('Body:', await res2.text());

        const res3 = await fetch('http://localhost:3000/api/ping');
        console.log('\n--- /api/ping ---');
        console.log('Status:', res3.status);
        console.log('Body:', await res3.text());
    } catch (e) {
        console.log('ERROR:', e.message);
    }
}
test();
