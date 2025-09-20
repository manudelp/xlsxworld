# XLSXWorld Deployment Guide

Este documento describe cómo desplegar XLSXWorld en el servidor Ubuntu con la infraestructura de Nginx centralizada existente.

## Pre-requisitos

- Servidor Ubuntu (200.114.149.190) configurado con nginx reverse proxy
- Docker y Docker Compose instalados
- Red Docker `app-network` creada
- Dominio configurado (ej: `api.xlsxworld.com`)

## Pasos de Despliegue

### 1. Preparar el Proyecto en el Servidor

```bash
# Conectar al servidor
ssh user@200.114.149.190

# Navegar al directorio de proyectos
cd /path/to/projects

# Clonar el repositorio
git clone https://github.com/manudelp/xlsxworld.git
cd xlsxworld
```

### 2. Configurar Variables de Entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar las variables de entorno
nano .env
```

Actualizar las siguientes variables en `.env`:

```bash
# Database Configuration
POSTGRES_USER=xlsxworld_user
POSTGRES_PASSWORD=your_very_secure_password_here
POSTGRES_DB=xlsxworld

# Application Configuration  
ENVIRONMENT=production
CORS_ORIGINS=https://api.xlsxworld.com,https://xlsxworld.com
```

### 3. Configurar Nginx en el Servidor Central

```bash
# Ir al directorio del nginx central
cd /path/to/server-nginx

# Copiar el archivo de configuración de xlsxworld
cp /path/to/xlsxworld/xlsxworld.nginx.conf nginx/sites-enabled/xlsxworld.conf

# Editar el archivo para ajustar el dominio si es necesario
nano nginx/sites-enabled/xlsxworld.conf

# Actualizar el dominio en la configuración:
# server_name api.xlsxworld.com;  # Cambiar por tu dominio real
```

### 4. Obtener Certificado SSL

```bash
# Detener nginx temporalmente
cd /path/to/server-nginx
docker-compose down

# Obtener certificado SSL para el nuevo dominio
sudo certbot certonly --standalone \
  -d api.xlsxworld.com \
  --email tu-email@dominio.com \
  --agree-tos --no-eff-email

# Copiar certificados al volumen Docker
sudo mkdir -p /tmp/letsencrypt-copy
sudo cp -r /etc/letsencrypt/* /tmp/letsencrypt-copy/
docker run --rm \
  -v letsencrypt:/etc/letsencrypt \
  -v /tmp/letsencrypt-copy:/source \
  alpine sh -c "cp -r /source/* /etc/letsencrypt/"
sudo rm -rf /tmp/letsencrypt-copy

# Reiniciar nginx
docker-compose up -d
```

### 5. Desplegar XLSXWorld

```bash
# Ir al directorio del proyecto
cd /path/to/xlsxworld

# Verificar que la red app-network existe
docker network ls | grep app-network

# Si no existe, crearla:
# docker network create app-network

# Construir y desplegar los contenedores
docker-compose up -d

# Verificar que los contenedores estén corriendo
docker-compose ps
```

### 6. Verificar el Despliegue

```bash
# Verificar estado de contenedores
docker ps | grep xlsxworld

# Verificar logs
docker-compose logs -f backend
docker-compose logs -f database

# Probar la API
curl -I https://api.xlsxworld.com/health
curl https://api.xlsxworld.com/

# Verificar conectividad a la base de datos
docker exec xlsxworld-backend python -c "
import asyncpg
import asyncio
async def test_db():
    try:
        conn = await asyncpg.connect('postgresql://xlsxworld_user:your_password@xlsxworld-database:5432/xlsxworld')
        await conn.close()
        print('✅ Database connection successful')
    except Exception as e:
        print(f'❌ Database connection failed: {e}')
asyncio.run(test_db())
"
```

### 7. Actualizar Documentación del Servidor

Actualizar el archivo README.md del servidor nginx para incluir XLSXWorld:

```markdown
## Proyectos Configurados

| Proyecto   | Dominio               | Puerto Interno | Contenedor         |
| ---------- | --------------------- | -------------- | ------------------ |
| ChirpID    | api.chirpid.com       | 5001           | chirpid-backend    |
| UTicTacToe | api.utictactoe.online | 5000           | utictactoe-backend |
| XLSXWorld  | api.xlsxworld.com     | 8000           | xlsxworld-backend  |
```

## Estructura del Proyecto Desplegado

```
xlsxworld/
├── docker-compose.yml          # Configuración de contenedores
├── .env                       # Variables de entorno (NO versionar)
├── .env.example              # Ejemplo de variables de entorno
├── .gitignore               # Archivos a ignorar
├── xlsxworld.nginx.conf     # Configuración nginx (copiar a server-nginx)
├── database/
│   ├── Dockerfile           # Imagen PostgreSQL
│   └── init/               # Scripts de inicialización DB (opcional)
├── server/
│   ├── Dockerfile          # Imagen Python/FastAPI
│   ├── requirements.txt    # Dependencias Python
│   ├── main.py            # Aplicación FastAPI
│   └── ...                # Resto del código
└── client/                # Cliente Next.js (separado)
```

## Comandos Útiles

### Gestión de Contenedores

```bash
# Ver estado
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f backend
docker-compose logs -f database

# Reiniciar servicios
docker-compose restart backend
docker-compose restart database

# Detener y eliminar contenedores
docker-compose down

# Reconstruir imágenes
docker-compose build --no-cache
docker-compose up -d
```

### Base de Datos

```bash
# Conectar a PostgreSQL
docker exec -it xlsxworld-database psql -U xlsxworld_user -d xlsxworld

# Backup de la base de datos
docker exec xlsxworld-database pg_dump -U xlsxworld_user xlsxworld > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup
docker exec -i xlsxworld-database psql -U xlsxworld_user xlsxworld < backup_20240920_143000.sql
```

### Monitoreo

```bash
# Verificar uso de recursos
docker stats xlsxworld-backend xlsxworld-database

# Verificar espacio en disco
docker system df

# Limpiar imágenes no utilizadas
docker image prune -f

# Ver logs de errores nginx
docker exec server-nginx tail -f /var/log/nginx/error.log | grep xlsxworld
```

## Troubleshooting

### Problema: Contenedores no se comunican

```bash
# Verificar que ambos estén en la misma red
docker network inspect app-network

# Debería mostrar xlsxworld-backend y xlsxworld-database
```

### Problema: Error de conexión a la base de datos

```bash
# Verificar variables de entorno
docker exec xlsxworld-backend env | grep DATABASE

# Verificar que la base de datos esté corriendo
docker exec xlsxworld-database pg_isready -U xlsxworld_user

# Verificar logs de la base de datos
docker-compose logs database
```

### Problema: Error 502 Bad Gateway

```bash
# Verificar que el backend esté respondiendo
docker exec xlsxworld-backend curl -f http://localhost:8000/health

# Verificar logs del backend
docker-compose logs backend

# Verificar configuración nginx
docker exec server-nginx nginx -t

# Verificar que nginx pueda resolver el nombre del contenedor
docker exec server-nginx nslookup xlsxworld-backend
```

### Problema: Error de certificado SSL

```bash
# Verificar que el certificado existe
sudo ls -la /etc/letsencrypt/live/api.xlsxworld.com/

# Verificar en el volumen Docker
docker run --rm -v letsencrypt:/etc/letsencrypt alpine ls -la /etc/letsencrypt/live/

# Renovar certificado si es necesario
sudo certbot renew --domain api.xlsxworld.com
```

## Mantenimiento

### Actualizaciones

```bash
# Hacer backup antes de actualizar
docker exec xlsxworld-database pg_dump -U xlsxworld_user xlsxworld > backup_before_update.sql

# Actualizar código
git pull origin main

# Reconstruir y redesplegar
docker-compose build --no-cache
docker-compose up -d

# Verificar que todo funcione
curl https://api.xlsxworld.com/health
```

### Logs Rotation

```bash
# Configurar rotación de logs en Docker
# Editar /etc/docker/daemon.json:
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}

# Reiniciar Docker después del cambio
sudo systemctl restart docker
```

### Backup Automático

Crear script de backup automático:

```bash
#!/bin/bash
# /path/to/backup-xlsxworld.sh

BACKUP_DIR="/backups/xlsxworld"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup de la base de datos
docker exec xlsxworld-database pg_dump -U xlsxworld_user xlsxworld > $BACKUP_DIR/xlsxworld_$DATE.sql

# Comprimir backup
gzip $BACKUP_DIR/xlsxworld_$DATE.sql

# Eliminar backups antiguos (mantener últimos 7 días)
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: xlsxworld_$DATE.sql.gz"
```

Agregar a crontab para backup diario:

```bash
# crontab -e
0 2 * * * /path/to/backup-xlsxworld.sh
```

## Consideraciones de Seguridad

- ✅ Certificados SSL configurados automáticamente
- ✅ Headers de seguridad aplicados en nginx
- ✅ Rate limiting configurado
- ✅ CORS configurado específicamente
- ✅ Variables de entorno sensibles no versionadas
- ✅ Contenedores corren como usuario no-root
- ✅ Red Docker aislada
- ⚠️ Cambiar contraseñas por defecto en `.env`
- ⚠️ Revisar permisos de archivos regularmente
- ⚠️ Mantener imágenes Docker actualizadas

## Enlaces Útiles

- **API Documentation**: https://api.xlsxworld.com/docs
- **Health Check**: https://api.xlsxworld.com/health
- **GitHub Repository**: https://github.com/manudelp/xlsxworld
- **Server Nginx Config**: /path/to/server-nginx