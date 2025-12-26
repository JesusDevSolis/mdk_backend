const Configuracion = require('../models/Configuracion');

// ========================================
// OBTENER TODAS LAS CONFIGURACIONES
// ========================================
exports.getAllConfiguraciones = async (req, res) => {
    try {
        const { categoria, soloPublicas } = req.query;

        let filtro = { isActive: true };

        // Filtrar por categoría si se especifica
        if (categoria) {
            filtro.categoria = categoria;
        }

        // Solo públicas si se especifica
        if (soloPublicas === 'true') {
            filtro.esPublica = true;
        }

        const configuraciones = await Configuracion.find(filtro)
            .sort({ categoria: 1, orden: 1 })
            .populate('modificadoPor', 'name email')
            .lean();

        res.json({
            success: true,
            data: configuraciones,
            total: configuraciones.length
        });

    } catch (error) {
        console.error('Error obteniendo configuraciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener configuraciones',
            error: error.message
        });
    }
};

// ========================================
// OBTENER CONFIGURACIONES AGRUPADAS POR CATEGORÍA
// ========================================
exports.getConfiguracionsAgrupadas = async (req, res) => {
    try {
        const { soloPublicas } = req.query;

        const agrupadas = await Configuracion.getTodasAgrupadas(soloPublicas === 'true');

        res.json({
            success: true,
            data: agrupadas,
            categorias: Object.keys(agrupadas)
        });

    } catch (error) {
        console.error('Error obteniendo configuraciones agrupadas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener configuraciones agrupadas',
            error: error.message
        });
    }
};

// ========================================
// OBTENER CONFIGURACIÓN POR ID
// ========================================
exports.getConfiguracionById = async (req, res) => {
    try {
        const { id } = req.params;

        const configuracion = await Configuracion.findById(id)
            .populate('modificadoPor', 'name email');

        if (!configuracion) {
            return res.status(404).json({
                success: false,
                message: 'Configuración no encontrada'
            });
        }

        res.json({
            success: true,
            data: configuracion
        });

    } catch (error) {
        console.error('Error obteniendo configuración:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener configuración',
            error: error.message
        });
    }
};

// ========================================
// OBTENER CONFIGURACIÓN POR CLAVE
// ========================================
exports.getConfiguracionByClave = async (req, res) => {
    try {
        const { clave } = req.params;

        const configuracion = await Configuracion.findOne({ 
            clave, 
            isActive: true 
        }).populate('modificadoPor', 'name email');

        if (!configuracion) {
            return res.status(404).json({
                success: false,
                message: `Configuración '${clave}' no encontrada`
            });
        }

        res.json({
            success: true,
            data: {
                ...configuracion.toObject(),
                valorParseado: configuracion.getValorParseado()
            }
        });

    } catch (error) {
        console.error('Error obteniendo configuración por clave:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener configuración',
            error: error.message
        });
    }
};

// ========================================
// OBTENER CONFIGURACIONES POR CATEGORÍA
// ========================================
exports.getConfiguracionesPorCategoria = async (req, res) => {
    try {
        const { categoria } = req.params;
        const { soloPublicas } = req.query;

        const configuraciones = await Configuracion.getPorCategoria(
            categoria, 
            soloPublicas === 'true'
        );

        res.json({
            success: true,
            data: configuraciones,
            categoria,
            total: configuraciones.length
        });

    } catch (error) {
        console.error('Error obteniendo configuraciones por categoría:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener configuraciones',
            error: error.message
        });
    }
};

// ========================================
// CREAR NUEVA CONFIGURACIÓN
// ========================================
exports.createConfiguracion = async (req, res) => {
    try {
        const configuracionData = {
            ...req.body,
            modificadoPor: req.user._id
        };

        // Validar que no exista una configuración con la misma clave
        const existe = await Configuracion.findOne({ 
            clave: configuracionData.clave 
        });

        if (existe) {
            return res.status(400).json({
                success: false,
                message: `Ya existe una configuración con la clave '${configuracionData.clave}'`
            });
        }

        const nuevaConfiguracion = new Configuracion(configuracionData);
        await nuevaConfiguracion.save();

        await nuevaConfiguracion.populate('modificadoPor', 'name email');

        res.status(201).json({
            success: true,
            message: 'Configuración creada exitosamente',
            data: nuevaConfiguracion
        });

    } catch (error) {
        console.error('Error creando configuración:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear configuración',
            error: error.message
        });
    }
};

// ========================================
// ACTUALIZAR CONFIGURACIÓN
// ========================================
exports.updateConfiguracion = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const configuracion = await Configuracion.findById(id);

        if (!configuracion) {
            return res.status(404).json({
                success: false,
                message: 'Configuración no encontrada'
            });
        }

        // Verificar si es editable
        if (!configuracion.esEditable) {
            return res.status(403).json({
                success: false,
                message: 'Esta configuración no puede ser editada desde la interfaz'
            });
        }

        // Si se está actualizando el valor, usar el método con validación
        if (updateData.valor !== undefined) {
            await configuracion.actualizarValor(updateData.valor, req.user._id);
        }

        // Actualizar otros campos permitidos
        const camposPermitidos = ['descripcion', 'esPublica', 'orden'];
        camposPermitidos.forEach(campo => {
            if (updateData[campo] !== undefined) {
                configuracion[campo] = updateData[campo];
            }
        });

        configuracion.modificadoPor = req.user._id;
        await configuracion.save();

        await configuracion.populate('modificadoPor', 'name email');

        res.json({
            success: true,
            message: 'Configuración actualizada exitosamente',
            data: configuracion
        });

    } catch (error) {
        console.error('Error actualizando configuración:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al actualizar configuración',
            error: error.message
        });
    }
};

// ========================================
// ACTUALIZAR VALOR POR CLAVE
// ========================================
exports.updateValorByClave = async (req, res) => {
    try {
        const { clave } = req.params;
        const { valor } = req.body;

        if (valor === undefined) {
            return res.status(400).json({
                success: false,
                message: 'El valor es requerido'
            });
        }

        const configuracion = await Configuracion.setValor(
            clave, 
            valor, 
            req.user._id
        );

        await configuracion.populate('modificadoPor', 'name email');

        res.json({
            success: true,
            message: 'Valor actualizado exitosamente',
            data: configuracion
        });

    } catch (error) {
        console.error('Error actualizando valor:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al actualizar valor',
            error: error.message
        });
    }
};

// ========================================
// ACTUALIZAR MÚLTIPLES CONFIGURACIONES
// ========================================
exports.updateMultiple = async (req, res) => {
    try {
        const { configuraciones } = req.body;

        if (!Array.isArray(configuraciones) || configuraciones.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere un array de configuraciones'
            });
        }

        const resultados = {
            exitosas: [],
            fallidas: []
        };

        for (const config of configuraciones) {
            try {
                const { clave, valor } = config;

                if (!clave || valor === undefined) {
                    resultados.fallidas.push({
                        clave: clave || 'sin_clave',
                        error: 'Clave y valor son requeridos'
                    });
                    continue;
                }

                const configuracion = await Configuracion.setValor(
                    clave, 
                    valor, 
                    req.user._id
                );

                resultados.exitosas.push({
                    clave,
                    valorAnterior: configuracion.valorDefecto,
                    valorNuevo: valor
                });

            } catch (error) {
                resultados.fallidas.push({
                    clave: config.clave,
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            message: `${resultados.exitosas.length} configuraciones actualizadas, ${resultados.fallidas.length} fallidas`,
            data: resultados
        });

    } catch (error) {
        console.error('Error actualizando múltiples configuraciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar configuraciones',
            error: error.message
        });
    }
};

// ========================================
// ELIMINAR CONFIGURACIÓN (SOFT DELETE)
// ========================================
exports.deleteConfiguracion = async (req, res) => {
    try {
        const { id } = req.params;

        const configuracion = await Configuracion.findById(id);

        if (!configuracion) {
            return res.status(404).json({
                success: false,
                message: 'Configuración no encontrada'
            });
        }

        // Verificar si es editable (las no editables tampoco se pueden eliminar)
        if (!configuracion.esEditable) {
            return res.status(403).json({
                success: false,
                message: 'Esta configuración no puede ser eliminada'
            });
        }

        configuracion.isActive = false;
        configuracion.modificadoPor = req.user._id;
        await configuracion.save();

        res.json({
            success: true,
            message: 'Configuración eliminada exitosamente',
            data: configuracion
        });

    } catch (error) {
        console.error('Error eliminando configuración:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar configuración',
            error: error.message
        });
    }
};

// ========================================
// RESTAURAR CONFIGURACIÓN A VALOR POR DEFECTO
// ========================================
exports.restaurarDefecto = async (req, res) => {
    try {
        const { id } = req.params;

        const configuracion = await Configuracion.findById(id);

        if (!configuracion) {
            return res.status(404).json({
                success: false,
                message: 'Configuración no encontrada'
            });
        }

        if (!configuracion.esEditable) {
            return res.status(403).json({
                success: false,
                message: 'Esta configuración no puede ser modificada'
            });
        }

        configuracion.valor = configuracion.valorDefecto;
        configuracion.modificadoPor = req.user._id;
        await configuracion.save();

        await configuracion.populate('modificadoPor', 'name email');

        res.json({
            success: true,
            message: 'Configuración restaurada a valor por defecto',
            data: configuracion
        });

    } catch (error) {
        console.error('Error restaurando configuración:', error);
        res.status(500).json({
            success: false,
            message: 'Error al restaurar configuración',
            error: error.message
        });
    }
};

// ========================================
// RESTAURAR TODAS LAS CONFIGURACIONES POR CATEGORÍA
// ========================================
exports.restaurarCategoria = async (req, res) => {
    try {
        const { categoria } = req.params;

        const configuraciones = await Configuracion.find({
            categoria,
            isActive: true,
            esEditable: true
        });

        if (configuraciones.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No se encontraron configuraciones editables en la categoría '${categoria}'`
            });
        }

        let restauradas = 0;
        for (const config of configuraciones) {
            config.valor = config.valorDefecto;
            config.modificadoPor = req.user._id;
            await config.save();
            restauradas++;
        }

        res.json({
            success: true,
            message: `${restauradas} configuraciones restauradas a valores por defecto`,
            data: {
                categoria,
                restauradas
            }
        });

    } catch (error) {
        console.error('Error restaurando categoría:', error);
        res.status(500).json({
            success: false,
            message: 'Error al restaurar configuraciones',
            error: error.message
        });
    }
};

// ========================================
// INICIALIZAR CONFIGURACIONES POR DEFECTO
// ========================================
exports.inicializarDefecto = async (req, res) => {
    try {
        await Configuracion.inicializarDefecto();

        const total = await Configuracion.countDocuments({ isActive: true });

        res.json({
            success: true,
            message: 'Configuraciones inicializadas correctamente',
            data: {
                total
            }
        });

    } catch (error) {
        console.error('Error inicializando configuraciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al inicializar configuraciones',
            error: error.message
        });
    }
};

// ========================================
// OBTENER ESTADÍSTICAS
// ========================================
exports.getEstadisticas = async (req, res) => {
    try {
        const total = await Configuracion.countDocuments({ isActive: true });
        const porCategoria = await Configuracion.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: '$categoria',
                    count: { $sum: 1 },
                    publicas: {
                        $sum: { $cond: ['$esPublica', 1, 0] }
                    },
                    editables: {
                        $sum: { $cond: ['$esEditable', 1, 0] }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const ultimaModificacion = await Configuracion.findOne({ isActive: true })
            .sort({ updatedAt: -1 })
            .populate('modificadoPor', 'name')
            .select('clave updatedAt modificadoPor');

        res.json({
            success: true,
            data: {
                total,
                porCategoria,
                ultimaModificacion
            }
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas',
            error: error.message
        });
    }
};

// ========================================
// EXPORTAR CONFIGURACIONES
// ========================================
exports.exportarConfiguraciones = async (req, res) => {
    try {
        const configuraciones = await Configuracion.find({ isActive: true })
            .select('-_id -__v -createdAt -updatedAt -modificadoPor')
            .sort({ categoria: 1, orden: 1 })
            .lean();

        res.json({
            success: true,
            message: 'Configuraciones exportadas exitosamente',
            data: configuraciones,
            total: configuraciones.length,
            exportedAt: new Date()
        });

    } catch (error) {
        console.error('Error exportando configuraciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al exportar configuraciones',
            error: error.message
        });
    }
};