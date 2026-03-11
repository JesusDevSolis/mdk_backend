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
    limits: { fileSize: 5 * 1024 * 1024 }
});

// ── GET /api/disciplinas ──────────────────────────────────────────────────────
const getDisciplinas = async (req, res) => {
    try {
        const disciplinas = await Disciplina.find({ isActive: true })
        .select('nombre slug descripcion logo isActive orden')
        .sort({ orden: 1, nombre: 1 })
        .lean();

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
        res.status(500).json({ success: false, message: 'Error interno del servidor', detail: error.message });
    }
};

// ── PUT /api/disciplinas/:id/logo ─────────────────────────────────────────────
// Usa findByIdAndUpdate + runValidators:false para evitar que campos required
// del modelo (createdBy, sucursales, etc.) bloqueen la operación.
const updateLogo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se proporcionó ninguna imagen' });
        }

        const existente = await Disciplina.findById(req.params.id).select('nombre logo').lean();
        if (!existente) {
            await fs.unlink(req.file.path).catch(() => {});
            return res.status(404).json({ success: false, message: 'Disciplina no encontrada' });
        }

        // Borrar logo anterior del disco
        if (existente.logo?.filename) {
        const oldPath = path.join(__dirname, '../uploads/logos', existente.logo.filename);
            if (fsSync.existsSync(oldPath)) await fs.unlink(oldPath).catch(() => {});
        }

        const newLogo = {
            url          : `/uploads/logos/${req.file.filename}`,
            filename     : req.file.filename,
            originalName : req.file.originalname,
            mimetype     : req.file.mimetype,
            size         : req.file.size,
        };

        // Solo actualiza el campo logo — sin disparar validación del documento completo
        await Disciplina.findByIdAndUpdate(
            req.params.id,
            { $set: { logo: newLogo } },
            { runValidators: false }
        );

        const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3005}`;
        const logoUrl = `${baseUrl}/uploads/logos/${req.file.filename}`;

        res.json({
            success : true,
            message : `Logo de ${existente.nombre} actualizado correctamente`,
            data    : { _id: req.params.id, nombre: existente.nombre, logo: newLogo, logoUrl }
        });

    } catch (error) {
        if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
        console.error('Error actualizando logo:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar el logo', detail: error.message });
    }
};

// ── DELETE /api/disciplinas/:id/logo ─────────────────────────────────────────
const deleteLogo = async (req, res) => {
    try {
        const existente = await Disciplina.findById(req.params.id).select('nombre logo').lean();
        if (!existente) {
            return res.status(404).json({ success: false, message: 'Disciplina no encontrada' });
        }

        if (existente.logo?.filename) {
            const filePath = path.join(__dirname, '../uploads/logos', existente.logo.filename);
            if (fsSync.existsSync(filePath)) await fs.unlink(filePath).catch(() => {});
        }

        await Disciplina.findByIdAndUpdate(
            req.params.id,
            { $set: { logo: { url: null, filename: null, originalName: null, mimetype: null, size: null } } },
            { runValidators: false }
        );

        res.json({ success: true, message: `Logo de ${existente.nombre} eliminado` });

    } catch (error) {
        console.error('Error eliminando logo:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar el logo', detail: error.message });
    }
};

module.exports = { getDisciplinas, updateLogo, deleteLogo, upload };