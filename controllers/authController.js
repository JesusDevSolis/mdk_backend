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

    // 🔍 LOG 1: Ver qué llega del frontend
    console.log('');
    console.log('🔍 ===== LOGIN ATTEMPT =====');
    console.log('📧 Email recibido:', email);
    console.log('🔑 Password recibido:', password);
    console.log('📏 Longitud del password:', password?.length);

    // Validaciones básicas
    if (!email || !password) {
      console.log('❌ Validación falló: email o password vacío');
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }

    // Buscar usuario con contraseña
    const emailLowerCase = email.toLowerCase();
    console.log('🔍 Buscando usuario con email:', emailLowerCase);
    
    const user = await User.findOne({ email: emailLowerCase }).select('+password');
    
    if (!user) {
      console.log('❌ Usuario NO encontrado en BD');
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // 🔍 LOG 2: Usuario encontrado
    console.log('✅ Usuario encontrado:');
    console.log('  - ID:', user._id);
    console.log('  - Nombre:', user.name);
    console.log('  - Email:', user.email);
    console.log('  - Rol:', user.role);
    console.log('  - Activo:', user.isActive);
    console.log('  - Hash almacenado:', user.password);

    // Verificar si el usuario está activo
    if (!user.isActive) {
      console.log('❌ Usuario inactivo');
      return res.status(401).json({
        success: false,
        message: 'Cuenta desactivada. Contacta al administrador'
      });
    }

    // 🔍 LOG 3: Comparar contraseñas
    console.log('');
    console.log('🔐 COMPARANDO CONTRASEÑAS:');
    console.log('  Password ingresado:', password);
    console.log('  Password tipo:', typeof password);
    console.log('  Hash en BD:', user.password);
    
    // Verificar contraseña
    console.log('⏳ Ejecutando user.comparePassword...');
    const isPasswordValid = await user.comparePassword(password);
    console.log('✅ Resultado de comparePassword:', isPasswordValid);

    // 🔍 LOG 4: Probar también con bcrypt.compare directo
    console.log('');
    console.log('🧪 PRUEBA ADICIONAL con bcrypt.compare directo:');
    const directCompare = await bcrypt.compare(password, user.password);
    console.log('  Resultado directo:', directCompare);
    
    if (!isPasswordValid) {
      console.log('');
      console.log('❌ CONTRASEÑA INVÁLIDA');
      console.log('===========================');
      console.log('');
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    console.log('');
    console.log('✅ CONTRASEÑA VÁLIDA');
    console.log('✅ LOGIN EXITOSO');
    console.log('===========================');
    console.log('');

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
    console.error('');
    console.error('❌ ERROR EN LOGIN:', error);
    console.error('Stack:', error.stack);
    console.error('');
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

module.exports = {
  register,
  login,
  verifyToken,
  logout,
  changePassword,
  getProfile,
  updateProfile,
  getUsers
};