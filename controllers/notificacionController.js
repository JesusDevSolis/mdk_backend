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
    await Notificacion.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Notificación eliminada' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Resolver destinatarios ─────────────────────────────────────────────────
// Regla: menores de 18 → email del tutor; mayores → email del alumno
const resolverDestinatarios = async (destinatarios) => {
  const lista = []; // [{ email, nombre }]
  const { tipo, sucursales, programas, alumnos, tutores } = destinatarios;

  // Función auxiliar: dado un alumno, devuelve { email, nombre } correcto
  const emailParaAlumno = async (alumno) => {
    const edad = alumno.age ?? calcularEdad(alumno.dateOfBirth);
    const esMinor = edad !== null && edad < 18;

    if (esMinor && alumno.tutor) {
      // Buscar email del tutor
      const tutorId = typeof alumno.tutor === 'object' ? alumno.tutor._id : alumno.tutor;
      const tutor = await Tutor.findById(tutorId).select('firstName lastName email').lean();
      if (tutor?.email) {
        return { email: tutor.email, nombre: `${tutor.firstName} ${tutor.lastName} (tutor de ${alumno.firstName})` };
      }
      // Si el tutor no tiene email, intentar con el alumno si tiene
      if (alumno.email) {
        return { email: alumno.email, nombre: `${alumno.firstName} ${alumno.lastName}` };
      }
      return null; // sin email disponible
    }

    if (alumno.email) {
      return { email: alumno.email, nombre: `${alumno.firstName} ${alumno.lastName}` };
    }
    return null;
  };

  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return null;
    const hoy = new Date();
    const nac = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  };

  // ── Consultas por tipo ─────────────────────────────────────────────────
  let alumnosQuery = [];

  if (tipo === 'todos') {
    alumnosQuery = await Alumno.find({ isActive: true })
      .select('firstName lastName email dateOfBirth tutor')
      .populate('tutor', 'firstName lastName email')
      .lean();

    // También incluir tutores activos directamente
    const tuts = await Tutor.find({ isActive: true, email: { $exists: true, $ne: null } })
      .select('firstName lastName email').lean();
    lista.push(...tuts.map(t => ({ email: t.email, nombre: `${t.firstName} ${t.lastName}` })));

  } else if (tipo === 'sucursal' && sucursales?.length) {
    alumnosQuery = await Alumno.find({
      isActive: true,
      'enrollment.sucursal': { $in: sucursales }
    }).select('firstName lastName email dateOfBirth tutor')
      .populate('tutor', 'firstName lastName email')
      .lean();

  } else if (tipo === 'programa' && programas?.length) {
    alumnosQuery = await Alumno.find({
      isActive: true,
      'enrollment.programa': { $in: programas }
    }).select('firstName lastName email dateOfBirth tutor')
      .populate('tutor', 'firstName lastName email')
      .lean();

  } else if (tipo === 'manual') {
    if (alumnos?.length) {
      alumnosQuery = await Alumno.find({ _id: { $in: alumnos } })
        .select('firstName lastName email dateOfBirth tutor')
        .populate('tutor', 'firstName lastName email')
        .lean();
    }
    if (tutores?.length) {
      const tuts = await Tutor.find({ _id: { $in: tutores }, email: { $exists: true, $ne: null } })
        .select('firstName lastName email').lean();
      lista.push(...tuts.map(t => ({ email: t.email, nombre: `${t.firstName} ${t.lastName}` })));
    }
  }

  // Procesar alumnos aplicando la regla menor/mayor
  for (const alumno of alumnosQuery) {
    const dest = await emailParaAlumno(alumno);
    if (dest) lista.push(dest);
  }

  // Eliminar duplicados por email
  const vistos = new Set();
  return lista.filter(d => {
    if (!d.email) return false;
    const emailNorm = d.email.toLowerCase().trim();
    if (vistos.has(emailNorm)) return false;
    vistos.add(emailNorm);
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
      preview: lista.slice(0, 10),
      conEmail: lista.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Enviar notificación (permite reenvío) ────────────────────────────────────
exports.enviar = async (req, res) => {
  try {
    const notif = await Notificacion.findById(req.params.id);
    if (!notif) return res.status(404).json({ success: false, message: 'Notificación no encontrada' });

    // Marcar como enviando
    notif.estado = 'enviando';
    await notif.save();

    // Resolver destinatarios
    const lista = await resolverDestinatarios(notif.destinatarios);
    if (!lista.length) {
      notif.estado = notif.envio?.fechaEnvio ? 'enviada' : 'borrador';
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

    // Actualizar registro (acumulando si es reenvío)
    notif.estado                   = 'enviada';
    notif.envio.totalDestinatarios = lista.length;
    notif.envio.enviados           = resultado.enviados;
    notif.envio.fallidos           = resultado.fallidos;
    notif.envio.errores            = resultado.errores;
    notif.envio.fechaEnvio         = new Date();
    await notif.save();

    res.json({
      success: true,
      message: `Notificación enviada a ${resultado.enviados} de ${lista.length} destinatarios`,
      data: {
        enviados: resultado.enviados,
        fallidos: resultado.fallidos,
        total:    lista.length
      }
    });
  } catch (error) {
    console.error('Error enviando notificación:', error);
    // Revertir estado si falla
    try {
      await Notificacion.findByIdAndUpdate(req.params.id, { estado: 'borrador' });
    } catch (_) {}
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