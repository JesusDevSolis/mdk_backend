const mongoose = require('mongoose');

const notificacionSchema = new mongoose.Schema({

  // ── Tipo de mensaje ──────────────────────────────────────────────────────
  tipo: {
    type: String,
    enum: ['notificacion', 'promocion', 'recordatorio', 'evento', 'otro'],
    required: [true, 'El tipo es requerido']
  },

  // ── Contenido ────────────────────────────────────────────────────────────
  titulo: {
    type: String,
    required: [true, 'El título es requerido'],
    trim: true,
    maxlength: [200, 'El título no puede exceder 200 caracteres']
  },
  mensaje: {
    type: String,
    required: [true, 'El mensaje es requerido'],
    trim: true,
    maxlength: [5000, 'El mensaje no puede exceder 5000 caracteres']
  },

  // ── Segmentación de destinatarios ────────────────────────────────────────
  destinatarios: {
    tipo: {
      type: String,
      enum: ['todos', 'sucursal', 'programa', 'manual'],
      default: 'todos'
    },
    sucursales: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Sucursal' }],
    programas: [{
      type: String,
      enum: ['tae-kwon-do','tang-soo-do','hapkido','gumdo','pequenos-dragones']
    }],
    // IDs específicos cuando tipo === 'manual'
    alumnos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Alumno' }],
    tutores: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tutor' }]
  },

  // ── Programación ─────────────────────────────────────────────────────────
  fechaInicio: { type: Date },
  fechaFin:    { type: Date },
  enviarEn:    { type: Date }, // para envío programado

  // ── Canal de envío ───────────────────────────────────────────────────────
  canales: {
    email:    { type: Boolean, default: true  },
    whatsapp: { type: Boolean, default: false },
    sms:      { type: Boolean, default: false }
  },

  // ── Estado ───────────────────────────────────────────────────────────────
  estado: {
    type: String,
    enum: ['borrador', 'programada', 'enviando', 'enviada', 'cancelada'],
    default: 'borrador'
  },

  // ── Resultado del envío ──────────────────────────────────────────────────
  envio: {
    totalDestinatarios: { type: Number, default: 0 },
    enviados:           { type: Number, default: 0 },
    fallidos:           { type: Number, default: 0 },
    fechaEnvio:         { type: Date },
    errores:            [{ email: String, error: String }]
  },

  // ── Auditoría ─────────────────────────────────────────────────────────────
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  modificadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }

}, { timestamps: true });

notificacionSchema.index({ tipo:   1 });
notificacionSchema.index({ estado: 1 });
notificacionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notificacion', notificacionSchema);