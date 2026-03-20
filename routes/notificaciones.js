const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/notificacionController');
const { authenticate, authorize } = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authenticate);

// CRUD (solo admin)
router.get('/',             authorize('admin'), ctrl.getAll);
router.get('/:id',          authorize('admin'), ctrl.getById);
router.post('/',            authorize('admin'), ctrl.create);
router.put('/:id',          authorize('admin'), ctrl.update);
router.delete('/:id',       authorize('admin'), ctrl.delete);

// Acciones especiales
router.post('/preview-destinatarios', authorize('admin'), ctrl.previewDestinatarios);
router.post('/:id/enviar',  authorize('admin'), ctrl.enviar);
router.get('/test/email',   authorize('admin'), ctrl.verificarEmail);

module.exports = router;