export interface TopologyZoneTemplate {
  id: string;
  title: string;
  /**
   * Zone rectangle in graph coordinate space (same space as node x/y).
   * x/y are top-left coordinates.
   */
  x: number;
  y: number;
  width: number;
  height: number;
  /**
   * Optional visual overrides.
   */
  strokeColor?: string; // border color
  fillColor?: string; // background color
}

export interface TopologyDiagramTemplate {
  /**
   * Optional background image (served from /public), e.g. "/topology-templates/arch.png"
   */
  backgroundImage?: string;
  /**
   * Optional zones (dashed boxes with titles) to match architecture diagram style.
   */
  zones?: TopologyZoneTemplate[];
}

/**
 * Per-business-view diagram templates (optional style enhancement).
 *
 * Notes:
 * - Reference screenshots (e.g. architecture diagram with zones) are **style hints only**,
 *   not content requirements. Topology data comes from OpManager getBVDetails.
 * - Zones (dashed group boxes) and background image are optional; use when you want
 *   that "clean, partitioned, professional" diagram look. Coordinates = graph space (node x/y).
 */
const TEMPLATES: Record<string, TopologyDiagramTemplate> = {
  // Example (empty). Add your own business view name here:
  // 'TEST1': {
  //   backgroundImage: '/topology-templates/test1.png',
  //   zones: [
  //     { id: 'core', title: '核心内网', x: -1200, y: -900, width: 900, height: 700 },
  //   ],
  // },
};

export function getTopologyDiagramTemplate(viewName: string): TopologyDiagramTemplate | null {
  const key = (viewName || '').trim();
  if (!key) return null;
  return TEMPLATES[key] ?? null;
}

