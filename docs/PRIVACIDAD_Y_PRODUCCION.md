# Privacidad y salida a producción

Los extractos y auxiliares pueden contener nombres, documentos, referencias de pago y otros datos personales. La [Ley 1581 de 2012](https://www.suin-juriscol.gov.co/clp/contenidos.dll/Leyes/1684507) exige, salvo excepción legal, autorización previa e informada, finalidad legítima, acceso restringido, calidad, seguridad y respeto de los derechos del titular.

## Antes de distribuir Kaikei

1. Identificar al responsable del tratamiento: razón social, NIT, dirección, correo y teléfono.
2. Publicar una política y un aviso de privacidad con finalidades específicas para la conciliación.
3. Definir la base legal/autorización para datos de empleados, clientes, proveedores y terceros incluidos en movimientos.
4. Documentar que OpenAI/Codex recibe movimientos normalizados a través de la cuenta del usuario y revisar los términos, controles de organización, residencia y retención aplicables al plan contratado.
5. Aplicar minimización: excluir columnas personales que no sean necesarias para conciliar.
6. Definir conservación y borrado de reportes y archivos; esta versión no crea un repositorio histórico.
7. Habilitar canales para consulta, corrección, actualización, revocatoria o supresión cuando corresponda.
8. Firmar y notarizar el instalador de macOS y firmar el ejecutable de Windows.
9. Para clientes empresariales, registrar/coordinar el identificador `clientInfo.name` con OpenAI cuando resulte exigible para logs de cumplimiento.
10. Realizar pruebas con extractos reales de cada banco antes del despliegue, especialmente PDF.

## Decisiones de seguridad ya implementadas

- Renderer aislado, sin Node.js y en sandbox.
- IPC limitado a operaciones declaradas.
- Rutas de archivo y contenido completo permanecen en el proceso principal.
- App Server por `stdio`; no se abre un WebSocket ni un puerto de red local.
- Thread efímero, sandbox `read-only`, aprobación `never` e instrucción explícita de no usar herramientas.
- JSON Schema y validación Zod antes de renderizar/exportar.
- No se guardan credenciales, tokens ni contraseñas en el proyecto.

## Campos que debe completar el propietario

```text
Responsable del tratamiento: Mauricio Samper
Identificación/NIT: [PENDIENTE ANTES DE PUBLICACIÓN COMERCIAL]
Domicilio: Bogotá, Colombia
Dirección: [PENDIENTE]
Correo de privacidad: mauro@entey.net
Teléfono: [TELÉFONO]
Plazo de conservación: [PLAZO]
Canal de consultas y reclamos: mauro@entey.net
```
