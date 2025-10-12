const client = require('./db');

const getUsers = async () => {
try {
const res = await client.query('SELECT * FROM users');
console.log('Users:', res.rows);
} catch (err) {
console.error('Error querying users:', err);
} finally {
client.end();
}
};
getUsers();