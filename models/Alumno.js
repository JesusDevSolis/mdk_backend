const mongoose = require('mongoose');

const alumnoSchema = new mongoose.Schema({
  // Información Personal Básica
  firstName: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
    maxlength: [50, 'El nombre no puede exceder 50 caracteres']
  },
  lastName: {
    type: String,
    required: [true, 'Los apellidos son requeridos'],
    trim: true,
    maxlength: [50, 'Los apellidos no pueden exceder 50 caracteres']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'La fecha de nacimiento es requerida'],
    validate: {
      validator: function(date) {
        const today = new Date();
        const hundredYearsAgo = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
        return date >= hundredYearsAgo && date <= today;
      },
      message: 'La fecha de nacimiento debe ser válida'
    }
  },
  gender: {
    type: String,
    enum: ['masculino', 'femenino', 'otro'],
    required: [true, 'El género es requerido']
  },
  
  // Información de Contacto (opcional para menores)
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Email inválido'
    ],
    unique: true,
    sparse: true // Permite nulls pero mantiene unicidad cuando existe
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [15, 'El teléfono no puede exceder 15 caracteres']
  },
  address: {
    street: {
      type: String,
      trim: true,
      maxlength: [100, 'La calle no puede exceder 100 caracteres']
    },
    neighborhood: {
      type: String,
      trim: true,
      maxlength: [50, 'La colonia no puede exceder 50 caracteres']
    },
    city: {
      type: String,
      trim: true,
      maxlength: [50, 'La ciudad no puede exceder 50 caracteres']
    },
    state: {
      type: String,
      trim: true,
      maxlength: [50, 'El estado no puede exceder 50 caracteres']
    },
    zipCode: {
      type: String,
      trim: true,
      maxlength: [10, 'El código postal no puede exceder 10 caracteres']
    }
  },

  // Relación con Tutor/Padre (NUEVA ESTRUCTURA)
  tutor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tutor',
    required: function() {
      return this.isMinor; // Solo requerido si es menor de edad
    },
    validate: {
      validator: async function(tutorId) {
        if (!tutorId && !this.isMinor) return true; // No requerido para mayores
        if (!tutorId && this.isMinor) return false; // Requerido para menores
        
        const Tutor = mongoose.model('Tutor');
        const tutor = await Tutor.findById(tutorId);
        return tutor && tutor.isActive;
      },
      message: 'El tutor debe existir y estar activo'
    }
  },
  
  // Relación con el tutor
  relationshipToTutor: {
    type: String,
    enum: ['hijo', 'hija', 'pupilo', 'padre', 'madre', 'tutor', 'abuelo', 'hermano', 'otro'],
    required: function() {
      return this.tutor ? true : false;
    }
  },

  // Información de Emergencia (adicional al tutor)
  emergencyContact: {
    name: {
      type: String,
      required: [true, 'El nombre del contacto de emergencia es requerido'],
      trim: true,
      maxlength: [100, 'El nombre del contacto no puede exceder 100 caracteres']
    },
    relationship: {
      type: String,
      required: [true, 'La relación del contacto es requerida'],
      trim: true,
      maxlength: [50, 'La relación no puede exceder 50 caracteres']
    },
    phone: {
      type: String,
      required: [true, 'El teléfono del contacto de emergencia es requerido'],
      trim: true,
      maxlength: [15, 'El teléfono no puede exceder 15 caracteres']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Email del contacto inválido'
      ]
    }
  },

  // Información Médica
  medicalInfo: {
    bloodType: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      trim: true
    },
    allergies: {
      type: String,
      trim: true,
      maxlength: [500, 'Las alergias no pueden exceder 500 caracteres']
    },
    medications: {
      type: String,
      trim: true,
      maxlength: [500, 'Los medicamentos no pueden exceder 500 caracteres']
    },
    medicalConditions: {
      type: String,
      trim: true,
      maxlength: [500, 'Las condiciones médicas no pueden exceder 500 caracteres']
    },
    doctorName: {
      type: String,
      trim: true,
      maxlength: [100, 'El nombre del doctor no puede exceder 100 caracteres']
    },
    doctorPhone: {
      type: String,
      trim: true,
      maxlength: [15, 'El teléfono del doctor no puede exceder 15 caracteres']
    },
    insuranceInfo: {
      type: String,
      trim: true,
      maxlength: [200, 'La información del seguro no puede exceder 200 caracteres']
    }
  },

  // Información Académica de Taekwondo
  belt: {
    level: {
      type: String,
      enum: [
        'blanco',
        'blanco-amarillo',
        'amarillo',
        'amarillo-naranja',
        'naranja',
        'naranja-verde',
        'verde',
        'verde-azul',
        'azul',
        'azul-marron',
        'marron',
        'marron-negro',
        'negro-1',
        'negro-2',
        'negro-3',
        'negro-4',
        'negro-5',
        'negro-6',
        'negro-7',
        'negro-8',
        'negro-9'
      ],
      default: 'blanco'
    },
    dateObtained: {
      type: Date,
      default: Date.now
    },
    certifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User' // Instructor que certificó
    }
  },

  // Información de Matrícula
  enrollment: {
    sucursal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sucursal',
      required: [true, 'La sucursal es requerida']
    },
    enrollmentDate: {
      type: Date,
      default: Date.now
    },
    studentId: {
      type: String,
      unique: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['activo', 'inactivo', 'suspendido', 'graduado'],
      default: 'activo'
    },
    monthlyFee: {
      type: Number,
      min: [0, 'La cuota mensual no puede ser negativa'],
      default: 0
    },
    registrationFee: {
      type: Number,
      min: [0, 'La cuota de inscripción no puede ser negativa'],
      default: 0
    }
  },

  // Foto de Perfil
  profilePhoto: {
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
    }
  },

  // Estadísticas y Progreso
  stats: {
    attendanceCount: {
      type: Number,
      default: 0
    },
    totalClasses: {
      type: Number,
      default: 0
    },
    attendancePercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    lastAttendance: {
      type: Date
    },
    graduationTests: {
      passed: {
        type: Number,
        default: 0
      },
      failed: {
        type: Number,
        default: 0
      }
    },
    competitions: {
      participated: {
        type: Number,
        default: 0
      },
      won: {
        type: Number,
        default: 0
      }
    }
  },

  // Configuraciones y Preferencias
  preferences: {
    receiveNotifications: {
      type: Boolean,
      default: true
    },
    receivePromotions: {
      type: Boolean,
      default: true
    },
    preferredContactMethod: {
      type: String,
      enum: ['email', 'phone', 'whatsapp'],
      default: 'email'
    }
  },

  // Notas y Observaciones
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Las notas no pueden exceder 1000 caracteres']
  },

  // Información de Auditoría
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
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para mejorar performance
alumnoSchema.index({ firstName: 1, lastName: 1 });
alumnoSchema.index({ 'enrollment.sucursal': 1 });
alumnoSchema.index({ 'enrollment.status': 1 });
alumnoSchema.index({ 'enrollment.studentId': 1 });
alumnoSchema.index({ email: 1 });
alumnoSchema.index({ phone: 1 });
alumnoSchema.index({ 'belt.level': 1 });
alumnoSchema.index({ tutor: 1 }); // NUEVO ÍNDICE
alumnoSchema.index({ createdAt: -1 });
alumnoSchema.index({ isActive: 1 });

// Virtual para nombre completo
alumnoSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

// Virtual para edad
alumnoSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Virtual para determinar si es menor de edad
alumnoSchema.virtual('isMinor').get(function() {
  return this.age < 18;
});

// Virtual para URL de foto de perfil
alumnoSchema.virtual('profilePhotoUrl').get(function() {
  if (this.profilePhoto && this.profilePhoto.url) {
    if (this.profilePhoto.url.startsWith('http')) {
      return this.profilePhoto.url;
    }
    const baseUrl = process.env.BASE_URL || 'http://localhost:3005';
    return `${baseUrl}${this.profilePhoto.url}`;
  }
  return null;
});

// Virtual para tiempo de membresía
alumnoSchema.virtual('membershipDuration').get(function() {
  if (!this.enrollment.enrollmentDate) return null;
  
  const today = new Date();
  const enrollmentDate = new Date(this.enrollment.enrollmentDate);
  const diffTime = Math.abs(today - enrollmentDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const months = Math.floor(diffDays / 30);
  const days = diffDays % 30;
  
  return {
    totalDays: diffDays,
    months,
    days,
    formatted: `${months} meses, ${days} días`
  };
});

// Método de instancia para obtener datos públicos
alumnoSchema.methods.getPublicInfo = function() {
  return {
    _id: this._id,
    fullName: this.fullName,
    firstName: this.firstName,
    lastName: this.lastName,
    age: this.age,
    isMinor: this.isMinor,

    dateOfBirth: this.dateOfBirth,
    gender: this.gender,
    email: this.email,
    phone: this.phone,

    address: this.address,
    tutor: this.tutor,
    relationshipToTutor: this.relationshipToTutor,
    emergencyContact: this.emergencyContact,
    medicalInfo: this.medicalInfo,
    preferences: this.preferences,
    notes: this.notes,

    profilePhotoUrl: this.profilePhotoUrl,
    belt: this.belt,
    enrollment: this.enrollment,
    stats: this.stats,
    membershipDuration: this.membershipDuration,
    relationshipToTutor: this.relationshipToTutor,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

// Método de instancia para obtener datos completos (solo para admin/instructores)
alumnoSchema.methods.getFullInfo = function() {
  const publicInfo = this.getPublicInfo();
  return {
    ...publicInfo,
    dateOfBirth: this.dateOfBirth,
    gender: this.gender,
    address: this.address,
    emergencyContact: this.emergencyContact,
    medicalInfo: this.medicalInfo,
    preferences: this.preferences,
    notes: this.notes
  };
};

// Método estático para buscar alumnos activos
alumnoSchema.statics.findActive = function(filters = {}) {
  return this.find({ 
    isActive: true,
    'enrollment.status': 'activo',
    ...filters 
  }).populate('enrollment.sucursal', 'name')
    .populate('belt.certifiedBy', 'name')
    .populate('tutor', 'firstName lastName email phones.primary') // POPULATE TUTOR
    .populate('createdBy', 'name');
};

// Método estático para buscar por sucursal
alumnoSchema.statics.findBySucursal = function(sucursalId) {
  return this.find({ 
    'enrollment.sucursal': sucursalId,
    isActive: true 
  }).populate('enrollment.sucursal', 'name')
    .populate('belt.certifiedBy', 'name')
    .populate('tutor', 'firstName lastName email phones.primary');
};

// Método estático para buscar por tutor
alumnoSchema.statics.findByTutor = function(tutorId) {
  return this.find({ 
    tutor: tutorId,
    isActive: true 
  }).populate('enrollment.sucursal', 'name')
    .populate('belt.certifiedBy', 'name');
};

// Método para actualizar estadísticas
alumnoSchema.methods.updateStats = async function() {
  try {
    this.stats.lastUpdated = new Date();
    await this.save();
    return this.stats;
  } catch (error) {
    console.error('Error actualizando estadísticas de alumno:', error);
    throw error;
  }
};

// Pre-save middleware para generar studentId
alumnoSchema.pre('save', async function(next) {
  if (this.isNew && !this.enrollment.studentId) {
    try {
      const sucursal = await mongoose.model('Sucursal').findById(this.enrollment.sucursal);
      const year = new Date().getFullYear();
      const count = await this.constructor.countDocuments({
        'enrollment.sucursal': this.enrollment.sucursal
      }) + 1;
      
      const sucursalCode = sucursal ? sucursal.name.substring(0, 3).toUpperCase() : 'TKD';
      this.enrollment.studentId = `${sucursalCode}-${year}-${count.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generando studentId:', error);
    }
  }
  next();
});

// Pre-save middleware para validar tutor si es menor
alumnoSchema.pre('save', function(next) {
  // Si es menor de edad, debe tener tutor
  if (this.isMinor && !this.tutor) {
    return next(new Error('Los alumnos menores de 18 años deben tener un tutor asignado'));
  }
  
  // Si no es menor, no debería tener relación con tutor requerida
  if (!this.isMinor && this.tutor && this.relationshipToTutor) {
    // Permitir tutores para mayores, pero no requerir la relación
  }
  
  next();
});

// Middleware para limpiar referencias al eliminar
alumnoSchema.pre('remove', async function(next) {
  try {
    console.log(`Eliminando alumno: ${this.fullName}`);
    // Aquí se limpiarían referencias en otras colecciones (asistencias, pagos, etc.)
    next();
  } catch (error) {
    next(error);
  }
});

// Exportar el modelo
const Alumno = mongoose.model('Alumno', alumnoSchema);

module.exports = Alumno;