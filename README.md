# CoopManager

Aplicación de escritorio para administrar socios, aportes, préstamos, gastos, caja y respaldos de una cooperativa.

> **¿Solo desea usar la aplicación?** No necesita instalar Node.js ni ejecutar comandos. Pida o descargue el archivo `CoopManager Setup ... .exe` y siga la sección [Instalar CoopManager](#instalar-coopmanager-en-windows).

---

## Instalar CoopManager en Windows

### 1. Obtenga el instalador

El archivo que debe recibir es similar a:

```text
CoopManager Setup 1.0.0.exe
```

No necesita abrir la carpeta del proyecto ni usar archivos `.zip`, `.json` o `.xlsx` para instalar el programa.

### 2. Ejecute el instalador

1. Haga doble clic en el archivo `CoopManager Setup ... .exe`.
2. Si Windows muestra una advertencia de seguridad, confirme que el archivo proviene de la persona u organización de confianza y seleccione **Más información** → **Ejecutar de todas formas**.
3. Espere a que termine la instalación.
4. Abra **CoopManager** desde el menú Inicio o el acceso directo del escritorio, si está disponible.

La aplicación funciona como un programa normal de Windows. No es necesario mantener abierta una consola.

### 3. Dónde se guardan los datos

Los datos se guardan localmente en el equipo, en:

```text
Documentos\CoopManager
```

Antes de cambiar de computadora, formatear Windows o desinstalar la aplicación, cree un **Respaldo Excel** desde CoopManager.

---

# Generar el instalador `.exe`

Esta sección es para la persona responsable de preparar la aplicación y entregarla a los usuarios.

## Requisitos

Para generar el instalador de Windows necesita:

- Una computadora con **Windows**.
- [Node.js LTS](https://nodejs.org/) instalado.
- Conexión a internet la primera vez, para descargar las dependencias.

## Pasos

1. Abra la carpeta del proyecto `coopmanager-sistema`.
2. Haga clic en la barra de dirección del Explorador de archivos, escriba `cmd` y presione **Enter**. Se abrirá una consola en esa carpeta.
3. Instale `pnpm` si todavía no lo tiene:

   ```sh
   npm install -g pnpm@11.9.0
   ```

4. Instale las dependencias del proyecto:

   ```sh
   pnpm install
   ```

5. Genere el instalador:

   ```sh
   pnpm build:desktop
   ```

6. Espere a que termine el proceso. Al finalizar, el instalador estará dentro de la carpeta:

   ```text
   release
   ```

7. Busque el archivo con extensión `.exe`, normalmente con un nombre similar a:

   ```text
   release\CoopManager Setup 1.0.0.exe
   ```

Ese archivo `.exe` es el que debe copiar, enviar o publicar para los usuarios. **No entregue la carpeta del proyecto ni la carpeta `win-unpacked`**.

## Si aparece un error al generar el `.exe`

Ejecute estos comandos, uno por uno, desde la carpeta del proyecto:

```sh
pnpm install
pnpm rebuild:native
pnpm build:desktop
```

Si el problema continúa, conserve el texto completo del error y compártalo con la persona encargada del desarrollo.

---

## Uso diario

### Espacios de trabajo

Cada espacio mantiene sus datos separados. Puede usar espacios distintos para cooperativas, grupos o períodos.

- Cambie de espacio desde el selector de la barra lateral.
- Antes de registrar, exportar o restaurar información, confirme que está en el espacio correcto.
- Los reportes y respaldos corresponden únicamente al espacio activo.

### Generar un reporte Excel

Use el reporte para revisar, imprimir o enviar información.

1. Abra **Configuración**.
2. Entre en **Datos y respaldos**.
3. Presione **Reporte Excel**.
4. Guarde el archivo `.xlsx` donde prefiera.

El reporte incluye hojas de resumen, socios, aportes, préstamos, gastos, devoluciones y movimientos.

### Crear un respaldo Excel

Use el respaldo para recuperar la información después.

1. Confirme el espacio activo.
2. Abra **Configuración** → **Datos y respaldos**.
3. Presione **Respaldo**.
4. Guarde el archivo `.xlsx` en una ubicación segura, como una memoria USB o una carpeta en la nube.

El respaldo conserva la configuración, socios, préstamos, aportes, gastos, devoluciones, transacciones, actividades, caja y fotos de perfil disponibles del espacio actual.

**Recomendaciones:**

- Cree un respaldo antes de restaurar datos, actualizar la aplicación, cambiar de equipo o hacer un cierre de período.
- Mantenga más de una copia y use nombres con fecha, por ejemplo: `Respaldo_Cooperativa_2026-07-15.xlsx`.
- No modifique hojas ni columnas de un archivo de respaldo. Aunque es un Excel, su estructura permite restaurar todos los datos.
- Un **reporte** es para leer información; un **respaldo** es para recuperarla. No son intercambiables.

### Restaurar un respaldo Excel

> **Atención:** restaurar reemplaza todos los datos del espacio seleccionado.

1. Cambie al espacio donde desea recuperar los datos.
2. Genere primero un respaldo de ese espacio si podría necesitar su contenido actual.
3. Abra **Configuración** → **Datos y respaldos**.
4. Presione **Restaurar** y seleccione el archivo de respaldo `.xlsx`.
5. Lea la advertencia, escriba `CONFIRMAR` y presione **Restaurar datos**.
6. La aplicación se recargará al terminar.

---

## Soporte

Cuando solicite ayuda, indique:

- La versión de CoopManager instalada.
- El sistema operativo que usa.
- Una captura del mensaje de error, si aparece.
- Si el problema ocurre en un espacio específico.

No envíe datos personales de socios ni el archivo de respaldo completo por canales públicos.
