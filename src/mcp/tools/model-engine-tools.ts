import type { MCPTool, MCPToolResult } from "../../types.js";
import { startInteractive, stopInteractive, showStatus } from "../../models/manager.js";

function text(t: string): MCPToolResult {
  return { content: [{ type: "text", text: t }] };
}
function json(d: unknown): MCPToolResult {
  return { content: [{ type: "text", text: JSON.stringify(d, null, 2) }] };
}

export const modelEngineTools: MCPTool[] = [
  {
    name: "models_start",
    description: "Inicia el asistente interactivo para seleccionar work mode y modelos, descargar de MinIO si es necesario, validar VRAM y lanzar llama-server en background",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: async () => {
      try {
        const result = await startInteractive();
        return json(result);
      } catch (err) {
        return text(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  },
  {
    name: "models_stop",
    description: "Detiene todos los servidores llama-server iniciados por aiyoucli models start",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: async () => {
      try {
        const result = stopInteractive();
        return json(result);
      } catch (err) {
        return text(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  },
  {
    name: "models_status",
    description: "Muestra el estado de los modelos actualmente activos",
    inputSchema: { type: "object", properties: {}, required: [] },
    handler: async () => {
      try {
        const status = showStatus();
        return text(status);
      } catch (err) {
        return text(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  },
];
