const User = require('../models/User');
const Alumno = require('../models/Alumno');
const Sucursal = require('../models/Sucursal');

// ========================================
// OBTENER TODOS LOS INSTRUCTORES
// ========================================
exports.getAllInstructores = async (req, res) => {
try {
    const { 
    page = 1, 
    limit = 10, 
    search = '', 
    sucursal = '',
    isActive = '',
    belt = ''  // ✅ AGREGADO
    } = req.query;

    // Construir filtros
    const filters = { role: 'instructor' };

    // ✅ NUEVO: Si el usuario es instructor, solo ve instructores de su sucursal
    if (req.user.role === 'instructor' && req.user.sucursal) {
        filters.sucursal = req.user.sucursal;
    }

    // Filtro por búsqueda (nombre o email)
    if (search) {
    filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
    ];
    }

    // Filtro por sucursal
    if (sucursal) {
    filters.sucursal = sucursal;
    }

    // Filtro por estado activo
    if (isActive !== '') {
    filters.isActive = isActive === 'true';
    }

    // ✅ NUEVO: Filtro por cinturón
    if (belt) {
    filters['instructorInfo.belt'] = { $regex: belt, $options: 'i' };
    }

    // Calcular paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Obtener instructores con populate de sucursal
    const instructores = await User.find(filters)
    .populate('sucursal', 'name address phone')
    .select('-password')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip)
    .lean();

    // Contar total de documentos
    const total = await User.countDocuments(filters);

    // Calcular estadísticas básicas para cada instructor
    const instructoresConEstadisticas = await Promise.all(
    instructores.map(async (instructor) => {
        // Contar alumnos asignados (si tienes ese campo en Alumno)
        // Por ahora dejamos en 0, se puede implementar después
        const alumnosAsignados = 0;
        
        return {
        ...instructor,
        alumnosAsignados
        };
    })
    );

    res.status(200).json({
    success: true,
    data: instructoresConEstadisticas,
    pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
    }
    });

} catch (error) {
    console.error('Error al obtener instructores:', error);
    res.status(500).json({
    success: false,
    message: 'Error al obtener instructores',
    error: error.message
    });
}
};

// ========================================
// OBTENER INSTRUCTOR POR ID
// ========================================
exports.getInstructorById = async (req, res) => {
try {
    const { id } = req.params;

    const instructor = await User.findOne({ 
    _id: id, 
    role: 'instructor' 
    })
    .populate('sucursal', 'name address phone email')
    .populate('createdBy', 'name email')
    .select('-password')
    .lean();

    if (!instructor) {
    return res.status(404).json({
        success: false,
        message: 'Instructor no encontrado'
    });
    }

    // Obtener estadísticas adicionales
    // Por ahora básicas, se pueden expandir después
    const estadisticas = {
    alumnosAsignados: 0, // Implementar después
    clasesImpartidas: 0,  // Implementar después
    asistenciaPromedio: 0 // Implementar después
    };

    res.status(200).json({
    success: true,
    data: {
        ...instructor,
        estadisticas
    }
    });

} catch (error) {
    console.error('Error al obtener instructor:', error);
    res.status(500).json({
    success: false,
    message: 'Error al obtener instructor',
    error: error.message
    });
}
};

// ========================================
// CREAR NUEVO INSTRUCTOR
// ========================================
exports.createInstructor = async (req, res) => {
try {
    const {
    name,
    email,
    password,
    phone,
    address,
    sucursal,
    emergencyContact,
    instructorInfo  // ✅ AGREGADO: Extraer instructorInfo del body
    } = req.body;

    // Validaciones básicas
    if (!name || !email || !password) {
    return res.status(400).json({
        success: false,
        message: 'Nombre, email y contraseña son requeridos'
    });
    }

    // Verificar que el email no exista
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
    return res.status(400).json({
        success: false,
        message: 'Ya existe un usuario con este email'
    });
    }

    // Verificar que la sucursal exista (si se proporciona)
    if (sucursal) {
    const sucursalExists = await Sucursal.findById(sucursal);
    if (!sucursalExists) {
        return res.status(404).json({
        success: false,
        message: 'La sucursal especificada no existe'
        });
    }
    }

    // Crear el instructor
    const newInstructor = new User({
    name,
    email: email.toLowerCase(),
    password,
    role: 'instructor', // Forzar el rol a instructor
    phone,
    address,
    sucursal,
    emergencyContact,
    instructorInfo,  // ✅ AGREGADO: Incluir instructorInfo en la creación
    isActive: true,
    createdBy: req.user._id // Usuario que lo crea (admin)
    });

    await newInstructor.save();

    // Obtener el instructor sin password
    const instructor = await User.findById(newInstructor._id)
    .populate('sucursal', 'name address')
    .select('-password')
    .lean();

    res.status(201).json({
    success: true,
    message: 'Instructor creado exitosamente',
    data: instructor
    });

} catch (error) {
    console.error('Error al crear instructor:', error);
    res.status(500).json({
    success: false,
    message: 'Error al crear instructor',
    error: error.message
    });
}
};

// ========================================
// ACTUALIZAR INSTRUCTOR
// ========================================
exports.updateInstructor = async (req, res) => {
try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // No permitir cambiar el rol
    delete updateData.role;
    
    // No permitir cambiar la contraseña por este endpoint
    delete updateData.password;

    // Verificar que el instructor exista
    const instructor = await User.findOne({ 
    _id: id, 
    role: 'instructor' 
    });

    if (!instructor) {
    return res.status(404).json({
        success: false,
        message: 'Instructor no encontrado'
    });
    }

    // Si se actualiza el email, verificar que no exista
    if (updateData.email && updateData.email !== instructor.email) {
    const existingUser = await User.findOne({ 
        email: updateData.email.toLowerCase(),
        _id: { $ne: id }
    });
    
    if (existingUser) {
        return res.status(400).json({
        success: false,
        message: 'Ya existe un usuario con este email'
        });
    }
    
    updateData.email = updateData.email.toLowerCase();
    }

    // Si se actualiza la sucursal, verificar que exista
    if (updateData.sucursal) {
    const sucursalExists = await Sucursal.findById(updateData.sucursal);
    if (!sucursalExists) {
        return res.status(404).json({
        success: false,
        message: 'La sucursal especificada no existe'
        });
    }
    }

    // Actualizar el instructor
    const updatedInstructor = await User.findByIdAndUpdate(
    id,
    updateData,
    { 
        new: true, 
        runValidators: true 
    }
    )
    .populate('sucursal', 'name address')
    .select('-password')
    .lean();

    res.status(200).json({
    success: true,
    message: 'Instructor actualizado exitosamente',
    data: updatedInstructor
    });

} catch (error) {
    console.error('Error al actualizar instructor:', error);
    res.status(500).json({
    success: false,
    message: 'Error al actualizar instructor',
    error: error.message
    });
}
};

// ========================================
// ELIMINAR INSTRUCTOR (SOFT DELETE)
// ========================================
exports.deleteInstructor = async (req, res) => {
try {
    const { id } = req.params;

    // Verificar que el instructor exista
    const instructor = await User.findOne({ 
    _id: id, 
    role: 'instructor' 
    });

    if (!instructor) {
    return res.status(404).json({
        success: false,
        message: 'Instructor no encontrado'
    });
    }

    // Verificar si tiene alumnos asignados o clases pendientes
    // (Implementar después cuando tengamos esos módulos)
    // Por ahora solo desactivar

    // Soft delete - cambiar isActive a false
    instructor.isActive = false;
    await instructor.save();

    res.status(200).json({
    success: true,
    message: 'Instructor desactivado exitosamente'
    });

} catch (error) {
    console.error('Error al eliminar instructor:', error);
    res.status(500).json({
    success: false,
    message: 'Error al eliminar instructor',
    error: error.message
    });
}
};

// ========================================
// OBTENER INSTRUCTORES POR SUCURSAL
// ========================================
exports.getInstructoresBySucursal = async (req, res) => {
try {
    const { sucursalId } = req.params;

    // Verificar que la sucursal exista
    const sucursal = await Sucursal.findById(sucursalId);
    if (!sucursal) {
    return res.status(404).json({
        success: false,
        message: 'Sucursal no encontrada'
    });
    }

    // Obtener instructores de esa sucursal
    const instructores = await User.find({
    role: 'instructor',
    sucursal: sucursalId,
    isActive: true
    })
    .select('-password')
    .sort({ name: 1 })
    .lean();

    res.status(200).json({
    success: true,
    data: instructores,
    total: instructores.length
    });

} catch (error) {
    console.error('Error al obtener instructores por sucursal:', error);
    res.status(500).json({
    success: false,
    message: 'Error al obtener instructores',
    error: error.message
    });
}
};

// ========================================
// ACTIVAR/DESACTIVAR INSTRUCTOR
// ========================================
exports.toggleInstructorStatus = async (req, res) => {
try {
    const { id } = req.params;

    const instructor = await User.findOne({ 
    _id: id, 
    role: 'instructor' 
    });

    if (!instructor) {
    return res.status(404).json({
        success: false,
        message: 'Instructor no encontrado'
    });
    }

    // Cambiar el estado
    instructor.isActive = !instructor.isActive;
    await instructor.save();

    const updatedInstructor = await User.findById(id)
    .populate('sucursal', 'name address')
    .select('-password')
    .lean();

    res.status(200).json({
    success: true,
    message: `Instructor ${instructor.isActive ? 'activado' : 'desactivado'} exitosamente`,
    data: updatedInstructor
    });

} catch (error) {
    console.error('Error al cambiar estado del instructor:', error);
    res.status(500).json({
    success: false,
    message: 'Error al cambiar estado del instructor',
    error: error.message
    });
}
};

// ========================================
// OBTENER ESTADÍSTICAS DEL INSTRUCTOR
// ========================================
exports.getInstructorEstadisticas = async (req, res) => {
    try {
        const { id } = req.params;

        const instructor = await User.findOne({ 
            _id: id, 
            role: 'instructor' 
        });

        if (!instructor) {
            return res.status(404).json({
                success: false,
                message: 'Instructor no encontrado'
            });
        }

        // Por ahora estadísticas básicas
        // Se pueden expandir cuando implementemos horarios, clases, etc.
        const estadisticas = {
            alumnosAsignados: 0,
            clasesImpartidas: 0,
            horasImpartidas: 0,
            asistenciaPromedio: 0,
            calificacionPromedio: 0,
            proximasClases: []
        };

        res.status(200).json({
        success: true,
        data: {
            instructor: {
            _id: instructor._id,
            name: instructor.name,
            email: instructor.email
            },
            estadisticas
        }
        });

    } catch (error) {
        console.error('Error al obtener estadísticas del instructor:', error);
        res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
        });
    }
};