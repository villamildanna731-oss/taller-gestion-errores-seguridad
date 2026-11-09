/**
 * PROYECTO REFACTORIZADO - TALLER DE SEGURIDAD Y EXCEPCIONES
 * SENA ADSO - Clase 10: Gestión de errores y seguridad
 */

const express = require('express');
const app = express();

app.use(express.json());

// ==========================================
// SISTEMA DE LOGS SEGURO
// ==========================================
const LOG_LEVELS = { INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR', FATAL: 'FATAL' };

function log(level, message, meta = {}) {
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        ...meta
    }));
}

// ==========================================
// EXCEPCIONES PERSONALIZADAS
// ==========================================
class AppError extends Error {
    constructor(message, statusCode, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message) {
        super(message, 400);
        this.name = 'ValidationError';
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Recurso no encontrado') {
        super(message, 404);
        this.name = 'NotFoundError';
    }
}

// ==========================================
// BASE DE DATOS SIMULADA
// ==========================================
const db = {
    users: [
        { id: 1, username: 'admin', role: 'administrator', passwordHash: 'hashed_secret_999' },
        { id: 2, username: 'cristian.instructor', role: 'teacher', passwordHash: 'hashed_sena_123' }
    ]
};

// ==========================================
// UTILIDADES DE SEGURIDAD
// ==========================================
function sanitizeUser(user) {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
}

function validateId(id) {
    const parsed = Number(id);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new ValidationError('El ID debe ser un número entero positivo');
    }
    return parsed;
}

function validateUserInput(body) {
    if (!body || typeof body !== 'object') {
        throw new ValidationError('Cuerpo de la petición inválido');
    }
    const { username, role } = body;

    if (typeof username !== 'string' || username.trim().length < 3 || username.length > 50) {
        throw new ValidationError('El username debe tener entre 3 y 50 caracteres');
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
        throw new ValidationError('El username contiene caracteres no permitidos');
    }
    const allowedRoles = ['user', 'teacher', 'administrator'];
    if (!allowedRoles.includes(role)) {
        throw new ValidationError(`El rol debe ser uno de: ${allowedRoles.join(', ')}`);
    }
    return { username: username.trim(), role };
}

// ==========================================
// RUTA 1: Consulta de usuario (SEGURA)
// ==========================================
app.get('/api/users/:id', (req, res, next) => {
    try {
        const userId = validateId(req.params.id);
        const user = db.users.find(u => u.id === userId);

        if (!user) throw new NotFoundError('Usuario no encontrado');

        log(LOG_LEVELS.INFO, 'Consulta de usuario exitosa', { userId });
        res.json({ success: true, data: sanitizeUser(user) });
    } catch (err) {
        next(err);
    }
});

// ==========================================
// RUTA 2: Registro de datos (SEGURA)
// ==========================================
app.post('/api/register', (req, res, next) => {
    try {
        const { username, role } = validateUserInput(req.body);

        if (db.users.some(u => u.username === username)) {
            throw new ValidationError('El username ya está registrado');
        }

        const newUser = { id: db.users.length + 1, username, role };
        db.users.push(newUser);

        log(LOG_LEVELS.INFO, 'Usuario registrado', { userId: newUser.id, role });
        res.status(201).json({
            message: 'Usuario registrado con éxito',
            assignedId: newUser.id
        });
    } catch (err) {
        next(err);
    }
});

// ==========================================
// 404 RUTAS NO EXISTENTES
// ==========================================
app.use((req, res, next) => {
    next(new NotFoundError('Ruta no encontrada'));
});

// ==========================================
// MANEJADOR GLOBAL DE ERRORES (SEGURO)
// ==========================================
app.use((err, req, res, next) => {
    const logLevel = err.statusCode >= 500 ? LOG_LEVELS.ERROR : LOG_LEVELS.WARN;
    log(logLevel, err.message, {
        name: err.name,
        statusCode: err.statusCode || 500,
        method: req.method,
        path: req.originalUrl,
        ip: req.ip
    });

    if (err.isOperational) {
        return res.status(err.statusCode).json({
            success: false,
            error: err.message
        });
    }

    res.status(500).json({
        success: false,
        error: 'Ocurrió un error interno. Contacte al administrador.'
    });
});

// ==========================================
// ERRORES NO CONTROLADOS
// ==========================================
process.on('unhandledRejection', (reason) => {
    log(LOG_LEVELS.FATAL, 'Unhandled Rejection', { reason: String(reason) });
});
process.on('uncaughtException', (err) => {
    log(LOG_LEVELS.FATAL, 'Uncaught Exception', { message: err.message });
});

const PORT = 3000;
app.listen(PORT, () => {
    log(LOG_LEVELS.INFO, `Servidor seguro corriendo en http://localhost:${PORT}`);
});