const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Importar controladores
const {
  getAlumnos,
  getAlumnoById,
  createAlumno,
  updateAlumno,
  deleteAlumno,
  uploadPhoto,
  updateBelt,
  getAlumnosStats
} = require('../controllers/alumnoController');

// Importar middleware de autenticación
const {
  authenticate,
  isAdmin,
  isInstructor,
  logAuthRequest
} = require('../middleware/auth');

// Importar middleware de validación
const {
  validateAlumno,
  validateAlumnoUpdate,
  validateBeltUpdate,
  validateMongoId,
  sanitizeInput,
  validateFileSize,
  validateFileType
} = require('../middleware/validation');

// Configuración de multer para subida de fotos de perfil
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/profiles');
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generar nombre único para el archivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'alumno-' + uniqueSuffix + ext);
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
    const uploadPath = path.join(__dirname, '../uploads/profiles');
    
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

// @route   GET /api/alumnos/stats
// @desc    Obtener estadísticas generales de alumnos
// @access  Private (Admin, Instructor)
// NOTA: Esta ruta debe ir ANTES de /:id para evitar conflictos
router.get('/stats', 
  authenticate, 
  isInstructor, 
  logAuthRequest, 
  getAlumnosStats
);

// @route   GET /api/alumnos
// @desc    Obtener todos los alumnos
// @access  Private (Admin, Instructor)
router.get('/', 
  authenticate, 
  isInstructor, 
  logAuthRequest, 
  getAlumnos
);

// @route   GET /api/alumnos/:id
// @desc    Obtener alumno por ID
// @access  Private (Admin, Instructor)
router.get('/:id', 
  authenticate, 
  isInstructor,
  validateMongoId, 
  logAuthRequest, 
  getAlumnoById
);

// @route   POST /api/alumnos
// @desc    Crear nuevo alumno
// @access  Private (Admin, Instructor)
router.post('/', 
  authenticate, 
  isInstructor, 
  sanitizeInput, 
  validateAlumno, 
  logAuthRequest, 
  createAlumno
);

// @route   PUT /api/alumnos/:id
// @desc    Actualizar alumno
// @access  Private (Admin, Instructor)
router.put('/:id', 
  authenticate, 
  isInstructor,
  validateMongoId, 
  sanitizeInput, 
  validateAlumnoUpdate, 
  logAuthRequest, 
  updateAlumno
);

// @route   DELETE /api/alumnos/:id
// @desc    Eliminar alumno
// @access  Private (Admin only)
router.delete('/:id', 
  authenticate, 
  isAdmin, 
  validateMongoId, 
  logAuthRequest, 
  deleteAlumno
);

// @route   POST /api/alumnos/:id/photo
// @desc    Subir foto de perfil de alumno
// @access  Private (Admin, Instructor)
router.post('/:id/photo', 
  authenticate, 
  isInstructor,
  validateMongoId, 
  ensureUploadDir,
  upload.single('photo'),
  validateFileSize(5 * 1024 * 1024), // 5MB
  validateFileType(['image/jpeg', 'image/jpg', 'image/png', 'image/gif']),
  logAuthRequest, 
  uploadPhoto
);

// @route   PUT /api/alumnos/:id/belt
// @desc    Actualizar cinturón de alumno
// @access  Private (Admin, Instructor)
router.put('/:id/belt', 
  authenticate, 
  isInstructor,
  validateMongoId, 
  sanitizeInput, 
  validateBeltUpdate, 
  logAuthRequest, 
  updateBelt
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