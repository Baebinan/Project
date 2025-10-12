const client = require('./db');

const deleteUser = async () => {
try {
const res = await client.query(
'DELETE FROM users WHERE name = $1 RETURNING *',
['John Doe']
);
console.log('User deleted:', res.rows[0]);
} catch (err) {
console.error('Error deleting user:', err);
} finally {
client.end();
}
};

deleteUser();