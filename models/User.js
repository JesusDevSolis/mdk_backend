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