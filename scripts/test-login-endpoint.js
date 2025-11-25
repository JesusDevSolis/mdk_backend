/**
 * Script para probar el endpoint de login del backend
 * 
 * Uso: node scripts/test-login-endpoint.js
 */

const axios = require('axios');

const testLogin = async () => {
    console.log('');
    console.log('🧪 PRUEBA DEL ENDPOINT DE LOGIN');
    console.log('='.repeat(60));
    console.log('');

    const backendUrl = 'http://localhost:3005/api/auth/login';
    
    // Prueba 1: Login con admin
    console.log('📧 PRUEBA 1: Login con admin@taekwondo.com');
    try {
        const response1 = await axios.post(backendUrl, {
            email: 'admin@taekwondo.com',
            password: 'admin123' // Cambia esto por la contraseña real del admin
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Login exitoso con admin');
        console.log('  - Status:', response1.status);
        console.log('  - Success:', response1.data.success);
        console.log('  - User:', response1.data.data?.user?.name);
        console.log('  - Role:', response1.data.data?.user?.role);
        console.log('  - Token:', response1.data.data?.token ? '✅ Presente' : '❌ Ausente');
        console.log('');
    } catch (error) {
        console.log('❌ Error con admin:');
        console.log('  - Status:', error.response?.status);
        console.log('  - Message:', error.response?.data?.message);
        console.log('  - Error:', error.message);
        console.log('');
    }

    // Prueba 2: Login con instructor
    console.log('📧 PRUEBA 2: Login con juan.her@gmail.com');
    try {
        const response2 = await axios.post(backendUrl, {
            email: 'juan.her@gmail.com',
            password: 'admin123'
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Login exitoso con instructor');
        console.log('  - Status:', response2.status);
        console.log('  - Success:', response2.data.success);
        console.log('  - User:', response2.data.data?.user?.name);
        console.log('  - Role:', response2.data.data?.user?.role);
        console.log('  - Token:', response2.data.data?.token ? '✅ Presente' : '❌ Ausente');
        console.log('');
    } catch (error) {
        console.log('❌ Error con instructor:');
        console.log('  - Status:', error.response?.status);
        console.log('  - Message:', error.response?.data?.message);
        console.log('  - Error:', error.message);
        console.log('  - Data completa:', JSON.stringify(error.response?.data, null, 2));
        console.log('');
    }

    // Prueba 3: Login con credenciales incorrectas
    console.log('📧 PRUEBA 3: Login con contraseña incorrecta (debe fallar)');
    try {
        const response3 = await axios.post(backendUrl, {
            email: 'juan.her@gmail.com',
            password: 'wrongpassword'
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('⚠️ No debería llegar aquí - login con contraseña incorrecta fue exitoso');
        console.log('');
    } catch (error) {
        console.log('✅ Correctamente rechazado:');
        console.log('  - Status:', error.response?.status);
        console.log('  - Message:', error.response?.data?.message);
        console.log('');
    }

    // Prueba 4: Login sin password
    console.log('📧 PRUEBA 4: Login sin contraseña (debe fallar)');
    try {
        const response4 = await axios.post(backendUrl, {
            email: 'juan.her@gmail.com'
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('⚠️ No debería llegar aquí - login sin contraseña fue exitoso');
        console.log('');
    } catch (error) {
        console.log('✅ Correctamente rechazado:');
        console.log('  - Status:', error.response?.status);
        console.log('  - Message:', error.response?.data?.message);
        console.log('');
    }

    // Prueba 5: Login con diferentes formatos de email
    console.log('📧 PRUEBA 5: Login con email en mayúsculas');
    try {
        const response5 = await axios.post(backendUrl, {
            email: 'JUAN.HER@GMAIL.COM',
            password: 'admin123'
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Login exitoso con email en mayúsculas');
        console.log('  - Status:', response5.status);
        console.log('  - Success:', response5.data.success);
        console.log('  - User:', response5.data.data?.user?.name);
        console.log('');
    } catch (error) {
        console.log('❌ Error con email en mayúsculas:');
        console.log('  - Status:', error.response?.status);
        console.log('  - Message:', error.response?.data?.message);
        console.log('');
    }

    console.log('='.repeat(60));
    console.log('📊 RESUMEN DE PRUEBAS COMPLETADO');
    console.log('');
    console.log('Si todas las pruebas pasaron correctamente, el backend funciona bien.');
    console.log('El problema está en cómo el frontend envía los datos.');
    console.log('');
};

// Ejecutar pruebas
testLogin().catch(error => {
    console.error('');
    console.error('❌ Error general:', error.message);
    console.error('');
});