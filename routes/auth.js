const express = require('express');
const router = express.Router();

// Importar controladores
const {
  register,
  login,
  verifyToken,
  logout,
  changePassword,
  getProfile,
  updateProfile,
  getUsers,
  createCompleteInstructor,
  updateCompleteInstructor
} = require('../controllers/authController');

// Importar middleware de autenticación
const {
  authenticate,
  isAdmin,
  logAuthRequest
} = require('../middleware/auth');

// Importar middleware de validación
const {
  validateRegister,
  validateLogin,
  validateChangePassword,
  validateUpdateProfile,
  validateUserQuery,
  sanitizeInput
} = require('../middleware/validation');

// @route   POST /api/auth/register
// @desc    Registrar nuevo usuario
// @access  Public (en desarrollo) / Private (en producción)
router.post('/register', sanitizeInput, validateRegister, register);

// @route   POST /api/auth/login
// @desc    Iniciar sesión
// @access  Public
router.post('/login', sanitizeInput, validateLogin, login);

// @route   GET /api/auth/verify
// @desc    Verificar token
// @access  Private
router.get('/verify', authenticate, verifyToken);

// @route   POST /api/auth/logout
// @desc    Cerrar sesión
// @access  Private
router.post('/logout', authenticate, logout);

// @route   PUT /api/auth/change-password
// @desc    Cambiar contraseña
// @access  Private
router.put('/change-password', authenticate, sanitizeInput, validateChangePassword, changePassword);

// @route   GET /api/auth/profile
// @desc    Obtener perfil del usuario actual
// @access  Private
router.get('/profile', authenticate, logAuthRequest, getProfile);

// @route   PUT /api/auth/profile
// @desc    Actualizar perfil del usuario
// @access  Private
router.put('/profile', authenticate, sanitizeInput, validateUpdateProfile, logAuthRequest, updateProfile);

// @route   GET /api/auth/users
// @desc    Obtener lista de usuarios (solo admin)
// @access  Private (Admin only)
router.get('/users', authenticate, isAdmin, validateUserQuery, logAuthRequest, getUsers);

// @route   POST /api/auth/instructor/complete
// @desc    Crear instructor con información completa
// @access  Private (Admin only)
router.post('/instructor/complete', authenticate, isAdmin, sanitizeInput, createCompleteInstructor);

// @route   PUT /api/auth/instructor/complete/:id
// @desc    Actualizar instructor con información completa
// @access  Private (Admin only)
router.put('/instructor/complete/:id', authenticate, isAdmin, sanitizeInput, updateCompleteInstructor);

module.exports = router;