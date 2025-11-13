const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
    maxlength: [50, 'El nombre no puede exceder 50 caracteres']
  },
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Por favor ingresa un email válido'
    ]
  },
  password: {
    type: String,
    required: [true, 'La contraseña es requerida'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    select: false // No incluir la contraseña en las consultas por defecto
  },
  role: {
    type: String,
    enum: {
      values: ['admin', 'instructor', 'padre'],
      message: 'El rol debe ser: admin, instructor o padre'
    },
    default: 'padre'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [15, 'El teléfono no puede exceder 15 caracteres']
  },
  address: {
    type: String,
    trim: true,
    maxlength: [200, 'La dirección no puede exceder 200 caracteres']
  },
  sucursal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sucursal',
    required: false // Opcional - se puede asignar después
  },
  // Información adicional para padres
  emergencyContact: {
    name: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    relationship: {
      type: String,
      trim: true
    }
  },
  // Configuraciones de notificaciones
  notifications: {
    email: {
      type: Boolean,
      default: true
    },
    telegram: {
      type: Boolean,
      default: false
    },
    telegramChatId: {
      type: String,
      trim: true
    }
  },
  // Metadata
  lastLogin: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  profileImage: {
    type: String, // URL de la imagen
    default: null
  },
  
  // ============================================
  // INFORMACIÓN ESPECÍFICA PARA INSTRUCTORES
  // ============================================
  instructorInfo: {
    // Grado y certificaciones
    belt: {
      type: String,
      enum: ['blanco', 'amarillo', 'verde', 'azul', 'rojo', 'negro_1dan', 'negro_2dan', 'negro_3dan', 'negro_4dan', 'negro_5dan', 'negro_6dan', 'negro_7dan', 'negro_8dan', 'negro_9dan'],
      default: null
    },
    danGrade: {
      type: Number,
      min: 1,
      max: 9,
      default: null
    },
    certificationNumber: {
      type: String,
      trim: true,
      maxlength: [50, 'El número de certificación no puede exceder 50 caracteres']
    },
    certificationDate: {
      type: Date
    },
    certifyingOrganization: {
      type: String,
      trim: true,
      maxlength: [100, 'La organización certificadora no puede exceder 100 caracteres']
    },
    
    // Especialidades y experiencia
    specialties: [{
      type: String,
      enum: ['poomsae', 'combate', 'defensa_personal', 'acrobacia', 'ninos', 'adultos', 'competencia', 'tradicional'],
      trim: true
    }],
    yearsOfExperience: {
      type: Number,
      min: 0,
      default: 0
    },
    teachingExperience: {
      type: String,
      trim: true,
      maxlength: [500, 'La experiencia de enseñanza no puede exceder 500 caracteres']
    },
    
    // Logros y competencias
    achievements: [{
      title: {
        type: String,
        trim: true,
        maxlength: [100, 'El título no puede exceder 100 caracteres']
      },
      description: {
        type: String,
        trim: true,
        maxlength: [300, 'La descripción no puede exceder 300 caracteres']
      },
      date: {
        type: Date
      }
    }],
    
    // Información laboral
    hireDate: {
      type: Date,
      default: Date.now
    },
    contractType: {
      type: String,
      enum: ['tiempo_completo', 'medio_tiempo', 'por_horas', 'freelance'],
      default: 'tiempo_completo'
    },
    salary: {
      type: Number,
      min: 0,
      default: null
    },
    
    // Disponibilidad
    availability: {
      monday: {
        available: { type: Boolean, default: true },
        hours: { type: String, trim: true }
      },
      tuesday: {
        available: { type: Boolean, default: true },
        hours: { type: String, trim: true }
      },
      wednesday: {
        available: { type: Boolean, default: true },
        hours: { type: String, trim: true }
      },
      thursday: {
        available: { type: Boolean, default: true },
        hours: { type: String, trim: true }
      },
      friday: {
        available: { type: Boolean, default: true },
        hours: { type: String, trim: true }
      },
      saturday: {
        available: { type: Boolean, default: true },
        hours: { type: String, trim: true }
      },
      sunday: {
        available: { type: Boolean, default: false },
        hours: { type: String, trim: true }
      }
    },
    
    // Información adicional
    bio: {
      type: String,
      trim: true,
      maxlength: [1000, 'La biografía no puede exceder 1000 caracteres']
    },
    languages: [{
      type: String,
      trim: true
    }],
    
    // Referencias y documentación
    references: [{
      name: {
        type: String,
        trim: true,
        maxlength: [100, 'El nombre no puede exceder 100 caracteres']
      },
      relationship: {
        type: String,
        trim: true,
        maxlength: [100, 'La relación no puede exceder 100 caracteres']
      },
      phone: {
        type: String,
        trim: true,
        maxlength: [15, 'El teléfono no puede exceder 15 caracteres']
      },
      email: {
        type: String,
        trim: true,
        lowercase: true
      }
    }],
    
    // Documentos requeridos
    documents: {
      identificationUrl: { type: String },
      proofOfAddressUrl: { type: String },
      certificationsUrl: { type: String },
      backgroundCheckUrl: { type: String },
      contractUrl: { type: String }
    }
  }
}, {
  timestamps: true, // Agrega createdAt y updatedAt automáticamente
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para mejorar performance
// ✅ CORREGIDO: email ya tiene unique: true, no necesita índice explícito
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ sucursal: 1 });

// Virtual para obtener el nombre completo
userSchema.virtual('fullName').get(function() {
  return this.name;
});

// Virtual para obtener información del cinturón del instructor en formato legible
userSchema.virtual('instructorInfo.beltDisplay').get(function() {
  if (!this.instructorInfo || !this.instructorInfo.belt) return null;
  
  const beltNames = {
    'blanco': 'Cinta Blanca',
    'amarillo': 'Cinta Amarilla',
    'verde': 'Cinta Verde',
    'azul': 'Cinta Azul',
    'rojo': 'Cinta Roja',
    'negro_1dan': 'Cinta Negra 1er Dan',
    'negro_2dan': 'Cinta Negra 2do Dan',
    'negro_3dan': 'Cinta Negra 3er Dan',
    'negro_4dan': 'Cinta Negra 4to Dan',
    'negro_5dan': 'Cinta Negra 5to Dan',
    'negro_6dan': 'Cinta Negra 6to Dan',
    'negro_7dan': 'Cinta Negra 7mo Dan',
    'negro_8dan': 'Cinta Negra 8vo Dan',
    'negro_9dan': 'Cinta Negra 9no Dan'
  };
  
  return beltNames[this.instructorInfo.belt] || this.instructorInfo.belt;
});

// Middleware para hashear la contraseña antes de guardar
userSchema.pre('save', async function(next) {
  // Solo hashear la contraseña si ha sido modificada
  if (!this.isModified('password')) return next();
  
  try {
    // Hashear la contraseña con factor de costo 12
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (error) {
    next(error);
  }
});

// Middleware para actualizar lastLogin
userSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('lastLogin')) {
    this.lastLogin = new Date();
  }
  next();
});

// Método de instancia para comparar contraseñas
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Error al comparar contraseñas');
  }
};

// Método de instancia para obtener datos públicos del usuario
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  
  // Remover campos sensibles
  delete userObject.password;
  delete userObject.__v;
  
  return userObject;
};

// Método estático para buscar usuario por email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Método estático para obtener usuarios activos
userSchema.statics.findActiveUsers = function(filters = {}) {
  return this.find({ 
    isActive: true,
    ...filters 
  }).select('-password');
};

// Método estático para obtener usuarios por rol
userSchema.statics.findByRole = function(role) {
  return this.find({ 
    role: role,
    isActive: true 
  }).select('-password');
};

// Método estático específico para instructores
userSchema.statics.findInstructors = function(filters = {}) {
  return this.find({
    role: 'instructor',
    isActive: true,
    ...filters
  })
    .select('-password')
    .populate('sucursal', 'name address phone')
    .sort({ 'instructorInfo.danGrade': -1, name: 1 });
};

// Método estático para obtener instructores por sucursal
userSchema.statics.findInstructorsBySucursal = function(sucursalId) {
  return this.find({
    role: 'instructor',
    sucursal: sucursalId,
    isActive: true
  })
    .select('-password')
    .sort({ name: 1 });
};

// Método de instancia para verificar si es instructor
userSchema.methods.isInstructor = function() {
  return this.role === 'instructor';
};

// Método de instancia para obtener perfil completo de instructor
userSchema.methods.getInstructorProfile = function() {
  if (this.role !== 'instructor') {
    throw new Error('Este usuario no es un instructor');
  }
  
  const profile = this.toObject();
  delete profile.password;
  delete profile.__v;
  
  return profile;
};

// Validación personalizada para email único
userSchema.pre('save', async function(next) {
  if (this.isModified('email')) {
    const existingUser = await this.constructor.findOne({
      email: this.email,
      _id: { $ne: this._id }
    });
    
    if (existingUser) {
      const error = new Error('Ya existe un usuario con este email');
      error.code = 11000;
      return next(error);
    }
  }
  next();
});

// Middleware para limpiar datos relacionados al eliminar usuario
userSchema.pre('remove', async function(next) {
  try {
    // Aquí se pueden agregar limpiezas adicionales
    // Por ejemplo, eliminar tokens de sesión, etc.
    console.log(`Eliminando usuario: ${this.email}`);
    next();
  } catch (error) {
    next(error);
  }
});

// Exportar el modelo
const User = mongoose.model('User', userSchema);

module.exports = User;