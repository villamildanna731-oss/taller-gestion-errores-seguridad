# Informe de Mejoras - Gestión de Errores y Seguridad

## 1. Vulnerabilidades identificadas y mitigadas

| # | Vulnerabilidad (OWASP) | Antes (Vulnerable) | Después (Mitigado) |
|---|------------------------|--------------------|--------------------|
| 1 | A03:2021 - Injection | `req.params.id` sin validar, comparación laxa `==` | `validateId()` valida entero positivo; comparación estricta `===` |
| 2 | A02:2021 - Cryptographic Failures | Se devolvía `passwordHash` al cliente | `sanitizeUser()` elimina campos sensibles |
| 3 | A05:2021 - Security Misconfiguration | Stack traces, rutas internas (`C:\PyAlgoritmia...`) y host de BD expuestos | Manejador global responde mensaje genérico; detalles solo en logs |
| 4 | A04:2021 - Insecure Design | `/api/register` aceptaba cualquier body | `validateUserInput()` valida tipos, longitud, regex y roles |
| 5 | A09:2021 - Security Logging Failures | Sin registro estructurado | Logs con niveles INFO/WARN/ERROR/FATAL en JSON |

## 2. Antes y Después

### Antes
- `GET /api/users/crash` → excepción no capturada → stack completo al cliente.
- `GET /api/users/999` → exponía `tbl_internal_users_2026`, ruta del archivo y host de BD.
- `GET /api/users/1` → incluía `passwordHash`.
- `POST /api/register {}` → registraba usuario con `undefined`.

### Después
- `GET /api/users/crash` → `400 { error: "El ID debe ser un número entero positivo" }`
- `GET /api/users/999` → `404 { error: "Usuario no encontrado" }`
- `GET /api/users/1` → `{ success: true, data: { id, username, role } }` (sin hash)
- `POST /api/register {}` → `400 { error: "El username debe tener entre 3 y 50 caracteres" }`

## 3. Buenas prácticas aplicadas
- Jerarquía de excepciones (`AppError`, `ValidationError`, `NotFoundError`).
- Separación errores operacionales vs. no operacionales.
- Logs estructurados JSON con timestamp, nivel y contexto.
- Nunca exponer `err.stack` al cliente.
- Validación de entrada con tipos, longitud, regex y listas blancas.
- Saneamiento de salida (eliminación de campos sensibles).