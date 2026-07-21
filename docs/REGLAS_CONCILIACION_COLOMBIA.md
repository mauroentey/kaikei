# Reglas de conciliación bancaria aplicadas por Kaikei

Fecha de revisión: 21 de julio de 2026.

## Conclusión normativa

En Colombia no existe una única norma de propósito general que prescriba un algoritmo universal, una tolerancia monetaria o una plantilla obligatoria de conciliación bancaria para todas las empresas privadas. La conciliación opera como procedimiento de control y soporte de la representación fiel de efectivo y bancos. Su periodicidad, responsables, materialidad y aprobaciones deben quedar en las políticas y procedimientos de cada entidad, considerando su grupo de información financiera y régimen de supervisión.

Para entidades privadas, la base general es la [Ley 1314 de 2009](https://www.suin-juriscol.gov.co/viewDocument.asp?ruta=Leyes%2F1677255), que exige información comprensible, transparente, comparable, pertinente y confiable, y el [Decreto Único 2420 de 2015](https://www.suin-juriscol.gov.co/viewDocument.asp?ruta=Decretos%2F30030273), que compila los marcos técnicos aplicables a los grupos de preparadores. Para entidades públicas rige además el Régimen de Contabilidad Pública de la Contaduría General de la Nación; no debe trasladarse automáticamente una instrucción del sector público a una empresa privada.

Los conceptos del CTCP son orientación técnica general y no resuelven por sí solos hechos particulares. El responsable legal y profesional se determina por las funciones, contratos, políticas y normas aplicables. El Concepto CTCP 0443 de 2024, resumido por el [Instituto Nacional de Contadores Públicos](https://incp.org.co/publicaciones/2025/02/ctcp-aclara-responsabilidad-del-contador-en-conciliaciones-bancarias/), destaca que la responsabilidad contractual debe estar explícita.

## Reglas operativas implementadas

### 1. Misma cuenta y misma fecha de corte

El usuario debe identificar la entidad, la cuenta y la fecha de corte. Kaikei compara movimientos de la misma cuenta; combinar cuentas distintas produciría falsos cruces.

### 2. Normalización sin alterar la evidencia

- Cada fila conserva un identificador de fuente y número de fila.
- Los valores se convierten a COP con dos decimales, pero el valor fuente no se “corrige” para forzar coincidencias.
- En el auxiliar de bancos, débito aumenta el activo y crédito lo disminuye.
- En el extracto, crédito/abono aumenta el saldo y débito/cargo lo disminuye.
- Los PDF se advierten como fuente de menor confiabilidad de extracción y requieren revisión visual.

### 3. Cruces explicables

El orden de búsqueda es:

1. Igual valor y signo dentro de la ventana de fechas.
2. Prioridad a la misma referencia o referencias contenidas.
3. Similitud de descripción solo como evidencia auxiliar.
4. Agrupaciones uno contra varios o varios contra uno cuando la suma coincide.
5. Una transacción no se reutiliza en más de un cruce.

La tolerancia y ventana son parámetros operativos, no valores impuestos por la legislación. El valor predeterminado es COP 1 y tres días.

### 4. Clasificación de diferencias

Partidas registradas en libros pero no reflejadas por el banco:

- depósitos o consignaciones en tránsito;
- cheques, pagos o transferencias pendientes;
- posibles errores o duplicados del auxiliar;
- partidas no identificadas.

Partidas reflejadas por el banco pero no registradas en libros:

- comisiones y gastos bancarios;
- intereses;
- GMF u otros impuestos/cargos;
- débitos o créditos automáticos;
- posibles errores bancarios;
- partidas no registradas o sin identificar.

El [Concepto CTCP 0218 de 2023](https://cijuf.org.co/sites/cijuf.org.co/files/normatividad/2023/concepto%200218.pdf) enumera, entre otras causas, consignaciones no registradas, transferencias no informadas, notas crédito bancarias y errores de registro. El [Concepto CTCP 328 de 2016](https://cijuf.org.co/sites/cijuf.org.co/files/normatividad/2016/ConCTCP328_16.pdf) trata las partidas conciliatorias no identificadas. Kaikei no usa estas categorías como licencia para dar de baja saldos sin soporte.

### 5. Gestión, no solo identificación

La conciliación termina cuando las diferencias están explicadas y tienen responsable/acción. La doctrina de la [Contaduría General de la Nación](https://www.contaduria.gov.co/documents/20127/124398/DOCTRINA%2BCONTABLE%2BP%C3%9ABLICA%2B2018.pdf/13d67c51-65b4-9aa2-6317-3957c13672cd?download=true) señala para el sector público que el alcance no debe limitarse a identificar diferencias: debe incluir reclamos, consecución de información y documentos necesarios para soportar y reconocer movimientos.

Por esa razón, cada pendiente de Kaikei exige una acción sugerida y los posibles errores bancarios se gestionan mediante reclamación; no mediante un asiento automático para ocultar la diferencia.

### 6. Ajustes sugeridos y aprobación

- Un cargo o abono bancario solo origina ajuste contable cuando existe soporte suficiente y corresponde a un hecho económico de la entidad.
- Un error del banco no se trata automáticamente como gasto o ingreso.
- Un posible error de libros requiere verificar comprobantes antes de reversar o reclasificar.
- Los nombres de cuenta generados por Codex son genéricos cuando el archivo no contiene un plan de cuentas.
- Todo ajuste queda con estado `suggested` y `requiresApproval=true`.

### 7. Igualdad de saldos ajustados

El control esperado es que el saldo ajustado de libros y el saldo ajustado del banco coincidan. Una igualdad matemática conseguida mediante partidas inventadas o cuentas puente no se considera conciliación válida.

### 8. Periodicidad y segregación

Kaikei recomienda conciliación mensual por cuenta como buena práctica de cierre. No la presenta como obligación universal para toda empresa privada. En el sector público existen procedimientos institucionales que sí ordenan periodicidad mensual; por ejemplo, el [procedimiento de Función Pública de 2026](https://www.funcionpublica.gov.co/documents/61037/652076/2026-05-08_Procedimiento_estados_financieros_v1.pdf/4968dff0-3991-5ff8-ef74-bc1196aa139d?download=true&t=1779209240882&version=3.0) dispone conciliaciones bancarias mensuales para esa entidad.

Cuando la estructura lo permita, deben distinguirse elaboración, revisión y aprobación. La aplicación registra esta necesidad como control, pero no administra todavía flujos de firma.

## Límites

- El reporte es evidencia de trabajo, no certificación ni dictamen.
- Codex puede equivocarse en la clasificación; el motor conserva los IDs para revisar contra la fuente.
- Las normas sectoriales de entidades vigiladas pueden exigir procedimientos adicionales.
- Para cierres auditados, la organización debe definir materialidad, muestreo, conservación de soportes y responsables.
