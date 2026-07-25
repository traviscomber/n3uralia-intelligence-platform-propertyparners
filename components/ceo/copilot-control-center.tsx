'use client'

export function CopilotControlCenter() {
  return (
    <section>
      <h2>Configuración del Copiloto N3uralia</h2>

      <div>
        <label>Frecuencia</label>
        <select>
          <option>Solo cuando sea necesario</option>
          <option>Diario</option>
          <option>Semanal</option>
        </select>
      </div>

      <div>
        <label>Horario preferido</label>
        <input type="time" />
      </div>

      <div>
        <label>Nivel de detalle</label>
        <select>
          <option>Ejecutivo</option>
          <option>Analítico</option>
          <option>Profundo</option>
        </select>
      </div>

      <div>
        <label>Temas prioritarios</label>
        <p>Mercado, crecimiento, estrategia, ventas, riesgos.</p>
      </div>

      <div>
        <label>Memoria del copiloto</label>
        <p>Gestionar qué recuerda y qué debe olvidar.</p>
      </div>
    </section>
  )
}
