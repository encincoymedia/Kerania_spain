# Kerania — versión para FTP/SFTP

La carpeta **`deploy/`** contiene la versión publicable. Los archivos originales
siguen en sus ubicaciones iniciales; no se han sobrescrito ni eliminado.

**Pendiente antes de dar la web por completamente verificada:** la página
`/nosotros/` presenta un desbordamiento y un fallo de menú en la prueba móvil,
reproducidos también en el original. Además, la petición automática a
`/favicon.ico` devuelve 404 en ambas versiones porque no existe favicon.
Se conservan estos estados por la instrucción de no cambiar el responsive ni
añadir elementos visuales. El informe detalla las incidencias y las pruebas.

## Publicación

1. Conserva una copia del contenido actual del hosting antes de sustituirlo.
2. Sube **el contenido de `deploy/`** al directorio público del dominio
   (por ejemplo, `public_html/`, `www/` o `httpdocs/`). `index.html` debe quedar
   directamente en ese directorio, no dentro de una subcarpeta `deploy`.
3. Conserva exactamente los nombres y la estructura, incluidas las carpetas
   antiguas de compatibilidad. Usa transferencia binaria/automática y UTF-8.
4. El servidor debe servir `index.html` como índice de directorio y publicar
   los tipos habituales HTML, CSS, JavaScript, JPEG, PNG, WebP y SVG. No hay
   compilación, paquetes que instalar ni redirecciones obligatorias.
5. Comprueba en el dominio la portada, `/contacto/`, `/nosotros/`, `/proyectos/`,
   las cuatro páginas de servicios y una galería. La configuración de TLS,
   del dominio y del hosting no forma parte de los archivos de la web.

No subas la raíz completa del proyecto, `reports/`, `tools/`, `backups/`, `.git/`,
los editables de Illustrator ni los archivos originales sueltos.

Los canonical se conservan en **`https://kerania.es/`**. El formulario conserva
su funcionamiento original: valida los campos y prepara un correo `mailto:`
a `info@kerania.es`; el visitante lo envía desde su aplicación de correo.

## Organización y compatibilidad

Las páginas conservan sus rutas. Sus recursos principales están organizados en
`assets/css/`, `assets/js/` y `assets/img/`. Las fotografías y logotipos mantienen
exactamente sus bytes, dimensiones, calidad y formato originales. Las fuentes
siguen usando Google Fonts; no hay fuentes locales ni carpetas vacías añadidas.

Las rutas antiguas de los recursos utilizados se conservan como **copias de
compatibilidad**, generadas desde los mismos originales. Se incluyen para que
las URLs anteriores de imágenes, CSS y JavaScript sigan disponibles sin exigir
Apache, Nginx, reglas `.htaccess` o redirecciones del proveedor. Esta decisión
duplica deliberadamente parte del almacenamiento; esas copias no son archivos
de desarrollo ni fotografías descartadas. No deben editarse por separado.

Las referencias activas nuevas usan nombres ASCII, sin espacios ni acentos.
Las copias heredadas mantienen sus nombres originales, algunos con espacios y
Unicode. La validación local exige coincidencia exacta de nombres. La
normalización de nombres Unicode que aplique un cliente FTP a esas copias
heredadas debe comprobarse después de subirlas; las páginas usan `assets/` y
no dependen de esos nombres antiguos.

## Mantenimiento

El origen editable sigue siendo el proyecto original. Para regenerar una
entrega, conserva primero la carpeta `deploy/` anterior fuera de la raíz pública
y ejecuta desde esta carpeta:

```sh
python3 tools/prepare_deploy.py
python3 tools/verify_deploy.py
```

El preparador se niega a sobrescribir un `deploy/` existente. Guarda un inventario
con hashes SHA-256, el mapa de recursos, exclusiones y las referencias cambiadas
en `reports/`. Revisa esos informes tras cualquier cambio de los originales.

Para repetir la revisión en navegador, usa tres terminales. Playwright ya estaba
instalado en el entorno donde se hizo la auditoría; solo lo necesita esta prueba,
no el sitio ni el hosting:

```sh
python3 tools/serve_preview.py deploy --port 8765 --strict
python3 tools/serve_preview.py . --port 8766
python3 tools/browser_qa.py
```

El último comando usa Google Chrome instalado en macOS. Puedes indicar otro
ejecutable de Chrome/Chromium mediante `KERANIA_QA_CHROME`. Detén ambos servidores
con Ctrl+C cuando termines. Solo escuchan en `127.0.0.1`.

## Informes

- [Informe de auditoría y resultados](reports/INFORME-PRODUCCION.md).
- [Inventario original y hashes](reports/original-inventory.json).
- [Dependencias, páginas, duplicados e integraciones](reports/audit.json).
- [Mapa de recursos original → producción → compatibilidad](reports/asset-map.tsv).
- [Referencias modificadas](reports/rewritten-references.json).
- [Archivos excluidos y motivos](reports/excluded-files.json).
- [Verificación estática](reports/static-verification.json).
- [Pruebas de navegador y comparación visual](reports/browser-verification.json).
- [Manifiesto de entrega y hashes](reports/deploy-manifest.json).

El informe de auditoría describe la preparación local inicial. La revisión del
cliente en GitHub Pages y su publicación automática se describen en
[README.md](README.md). No se han enviado archivos al hosting FTP definitivo
ni correos de prueba.
