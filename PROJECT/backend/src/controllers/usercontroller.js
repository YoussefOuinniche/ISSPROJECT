const User = require('../models/users');
const { notFound, asyncHandler } = require('../utils/errors');

// GET /api/users
const getAllUsers = asyncHandler(async (req, res) => {
  const { search, experience_level } = req.query;
  const users = await User.findAll({ search, experience_level });
  res.json({ success: true, data: users, count: users.length });
});

// GET /api/users/:id
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json(notFound('User'));
  res.json({ success: true, data: user });
});

// POST /api/users
const createUser = asyncHandler(async (req, res) => {
  const { full_name, bio, avatar_url, user_id } = req.body;
  if (!full_name) {
    return res.status(400).json({ success: false, error: 'full_name is required' });
  }
  const user = await User.create({ full_name, bio, avatar_url, user_id });
  res.status(201).json({ success: true, message: 'User created', data: user });
});

// PUT /api/users/:id
const updateUser = asyncHandler(async (req, res) => {
  const { full_name, bio, avatar_url } = req.body;
  const user = await User.update(req.params.id, { full_name, bio, avatar_url });
  res.json({ success: true, message: 'User updated', data: user });
});

// DELETE /api/users/:id
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.delete(req.params.id);
  if (!user) return res.status(404).json(notFound('User'));
  res.json({ success: true, message: 'User deleted', data: user });
});

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser };
