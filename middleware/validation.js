const { body, param, query, validationResult } = require('express-validator');

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: errorMessages
    });
  }
  
  next();
};

// Validaciones para registro de usuario
const validateRegister = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('El nombre solo puede contener letras y espacios'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('El email es requerido')
    .isEmail()
    .withMessage('El email debe tener un formato válido')
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage('El email no puede exceder 100 caracteres'),

  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida')
    .isLength({ min: 6, max: 128 })
    .withMessage('La contraseña debe tener entre 6 y 128 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una minúscula, una mayúscula y un número'),

  body('role')
    .optional()
    .isIn(['admin', 'instructor', 'padre'])
    .withMessage('El rol debe ser: admin, instructor o padre'),

  body('phone')
    .optional()
    .trim()
    .isMobilePhone('es-MX')
    .withMessage('El teléfono debe tener un formato válido')
    .isLength({ max: 15 })
    .withMessage('El teléfono no puede exceder 15 caracteres'),

  body('address')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('La dirección no puede exceder 200 caracteres'),

  body('sucursal')
    .optional()
    .isMongoId()
    .withMessage('ID de sucursal inválido'),

  handleValidationErrors
];

// Validaciones para login
const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('El email es requerido')
    .isEmail()
    .withMessage('El email debe tener un formato válido')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida'),

  handleValidationErrors
];

// Validaciones para cambio de contraseña
const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('La contraseña actual es requerida'),

  body('newPassword')
    .notEmpty()
    .withMessage('La nueva contraseña es requerida')
    .isLength({ min: 6, max: 128 })
    .withMessage('La nueva contraseña debe tener entre 6 y 128 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La nueva contraseña debe contener al menos una minúscula, una mayúscula y un número'),

  handleValidationErrors
];

// Validaciones para actualizar perfil
const validateUpdateProfile = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El nombre no puede estar vacío')
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('El nombre solo puede contener letras y espacios'),

  body('phone')
    .optional()
    .trim()
    .isMobilePhone('es-MX')
    .withMessage('El teléfono debe tener un formato válido')
    .isLength({ max: 15 })
    .withMessage('El teléfono no puede exceder 15 caracteres'),

  body('address')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('La dirección no puede exceder 200 caracteres'),

  body('notifications.email')
    .optional()
    .isBoolean()
    .withMessage('La configuración de email debe ser verdadero o falso'),

  body('notifications.telegram')
    .optional()
    .isBoolean()
    .withMessage('La configuración de telegram debe ser verdadero o falso'),

  body('notifications.telegramChatId')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('El ID de chat de Telegram no puede exceder 50 caracteres'),

  handleValidationErrors
];

// Validaciones para parámetros MongoDB ID
const validateMongoId = [
  param('id')
    .isMongoId()
    .withMessage('ID inválido'),

  handleValidationErrors
];

// Validaciones para consultas de usuarios
const validateUserQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero mayor a 0'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un número entre 1 y 100'),

  query('role')
    .optional()
    .isIn(['admin', 'instructor', 'padre'])
    .withMessage('El rol debe ser: admin, instructor o padre'),

  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive debe ser verdadero o falso'),

  handleValidationErrors
];

// Validaciones para sucursales
const validateSucursal = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre de la sucursal es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),

  body('address')
    .trim()
    .notEmpty()
    .withMessage('La dirección es requerida')
    .isLength({ min: 5, max: 200 })
    .withMessage('La dirección debe tener entre 5 y 200 caracteres'),

  body('phone')
    .optional()
    .trim()
    .isMobilePhone('es-MX')
    .withMessage('El teléfono debe tener un formato válido'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('El email debe tener un formato válido')
    .normalizeEmail(),

  handleValidationErrors
];

// Validaciones para alumnos
const validateAlumno = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre del alumno es requerido')
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('El nombre solo puede contener letras y espacios'),

  body('dateOfBirth')
    .notEmpty()
    .withMessage('La fecha de nacimiento es requerida')
    .isISO8601()
    .withMessage('La fecha de nacimiento debe tener un formato válido (YYYY-MM-DD)')
    .custom(value => {
      const birthDate = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (age < 3 || age > 80) {
        throw new Error('La edad del alumno debe estar entre 3 y 80 años');
      }
      return true;
    }),

  body('sucursal')
    .notEmpty()
    .withMessage('La sucursal es requerida')
    .isMongoId()
    .withMessage('ID de sucursal inválido'),

  body('tutor')
    .notEmpty()
    .withMessage('El tutor es requerido')
    .isMongoId()
    .withMessage('ID de tutor inválido'),

  body('emergencyContact.name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre del contacto de emergencia debe tener entre 2 y 50 caracteres'),

  body('emergencyContact.phone')
    .optional()
    .trim()
    .isMobilePhone('es-MX')
    .withMessage('El teléfono del contacto de emergencia debe tener un formato válido'),

  handleValidationErrors
];

// Middleware para sanitizar datos de entrada
const sanitizeInput = (req, res, next) => {
  // Función recursiva para limpiar objetos
  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Remover caracteres potencialmente peligrosos
        sanitized[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .trim();
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }
    return sanitized;
  };

  // Sanitizar body, query y params
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// Middleware para limitar el tamaño de archivos
const validateFileSize = (maxSize = 5 * 1024 * 1024) => { // 5MB por defecto
  return (req, res, next) => {
    if (req.file && req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: `El archivo es demasiado grande. Tamaño máximo: ${maxSize / (1024 * 1024)}MB`
      });
    }
    next();
  };
};

// Middleware para validar tipos de archivo
const validateFileType = (allowedTypes = ['image/jpeg', 'image/png', 'image/jpg']) => {
  return (req, res, next) => {
    if (req.file && !allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `Tipo de archivo no permitido. Tipos permitidos: ${allowedTypes.join(', ')}`
      });
    }
    next();
  };
};

module.exports = {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validateChangePassword,
  validateUpdateProfile,
  validateMongoId,
  validateUserQuery,
  validateSucursal,
  validateAlumno,
  sanitizeInput,
  validateFileSize,
  validateFileType
};