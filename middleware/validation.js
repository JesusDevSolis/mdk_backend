const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

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

// ===== VALIDACIONES DE SUCURSALES =====

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

// ===== VALIDACIONES PARA TUTORES =====

const validateTutor = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('El nombre solo puede contener letras y espacios'),

  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Los apellidos son requeridos')
    .isLength({ min: 2, max: 50 })
    .withMessage('Los apellidos deben tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('Los apellidos solo pueden contener letras y espacios'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('El email es requerido')
    .isEmail()
    .withMessage('El email debe tener un formato válido')
    .normalizeEmail(),

  body('identification.type')
    .notEmpty()
    .withMessage('El tipo de identificación es requerido')
    .isIn(['ine', 'cedula', 'pasaporte', 'licencia', 'otro'])
    .withMessage('Tipo de identificación inválido'),

  body('identification.number')
    .trim()
    .notEmpty()
    .withMessage('El número de identificación es requerido')
    .isLength({ min: 5, max: 20 })
    .withMessage('El número de identificación debe tener entre 5 y 20 caracteres'),

  body('phones.primary')
    .trim()
    .notEmpty()
    .withMessage('El teléfono principal es requerido')
    .isMobilePhone('es-MX')
    .withMessage('El teléfono principal debe tener un formato válido'),

  body('address.street')
    .trim()
    .notEmpty()
    .withMessage('La calle es requerida')
    .isLength({ max: 100 })
    .withMessage('La calle no puede exceder 100 caracteres'),

  body('address.neighborhood')
    .trim()
    .notEmpty()
    .withMessage('La colonia es requerida')
    .isLength({ max: 50 })
    .withMessage('La colonia no puede exceder 50 caracteres'),

  body('address.city')
    .trim()
    .notEmpty()
    .withMessage('La ciudad es requerida')
    .isLength({ max: 50 })
    .withMessage('La ciudad no puede exceder 50 caracteres'),

  body('address.state')
    .trim()
    .notEmpty()
    .withMessage('El estado es requerido')
    .isLength({ max: 50 })
    .withMessage('El estado no puede exceder 50 caracteres'),

  body('address.zipCode')
    .trim()
    .notEmpty()
    .withMessage('El código postal es requerido')
    .isLength({ min: 5, max: 10 })
    .withMessage('El código postal debe tener entre 5 y 10 caracteres'),

  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('La fecha de nacimiento debe tener un formato válido')
    .custom(value => {
      if (!value) return true;
      const birthDate = new Date(value);
      const today = new Date();
      const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
      
      if (birthDate > eighteenYearsAgo) {
        throw new Error('El tutor debe ser mayor de 18 años');
      }
      return true;
    }),

  handleValidationErrors
];

const validateTutorUpdate = [
  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El nombre no puede estar vacío')
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('El nombre solo puede contener letras y espacios'),

  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Los apellidos no pueden estar vacíos')
    .isLength({ min: 2, max: 50 })
    .withMessage('Los apellidos deben tener entre 2 y 50 caracteres'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('El email debe tener un formato válido')
    .normalizeEmail(),

  body('identification.type')
    .optional()
    .isIn(['ine', 'cedula', 'pasaporte', 'licencia', 'otro'])
    .withMessage('Tipo de identificación inválido'),

  body('identification.number')
    .optional()
    .trim()
    .isLength({ min: 5, max: 20 })
    .withMessage('El número de identificación debe tener entre 5 y 20 caracteres'),

  handleValidationErrors
];

// ===== VALIDACIONES PARA ALUMNOS =====

const validateAlumno = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('El nombre solo puede contener letras y espacios'),

  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Los apellidos son requeridos')
    .isLength({ min: 2, max: 50 })
    .withMessage('Los apellidos deben tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('Los apellidos solo pueden contener letras y espacios'),

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

  body('gender')
    .notEmpty()
    .withMessage('El género es requerido')
    .isIn(['masculino', 'femenino', 'otro'])
    .withMessage('El género debe ser: masculino, femenino u otro'),

  body('enrollment.sucursal')
    .notEmpty()
    .withMessage('La sucursal es requerida')
    .isMongoId()
    .withMessage('ID de sucursal inválido'),

  body('emergencyContact.name')
    .trim()
    .notEmpty()
    .withMessage('El nombre del contacto de emergencia es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre del contacto debe tener entre 2 y 100 caracteres'),

  body('emergencyContact.relationship')
    .trim()
    .notEmpty()
    .withMessage('La relación del contacto de emergencia es requerida')
    .isLength({ max: 50 })
    .withMessage('La relación no puede exceder 50 caracteres'),

  body('emergencyContact.phone')
    .trim()
    .notEmpty()
    .withMessage('El teléfono del contacto de emergencia es requerido')
    .isMobilePhone('es-MX')
    .withMessage('El teléfono del contacto de emergencia debe tener un formato válido'),

  body('tutor')
    .optional()
    .isMongoId()
    .withMessage('ID de tutor inválido'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('El email debe tener un formato válido')
    .normalizeEmail(),

  handleValidationErrors
];

const validateAlumnoUpdate = [
  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El nombre no puede estar vacío')
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('El nombre solo puede contener letras y espacios'),

  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Los apellidos no pueden estar vacíos')
    .isLength({ min: 2, max: 50 })
    .withMessage('Los apellidos deben tener entre 2 y 50 caracteres'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('El email debe tener un formato válido')
    .normalizeEmail(),

  body('gender')
    .optional()
    .isIn(['masculino', 'femenino', 'otro'])
    .withMessage('El género debe ser: masculino, femenino u otro'),

  body('enrollment.sucursal')
    .optional()
    .isMongoId()
    .withMessage('ID de sucursal inválido'),

  body('tutor')
    .optional()
    .isMongoId()
    .withMessage('ID de tutor inválido'),

  handleValidationErrors
];

// Validación específica para actualización de cinturón
const validateBeltUpdate = [
  body('level')
    .optional()
    .isIn([
      'blanco', 'blanco-amarillo', 'amarillo', 'amarillo-naranja', 'naranja',
      'naranja-verde', 'verde', 'verde-azul', 'azul', 'azul-marron', 'marron',
      'marron-negro', 'negro-1', 'negro-2', 'negro-3', 'negro-4', 'negro-5',
      'negro-6', 'negro-7', 'negro-8', 'negro-9'
    ])
    .withMessage('Nivel de cinturón inválido'),

  body('dateObtained')
    .optional()
    .isISO8601()
    .withMessage('La fecha de obtención debe tener un formato válido')
    .custom(value => {
      if (!value) return true;
      const date = new Date(value);
      const today = new Date();
      
      if (date > today) {
        throw new Error('La fecha de obtención no puede ser futura');
      }
      return true;
    }),

  body('certifiedBy')
    .optional()
    .isMongoId()
    .withMessage('ID de instructor certificador inválido'),

  handleValidationErrors
];

// ===== MIDDLEWARE UTILITIES =====

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
  // Utilities
  handleValidationErrors,
  sanitizeInput,
  validateFileSize,
  validateFileType,
  validateMongoId,
  
  // Validaciones de usuarios
  validateRegister,
  validateLogin,
  validateChangePassword,
  validateUpdateProfile,
  validateUserQuery,
  
  // Validaciones de sucursales
  validateSucursal,
  
  // Validaciones de tutores
  validateTutor,
  validateTutorUpdate,
  
  // Validaciones de alumnos
  validateAlumno,
  validateAlumnoUpdate,
  validateBeltUpdate
};