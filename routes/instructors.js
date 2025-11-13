const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Importar controladores
const {
    getAllInstructores,
    getInstructorById,
    createInstructor,
    updateInstructor,
    deleteInstructor,
    getInstructoresBySucursal,
    toggleInstructorStatus,
    getInstructorEstadisticas
} = require('../controllers/instructorController');

// Importar middleware de autenticación
const {
    authenticate,
    isAdmin,
    logAuthRequest
} = require('../middleware/auth');

// Importar middleware de validación
const {
    validateMongoId,
    sanitizeInput
} = require('../middleware/validation');

// Configuración de multer para subida de fotos de perfil de instructores
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../uploads/instructors');
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Generar nombre único para el archivo
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'instructor-' + uniqueSuffix + ext);
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
        const uploadPath = path.join(__dirname, '../uploads/instructors');
        
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

// ============================================
// RUTAS ESPECÍFICAS (deben ir antes de /:id)
// ============================================

// @route   GET /api/instructores/sucursal/:sucursalId
// @desc    Obtener instructores por sucursal
// @access  Private (Admin only)
router.get('/sucursal/:sucursalId', 
    authenticate, 
    isAdmin,
    validateMongoId, 
    logAuthRequest, 
    getInstructoresBySucursal
);

// ============================================
// RUTAS CRUD PRINCIPALES
// ============================================

// @route   GET /api/instructores
// @desc    Obtener todos los instructores
// @access  Private (Admin only)
router.get('/', 
    authenticate, 
    isAdmin, 
    logAuthRequest, 
    getAllInstructores
);

// @route   GET /api/instructores/:id
// @desc    Obtener instructor por ID
// @access  Private (Admin only)
router.get('/:id', 
    authenticate, 
    isAdmin,
    validateMongoId, 
    logAuthRequest, 
    getInstructorById
);

// @route   POST /api/instructores
// @desc    Crear nuevo instructor
// @access  Private (Admin only)
router.post('/', 
    authenticate, 
    isAdmin, 
    sanitizeInput, 
    logAuthRequest, 
    createInstructor
);

// @route   PUT /api/instructores/:id
// @desc    Actualizar instructor
// @access  Private (Admin only)
router.put('/:id', 
    authenticate, 
    isAdmin,
    validateMongoId, 
    sanitizeInput, 
    logAuthRequest, 
    updateInstructor
);

// @route   DELETE /api/instructores/:id
// @desc    Eliminar instructor (soft delete)
// @access  Private (Admin only)
router.delete('/:id', 
    authenticate, 
    isAdmin, 
    validateMongoId, 
    logAuthRequest, 
    deleteInstructor
);

// ============================================
// RUTAS ADICIONALES
// ============================================

// @route   PUT /api/instructores/:id/toggle-status
// @desc    Activar/Desactivar instructor
// @access  Private (Admin only)
router.put('/:id/toggle-status', 
    authenticate, 
    isAdmin,
    validateMongoId, 
    logAuthRequest, 
    toggleInstructorStatus
);

// @route   GET /api/instructores/:id/estadisticas
// @desc    Obtener estadísticas del instructor
// @access  Private (Admin only)
router.get('/:id/estadisticas', 
    authenticate, 
    isAdmin,
    validateMongoId, 
    logAuthRequest, 
    getInstructorEstadisticas
);

// @route   POST /api/instructores/:id/photo
// @desc    Subir foto de perfil de instructor
// @access  Private (Admin only)
// NOTA: Esta funcionalidad está preparada pero el endpoint de actualización 
// está en el updateInstructor. Se puede implementar endpoint separado si se necesita.
router.post('/:id/photo', 
    authenticate, 
    isAdmin,
    validateMongoId, 
    ensureUploadDir,
    upload.single('photo'),
    logAuthRequest,
    (req, res) => {
        // Por ahora solo retornar la URL del archivo subido
        // El update completo se hace con updateInstructor
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No se proporcionó ningún archivo'
            });
        }

        const photoUrl = `/uploads/instructors/${req.file.filename}`;
        
        res.status(200).json({
            success: true,
            message: 'Foto subida exitosamente',
            data: {
                photoUrl,
                filename: req.file.filename
            }
        });
    }
);

// ============================================
// MIDDLEWARE DE MANEJO DE ERRORES
// ============================================

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