const express = require('express');
const app = express();

app.use(express.json());

// Get all users
app.get('/api/users', (req, res) => {
  res.json([
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
  ]);
});

// Get user by ID
app.get('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const user = { id: userId, name: 'User ' + userId, email: `user${userId}@example.com` };
  res.json(user);
});

// Create new user
app.post('/api/users', (req, res) => {
  const { name, email } = req.body;
  const newUser = { id: Date.now(), name, email };
  res.status(201).json(newUser);
});

// Update user
app.put('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const { name, email } = req.body;
  const updatedUser = { id: userId, name, email };
  res.json(updatedUser);
});

// Delete user
app.delete('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  res.json({ message: `User ${userId} deleted successfully` });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;