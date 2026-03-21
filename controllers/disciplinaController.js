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

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

const buildLogoUrl = (logo, req) => {
  if (!logo?.url) return null;
  if (logo.url.startsWith('http')) return logo.url;
  const base = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3005}`;
  return `${base}${logo.url}`;
};

// ── GET /api/disciplinas ──────────────────────────────────────────────────────
const getDisciplinas = async (req, res) => {
  try {
    const all = req.query.all === 'true'; // incluir inactivas si all=true
    const query = all ? {} : { isActive: true };
    const disciplinas = await Disciplina.find(query)
      .select('nombre slug descripcion logo isActive orden color emoji')
      .sort({ orden: 1, nombre: 1 })
      .lean();

    const result = disciplinas.map(d => ({
      ...d,
      logoUrl: buildLogoUrl(d.logo)
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno', detail: error.message });
  }
};

// ── POST /api/disciplinas ─────────────────────────────────────────────────────
const createDisciplina = async (req, res) => {
  try {
    const { nombre, descripcion, color, emoji, orden } = req.body;
    if (!nombre?.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre es requerido' });
    }

    // Generar slug desde nombre
    const slug = nombre.trim()
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    const existe = await Disciplina.findOne({ slug });
    if (existe) {
      return res.status(400).json({ success: false, message: `Ya existe una disciplina con el slug "${slug}"` });
    }

    // Calcular orden si no se pasa
    const maxOrden = await Disciplina.countDocuments();

    // Usar insertOne directo para evitar validaciones de campos no relevantes
    const mongoose = require('mongoose');
    const col = mongoose.connection.db.collection('disciplinas');
    const now = new Date();
    const docId = new mongoose.Types.ObjectId();

    await col.insertOne({
      _id:         docId,
      slug,
      nombre:      nombre.trim(),
      descripcion: descripcion?.trim() || '',
      color:       color  || '#6B7280',
      emoji:       emoji  || '🥋',
      orden:       orden  ?? (maxOrden + 1),
      isActive:    true,
      createdBy:   req.user._id,
      sistemaNiveles: [],
      sucursales:  [],
      logo: { url: null, filename: null, originalName: null, mimetype: null, size: null },
      createdAt: now,
      updatedAt: now,
    });

    res.status(201).json({
      success: true,
      message: 'Disciplina creada',
      data: { _id: docId, slug, nombre: nombre.trim(), color: color || '#6B7280', emoji: emoji || '🥋', isActive: true, logoUrl: null }
    });
  } catch (error) {
    console.error('Error creando disciplina:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ── PUT /api/disciplinas/:id ──────────────────────────────────────────────────
const updateDisciplina = async (req, res) => {
  try {
    const { nombre, descripcion, color, emoji, isActive, orden } = req.body;

    const disc = await Disciplina.findById(req.params.id);
    if (!disc) return res.status(404).json({ success: false, message: 'Disciplina no encontrada' });

    // Construir solo los campos que vienen en el request
    const campos = {};
    if (nombre      !== undefined) campos.nombre      = nombre.trim();
    if (descripcion !== undefined) campos.descripcion = descripcion.trim();
    if (color       !== undefined) campos.color       = color;
    if (emoji       !== undefined) campos.emoji       = emoji;
    if (isActive    !== undefined) campos.isActive    = isActive;
    if (orden       !== undefined) campos.orden       = orden;

    // Usar $set para no disparar validaciones de campos que no se están editando
    const updated = await Disciplina.findByIdAndUpdate(
      req.params.id,
      { $set: campos },
      { new: true, runValidators: false }
    ).lean();

    const logoUrl = buildLogoUrl(updated.logo);
    res.json({ success: true, message: 'Disciplina actualizada', data: { ...updated, logoUrl } });
  } catch (error) {
    console.error('Error actualizando disciplina:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// ── DELETE /api/disciplinas/:id ───────────────────────────────────────────────
const deleteDisciplina = async (req, res) => {
  try {
    const disc = await Disciplina.findById(req.params.id).lean();
    if (!disc) return res.status(404).json({ success: false, message: 'Disciplina no encontrada' });

    // Hard delete — elimina el documento de la BD completamente
    // Esto permite crear una nueva disciplina con el mismo nombre/slug después
    await Disciplina.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: `Disciplina "${disc.nombre}" eliminada correctamente` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── PUT /api/disciplinas/:id/logo ─────────────────────────────────────────────
const updateLogo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No se proporcionó ninguna imagen' });

    const existente = await Disciplina.findById(req.params.id).select('nombre logo').lean();
    if (!existente) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ success: false, message: 'Disciplina no encontrada' });
    }

    if (existente.logo?.filename) {
      const oldPath = path.join(__dirname, '../uploads/logos', existente.logo.filename);
      if (fsSync.existsSync(oldPath)) await fs.unlink(oldPath).catch(() => {});
    }

    const newLogo = {
      url: `/uploads/logos/${req.file.filename}`,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    };

    await Disciplina.findByIdAndUpdate(req.params.id, { $set: { logo: newLogo } }, { runValidators: false });

    const base    = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3005}`;
    const logoUrl = `${base}/uploads/logos/${req.file.filename}`;

    res.json({ success: true, message: `Logo actualizado`, data: { _id: req.params.id, nombre: existente.nombre, logo: newLogo, logoUrl } });
  } catch (error) {
    if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── DELETE /api/disciplinas/:id/logo ─────────────────────────────────────────
const deleteLogo = async (req, res) => {
  try {
    const existente = await Disciplina.findById(req.params.id).select('nombre logo').lean();
    if (!existente) return res.status(404).json({ success: false, message: 'Disciplina no encontrada' });

    if (existente.logo?.filename) {
      const filePath = path.join(__dirname, '../uploads/logos', existente.logo.filename);
      if (fsSync.existsSync(filePath)) await fs.unlink(filePath).catch(() => {});
    }

    await Disciplina.findByIdAndUpdate(req.params.id,
      { $set: { logo: { url: null, filename: null, originalName: null, mimetype: null, size: null } } },
      { runValidators: false }
    );

    res.json({ success: true, message: `Logo eliminado` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDisciplinas, createDisciplina, updateDisciplina, deleteDisciplina, updateLogo, deleteLogo, upload };