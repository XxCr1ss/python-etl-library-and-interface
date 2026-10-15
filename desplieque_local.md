# Guía de Despliegue Local del Proyecto ETL

Este documento contiene las instrucciones paso a paso y los comandos de terminal necesarios para desplegar y ejecutar el proyecto **Python ETL Library & Interface** en un entorno local.

---

## Requisitos Previos

Asegúrate de tener instalados los siguientes componentes en tu sistema:

* **Python**: 3.14.0, versión comprobada con los manifiestos fijados de Fase 01A. No se certifica Python 3.9 con estas dependencias.
* **Node.js**: Versión 18.x o superior (incluye `npm`).
* **Git** (Opcional, para gestión de versiones).

---

## Paso 1: Configurar e Iniciar el Backend (FastAPI)

El Backend es una API desarrollada con **FastAPI** que gestiona los procesos de extracción, transformación y carga (ETL), así como las conexiones WebSocket con el agente local.

### 1.1. Crear y Activar el Entorno Virtual de Python

Abre una terminal en la raíz del proyecto y ejecuta:

#### En Windows (PowerShell):
```powershell
# Crear el entorno virtual
python -m venv .venv

# Activar el entorno virtual
.\.venv\Scripts\Activate.ps1
```

#### En Windows (CMD):
```cmd
python -m venv .venv
.\.venv\Scripts\activate.bat
```

#### En Linux / macOS:
```bash
python3 -m venv .venv
source .venv/bin/activate
```

---

### 1.2. Instalar Dependencias de Python

Con el entorno virtual activado, instala todas las librerías requeridas desde la raíz del proyecto:

```bash
pip install -r requirements.txt
```

---

### 1.3. Iniciar el Servidor Backend (FastAPI + Uvicorn)

Para iniciar el servidor de desarrollo del Backend en el puerto **8000**:

#### Desde la raíz del proyecto:
```bash
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

#### O accediendo a la carpeta `backend`:
```bash
cd backend
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

> **Verificación**:
> * **API Backend**: `http://127.0.0.1:8000`
> * **Documentación Interactiva (Swagger UI)**: `http://127.0.0.1:8000/docs`
> * **Health Check**: `http://127.0.0.1:8000/api/v1/health`

---

## 🎨 Paso 2: Configurar e Iniciar el Frontend (Next.js)

El Frontend es una interfaz de usuario construida con **Next.js**, **React** y **Tailwind CSS**.

### 2.1. Abrir una nueva ventana/pestana de Terminal

Navega hasta el directorio `frontend`:

```bash
cd frontend
```

### 2.2. Instalar Dependencias de Node.js

```bash
npm install
```

### 2.3. Iniciar el Servidor de Desarrollo del Frontend

```bash
npm run dev
```

> **Verificación**:
> * **Aplicación Web**: Accede a [`http://localhost:3000`](http://localhost:3000) en tu navegador web.

---

## Paso 3: Iniciar el Agente ETL Local Híbrido (Opcional)

Si utilizas la arquitectura híbrida para conectar bases de datos locales a la plataforma a través de WebSockets:

1. Abre una **tercera terminal** en la raíz del proyecto.
2. Activa el entorno virtual de Python:
   * **Windows**: `.\.venv\Scripts\Activate.ps1`
   * **Linux/macOS**: `source .venv/bin/activate`
3. Ejecuta el agente ETL:

```bash
python etl_agent.py
```

---

## Resumen Rápido de Comandos (Cheat Sheet)

### Terminal 1: Backend (FastAPI)
```bash
# Desde la raíz del proyecto
python -m venv .venv
.\.venv\Scripts\Activate.ps1    # (En Windows PowerShell)
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

### Terminal 2: Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```

### Terminal 3: Agente ETL (Si aplica)
```bash
.\.venv\Scripts\Activate.ps1
python etl_agent.py
```

---

## Verificación de Funcionalidad y Pruebas

Para ejecutar la suite automatizada aislada del backend, desde la raíz y con el entorno virtual activado:

```bash
python -m pip install -r backend/requirements-dev.txt
python -m pytest -c backend/pytest.ini backend/tests -m "not integration" -q
```

Los scripts heredados `backend/test_api_*.py` son manuales y pueden modificar una BD;
no forman parte de esta suite. Los detalles de aislamiento, fixtures y comprobación
de las entradas local/despliegue están en `backend/tests/README.md`.
