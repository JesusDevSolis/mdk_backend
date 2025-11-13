const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// @desc    Registrar nuevo usuario
// @route   POST /api/auth/register
// @access  Public (pero restringido en producción)
const register = async (req, res) => {
  try {
    const { name, email, password, role, phone, address, sucursal } = req.body;

    // Validaciones básicas
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, email y contraseña son requeridos'
      });
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un usuario con este email'
      });
    }

    // Validar rol
    const validRoles = ['admin', 'instructor', 'padre'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Rol inválido'
      });
    }

    // Crear usuario
    const userData = {
      name,
      email,
      password,
      role: role || 'padre',
      phone,
      address
    };

    // Si es instructor, requerir sucursal
    if (userData.role === 'instructor') {
      if (!sucursal) {
        return res.status(400).json({
          success: false,
          message: 'Sucursal es requerida para instructores'
        });
      }
      userData.sucursal = sucursal;
    }

    // Agregar createdBy si hay un usuario autenticado
    if (req.user) {
      userData.createdBy = req.user._id;
    }

    const user = new User(userData);
    await user.save();

    // Generar token
    const token = generateToken(user._id);

    // Respuesta exitosa
    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    
    // Manejar errores específicos
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un usuario con este email'
      });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Iniciar sesión
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validaciones básicas
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }

    // Buscar usuario con contraseña
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Cuenta desactivada. Contacta al administrador'
      });
    }

    // Verificar contraseña
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Actualizar última conexión
    user.lastLogin = new Date();
    await user.save();

    // Generar token
    const token = generateToken(user._id);

    // Respuesta exitosa
    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Verificar token
// @route   GET /api/auth/verify
// @access  Private
const verifyToken = async (req, res) => {
  try {
    // El usuario ya está disponible en req.user gracias al middleware authenticate
    res.json({
      success: true,
      message: 'Token válido',
      data: {
        user: req.user.getPublicProfile()
      }
    });
  } catch (error) {
    console.error('Error en verificación de token:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Cerrar sesión
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // En una implementación más compleja, aquí se podría:
    // - Agregar el token a una blacklist
    // - Limpiar tokens de refresh
    // - Registrar la actividad de logout

    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Cambiar contraseña
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validaciones básicas
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña actual y nueva contraseña son requeridas'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    // Obtener usuario con contraseña
    const user = await User.findById(req.user._id).select('+password');
    
    // Verificar contraseña actual
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña actual es incorrecta'
      });
    }

    // Actualizar contraseña
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener perfil del usuario actual
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    // Obtener usuario con información completa
    const user = await User.findById(req.user._id)
      .populate('sucursal', 'name address')
      .populate('createdBy', 'name email');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: {
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Actualizar perfil del usuario
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, phone, address, notifications } = req.body;

    // Campos que se pueden actualizar
    const allowedUpdates = {
      name,
      phone,
      address,
      notifications
    };

    // Remover campos undefined
    Object.keys(allowedUpdates).forEach(key => 
      allowedUpdates[key] === undefined && delete allowedUpdates[key]
    );

    // Actualizar usuario
    const user = await User.findByIdAndUpdate(
      req.user._id,
      allowedUpdates,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: {
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Obtener usuarios (solo admin)
// @route   GET /api/auth/users
// @access  Private (Admin only)
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, isActive } = req.query;

    // Construir filtros
    const filters = {};
    if (role) filters.role = role;
    if (isActive !== undefined) filters.isActive = isActive === 'true';

    // Calcular skip para paginación manual
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Obtener usuarios con paginación manual
    const users = await User.find(filters)
      .select('-password')
      .populate('sucursal', 'name address')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Contar total de documentos
    const total = await User.countDocuments(filters);

    // Calcular información de paginación
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: {
        docs: users, // Cambiar a 'docs' para mantener compatibilidad
        pagination: {
          page: parseInt(page),
          pages: totalPages,
          total,
          limit: parseInt(limit),
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Crear instructor completo
// @route   POST /api/auth/instructor/complete
// @access  Private (Admin only)
const createCompleteInstructor = async (req, res) => {
  try {
    const {
      name, email, password, phone, address, sucursal,
      notifications, profileImage, instructorInfo
    } = req.body;

    // Validaciones básicas
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, email y contraseña son requeridos'
      });
    }

    if (!sucursal) {
      return res.status(400).json({
        success: false,
        message: 'Sucursal es requerida para instructores'
      });
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un usuario con este email'
      });
    }

    // Crear usuario instructor completo
    const userData = {
      name,
      email,
      password,
      role: 'instructor',
      phone,
      address,
      sucursal,
      notifications,
      profileImage,
      instructorInfo,
      createdBy: req.user._id
    };

    const user = new User(userData);
    await user.save();

    // Generar token
    const token = generateToken(user._id);

    // Respuesta exitosa
    res.status(201).json({
      success: true,
      message: 'Instructor creado exitosamente',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });

  } catch (error) {
    console.error('Error al crear instructor completo:', error);

    // Manejar errores específicos
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un usuario con este email'
      });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// @desc    Actualizar instructor completo
// @route   PUT /api/auth/instructor/complete/:id
// @access  Private (Admin only)
const updateCompleteInstructor = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, phone, address, sucursal,
      notifications, profileImage, instructorInfo
    } = req.body;

    // Buscar instructor
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Instructor no encontrado'
      });
    }

    if (user.role !== 'instructor') {
      return res.status(400).json({
        success: false,
        message: 'El usuario no es un instructor'
      });
    }

    // Actualizar campos
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (sucursal) user.sucursal = sucursal;
    if (notifications) user.notifications = notifications;
    if (profileImage !== undefined) user.profileImage = profileImage;
    if (instructorInfo) user.instructorInfo = instructorInfo;

    await user.save();

    // Respuesta exitosa
    res.json({
      success: true,
      message: 'Instructor actualizado exitosamente',
      data: {
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Error al actualizar instructor completo:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
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
};