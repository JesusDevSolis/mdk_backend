const Alumno = require('../models/Alumno');
const User = require('../models/User');
const Sucursal = require('../models/Sucursal');
const Payment = require('../models/Payments');
const Tutor = require('../models/Tutor');

// @desc    Obtener estadísticas generales del dashboard
// @route   GET /api/dashboard/stats
// @access  Private (Admin, Instructor)
const getDashboardStats = async (req, res) => {
    try {
        // Obtener fecha actual y del mes
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // ===== ESTADÍSTICAS GENERALES =====
        
        // Total de alumnos activos
        const totalAlumnos = await Alumno.countDocuments({
            isActive: true,
            'enrollment.status': 'activo'
        });

        // Total de instructores activos
        const totalInstructores = await User.countDocuments({
            role: 'instructor',
            isActive: true
        });

        // Total de sucursales activas
        const totalSucursales = await Sucursal.countDocuments({
            isActive: true
        });

        // Total de tutores activos
        const totalTutores = await Tutor.countDocuments({
            isActive: true
        });

        // ===== ESTADÍSTICAS FINANCIERAS DEL MES =====
        
        // Ingresos del mes actual (pagos con status 'pagado')
        const ingresosMes = await Payment.aggregate([
            {
                $match: {
                    status: 'pagado',
                    paidDate: {
                        $gte: firstDayOfMonth,
                        $lte: lastDayOfMonth
                    },
                    isActive: true
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$total' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const ingresosDelMes = ingresosMes.length > 0 ? ingresosMes[0].total : 0;
        const pagosProcesadosMes = ingresosMes.length > 0 ? ingresosMes[0].count : 0;

        // Pagos pendientes (total)
        const pagosPendientes = await Payment.aggregate([
            {
                $match: {
                    status: 'pendiente',
                    isActive: true
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$total' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const totalPagosPendientes = pagosPendientes.length > 0 ? pagosPendientes[0].total : 0;
        const cantidadPagosPendientes = pagosPendientes.length > 0 ? pagosPendientes[0].count : 0;

        // Pagos vencidos
        const pagosVencidos = await Payment.countDocuments({
            status: 'vencido',
            isActive: true
        });

        // ===== DISTRIBUCIÓN DE ALUMNOS POR CINTURÓN =====
        const distribucionCinturones = await Alumno.aggregate([
            {
                $match: {
                isActive: true,
                    'enrollment.status': 'activo'
                }
            },
            {
                $group: {
                    _id: '$belt.level',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        // ===== NUEVOS REGISTROS DEL MES =====
        const nuevosAlumnosMes = await Alumno.countDocuments({
            'enrollment.enrollmentDate': {
                $gte: firstDayOfMonth,
                $lte: lastDayOfMonth
            },
            isActive: true
        });

        // ===== RESPUESTA =====
        res.status(200).json({
            success: true,
            data: {
                general: {
                    totalAlumnos,
                    totalInstructores,
                    totalSucursales,
                    totalTutores,
                    nuevosAlumnosMes
                },
                financiero: {
                    ingresosDelMes,
                    pagosProcesadosMes,
                    totalPagosPendientes,
                    cantidadPagosPendientes,
                    pagosVencidos
                },
                distribucionCinturones
            }
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas del dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// @desc    Obtener actividad reciente
// @route   GET /api/dashboard/actividad-reciente
// @access  Private (Admin, Instructor)
const getActividadReciente = async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        // Últimos alumnos registrados
        const ultimosAlumnos = await Alumno.find({
            isActive: true
        })
        .select('firstName lastName enrollment.enrollmentDate enrollment.sucursal profilePhoto')
        .populate('enrollment.sucursal', 'name')
        .sort({ 'enrollment.enrollmentDate': -1 })
        .limit(parseInt(limit))
        .lean();

        // Últimos pagos realizados
        const ultimosPagos = await Payment.find({
            status: 'pagado',
            isActive: true
        })
        .select('alumno total paidDate paymentMethod receiptNumber')
        .populate('alumno', 'firstName lastName')
        .sort({ paidDate: -1 })
        .limit(parseInt(limit))
        .lean();

        // Próximos pagos por vencer (en los próximos 7 días)
        const hoy = new Date();
        const enUnaSemana = new Date();
        enUnaSemana.setDate(hoy.getDate() + 7);

        const proximosPagos = await Payment.find({
            status: 'pendiente',
            dueDate: {
                $gte: hoy,
                $lte: enUnaSemana
            },
            isActive: true
        })
        .select('alumno total dueDate type')
        .populate('alumno', 'firstName lastName')
        .sort({ dueDate: 1 })
        .limit(parseInt(limit))
        .lean();

        res.status(200).json({
            success: true,
            data: {
                ultimosAlumnos,
                ultimosPagos,
                proximosPagos
            }
        });

    } catch (error) {
        console.error('Error obteniendo actividad reciente:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// @desc    Obtener estadísticas por sucursal
// @route   GET /api/dashboard/sucursales-stats
// @access  Private (Admin, Instructor)
const getSucursalesStats = async (req, res) => {
    try {
        // Obtener todas las sucursales activas
        const sucursales = await Sucursal.find({ isActive: true })
                                        .select('name address')
                                        .lean();

        // Para cada sucursal, calcular estadísticas
        const sucursalesConEstadisticas = await Promise.all(
            sucursales.map(async (sucursal) => {
                // Alumnos activos por sucursal
                const alumnosActivos = await Alumno.countDocuments({
                    'enrollment.sucursal': sucursal._id,
                    'enrollment.status': 'activo',
                    isActive: true
                });

                // Ingresos del mes por sucursal
                const now = new Date();
                const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

                const ingresosMes = await Payment.aggregate([
                    {
                        $match: {
                            sucursal: sucursal._id,
                            status: 'pagado',
                            paidDate: {
                                $gte: firstDayOfMonth,
                                $lte: lastDayOfMonth
                            },
                            isActive: true
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: '$total' }
                        }
                    }
                ]);

                const ingresosDelMes = ingresosMes.length > 0 ? ingresosMes[0].total : 0;

                // Instructores asignados
                const instructores = await User.countDocuments({
                    role: 'instructor',
                    sucursal: sucursal._id,
                    isActive: true
                });

                return {
                    _id: sucursal._id,
                    name: sucursal.name,
                    address: sucursal.address,
                    alumnosActivos,
                    instructores,
                    ingresosDelMes
                };
            })
        );

        // Ordenar por alumnos activos (descendente)
        sucursalesConEstadisticas.sort((a, b) => b.alumnosActivos - a.alumnosActivos);

        res.status(200).json({
            success: true,
            data: sucursalesConEstadisticas
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas de sucursales:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// @desc    Obtener estadísticas financieras detalladas
// @route   GET /api/dashboard/financiero
// @access  Private (Admin only)
const getFinancieroStats = async (req, res) => {
    try {
        const { year, month } = req.query;

        // Si no se proporciona año/mes, usar el actual
        const now = new Date();
        const selectedYear = year ? parseInt(year) : now.getFullYear();
        const selectedMonth = month ? parseInt(month) - 1 : now.getMonth(); // 0-indexed

        const firstDay = new Date(selectedYear, selectedMonth, 1);
        const lastDay = new Date(selectedYear, selectedMonth + 1, 0);

        // Ingresos por tipo de pago
        const ingresosPorTipo = await Payment.aggregate([
            {
                $match: {
                status: 'pagado',
                paidDate: {
                    $gte: firstDay,
                    $lte: lastDay
                },
                isActive: true
                }
            },
            {
                $group: {
                _id: '$type',
                total: { $sum: '$total' },
                count: { $sum: 1 }
                }
            },
            {
                $sort: { total: -1 }
            }
        ]);

        // Ingresos por método de pago
        const ingresosPorMetodo = await Payment.aggregate([
            {
                $match: {
                status: 'pagado',
                paidDate: {
                    $gte: firstDay,
                    $lte: lastDay
                },
                isActive: true
                }
            },
            {
                $group: {
                _id: '$paymentMethod',
                total: { $sum: '$total' },
                count: { $sum: 1 }
                }
            },
            {
                $sort: { total: -1 }
            }
        ]);

        // Ingresos por sucursal
        const ingresosPorSucursal = await Payment.aggregate([
            {
                $match: {
                status: 'pagado',
                paidDate: {
                    $gte: firstDay,
                    $lte: lastDay
                },
                isActive: true
                }
            },
            {
                $group: {
                _id: '$sucursal',
                total: { $sum: '$total' },
                count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                from: 'sucursals',
                localField: '_id',
                foreignField: '_id',
                as: 'sucursalInfo'
                }
            },
            {
                $unwind: '$sucursalInfo'
            },
            {
                $project: {
                _id: 1,
                total: 1,
                count: 1,
                name: '$sucursalInfo.name'
                }
            },
            {
                $sort: { total: -1 }
            }
        ]);

        // Total general del mes
        const totalMes = ingresosPorTipo.reduce((acc, item) => acc + item.total, 0);
        const cantidadPagos = ingresosPorTipo.reduce((acc, item) => acc + item.count, 0);

        res.status(200).json({
            success: true,
            data: {
                periodo: {
                    year: selectedYear,
                    month: selectedMonth + 1, // 1-indexed para el frontend
                    firstDay,
                    lastDay
                },
                resumen: {
                    totalMes,
                    cantidadPagos
                },
                ingresosPorTipo,
                ingresosPorMetodo,
                ingresosPorSucursal
            }
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas financieras:', error);
        res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
        });
    }
};

// @desc    Obtener estadísticas de alumnos
// @route   GET /api/dashboard/alumnos-stats
// @access  Private (Admin, Instructor)
const getAlumnosStats = async (req, res) => {
    try {
        // Distribución por género
        const distribucionGenero = await Alumno.aggregate([
            {
                $match: {
                isActive: true,
                'enrollment.status': 'activo'
                }
            },
            {
                $group: {
                _id: '$gender',
                count: { $sum: 1 }
                }
            }
        ]);

        // Distribución por edad (rangos)
        const alumnos = await Alumno.find({
            isActive: true,
            'enrollment.status': 'activo'
        }).select('dateOfBirth').lean();

        const rangoEdades = {
            'menores_6': 0,
            '6_12': 0,
            '13_17': 0,
            '18_30': 0,
            '31_50': 0,
            'mayores_50': 0
        };

        alumnos.forEach(alumno => {
            const edad = calcularEdad(alumno.dateOfBirth);
            
            if (edad < 6) rangoEdades.menores_6++;
            else if (edad <= 12) rangoEdades['6_12']++;
            else if (edad <= 17) rangoEdades['13_17']++;
            else if (edad <= 30) rangoEdades['18_30']++;
            else if (edad <= 50) rangoEdades['31_50']++;
            else rangoEdades.mayores_50++;
        });

        // Distribución por sucursal
        const alumnosPorSucursal = await Alumno.aggregate([
            {
                $match: {
                isActive: true,
                'enrollment.status': 'activo'
                }
            },
            {
                $group: {
                _id: '$enrollment.sucursal',
                count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                from: 'sucursals',
                localField: '_id',
                foreignField: '_id',
                as: 'sucursalInfo'
                }
            },
            {
                $unwind: '$sucursalInfo'
            },
            {
                $project: {
                _id: 1,
                count: 1,
                name: '$sucursalInfo.name'
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        // Distribución por estado de enrollment
        const estadosEnrollment = await Alumno.aggregate([
            {
                $match: {
                isActive: true
                }
            },
            {
                $group: {
                _id: '$enrollment.status',
                count: { $sum: 1 }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                distribucionGenero,
                rangoEdades,
                alumnosPorSucursal,
                estadosEnrollment
            }
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas de alumnos:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// @desc    Obtener resumen para tarjetas del dashboard
// @route   GET /api/dashboard/resumen
// @access  Private (Admin, Instructor)
const getResumen = async (req, res) => {
    try {
        const now = new Date();
        const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1);
        const ultimoDiaMes = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Promesas paralelas para mejorar rendimiento
        const [
            alumnosActivos,
            instructoresActivos,
            sucursalesActivas,
            ingresosMes,
            pagosPendientes,
            pagosVencidos
        ] = await Promise.all([
            // Alumnos activos
            Alumno.countDocuments({
                isActive: true,
                'enrollment.status': 'activo'
            }),
            
            // Instructores activos
            User.countDocuments({
                role: 'instructor',
                isActive: true
            }),
            
            // Sucursales activas
            Sucursal.countDocuments({
                isActive: true
            }),
            
            // Ingresos del mes
            Payment.aggregate([
                {
                $match: {
                    status: 'pagado',
                    paidDate: {
                    $gte: primerDiaMes,
                    $lte: ultimoDiaMes
                    },
                    isActive: true
                }
                },
                {
                $group: {
                    _id: null,
                    total: { $sum: '$total' }
                }
                }
            ]),
            
            // Pagos pendientes
            Payment.countDocuments({
                status: 'pendiente',
                isActive: true
            }),
            
            // Pagos vencidos
            Payment.countDocuments({
                status: 'vencido',
                isActive: true
            })
        ]);

        const totalIngresosMes = ingresosMes.length > 0 ? ingresosMes[0].total : 0;

        res.status(200).json({
            success: true,
            data: {
                alumnosActivos,
                instructoresActivos,
                sucursalesActivas,
                ingresosMes: totalIngresosMes,
                pagosPendientes,
                pagosVencidos
            }
        });

    } catch (error) {
        console.error('Error obteniendo resumen del dashboard:', error);
        res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
        });
    }
};

// @desc    Obtener comparativa de sucursales para tabla
// @route   GET /api/dashboard/sucursales-comparativa
// @access  Private (Admin, Instructor)
const getSucursalesComparativa = async (req, res) => {
    try {
        // Obtener todas las sucursales activas
        const sucursales = await Sucursal.find({ isActive: true })
            .select('name address')
            .lean();

        // Obtener fecha actual y del mes
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Para cada sucursal, calcular estadísticas
        const sucursalesComparativa = await Promise.all(
            sucursales.map(async (sucursal) => {
                // Total de alumnos activos por sucursal
                const totalAlumnos = await Alumno.countDocuments({
                    'enrollment.sucursal': sucursal._id,
                    'enrollment.status': 'activo',
                    isActive: true
                });

                // Total de instructores asignados a la sucursal
                const totalInstructores = await User.countDocuments({
                    role: 'instructor',
                    sucursal: sucursal._id,
                    isActive: true
                });

                // Ingresos del mes actual por sucursal
                const ingresosMes = await Payment.aggregate([
                    {
                        $match: {
                            sucursal: sucursal._id,
                            status: 'pagado',
                            paidDate: {
                                $gte: firstDayOfMonth,
                                $lte: lastDayOfMonth
                            },
                            isActive: true
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: '$total' }
                        }
                    }
                ]);

                const ingresosMesTotal = ingresosMes.length > 0 ? ingresosMes[0].total : 0;

                return {
                    _id: sucursal._id,
                    nombre: sucursal.name,
                    direccion: {
                        ciudad: sucursal.address?.city || 'Sin ciudad',
                        estado: sucursal.address?.state || 'Sin estado',
                        calle: sucursal.address?.street || 'Sin dirección'
                    },
                    totalAlumnos,
                    totalInstructores,
                    ingresosMes: ingresosMesTotal
                };
            })
        );

        // Ordenar por ingresos descendente (mejor sucursal primero)
        sucursalesComparativa.sort((a, b) => b.ingresosMes - a.ingresosMes);

        res.status(200).json({
            success: true,
            data: sucursalesComparativa,
            total: sucursalesComparativa.length
        });

    } catch (error) {
        console.error('Error obteniendo comparativa de sucursales:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
};

// ===== FUNCIONES AUXILIARES =====

// Función para calcular edad
const calcularEdad = (fechaNacimiento) => {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
    }
    
    return edad;
};

module.exports = {
    getDashboardStats,
    getActividadReciente,
    getSucursalesStats,
    getFinancieroStats,
    getAlumnosStats,
    getResumen,
    getSucursalesComparativa
};