const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Importar controladores
const {
  getTutores,
  getTutorById,
  createTutor,
  updateTutor,
  deleteTutor,
  uploadPhoto,
  getTutorChildren
} = require('../controllers/tutorController');

// Importar middleware de autenticación
const {
  authenticate,
  isAdmin,
  isInstructor,
  logAuthRequest
} = require('../middleware/auth');

// Importar middleware de validación
const {
  validateTutor,
  validateTutorUpdate,
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
    cb(null, 'tutor-' + uniqueSuffix + ext);
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

// @route   GET /api/tutores
// @desc    Obtener todos los tutores
// @access  Private (Admin, Instructor)
router.get('/', 
  authenticate, 
  isInstructor, 
  logAuthRequest, 
  getTutores
);

// @route   GET /api/tutores/:id
// @desc    Obtener tutor por ID
// @access  Private (Admin, Instructor)
router.get('/:id', 
  authenticate, 
  isInstructor,
  validateMongoId, 
  logAuthRequest, 
  getTutorById
);

// @route   POST /api/tutores
// @desc    Crear nuevo tutor
// @access  Private (Admin, Instructor)
router.post('/', 
  authenticate, 
  isInstructor, 
  sanitizeInput, 
  validateTutor, 
  logAuthRequest, 
  createTutor
);

// @route   PUT /api/tutores/:id
// @desc    Actualizar tutor
// @access  Private (Admin, Instructor)
router.put('/:id', 
  authenticate, 
  isInstructor,
  validateMongoId, 
  sanitizeInput, 
  validateTutorUpdate, 
  logAuthRequest, 
  updateTutor
);

// @route   DELETE /api/tutores/:id
// @desc    Eliminar tutor
// @access  Private (Admin only)
router.delete('/:id', 
  authenticate, 
  isAdmin, 
  validateMongoId, 
  logAuthRequest, 
  deleteTutor
);

// @route   POST /api/tutores/:id/photo
// @desc    Subir foto de perfil de tutor
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

// @route   GET /api/tutores/:id/children
// @desc    Obtener hijos de un tutor
// @access  Private (Admin, Instructor)
router.get('/:id/children', 
  authenticate, 
  isInstructor,
  validateMongoId, 
  logAuthRequest, 
  getTutorChildren
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