const express = require('express');
const router = express.Router();

// Importar controladores
const {
    getAllConfiguraciones,
    getConfiguracionsAgrupadas,
    getConfiguracionById,
    getConfiguracionByClave,
    getConfiguracionesPorCategoria,
    createConfiguracion,
    updateConfiguracion,
    updateValorByClave,
    updateMultiple,
    deleteConfiguracion,
    restaurarDefecto,
    restaurarCategoria,
    inicializarDefecto,
    getEstadisticas,
    exportarConfiguraciones
} = require('../controllers/configuracionController');

// Importar middleware de autenticación
const {
    authenticate,
    isAdmin
} = require('../middleware/auth');

// Importar middleware de validación
const {
    validateMongoId,
    sanitizeInput
} = require('../middleware/validation');

// ============================================
// RUTAS ESPECIALES (deben ir ANTES de /:id)
// ============================================

// @route   GET /api/configuraciones/agrupadas
// @desc    Obtener configuraciones agrupadas por categoría
// @access  Private (Admin only)
router.get('/agrupadas', 
    authenticate, 
    isAdmin, 
    getConfiguracionsAgrupadas
);

// @route   GET /api/configuraciones/estadisticas
// @desc    Obtener estadísticas de configuraciones
// @access  Private (Admin only)
router.get('/estadisticas', 
    authenticate, 
    isAdmin, 
    getEstadisticas
);

// @route   GET /api/configuraciones/exportar
// @desc    Exportar todas las configuraciones
// @access  Private (Admin only)
router.get('/exportar', 
    authenticate, 
    isAdmin, 
    exportarConfiguraciones
);

// @route   POST /api/configuraciones/inicializar
// @desc    Inicializar configuraciones por defecto
// @access  Private (Admin only)
router.post('/inicializar', 
    authenticate, 
    isAdmin, 
    inicializarDefecto
);

// @route   PUT /api/configuraciones/multiple
// @desc    Actualizar múltiples configuraciones
// @access  Private (Admin only)
router.put('/multiple', 
    authenticate, 
    isAdmin,
    sanitizeInput, 
    updateMultiple
);

// @route   GET /api/configuraciones/categoria/:categoria
// @desc    Obtener configuraciones por categoría
// @access  Private (Admin only)
router.get('/categoria/:categoria', 
    authenticate, 
    isAdmin, 
    getConfiguracionesPorCategoria
);

// @route   PUT /api/configuraciones/categoria/:categoria/restaurar
// @desc    Restaurar todas las configuraciones de una categoría
// @access  Private (Admin only)
router.put('/categoria/:categoria/restaurar', 
    authenticate, 
    isAdmin, 
    restaurarCategoria
);

// @route   GET /api/configuraciones/clave/:clave
// @desc    Obtener configuración por clave
// @access  Private (Admin only)
router.get('/clave/:clave', 
    authenticate, 
    isAdmin, 
    getConfiguracionByClave
);

// @route   PUT /api/configuraciones/clave/:clave
// @desc    Actualizar valor por clave
// @access  Private (Admin only)
router.put('/clave/:clave', 
    authenticate, 
    isAdmin,
    sanitizeInput, 
    updateValorByClave
);

// ============================================
// RUTAS CRUD PRINCIPALES
// ============================================

// @route   GET /api/configuraciones
// @desc    Obtener todas las configuraciones
// @access  Private (Admin only)
router.get('/', 
    authenticate, 
    isAdmin, 
    getAllConfiguraciones
);

// @route   GET /api/configuraciones/:id
// @desc    Obtener configuración por ID
// @access  Private (Admin only)
router.get('/:id', 
    authenticate, 
    isAdmin,
    validateMongoId, 
    getConfiguracionById
);

// @route   POST /api/configuraciones
// @desc    Crear nueva configuración
// @access  Private (Admin only)
router.post('/', 
    authenticate, 
    isAdmin,
    sanitizeInput, 
    createConfiguracion
);

// @route   PUT /api/configuraciones/:id
// @desc    Actualizar configuración
// @access  Private (Admin only)
router.put('/:id', 
    authenticate, 
    isAdmin,
    validateMongoId,
    sanitizeInput, 
    updateConfiguracion
);

// @route   DELETE /api/configuraciones/:id
// @desc    Eliminar configuración (soft delete)
// @access  Private (Admin only)
router.delete('/:id', 
    authenticate, 
    isAdmin,
    validateMongoId, 
    deleteConfiguracion
);

// @route   PUT /api/configuraciones/:id/restaurar
// @desc    Restaurar configuración a valor por defecto
// @access  Private (Admin only)
router.put('/:id/restaurar', 
    authenticate, 
    isAdmin,
    validateMongoId, 
    restaurarDefecto
);

module.exports = router;