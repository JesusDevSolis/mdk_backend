const express = require('express');
const router  = express.Router();

const { getDisciplinas, updateLogo, deleteLogo, upload } = require('../controllers/disciplinaController');
const { authenticate, isAdmin, isInstructor }            = require('../middleware/auth');
const { validateMongoId }                                 = require('../middleware/validation');

// @route  GET /api/disciplinas
// @desc   Listar todas las disciplinas activas
// @access Private (Admin, Instructor)
router.get('/', authenticate, isInstructor, getDisciplinas);

// @route  PUT /api/disciplinas/:id/logo
// @desc   Subir / reemplazar logo de disciplina
// @access Private (Admin)
router.put('/:id/logo',
    authenticate,
    isAdmin,
    validateMongoId,
    upload.single('logo'),
    updateLogo
);

// @route  DELETE /api/disciplinas/:id/logo
// @desc   Eliminar logo de disciplina
// @access Private (Admin)
router.delete('/:id/logo',
    authenticate,
    isAdmin,
    validateMongoId,
    deleteLogo
);

module.exports = router;