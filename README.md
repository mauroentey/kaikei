# Kaikei

[English version](README.en.md)

Aplicación Electron para macOS y Windows que concilia un auxiliar contable contra uno o varios extractos bancarios. Usa la sesión de ChatGPT mediante **Codex App Server**; no solicita una API key.

> Creado y mantenido por **Mauricio Samper** — Bogotá, Colombia<br>
> Contacto: [mauro@entey.net](mailto:mauro@entey.net)

<p align="center">
  <img src="assets/logo-kaikei.png" alt="Logo de Kaikei" width="180">
</p>

## OpenAI Build Week 2026

**Track:** Work & Productivity<br>
**Tagline:** From two financial records to one trusted answer.<br>
**Submission draft:** [Elevator pitch, Devpost story and demo script](docs/BUILDWEEK_SUBMISSION.md)

Kaikei was created during OpenAI Build Week from a plain-language accounting workflow. It is a working Electron product—not a chat mockup—with local financial-file parsing, deterministic reconciliation, GPT-5.6 exception analysis, schema-constrained output, dashboards and exportable reports.

### Cómo usamos Codex para crear Kaikei

Codex fue el colaborador de ingeniería durante todo el proyecto. Partimos de una descripción en lenguaje natural del proceso de conciliación bancaria y trabajamos de forma iterativa: Mauricio definía el problema, las restricciones contables y las decisiones de producto; Codex inspeccionaba el repositorio, proponía el siguiente cambio, implementaba el código y verificaba el resultado con pruebas, typecheck y builds ejecutables.

En concreto, usamos Codex para investigar el contexto colombiano de conciliación, convertir el flujo contable en requisitos, diseñar la arquitectura con Electron y Codex App Server, implementar los parsers y el motor de cruces, construir la interfaz, escribir pruebas automatizadas, diagnosticar fallos de la aplicación empaquetada, generar instaladores y preparar la documentación y los materiales de la demo.

Mauricio Samper tomó las decisiones clave: reutilizar la sesión de ChatGPT del usuario en vez de pedir una API key; mantener el procesamiento de archivos local; usar reglas determinísticas para la aritmética y los cruces; reservar GPT-5.6 para excepciones ambiguas y hallazgos; y exigir evidencia, revisión y aprobación humana para cada ajuste sugerido. Codex aceleró la investigación, la implementación y la validación, sin reemplazar esas decisiones de producto ni el criterio contable.

Codex también forma parte del producto terminado. Kaikei ejecuta GPT-5.6 mediante `codex app-server` en un thread efímero y de solo lectura. El modelo recibe movimientos normalizados y candidatos determinísticos; su reporte final debe cumplir `turn/start.outputSchema`, y Zod vuelve a validarlo antes de que la interfaz o los exportadores puedan consumirlo.

Los jueces pueden usar los dos XLSX sintéticos incluidos: [`auxiliar_contable_sintetico_kaikei.xlsx`](outputs/019f86b6-372d-7103-912c-6632663ce348/auxiliar_contable_sintetico_kaikei.xlsx) y [`extracto_bancario_sintetico_kaikei.xlsx`](outputs/019f86b6-372d-7103-912c-6632663ce348/extracto_bancario_sintetico_kaikei.xlsx). Contienen 30 y 31 movimientos ficticios, respectivamente, con cruces directos, tres agrupaciones, una diferencia de valor, un duplicado, comisión bancaria, GMF, intereses, consignación en tránsito y cheque pendiente. El historial de commits y el thread principal de Codex documentan el trabajo realizado durante el periodo de Build Week.

## Qué incluye

- Inicio de sesión administrado por `codex app-server` y apertura del OAuth de ChatGPT en el navegador.
- Lectura local de XLSX, CSV, OFX, QFX y PDF.
- Detección y corrección manual del mapeo de fecha, descripción, referencia, valor, débito, crédito, tipo y saldo.
- Motor auditable de cruces por valor, signo, ventana de fechas, referencia y agrupaciones 1:N/N:1.
- Revisión de excepciones con Codex y salida validada contra JSON Schema.
- Dashboard de resultados, partidas pendientes, hallazgos, controles y ajustes sugeridos.
- Exportación final a Excel, PDF ejecutivo y JSON.
- Tratamiento diferenciado para empresas privadas, ESAL y entidades públicas.

## Capturas

### Inicio

![Pantalla de inicio de Kaikei](docs/screenshots/inicio.png)

### Carga y preparación de archivos

![Carga del auxiliar contable y los extractos bancarios](docs/screenshots/carga-archivos.png)

### Reporte de conciliación

![Dashboard de conciliación de Kaikei](docs/screenshots/dashboard.png)

## Requisitos

- Node.js 24 o superior para desarrollo.
- ChatGPT/Codex instalado, o un ejecutable `codex` disponible en `PATH`.
- Una cuenta de ChatGPT con acceso a Codex.

Kaikei busca automáticamente el binario de ChatGPT en macOS y rutas comunes de Windows. Si no lo encuentra, la pantalla de acceso permite seleccionarlo manualmente. El binario no se incluye en el instalador de este repositorio.

## Descargas

Los artefactos generados quedan en `release/`:

| Plataforma | Instalador |
| --- | --- |
| Windows x64 | `Kaikei Setup 0.1.0.exe` |
| macOS Apple Silicon | `Kaikei-0.1.0-arm64.dmg` |
| macOS Intel | `Kaikei-0.1.0.dmg` |

Los instaladores de esta versión de desarrollo no están firmados digitalmente ni notarizados. Para distribución pública deben configurarse certificados de Apple Developer ID y Windows Code Signing.

## Desarrollo

```bash
npm install
npm run dev
```

Validación completa:

```bash
npm run verify
```

Empaquetado:

```bash
npm run dist:mac
npm run dist:win
```

El instalador de Windows normalmente se genera en Windows o en CI con el entorno de firma correspondiente. Los artefactos quedan en `release/`.

## Flujo técnico

1. Electron inicia `codex app-server` por `stdio` y realiza el handshake JSONL.
2. `account/read` reutiliza una sesión existente; `account/login/start` inicia el acceso con ChatGPT cuando hace falta.
3. Los archivos se leen y normalizan en el proceso principal. El renderer recibe solo una vista previa y metadatos.
4. El motor local propone cruces determinísticos y detecta duplicados.
5. Se inicia un thread efímero, `read-only`, sin aprobaciones ni uso de herramientas. Codex recibe movimientos normalizados, candidatos y reglas de revisión.
6. `turn/start.outputSchema` obliga a que el mensaje final cumpla el esquema del reporte; Zod lo valida otra vez antes de mostrarlo.
7. Los exportadores trabajan sobre el reporte validado guardado en memoria durante la sesión.

La integración sigue la documentación oficial de [Codex App Server](https://learn.chatgpt.com/docs/app-server), que define autenticación, `account/login/start`, threads, turns, eventos y `outputSchema`.

## Alcance contable

La aplicación ayuda a preparar y documentar la conciliación. No registra asientos, no certifica estados financieros y no reemplaza al contador, revisor o aprobador. Las reglas y fuentes investigadas están en [docs/REGLAS_CONCILIACION_COLOMBIA.md](docs/REGLAS_CONCILIACION_COLOMBIA.md).

## Privacidad y seguridad

- `contextIsolation: true`, `nodeIntegration: false` y renderer en sandbox.
- Selección de archivos mediante diálogos nativos; no se exponen rutas al renderer.
- Sin servidor propio ni almacenamiento de contraseñas.
- Threads de análisis efímeros, sandbox de solo lectura y política de aprobación `never`.
- Consentimiento previo en UI antes de enviar movimientos normalizados a Codex.
- Límite de 25 MB y 15.000 filas por archivo.

Antes de distribuir comercialmente, completa el responsable, canales y política de tratamiento descritos en [docs/PRIVACIDAD_Y_PRODUCCION.md](docs/PRIVACIDAD_Y_PRODUCCION.md), firma los instaladores y valida los términos aplicables a tu organización.

## Prueba visual

En desarrollo puede abrirse una pantalla poblada sin enviar información real:

```text
http://127.0.0.1:5173/?demo=results
```

También están disponibles `?demo=home`, `?demo=files` y `?demo=processing`.

## Licencia

Copyright © 2026 Mauricio Samper, Bogotá, Colombia.

Kaikei es software open source publicado bajo la **GNU Affero General Public License v3.0 únicamente** (`AGPL-3.0-only`). Puedes usarlo, estudiarlo, modificarlo y distribuirlo —también con fines comerciales— siempre que cumplas las condiciones de la licencia. Si distribuyes una versión modificada o permites que usuarios interactúen con ella a través de una red, debes ofrecer el código fuente correspondiente bajo la misma licencia.

Consulta el texto legal completo en [LICENSE](LICENSE). Si necesitas integrar Kaikei en un producto propietario sin las obligaciones de la AGPL, solicita una licencia comercial a [mauro@entey.net](mailto:mauro@entey.net).
