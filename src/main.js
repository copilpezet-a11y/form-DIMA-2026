import { createClient } from "@supabase/supabase-js";
import "./style.css";

// La URL y la llave se leen de .env al iniciar o construir la aplicación.
const supabase = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_PUBLISHABLE_KEY,
);

const formulario = document.querySelector("#registro");
const boton = formulario.querySelector("button");
const estado = document.querySelector("#estado");
const filas = document.querySelector("#registros tbody");
const conteo = document.querySelector("#conteo");
const totalRegistros = document.querySelector("#total-registros");
const ultimoRegistro = document.querySelector("#ultimo-registro");
const registrosSemana = document.querySelector("#registros-semana");
const parcelaComun = document.querySelector("#parcela-comun");

// Emoticonos por cultivo y actividad para hacer la tabla más amigable.
const EMOJI_CULTIVO = { "Maíz": "🌽", "Frijol": "🫘", "Haba": "🌿", "Avena": "🌾" };
const EMOJI_ACTIVIDAD = {
  "Observación": "👀",
  "Riego": "💧",
  "Fertilización": "🧪",
  "Muestreo": "🔬",
};

// 2026-10-19 → 19/10/2026
const formatoFecha = (fecha) => fecha.split("-").reverse().join("/");

// Los registros de hace 7 días o menos cuentan como "de esta semana".
function esDeEstaSemana(fechaISO) {
  const [a, m, d] = fechaISO.split("-").map(Number);
  const fecha = new Date(a, m - 1, d);
  const hace7 = new Date();
  hace7.setDate(hace7.getDate() - 7);
  fecha.setHours(0, 0, 0, 0);
  hace7.setHours(0, 0, 0, 0);
  return fecha >= hace7;
}

// Parcela/cultivo que más se repite en la lista (o "—" si no hay datos).
function masComun(lista) {
  if (lista.length === 0) return "—";
  const conteos = new Map();
  for (const valor of lista) conteos.set(valor, (conteos.get(valor) ?? 0) + 1);
  let mejor = null, mejorN = 0;
  for (const [valor, n] of conteos) {
    if (n > mejorN) { mejor = valor; mejorN = n; }
  }
  return mejor;
}

function mostrar(registros) {
  filas.replaceChildren();
  if (registros.length === 0) {
    const celda = filas.insertRow().insertCell();
    celda.colSpan = 5;
    celda.textContent = "🌵 Todavía no hay registros.";
    return;
  }
  for (const r of registros) {
    const fila = filas.insertRow();
    const valores = [
      formatoFecha(r.fecha),
      `📍 ${r.parcela}`,
      `${EMOJI_CULTIVO[r.cultivo] ?? "🌱"} ${r.cultivo}`,
      `${EMOJI_ACTIVIDAD[r.actividad] ?? "🛠️"} ${r.actividad}`,
      r.observaciones ?? "",
    ];
    for (const valor of valores) {
      fila.insertCell().textContent = valor;
    }
    // Resaltar el registro más reciente con una etiqueta de "nuevo".
    if (r === registros[0]) {
      fila.classList.add("reciente");
      fila.querySelector("td").insertAdjacentHTML("afterbegin", "<span class='insignia'>NUEVO</span> ");
    }
  }
}

// Actualiza las tarjetas de resumen y el contador de la tabla.
function actualizarResumen(registros) {
  conteo.textContent = `${registros.length} registro${registros.length === 1 ? "" : "s"}`;
  totalRegistros.textContent = registros.length;
  registrosSemana.textContent = registros.filter((r) => esDeEstaSemana(r.fecha)).length;

  if (registros.length > 0) {
    const ultimo = registros[0];
    ultimoRegistro.textContent = `${formatoFecha(ultimo.fecha)} · ${EMOJI_ACTIVIDAD[ultimo.actividad] ?? "🌱"} ${ultimo.actividad}`;
  } else {
    ultimoRegistro.textContent = "—";
  }

  parcelaComun.textContent = masComun(registros.map((r) => r.parcela));
}

// Consultar los registros
async function consultar() {
  estado.textContent = "⏳ Cargando registros…";
  const { data, error } = await supabase
    .from("registros")
    .select("*")
    .order("fecha", { ascending: false });
  if (error) {
    console.error(error);
    estado.textContent = "⚠️ No se pudieron cargar los registros.";
    return;
  }
  mostrar(data);
  actualizarResumen(data);
  estado.textContent = "";
}

// Guardar un registro
async function guardar(evento) {
  evento.preventDefault();
  const { fecha, parcela, cultivo, actividad, observaciones } = Object.fromEntries(new FormData(formulario));

  boton.disabled = true;
  estado.textContent = "⏳ Guardando…";
  const { error } = await supabase
    .from("registros")
    .insert({ fecha, parcela, cultivo, actividad, observaciones });
  boton.disabled = false;

  if (error) {
    console.error(error);
    estado.textContent = "❌ No se pudo guardar el registro.";
    return;
  }
  estado.textContent = "✅ Registro guardado.";
  formulario.observaciones.value = "";
  consultar();
}

// Fecha de hoy, en la zona horaria de la computadora.
formulario.fecha.value = new Date().toLocaleDateString("en-CA");
formulario.addEventListener("submit", guardar);
consultar();