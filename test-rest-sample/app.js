// Express.js example
const express = require('express');
const app = express();

// Basic CRUD endpoints
app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.post('/api/users', (req, res) => {
  res.json({ message: 'User created' });
});

app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  res.json({ user: { id } });
});

app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  res.json({ message: `User ${id} updated` });
});

app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  res.json({ message: `User ${id} deleted` });
});

// Nested routes
app.get('/api/users/:userId/posts', (req, res) => {
  const { userId } = req.params;
  res.json({ posts: [], userId });
});

app.post('/api/users/:userId/posts', (req, res) => {
  const { userId } = req.params;
  res.json({ message: 'Post created', userId });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});