# Contrato de datos de Metas 2026

## Regla principal

Ninguna celda de los tres XLS se omite, corrige o reemplaza. El manifiesto conserva los valores fuente y la capa de gestión añade interpretación solo cuando la semántica está demostrada.

## Fuentes

| Sucursal | SHA-256 |
| --- | --- |
| Lo Beltran | `369905D93943DCAB494878C0F9FE3A4CE34359F6B05C4C876D6A0D5E9FC3F205` |
| Nueva Costanera | `62410258860F564DABB4280353EB0D50EFB1E977D5B0ABA2CDDB3D10BA4AFF14` |
| Santa María | `D158B6CC2B16B99A43CCDB5926CF7FD539E803729D4420DB8CF81003974C05E1` |

Los originales permanecen fuera del bundle público. El repositorio contiene agregados privados de gestión y un manifiesto de auditoría reproducible.

## Cobertura verificada

- 3 libros y 3 hojas.
- 4.382 celdas almacenadas.
- 3.280 celdas con valor o fórmula.
- 715 fórmulas.
- 0 errores de fórmula.
- 7 bloques métricos por sucursal.
- 12 meses por bloque y por fila de partner.
- 4 filas con identidad no resuelta.
- 5 celdas con contenido fuera de los bloques detectados.

## Incidencias de origen

- Nueva Costanera, cartera junio: total sucursal 164, suma de partners 163, diferencia 1.
- Nueva Costanera, requerimientos abril: total 277,2028994152047, suma 273,20890846497844, diferencia 3,993990950226248.
- Nueva Costanera, requerimientos mayo: total 329,7475899061379, suma 334,2750107206175, diferencia -4,527420814479626.
- Nueva Costanera, requerimientos junio: total 335,079462184874, suma 322,09515190691667, diferencia 12,98431027795732.
- Lo Beltran, fila 78 de cierres UF: sin nombre, con valores y meta anual preservados.
- Nueva Costanera: filas `NN` en visitas, ofertas y cierres UF.
- Nueva Costanera: celdas `H54`, `N54` y `N122` fuera de bloque.
- Santa María: celdas `G104` y `G105` fuera de bloque.

## Reglas de cumplimiento

| Meta | Actual CRM compatible | Publicación |
| --- | --- | --- |
| Cartera | stock por sucursal | Meta, real y cumplimiento |
| Requerimientos | requerimientos por sucursal | Meta, real y cumplimiento |
| Leads | leads nuevos por sucursal | Meta, real y cumplimiento |
| Visitas | agendadas y realizadas disponibles | Cumplimiento `n/d` hasta definir denominador |
| Ofertas | no disponible | Cumplimiento `n/d` |
| Cierres | ventas por sucursal | Meta, real y cumplimiento |
| Cierres UF | UF vendidas por sucursal | Meta, real y cumplimiento |

Las metas individuales se publican como fuente. Los resultados CRM no se atribuyen a una persona mientras los nombres no tengan una identidad canónica demostrada.

## Verificación

```powershell
pnpm targets:build -- --input "C:\ruta\a\Metas 2026\raw"
pnpm targets:verify -- --input "C:\ruta\a\Metas 2026\raw"
pnpm crm:build -- --input "C:\ruta\a\Datos CRM"
pnpm crm:verify
```
