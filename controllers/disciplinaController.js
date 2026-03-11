const Disciplina = require('../models/Disciplina');
const path        = require('path');
const fs          = require('fs').promises;
const fsSync      = require('fs');
const multer      = require('multer');

// ── Multer — almacenamiento para logos de disciplina ─────────────────────────
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/logos');
        try { await fs.mkdir(dir, { recursive: true }); } catch (_) {}
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext    = path.extname(file.originalname).toLowerCase();
        const unique = `logo-disciplina-${req.params.id}-${Date.now()}${ext}`;
        cb(null, unique);
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    allowed.includes(file.mimetype)
        ? cb(null, true)
        : cb(new Error('Solo se permiten imágenes (JPEG, PNG, WEBP, GIF)'), false);
    };

    const upload = multer({
        storage,
        fileFilter,
        limits: { fileSize: 5 * 1024 * 1024 } // 5MB
    });

// ── @route  GET /api/disciplinas ──────────────────────────────────────────────
// @desc   Obtener todas las disciplinas activas
// @access Private
const getDisciplinas = async (req, res) => {
    try {
        const disciplinas = await Disciplina.find({ isActive: true })
        .select('nombre slug descripcion logo isActive orden')
        .sort({ orden: 1, nombre: 1 })
        .lean();

        // Agregar logoUrl resuelto
        const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3005}`;
        const result  = disciplinas.map(d => ({
        ...d,
        logoUrl: d.logo?.url
            ? (d.logo.url.startsWith('http') ? d.logo.url : `${baseUrl}${d.logo.url}`)
            : null
        }));

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error obteniendo disciplinas:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// ── @route  PUT /api/disciplinas/:id/logo ─────────────────────────────────────
// @desc   Subir / actualizar logo de una disciplina
// @access Private (Admin)
const updateLogo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se proporcionó ninguna imagen' });
        }

        const disciplina = await Disciplina.findById(req.params.id);
        if (!disciplina) {
            // Limpiar archivo subido si no existe la disciplina
            await fs.unlink(req.file.path).catch(() => {});
            return res.status(404).json({ success: false, message: 'Disciplina no encontrada' });
        }

        // Eliminar logo anterior si existe (y no es una URL externa)
        if (disciplina.logo?.filename) {
            const oldPath = path.join(__dirname, '../uploads/logos', disciplina.logo.filename);
            if (fsSync.existsSync(oldPath)) {
                await fs.unlink(oldPath).catch(() => {});
            }
        }

        // Guardar nuevo logo
        disciplina.logo = {
            url      : `/uploads/logos/${req.file.filename}`,
            filename : req.file.filename,
        };
        await disciplina.save();

        const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3005}`;
        const logoUrl = `${baseUrl}/uploads/logos/${req.file.filename}`;

        res.json({
            success : true,
            message : `Logo de ${disciplina.nombre} actualizado correctamente`,
            data    : {
                _id    : disciplina._id,
                nombre : disciplina.nombre,
                logo   : disciplina.logo,
                logoUrl,
            }
        });
    } catch (error) {
        // Limpiar archivo si hubo error
        if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
        console.error('Error actualizando logo de disciplina:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar el logo' });
    }
};

// ── @route  DELETE /api/disciplinas/:id/logo ─────────────────────────────────
// @desc   Eliminar logo de una disciplina
// @access Private (Admin)
const deleteLogo = async (req, res) => {
    try {
        const disciplina = await Disciplina.findById(req.params.id);
        if (!disciplina) {
            return res.status(404).json({ success: false, message: 'Disciplina no encontrada' });
        }

        if (disciplina.logo?.filename) {
            const filePath = path.join(__dirname, '../uploads/logos', disciplina.logo.filename);
            if (fsSync.existsSync(filePath)) {
                await fs.unlink(filePath).catch(() => {});
            }
        }

        disciplina.logo = { url: null, filename: null };
        await disciplina.save();

        res.json({ success: true, message: `Logo de ${disciplina.nombre} eliminado` });
    } catch (error) {
        console.error('Error eliminando logo de disciplina:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar el logo' });
    }
};

module.exports = { getDisciplinas, updateLogo, deleteLogo, upload };