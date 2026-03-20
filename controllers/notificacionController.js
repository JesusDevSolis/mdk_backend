const Notificacion  = require('../models/Notificacion');
const Alumno        = require('../models/Alumno');
const Tutor         = require('../models/Tutor');
const { enviarEmailMasivo, verificarConexion } = require('../services/emailService');
const mongoose      = require('mongoose');

// ── Obtener lista ────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 20, tipo, estado, search } = req.query;
    const filtros = {};
    if (tipo)   filtros.tipo   = tipo;
    if (estado) filtros.estado = estado;
    if (search) filtros.$or = [
      { titulo:  { $regex: search, $options: 'i' } },
      { mensaje: { $regex: search, $options: 'i' } }
    ];

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Notificacion.countDocuments(filtros);

    const notificaciones = await Notificacion.find(filtros)
      .populate('creadoPor', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: notificaciones,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener notificaciones', error: error.message });
  }
};

// ── Obtener una ──────────────────────────────────────────────────────────────
exports.getById = async (req, res) => {
  try {
    const notif = await Notificacion.findById(req.params.id)
      .populate('creadoPor', 'name email');
    if (!notif) return res.status(404).json({ success: false, message: 'Notificación no encontrada' });
    res.json({ success: true, data: notif });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Crear ─────────────────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const notif = new Notificacion({
      ...req.body,
      creadoPor: req.user._id,
      estado: 'borrador'
    });
    await notif.save();
    res.status(201).json({ success: true, message: 'Notificación creada', data: notif });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ── Actualizar ────────────────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const notif = await Notificacion.findById(req.params.id);
    if (!notif) return res.status(404).json({ success: false, message: 'Notificación no encontrada' });
    if (notif.estado === 'enviada') {
      return res.status(400).json({ success: false, message: 'No se puede editar una notificación ya enviada' });
    }
    Object.assign(notif, { ...req.body, modificadoPor: req.user._id });
    await notif.save();
    res.json({ success: true, message: 'Notificación actualizada', data: notif });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ── Eliminar ──────────────────────────────────────────────────────────────────
exports.delete = async (req, res) => {
  try {
    const notif = await Notificacion.findById(req.params.id);
    if (!notif) return res.status(404).json({ success: false, message: 'Notificación no encontrada' });
    if (notif.estado === 'enviada') {
      return res.status(400).json({ success: false, message: 'No se puede eliminar una notificación ya enviada' });
    }
    await Notificacion.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Notificación eliminada' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Resolver destinatarios ────────────────────────────────────────────────────
const resolverDestinatarios = async (destinatarios) => {
  let lista = []; // [{ email, nombre }]

  const { tipo, sucursales, programas, alumnos, tutores } = destinatarios;

  if (tipo === 'todos') {
    // Alumnos activos con email
    const als = await Alumno.find({ isActive: true, email: { $exists: true, $ne: null } })
      .select('firstName lastName email');
    lista.push(...als.map(a => ({ email: a.email, nombre: `${a.firstName} ${a.lastName}` })));

    // Tutores activos con email
    const tuts = await Tutor.find({ isActive: true, email: { $exists: true, $ne: null } })
      .select('firstName lastName email');
    lista.push(...tuts.map(t => ({ email: t.email, nombre: `${t.firstName} ${t.lastName}` })));

  } else if (tipo === 'sucursal' && sucursales?.length) {
    const als = await Alumno.find({
      isActive: true,
      'enrollment.sucursal': { $in: sucursales },
      email: { $exists: true, $ne: null }
    }).select('firstName lastName email');
    lista.push(...als.map(a => ({ email: a.email, nombre: `${a.firstName} ${a.lastName}` })));

    // Tutores de esos alumnos
    const tutorIds = [...new Set(als.filter(a => a.tutor).map(a => a.tutor?.toString()))];
    if (tutorIds.length) {
      const tuts = await Tutor.find({ _id: { $in: tutorIds }, email: { $exists: true, $ne: null } })
        .select('firstName lastName email');
      lista.push(...tuts.map(t => ({ email: t.email, nombre: `${t.firstName} ${t.lastName}` })));
    }

  } else if (tipo === 'programa' && programas?.length) {
    const als = await Alumno.find({
      isActive: true,
      'enrollment.programa': { $in: programas },
      email: { $exists: true, $ne: null }
    }).select('firstName lastName email tutor');
    lista.push(...als.map(a => ({ email: a.email, nombre: `${a.firstName} ${a.lastName}` })));

  } else if (tipo === 'manual') {
    if (alumnos?.length) {
      const als = await Alumno.find({ _id: { $in: alumnos }, email: { $exists: true, $ne: null } })
        .select('firstName lastName email');
      lista.push(...als.map(a => ({ email: a.email, nombre: `${a.firstName} ${a.lastName}` })));
    }
    if (tutores?.length) {
      const tuts = await Tutor.find({ _id: { $in: tutores }, email: { $exists: true, $ne: null } })
        .select('firstName lastName email');
      lista.push(...tuts.map(t => ({ email: t.email, nombre: `${t.firstName} ${t.lastName}` })));
    }
  }

  // Eliminar duplicados por email
  const vistos = new Set();
  return lista.filter(d => {
    if (vistos.has(d.email)) return false;
    vistos.add(d.email);
    return true;
  });
};

// ── Previsualizar destinatarios ───────────────────────────────────────────────
exports.previewDestinatarios = async (req, res) => {
  try {
    const lista = await resolverDestinatarios(req.body.destinatarios || { tipo: 'todos' });
    res.json({
      success: true,
      total: lista.length,
      preview: lista.slice(0, 10), // primeros 10 como muestra
      conEmail: lista.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Enviar notificación ───────────────────────────────────────────────────────
exports.enviar = async (req, res) => {
  try {
    const notif = await Notificacion.findById(req.params.id);
    if (!notif) return res.status(404).json({ success: false, message: 'Notificación no encontrada' });
    if (notif.estado === 'enviada') {
      return res.status(400).json({ success: false, message: 'Esta notificación ya fue enviada' });
    }

    // Marcar como enviando
    notif.estado = 'enviando';
    await notif.save();

    // Resolver destinatarios
    const lista = await resolverDestinatarios(notif.destinatarios);
    if (!lista.length) {
      notif.estado = 'borrador';
      await notif.save();
      return res.status(400).json({ success: false, message: 'No hay destinatarios con email válido' });
    }

    // Enviar emails
    const resultado = await enviarEmailMasivo({
      destinatarios: lista,
      subject:       notif.titulo,
      titulo:        notif.titulo,
      mensaje:       notif.mensaje
    });

    // Actualizar registro
    notif.estado              = 'enviada';
    notif.envio.totalDestinatarios = lista.length;
    notif.envio.enviados          = resultado.enviados;
    notif.envio.fallidos          = resultado.fallidos;
    notif.envio.errores           = resultado.errores;
    notif.envio.fechaEnvio        = new Date();
    await notif.save();

    res.json({
      success: true,
      message: `Notificación enviada a ${resultado.enviados} destinatarios`,
      data: {
        enviados: resultado.enviados,
        fallidos: resultado.fallidos,
        total:    lista.length
      }
    });
  } catch (error) {
    console.error('Error enviando notificación:', error);
    res.status(500).json({ success: false, message: 'Error al enviar la notificación', error: error.message });
  }
};

// ── Verificar conexión email ──────────────────────────────────────────────────
exports.verificarEmail = async (req, res) => {
  try {
    const result = await verificarConexion();
    res.json({ success: result.ok, message: result.ok ? 'Conexión SMTP OK' : result.error });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};