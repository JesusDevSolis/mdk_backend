const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware para verificar token JWT
const authenticate = async (req, res, next) => {
  try {
    // Obtener token del header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Acceso denegado. No se proporcionó token de autenticación.'
      });
    }

    // Verificar formato del token (Bearer token)
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Acceso denegado. Token inválido.'
      });
    }

    // Verificar y decodificar el token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expirado. Por favor, inicia sesión nuevamente.'
        });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Token inválido.'
        });
      } else {
        return res.status(401).json({
          success: false,
          message: 'Error al verificar token.'
        });
      }
    }

    // Buscar usuario en la base de datos
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido. Usuario no encontrado.'
      });
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Cuenta desactivada. Contacta al administrador.'
      });
    }

    // Agregar usuario a la request
    req.user = user;
    next();

  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor en autenticación.'
    });
  }
};

// Middleware para verificar roles específicos
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Acceso denegado. Usuario no autenticado.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Acceso denegado. Se requiere rol: ${roles.join(' o ')}`
      });
    }

    next();
  };
};

// Middleware para verificar si es admin
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Acceso denegado. Usuario no autenticado.'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador.'
    });
  }

  next();
};

// Middleware para verificar si es instructor
const isInstructor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Acceso denegado. Usuario no autenticado.'
    });
  }

  if (!['admin', 'instructor'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de instructor o administrador.'
    });
  }

  next();
};

// Middleware opcional de autenticación (no falla si no hay token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      req.user = null;
      return next();
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (user && user.isActive) {
      req.user = user;
    } else {
      req.user = null;
    }

    next();

  } catch (error) {
    // En caso de error, simplemente no autenticar
    req.user = null;
    next();
  }
};

// Función para generar token JWT
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRE || '30d',
      issuer: 'taekwondo-system',
      audience: 'taekwondo-users'
    }
  );
};

// Función para verificar token sin middleware
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Middleware para logging de requests autenticados
const logAuthRequest = (req, res, next) => {
  if (req.user) {
    console.log(`[${new Date().toISOString()}] Usuario autenticado: ${req.user.email} (${req.user.role}) - ${req.method} ${req.originalUrl}`);
  }
  next();
};

// Middleware para verificar ownership (el usuario solo puede acceder a sus propios datos)
const checkOwnership = (userIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado.'
      });
    }

    // Los admins pueden acceder a cualquier recurso
    if (req.user.role === 'admin') {
      return next();
    }

    // Obtener el ID del usuario desde los parámetros o body
    const targetUserId = req.params[userIdField] || req.body[userIdField];
    
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario requerido.'
      });
    }

    // Verificar que el usuario solo acceda a sus propios datos
    if (req.user._id.toString() !== targetUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Solo puedes acceder a tus propios datos.'
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  isAdmin,
  isInstructor,
  optionalAuth,
  generateToken,
  verifyToken,
  logAuthRequest,
  checkOwnership
};