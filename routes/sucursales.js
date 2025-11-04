const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Importar controladores
const {
  getSucursales,
  getSucursalById,
  createSucursal,
  updateSucursal,
  deleteSucursal,
  uploadLogo,
  getSucursalStats
} = require('../controllers/sucursalController');

// Importar middleware de autenticación
const {
  authenticate,
  isAdmin,
  isInstructor,
  logAuthRequest
} = require('../middleware/auth');

// Importar middleware de validación
const {
  validateSucursal,
  validateMongoId,
  sanitizeInput,
  validateFileSize,
  validateFileType
} = require('../middleware/validation');

// Configuración de multer para subida de logos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/logos');
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generar nombre único para el archivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'logo-' + uniqueSuffix + ext);
  }
});

// Filtros para multer
const fileFilter = (req, file, cb) => {
  // Permitir solo imágenes
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  }
});

// Middleware para crear directorio de uploads si no existe
const ensureUploadDir = async (req, res, next) => {
  try {
    const fs = require('fs').promises;
    const uploadPath = path.join(__dirname, '../uploads/logos');
    
    try {
      await fs.access(uploadPath);
    } catch {
      await fs.mkdir(uploadPath, { recursive: true });
    }
    
    next();
  } catch (error) {
    console.error('Error creando directorio de uploads:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor al preparar subida de archivos'
    });
  }
};

// @route   GET /api/sucursales
// @desc    Obtener todas las sucursales
// @access  Private (Admin, Instructor)
router.get('/', 
  authenticate, 
  isInstructor, 
  logAuthRequest, 
  getSucursales
);

// @route   GET /api/sucursales/:id
// @desc    Obtener sucursal por ID
// @access  Private (Admin, Manager de la sucursal)
router.get('/:id', 
  authenticate, 
  validateMongoId, 
  logAuthRequest, 
  getSucursalById
);

// @route   POST /api/sucursales
// @desc    Crear nueva sucursal
// @access  Private (Admin only)
router.post('/', 
  authenticate, 
  isAdmin, 
  sanitizeInput, 
  validateSucursal, 
  logAuthRequest, 
  createSucursal
);

// @route   PUT /api/sucursales/:id
// @desc    Actualizar sucursal
// @access  Private (Admin or Manager)
router.put('/:id', 
  authenticate, 
  validateMongoId, 
  sanitizeInput, 
  validateSucursal, 
  logAuthRequest, 
  updateSucursal
);

// @route   DELETE /api/sucursales/:id
// @desc    Eliminar sucursal
// @access  Private (Admin only)
router.delete('/:id', 
  authenticate, 
  isAdmin, 
  validateMongoId, 
  logAuthRequest, 
  deleteSucursal
);

// @route   POST /api/sucursales/:id/logo
// @desc    Subir logo de sucursal
// @access  Private (Admin or Manager)
router.post('/:id/logo', 
  authenticate, 
  validateMongoId, 
  ensureUploadDir,
  upload.single('logo'),
  validateFileSize(5 * 1024 * 1024), // 5MB
  validateFileType(['image/jpeg', 'image/jpg', 'image/png', 'image/gif']),
  logAuthRequest, 
  uploadLogo
);

// @route   GET /api/sucursales/:id/stats
// @desc    Obtener estadísticas de sucursal
// @access  Private (Admin or Manager)
router.get('/:id/stats', 
  authenticate, 
  validateMongoId, 
  logAuthRequest, 
  getSucursalStats
);

// Middleware para manejo de errores de multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'El archivo es demasiado grande. Máximo 5MB.'
      });
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Campo de archivo inesperado.'
      });
    }
  }
  
  if (error.message === 'Solo se permiten archivos de imagen') {
    return res.status(400).json({
      success: false,
      message: 'Solo se permiten archivos de imagen (JPEG, PNG, GIF).'
    });
  }
  
  next(error);
});

module.exports = router;