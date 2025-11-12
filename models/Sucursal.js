const mongoose = require('mongoose');

const sucursalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre de la sucursal es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres'],
    unique: true
  },
  address: {
    type: String,
    required: [true, 'La direccion es requerida'],
    trim: true,
    maxlength: [200, 'La direccion no puede exceder 200 caracteres']
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [15, 'El telefono no puede exceder 15 caracteres']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Email invalido'
    ]
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripcion no puede exceder 500 caracteres']
  },
  capacity: {
    type: Number,
    min: [1, 'La capacidad debe ser mayor a 0'],
    max: [1000, 'La capacidad no puede exceder 1000 alumnos']
  },
  logo: {
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
  schedule: {
    monday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '08:00' },
      closeTime: { type: String, default: '20:00' }
    },
    tuesday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '08:00' },
      closeTime: { type: String, default: '20:00' }
    },
    wednesday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '08:00' },
      closeTime: { type: String, default: '20:00' }
    },
    thursday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '08:00' },
      closeTime: { type: String, default: '20:00' }
    },
    friday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '08:00' },
      closeTime: { type: String, default: '20:00' }
    },
    saturday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '08:00' },
      closeTime: { type: String, default: '18:00' }
    },
    sunday: {
      isOpen: { type: Boolean, default: false },
      openTime: { type: String, default: '10:00' },
      closeTime: { type: String, default: '16:00' }
    }
  },
  settings: {
    allowOnlinePayments: {
      type: Boolean,
      default: true
    },
    requireParentApproval: {
      type: Boolean,
      default: true
    },
    maxStudentsPerClass: {
      type: Number,
      default: 20,
      min: 1,
      max: 50
    },
    monthlyFee: {
      type: Number,
      min: 0,
      default: 0
    },
    registrationFee: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: async function(managerId) {
        if (!managerId) return true;
        const user = await mongoose.model('User').findById(managerId);
        return user && ['admin', 'instructor'].includes(user.role);
      },
      message: 'El manager debe ser un administrador o instructor'
    }
  },
  stats: {
    totalStudents: {
      type: Number,
      default: 0
    },
    activeStudents: {
      type: Number,
      default: 0
    },
    totalInstructors: {
      type: Number,
      default: 0
    },
    monthlyRevenue: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indices para mejorar performance
// ✅ CORREGIDO: name ya tiene unique: true, no necesita índice explícito
sucursalSchema.index({ isActive: 1 });
sucursalSchema.index({ createdBy: 1 });
sucursalSchema.index({ manager: 1 });
sucursalSchema.index({ 'settings.monthlyFee': 1 });

// Virtual para obtener la URL completa del logo
sucursalSchema.virtual('logoUrl').get(function() {
  if (this.logo && this.logo.filename) {
    // Usar endpoint de API en lugar de archivos estáticos
    const baseUrl = process.env.BASE_URL || 'http://localhost:3005';
    const apiUrl = `${baseUrl}/api/images/logos/${this.logo.filename}`;
    return apiUrl;
  }
  return null;
});

// Virtual para calcular capacidad utilizada
sucursalSchema.virtual('capacityUsed').get(function() {
  if (this.capacity && this.stats.activeStudents) {
    return Math.round((this.stats.activeStudents / this.capacity) * 100);
  }
  return 0;
});

// Virtual para verificar si esta abierto ahora
sucursalSchema.virtual('isOpenNow').get(function() {
  try {
    // Obtener hora actual en zona horaria de Mexico (GMT-6)
    const now = new Date();
    const mexicoTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Mexico_City"}));
    
    // Obtener dia de la semana en ingles
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[mexicoTime.getDay()];
    
    // Obtener hora actual en formato HH:MM
    const currentHour = mexicoTime.getHours().toString().padStart(2, '0');
    const currentMinute = mexicoTime.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;
    
    const daySchedule = this.schedule[currentDay];
    if (!daySchedule || !daySchedule.isOpen) {
      return false;
    }
    
    const isOpen = currentTime >= daySchedule.openTime && currentTime <= daySchedule.closeTime;
    
    return isOpen;
  } catch (error) {
    console.error('Error calculando isOpenNow:', error);
    return false;
  }
});

// Metodo de instancia para obtener datos publicos
sucursalSchema.methods.getPublicInfo = function() {
  return {
    _id: this._id,
    name: this.name,
    address: this.address,
    phone: this.phone,
    email: this.email,
    description: this.description,
    capacity: this.capacity,
    logoUrl: this.logoUrl,
    schedule: this.schedule,
    isActive: this.isActive,
    isOpenNow: this.isOpenNow,
    capacityUsed: this.capacityUsed,
    stats: this.stats,
    createdAt: this.createdAt
  };
};

// Metodo de instancia para actualizar estadisticas
sucursalSchema.methods.updateStats = async function() {
  try {
    this.stats.lastUpdated = new Date();
    await this.save();
    return this.stats;
  } catch (error) {
    console.error('Error actualizando estadisticas de sucursal:', error);
    throw error;
  }
};

// Metodo estatico para buscar sucursales activas
sucursalSchema.statics.findActive = function(filters = {}) {
  return this.find({ 
    isActive: true,
    ...filters 
  }).populate('manager', 'name email role');
};

// Metodo estatico para buscar por manager
sucursalSchema.statics.findByManager = function(managerId) {
  return this.find({ 
    manager: managerId,
    isActive: true 
  });
};

// Middleware para validar horarios
sucursalSchema.pre('save', function(next) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  for (const day of days) {
    const schedule = this.schedule[day];
    if (schedule.isOpen && schedule.openTime >= schedule.closeTime) {
      return next(new Error(`Horario invalido para ${day}: la hora de apertura debe ser menor que la de cierre`));
    }
  }
  
  next();
});

// Middleware para actualizar slug/url amigable
sucursalSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  next();
});

// Middleware para limpiar referencias al eliminar
sucursalSchema.pre('remove', async function(next) {
  try {
    console.log(`Eliminando sucursal: ${this.name}`);
    next();
  } catch (error) {
    next(error);
  }
});

// Anadir campo slug para URLs amigables
sucursalSchema.add({
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  }
});

// Exportar el modelo
const Sucursal = mongoose.model('Sucursal', sucursalSchema);

module.exports = Sucursal;