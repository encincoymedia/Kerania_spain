# Kerania España

Sitio estático de Kerania. La versión para revisión del cliente se publica en
<https://encincoymedia.github.io/Kerania_spain/>.

## Publicación

GitHub Actions valida y publica **solo `deploy/`** al actualizar esa carpeta en
`main`. También puede ejecutarse manualmente desde Actions. No hay compilación
ni dependencias del sitio que instalar. Las acciones oficiales están fijadas
a revisiones concretas.

Las páginas usan rutas relativas compatibles con `/Kerania_spain/`. Los
canonical se conservan en el dominio definitivo `https://kerania.es/`.

## Mantenimiento

Los archivos originales siguen en la raíz y en sus secciones. `deploy/` contiene
la entrega preparada y las copias de compatibilidad de recursos. Tras editar
los originales, actualiza la entrega antes de publicar; el workflow no vuelve
a generar ni sustituye los originales.

Para reconstruir una entrega, conserva primero la anterior fuera de `deploy/`
y ejecuta `python3 tools/prepare_deploy.py`. El preparador se niega a sobrescribir
una carpeta existente. Comprueba después:

```sh
python3 tools/check_static_site.py deploy --base-path /Kerania_spain/
```

Para el hosting definitivo por FTP/SFTP se sube el contenido de `deploy/` a la
raíz pública, sin cambios. Véase [README-PRODUCCION.md](README-PRODUCCION.md).

Los backups, editables de Illustrator, evidencias y capturas de auditoría se
conservan únicamente en local y están excluidos de nuevas publicaciones Git.
Los informes citados en las instrucciones de producción están en `reports/`
del proyecto local; no forman parte del sitio ni del repositorio publicado.

## Incidencias conservadas del original

La auditoría detectó desbordamiento y dificultad de uso del menú móvil en
`/nosotros/`, y ausencia de favicon. No se modifican el diseño, el responsive
ni el contenido en el trabajo de organización y publicación. El formulario
prepara un correo mediante `mailto:` y depende del cliente de correo del visitante.
