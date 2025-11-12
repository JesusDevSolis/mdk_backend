const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // ===== RELACIONES =====
  alumno: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Alumno',
    required: [true, 'El alumno es requerido'],
    index: true
  },
  tutor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tutor',
    validate: {
      validator: async function(tutorId) {
        if (!tutorId) return true; // Es opcional
        
        const Tutor = mongoose.model('Tutor');
        const tutor = await Tutor.findById(tutorId);
        return tutor && tutor.isActive;
      },
      message: 'El tutor debe existir y estar activo'
    }
  },
  sucursal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sucursal',
    required: [true, 'La sucursal es requerida'],
    index: true
  },

  // ===== INFORMACIÓN DEL PAGO =====
  type: {
    type: String,
    enum: {
      values: ['colegiatura', 'inscripcion', 'uniforme', 'examen', 'equipo', 'otro'],
      message: '{VALUE} no es un tipo de pago válido'
    },
    required: [true, 'El tipo de pago es requerido'],
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'La descripción no puede exceder 200 caracteres'],
    default: function() {
      const descriptions = {
        'colegiatura': 'Pago de colegiatura mensual',
        'inscripcion': 'Pago de inscripción',
        'uniforme': 'Compra de uniforme',
        'examen': 'Pago de examen de graduación',
        'equipo': 'Compra de equipo',
        'otro': 'Otro concepto'
      };
      return descriptions[this.type] || 'Pago';
    }
  },

  // ===== MONTOS =====
  amount: {
    type: Number,
    required: [true, 'El monto es requerido'],
    min: [0, 'El monto no puede ser negativo'],
    validate: {
      validator: function(value) {
        return /^\d+(\.\d{1,2})?$/.test(value.toString());
      },
      message: 'El monto debe tener máximo 2 decimales'
    }
  },
  discount: {
    type: Number,
    min: [0, 'El descuento no puede ser negativo'],
    default: 0,
    validate: {
      validator: function(value) {
        return value <= this.amount;
      },
      message: 'El descuento no puede ser mayor al monto'
    }
  },
  total: {
    type: Number,
    default: function() {
      return this.amount - (this.discount || 0);
    }
  },

  // ===== FECHAS =====
  dueDate: {
    type: Date,
    required: [true, 'La fecha de vencimiento es requerida'],
    index: true
  },
  paidDate: {
    type: Date,
    validate: {
      validator: function(date) {
        if (!date) return true;
        return date <= new Date();
      },
      message: 'La fecha de pago no puede ser futura'
    }
  },

  // ===== PERIODO (Para colegiaturas) =====
  period: {
    month: {
      type: Number,
      min: 1,
      max: 12,
      validate: {
        validator: function(value) {
          if (this.type === 'colegiatura') {
            return value !== null && value !== undefined;
          }
          return true;
        },
        message: 'El mes es requerido para pagos de colegiatura'
      }
    },
    year: {
      type: Number,
      min: 2020,
      max: 2100,
      validate: {
        validator: function(value) {
          if (this.type === 'colegiatura') {
            return value !== null && value !== undefined;
          }
          return true;
        },
        message: 'El año es requerido para pagos de colegiatura'
      }
    }
  },

  // ===== ESTADO =====
  status: {
    type: String,
    enum: {
      values: ['pendiente', 'pagado', 'vencido', 'cancelado'],
      message: '{VALUE} no es un estado válido'
    },
    default: 'pendiente',
    index: true
  },

  // ===== MÉTODO DE PAGO =====
  paymentMethod: {
    type: String,
    enum: {
      values: ['efectivo', 'tarjeta', 'transferencia', 'cheque', 'deposito'],
      message: '{VALUE} no es un método de pago válido'
    },
    required: function() {
      return this.status === 'pagado';
    }
  },

  // ===== NÚMERO DE RECIBO =====
  receiptNumber: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true
  },

  // ===== REFERENCIA DE PAGO =====
  paymentReference: {
    type: String,
    trim: true,
    maxlength: [100, 'La referencia no puede exceder 100 caracteres']
  },

  // ===== COMPROBANTE =====
  receiptFile: {
    filename: {
      type: String,
      default: null
    },
    originalName: {
      type: String,
      default: null
    },
    mimetype: {
      type: String,
      default: null
    },
    size: {
      type: Number,
      default: null
    },
    url: {
      type: String,
      default: null
    },
    uploadedAt: {
      type: Date,
      default: null
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },

  // ===== NOTAS Y OBSERVACIONES =====
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Las notas no pueden exceder 500 caracteres']
  },

  // ===== AUDITORÍA =====
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ===== ÍNDICES COMPUESTOS =====
// ✅ CORREGIDO: receiptNumber ya tiene unique: true con sparse, no necesita índice explícito
paymentSchema.index({ alumno: 1, dueDate: -1 });
paymentSchema.index({ sucursal: 1, status: 1 });
paymentSchema.index({ type: 1, status: 1 });
paymentSchema.index({ status: 1, dueDate: 1 });
paymentSchema.index({ 'period.year': 1, 'period.month': 1 });
paymentSchema.index({ createdAt: -1 });

// ===== VIRTUALS =====

// Virtual para saber si el pago está vencido
paymentSchema.virtual('isOverdue').get(function() {
  if (this.status === 'pagado' || this.status === 'cancelado') {
    return false;
  }
  return new Date() > new Date(this.dueDate);
});

// Virtual para días de retraso
paymentSchema.virtual('daysOverdue').get(function() {
  if (!this.isOverdue) return 0;
  
  const today = new Date();
  const due = new Date(this.dueDate);
  const diffTime = Math.abs(today - due);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual para nombre del periodo (para colegiaturas)
paymentSchema.virtual('periodName').get(function() {
  if (!this.period || !this.period.month || !this.period.year) {
    return null;
  }
  
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  return `${months[this.period.month - 1]} ${this.period.year}`;
});

// Virtual para URL completa del comprobante
paymentSchema.virtual('receiptFileUrl').get(function() {
  if (this.receiptFile && this.receiptFile.url) {
    if (this.receiptFile.url.startsWith('http')) {
      return this.receiptFile.url;
    }
    const baseUrl = process.env.BASE_URL || 'http://localhost:3005';
    return `${baseUrl}${this.receiptFile.url}`;
  }
  return null;
});

// ===== MÉTODOS DE INSTANCIA =====

// Método para marcar como pagado
paymentSchema.methods.markAsPaid = async function(paymentData, userId) {
  this.status = 'pagado';
  this.paidDate = paymentData.paidDate || new Date();
  this.paymentMethod = paymentData.paymentMethod;
  this.paymentReference = paymentData.paymentReference || '';
  this.paidBy = userId;
  this.lastModifiedBy = userId;
  
  // Generar número de recibo si no existe
  if (!this.receiptNumber) {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    
    try {
      const count = await this.constructor.countDocuments({
        receiptNumber: new RegExp(`^REC-${year}${month}`)
      });
      
      const sequence = (count + 1).toString().padStart(5, '0');
      this.receiptNumber = `REC-${year}${month}-${sequence}`;
    } catch (error) {
      console.error('Error generando número de recibo:', error);
    }
  }
  
  await this.save();
  return this;
};

// Método para cancelar pago
paymentSchema.methods.cancel = async function(userId, reason) {
  this.status = 'cancelado';
  this.notes = `${this.notes ? this.notes + ' | ' : ''}Cancelado: ${reason}`;
  this.lastModifiedBy = userId;
  
  await this.save();
  return this;
};

// Método getPublicInfo
paymentSchema.methods.getPublicInfo = function() {
  const obj = this.toObject();
  
  return {
    _id: obj._id,
    alumno: obj.alumno,
    tutor: obj.tutor,
    sucursal: obj.sucursal,
    type: obj.type,
    description: obj.description,
    amount: obj.amount,
    discount: obj.discount,
    total: obj.total,
    dueDate: obj.dueDate,
    paidDate: obj.paidDate,
    period: obj.period,
    periodName: obj.periodName,
    status: obj.status,
    paymentMethod: obj.paymentMethod,
    paymentReference: obj.paymentReference,
    receiptNumber: obj.receiptNumber,
    isOverdue: obj.isOverdue,
    daysOverdue: obj.daysOverdue,
    receiptFile: obj.receiptFile,
    receiptFileUrl: obj.receiptFileUrl,
    notes: obj.notes,
    createdBy: obj.createdBy,
    lastModifiedBy: obj.lastModifiedBy,
    paidBy: obj.paidBy,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt
  };
};

// ===== MÉTODOS ESTÁTICOS =====

paymentSchema.statics.findActive = function(filters = {}) {
  return this.find({ 
    isActive: true,
    ...filters 
  })
    .populate('alumno', 'firstName lastName enrollment.studentId')
    .populate('tutor', 'firstName lastName email phones.primary')
    .populate('sucursal', 'name')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });
};

paymentSchema.statics.findPending = function(filters = {}) {
  return this.find({ 
    status: 'pendiente',
    isActive: true,
    ...filters 
  })
    .populate('alumno', 'firstName lastName enrollment.studentId')
    .populate('tutor', 'firstName lastName email phones.primary')
    .populate('sucursal', 'name')
    .sort({ dueDate: 1 });
};

paymentSchema.statics.findOverdue = function(filters = {}) {
  return this.find({ 
    status: 'pendiente',
    dueDate: { $lt: new Date() },
    isActive: true,
    ...filters 
  })
    .populate('alumno', 'firstName lastName enrollment.studentId')
    .populate('tutor', 'firstName lastName email phones.primary')
    .populate('sucursal', 'name')
    .sort({ dueDate: 1 });
};

paymentSchema.statics.findByAlumno = function(alumnoId, filters = {}) {
  return this.find({ 
    alumno: alumnoId,
    isActive: true,
    ...filters 
  })
    .populate('sucursal', 'name')
    .populate('createdBy', 'name')
    .sort({ dueDate: -1 });
};

paymentSchema.statics.findByTutor = function(tutorId, filters = {}) {
  return this.find({ 
    tutor: tutorId,
    isActive: true,
    ...filters 
  })
    .populate('alumno', 'firstName lastName enrollment.studentId')
    .populate('sucursal', 'name')
    .sort({ dueDate: -1 });
};

paymentSchema.statics.getStats = async function(filters = {}) {
  const stats = await this.aggregate([
    { 
      $match: { 
        isActive: true,
        ...filters 
      } 
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        total: { $sum: '$total' }
      }
    }
  ]);

  return {
    total: stats.reduce((acc, item) => acc + item.count, 0),
    totalAmount: stats.reduce((acc, item) => acc + item.total, 0),
    byStatus: stats.reduce((acc, item) => {
      acc[item._id] = {
        count: item.count,
        total: item.total
      };
      return acc;
    }, {})
  };
};

// ===== MIDDLEWARE PRE-SAVE =====

paymentSchema.pre('save', async function(next) {
  if (this.isNew && this.status === 'pagado' && !this.receiptNumber) {
    try {
      const year = new Date().getFullYear();
      const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
      const count = await this.constructor.countDocuments({
        receiptNumber: new RegExp(`^REC-${year}${month}`)
      });
      const sequence = (count + 1).toString().padStart(5, '0');
      this.receiptNumber = `REC-${year}${month}-${sequence}`;
    } catch (error) {
      console.error('Error generando número de recibo:', error);
    }
  }
  
  this.total = this.amount - (this.discount || 0);
  next();
});

paymentSchema.pre('save', function(next) {
  if (this.status === 'pendiente') {
    const hoy = new Date();
    const fechaVencimiento = new Date(this.dueDate);
    hoy.setHours(0, 0, 0, 0);
    fechaVencimiento.setHours(0, 0, 0, 0);
    if (fechaVencimiento < hoy) {
      this.status = 'vencido';
    }
  }
  next();
});

// ===== MIDDLEWARE POST-SAVE =====

paymentSchema.post('save', async function(doc) {
  try {
    console.log(`Pago guardado: ${doc.receiptNumber || doc._id}`);
  } catch (error) {
    console.error('Error en post-save de Payment:', error);
  }
});

// ===== EXPORTAR MODELO =====
const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;