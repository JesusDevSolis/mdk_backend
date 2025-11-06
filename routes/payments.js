const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Importar controlador
const paymentController = require('../controllers/paymentController');

// Importar middleware de autenticación
const { authenticate, authorize } = require('../middleware/auth');

// ===== CONFIGURACIÓN DE MULTER PARA SUBIDA DE COMPROBANTES =====

// Asegurar que existe el directorio de uploads
const uploadsDir = path.join(__dirname, '../uploads/documents');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generar nombre único: comprobante-timestamp-random.ext
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'comprobante-' + uniqueSuffix + ext);
  }
});

// Filtro de archivos permitidos
const fileFilter = (req, file, cb) => {
  // Tipos de archivo permitidos para comprobantes
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen (JPG, PNG) o documentos (PDF, DOC, DOCX)'), false);
  }
};

// Configurar multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // Límite de 5MB
  },
  fileFilter: fileFilter
});

// ===== RUTAS PÚBLICAS (Sin autenticación - solo para testing) =====
// NOTA: En producción, estas rutas deberían estar protegidas

// ===== RUTAS PROTEGIDAS =====

// Aplicar protección a todas las rutas
router.use(authenticate);

// ===== RUTAS DE ESTADÍSTICAS Y CONSULTAS ESPECIALES =====

// Obtener estadísticas de pagos
// GET /api/pagos/stats
router.get('/stats', paymentController.getPaymentStats);

// Obtener pagos pendientes
// GET /api/pagos/pendientes
router.get('/pendientes', paymentController.getPendingPayments);

// Obtener pagos vencidos
// GET /api/pagos/vencidos
router.get('/vencidos', paymentController.getOverduePayments);

// Obtener pagos por alumno
// GET /api/pagos/alumno/:alumnoId
router.get('/alumno/:alumnoId', paymentController.getPaymentsByAlumno);

// Obtener pagos por tutor
// GET /api/pagos/tutor/:tutorId
router.get('/tutor/:tutorId', paymentController.getPaymentsByTutor);

// ===== RUTAS CRUD PRINCIPALES =====

// Obtener todos los pagos (con paginación y filtros)
// GET /api/pagos?page=1&limit=20&status=pendiente&type=colegiatura
router.get('/', paymentController.getAllPayments);

// Obtener pago por ID
// GET /api/pagos/:id
router.get('/:id', paymentController.getPaymentById);

// Crear nuevo pago
// POST /api/pagos
// Body: { alumno, sucursal, type, amount, dueDate, etc. }
router.post('/', paymentController.createPayment);

// Actualizar pago
// PUT /api/pagos/:id
// Body: { amount, dueDate, notes, etc. }
router.put('/:id', paymentController.updatePayment);

// Eliminar pago (soft delete)
// DELETE /api/pagos/:id
router.delete('/:id', paymentController.deletePayment);

// ===== RUTAS DE ACCIONES ESPECIALES =====

// Marcar pago como pagado
// PUT /api/pagos/:id/marcar-pagado
// Body: { paidDate, paymentMethod, paymentReference }
router.put('/:id/marcar-pagado', paymentController.markAsPaid);

// Cancelar pago
// PUT /api/pagos/:id/cancelar
// Body: { reason }
router.put('/:id/cancelar', paymentController.cancelPayment);

// Subir comprobante de pago
// POST /api/pagos/:id/comprobante
// Form-data: comprobante (file)
router.post(
  '/:id/comprobante',
  upload.single('comprobante'),
  paymentController.uploadReceipt
);

// ===== MANEJO DE ERRORES DE MULTER =====
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'El archivo es demasiado grande. Máximo 5MB.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Error al subir archivo: ${error.message}`
    });
  }
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next();
});

module.exports = router;