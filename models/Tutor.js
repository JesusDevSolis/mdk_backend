const mongoose = require('mongoose');

const tutorSchema = new mongoose.Schema({
  // Información Personal Básica
  firstName: {
    type: String,
    required: [true, 'El nombre del tutor es requerido'],
    trim: true,
    maxlength: [50, 'El nombre no puede exceder 50 caracteres']
  },
  lastName: {
    type: String,
    required: [true, 'Los apellidos del tutor son requeridos'],
    trim: true,
    maxlength: [50, 'Los apellidos no pueden exceder 50 caracteres']
  },
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(date) {
        if (!date) return true; // Opcional
        const today = new Date();
        const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
        const hundredYearsAgo = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
        return date >= hundredYearsAgo && date <= eighteenYearsAgo;
      },
      message: 'El tutor debe ser mayor de 18 años'
    }
  },
  gender: {
    type: String,
    enum: ['masculino', 'femenino', 'otro']
  },

  // Documentos de Identificación
  identification: {
    type: {
      type: String,
      enum: ['ine', 'pasaporte', 'licencia', 'otro'],
      required: [true, 'El tipo de identificación es requerido']
    },
    number: {
      type: String,
      required: [true, 'El número de identificación es requerido'],
      trim: true,
      unique: true,
      maxlength: [20, 'El número de identificación no puede exceder 20 caracteres']
    }
  },

  // Información de Contacto
  email: {
    type: String,
    required: [true, 'El email del tutor es requerido'],
    trim: true,
    lowercase: true,
    unique: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Email inválido'
    ]
  },
  phones: {
    primary: {
      type: String,
      required: [true, 'El teléfono principal es requerido'],
      trim: true,
      maxlength: [15, 'El teléfono no puede exceder 15 caracteres']
    },
    secondary: {
      type: String,
      trim: true,
      maxlength: [15, 'El teléfono no puede exceder 15 caracteres']
    },
    whatsapp: {
      type: String,
      trim: true,
      maxlength: [15, 'El WhatsApp no puede exceder 15 caracteres']
    }
  },

  // Dirección Completa
  address: {
    street: {
      type: String,
      required: [true, 'La calle es requerida'],
      trim: true,
      maxlength: [100, 'La calle no puede exceder 100 caracteres']
    },
    number: {
      type: String,
      trim: true,
      maxlength: [10, 'El número no puede exceder 10 caracteres']
    },
    neighborhood: {
      type: String,
      required: [true, 'La colonia es requerida'],
      trim: true,
      maxlength: [50, 'La colonia no puede exceder 50 caracteres']
    },
    city: {
      type: String,
      required: [true, 'La ciudad es requerida'],
      trim: true,
      maxlength: [50, 'La ciudad no puede exceder 50 caracteres']
    },
    state: {
      type: String,
      required: [true, 'El estado es requerido'],
      trim: true,
      maxlength: [50, 'El estado no puede exceder 50 caracteres']
    },
    zipCode: {
      type: String,
      required: [true, 'El código postal es requerido'],
      trim: true,
      maxlength: [10, 'El código postal no puede exceder 10 caracteres']
    },
    country: {
      type: String,
      default: 'México',
      trim: true,
      maxlength: [50, 'El país no puede exceder 50 caracteres']
    }
  },

  // Información Laboral/Profesional
  occupation: {
    jobTitle: {
      type: String,
      trim: true,
      maxlength: [100, 'El puesto de trabajo no puede exceder 100 caracteres']
    },
    company: {
      type: String,
      trim: true,
      maxlength: [100, 'La empresa no puede exceder 100 caracteres']
    },
    workPhone: {
      type: String,
      trim: true,
      maxlength: [15, 'El teléfono de trabajo no puede exceder 15 caracteres']
    },
    workAddress: {
      type: String,
      trim: true,
      maxlength: [200, 'La dirección de trabajo no puede exceder 200 caracteres']
    }
  },

  // Estado Civil y Información Familiar
  maritalStatus: {
    type: String,
    enum: ['soltero', 'casado', 'divorciado', 'viudo', 'union_libre'],
    default: 'soltero'
  },
  
  // Contacto de Emergencia del Tutor
  emergencyContact: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'El nombre del contacto no puede exceder 100 caracteres']
    },
    relationship: {
      type: String,
      trim: true,
      maxlength: [50, 'La relación no puede exceder 50 caracteres']
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [15, 'El teléfono no puede exceder 15 caracteres']
    }
  },

  // Foto de Perfil del Tutor
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

  // Configuraciones y Preferencias
  preferences: {
    preferredContactMethod: {
      type: String,
      enum: ['email', 'phone', 'whatsapp', 'sms'],
      default: 'whatsapp'
    },
    receiveNotifications: {
      type: Boolean,
      default: true
    },
    receivePromotions: {
      type: Boolean,
      default: true
    },
    notificationTypes: {
      attendance: {
        type: Boolean,
        default: true
      },
      payments: {
        type: Boolean,
        default: true
      },
      events: {
        type: Boolean,
        default: true
      },
      graduations: {
        type: Boolean,
        default: true
      }
    }
  },

  // Información Financiera/Pagos
  paymentInfo: {
    preferredPaymentMethod: {
      type: String,
      enum: ['efectivo', 'tarjeta', 'transferencia', 'cheque'],
      default: 'efectivo'
    },
    bankInfo: {
      bank: {
        type: String,
        trim: true
      },
      accountNumber: {
        type: String,
        trim: true
      },
      accountType: {
        type: String,
        enum: ['ahorro', 'corriente']
      }
    }
  },

  // Notas y Observaciones
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Las notas no pueden exceder 1000 caracteres']
  },

  // Estado y Auditoría
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
tutorSchema.index({ firstName: 1, lastName: 1 });
tutorSchema.index({ email: 1 }, { unique: true });
tutorSchema.index({ 'identification.number': 1 }, { unique: true });
tutorSchema.index({ 'phones.primary': 1 });
tutorSchema.index({ isActive: 1 });
tutorSchema.index({ createdAt: -1 });

// Virtual para nombre completo
tutorSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

// Virtual para edad
tutorSchema.virtual('age').get(function() {
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

// Virtual para dirección completa
tutorSchema.virtual('fullAddress').get(function() {
  const addr = this.address;
  if (!addr.street) return null;
  
  const parts = [
    addr.street,
    addr.number,
    addr.neighborhood,
    addr.city,
    addr.state,
    addr.zipCode
  ].filter(Boolean);
  
  return parts.join(', ');
});

// Virtual para URL de foto de perfil
tutorSchema.virtual('profilePhotoUrl').get(function() {
  if (this.profilePhoto && this.profilePhoto.url) {
    if (this.profilePhoto.url.startsWith('http')) {
      return this.profilePhoto.url;
    }
    const baseUrl = process.env.BASE_URL || 'http://localhost:3005';
    return `${baseUrl}${this.profilePhoto.url}`;
  }
  return null;
});

// Virtual para obtener el número de hijos registrados
tutorSchema.virtual('childrenCount', {
  ref: 'Alumno',
  localField: '_id',
  foreignField: 'tutor',
  count: true
});

// Método de instancia para obtener datos públicos
tutorSchema.methods.getPublicInfo = function() {
  return {
    _id: this._id,
    fullName: this.fullName,
    firstName: this.firstName,
    lastName: this.lastName,
    age: this.age,
    email: this.email,
    phones: this.phones,
    profilePhotoUrl: this.profilePhotoUrl,
    preferences: this.preferences,
    isActive: this.isActive,
    createdAt: this.createdAt
  };
};

// Método de instancia para obtener datos completos
tutorSchema.methods.getFullInfo = function() {
  const obj = this.toObject();
  delete obj.__v;
  return {
    ...obj,
    fullName: this.fullName,
    age: this.age,
    fullAddress: this.fullAddress,
    profilePhotoUrl: this.profilePhotoUrl
  };
};

// Método estático para buscar tutores activos
tutorSchema.statics.findActive = function(filters = {}) {
  return this.find({ 
    isActive: true,
    ...filters 
  }).populate('createdBy', 'name');
};

// Método para buscar tutores con sus hijos
tutorSchema.statics.findWithChildren = function(tutorId = null) {
  const match = tutorId ? { _id: tutorId, isActive: true } : { isActive: true };
  
  return this.find(match).populate({
    path: 'childrenCount'
  });
};

// Pre-save middleware para validaciones
tutorSchema.pre('save', function(next) {
  // Asegurar que el WhatsApp tenga el teléfono principal por defecto
  if (!this.phones.whatsapp && this.phones.primary) {
    this.phones.whatsapp = this.phones.primary;
  }
  
  next();
});

// Middleware para limpiar referencias al eliminar
tutorSchema.pre('remove', async function(next) {
  try {
    // console.log(`Eliminando tutor: ${this.fullName}`);
    
    // Verificar si tiene hijos activos
    const Alumno = mongoose.model('Alumno');
    const activeChildren = await Alumno.countDocuments({
      tutor: this._id,
      isActive: true,
      'enrollment.status': 'activo'
    });
    
    if (activeChildren > 0) {
      throw new Error('No se puede eliminar un tutor con hijos activos registrados');
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Exportar el modelo
const Tutor = mongoose.model('Tutor', tutorSchema);

module.exports = Tutor;