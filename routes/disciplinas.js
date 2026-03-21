const express = require('express');
const router  = express.Router();

const {
  getDisciplinas, createDisciplina, updateDisciplina,
  deleteDisciplina, updateLogo, deleteLogo, upload
} = require('../controllers/disciplinaController');
const { authenticate, isAdmin, isInstructor } = require('../middleware/auth');
const { validateMongoId }                      = require('../middleware/validation');

// Rutas específicas primero
router.get('/',    authenticate, isInstructor, getDisciplinas);
router.post('/',   authenticate, isAdmin,      createDisciplina);

router.put('/:id/logo',    authenticate, isAdmin, validateMongoId, upload.single('logo'), updateLogo);
router.delete('/:id/logo', authenticate, isAdmin, validateMongoId, deleteLogo);

router.put('/:id',    authenticate, isAdmin, validateMongoId, updateDisciplina);
router.delete('/:id', authenticate, isAdmin, validateMongoId, deleteDisciplina);

module.exports = router;