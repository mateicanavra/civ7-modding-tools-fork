import * as path from 'node:path';
import { Graph, GraphEdge, GraphNode, NodeKey } from './types';

export function graphToJson(g: Graph) {
  return {
    nodes: Array.from(g.nodes.values()).map((n: GraphNode) => ({ table: n.key.table, id: n.key.id, file: n.file, row: n.row })),
    edges: g.edges.map((e: GraphEdge) => ({ from: `${e.from.table}:${e.from.id}`, to: `${e.to.table}:${e.to.id}`, label: e.label })),
  };
}

export function graphToDot(g: Graph): string {
  const lines: string[] = ['digraph G {'];
  lines.push('  graph [rankdir=LR, compound=true, overlap=false, splines=true, concentrate=true, nodesep=0.5, ranksep=0.6];');
  lines.push('  node  [fontname="Helvetica", fontsize=10, shape=box, style=filled, fillcolor="#ffffff", color="#555555", penwidth=1.2];');
  lines.push('  edge  [fontname="Helvetica", fontsize=9, color="#555555"];');

  lines.push('  subgraph cluster_legend {');
  lines.push('    label="Legend"; fontsize=10; color="#BBBBBB";');
  const legendNodes: Array<{ name: string; table: string }> = [
    { name: 'Legend_Traits', table: 'Traits' },
    { name: 'Legend_Modifiers', table: 'Modifiers' },
    { name: 'Legend_ReqSets', table: 'RequirementSets' },
    { name: 'Legend_Requirements', table: 'Requirements' },
    { name: 'Legend_ModArgs', table: 'ModifierArguments' },
    { name: 'Legend_ReqArgs', table: 'RequirementArguments' },
  ];
  for (const ln of legendNodes) {
    const attrs = nodeStyleAttrs(ln.table);
    const label = ln.table;
    lines.push(`    "${ln.name}" [label="${label}"${attrs ? ', ' + attrs : ''}];`);
  }
  lines.push('    "Legend_Primary_A" [label="Primary", shape=plaintext, color="#555555"];');
  lines.push('    "Legend_Primary_B" [label="", shape=point, width=0.05, color="#555555"];');
  lines.push(`    "Legend_Primary_A" -> "Legend_Primary_B" [${edgeStyleAttrs('TraitModifiers')}];`);
  lines.push('    "Legend_Attach_A" [label="Attach", shape=plaintext, color="#ef6c00"];');
  lines.push('    "Legend_Attach_B" [label="", shape=point, width=0.05, color="#ef6c00"];');
  lines.push(`    "Legend_Attach_A" -> "Legend_Attach_B" [${edgeStyleAttrs('Attach')}];`);
  lines.push('    "Legend_ReqSet_A" [label="ReqSet link", shape=plaintext, color="#1976d2"];');
  lines.push('    "Legend_ReqSet_B" [label="", shape=point, width=0.05, color="#1976d2"];');
  lines.push(`    "Legend_ReqSet_A" -> "Legend_ReqSet_B" [${edgeStyleAttrs('SubjectRequirementSetId')}];`);
  lines.push('  }');

  const layerToIds = new Map<number, string[]>();
  for (const n of g.nodes.values()) {
    if (n.key.table === 'RequirementSets') continue;
    const id = sanitize(`${n.key.table}_${n.key.id}`);
    const label = formatNodeLabel(n.key.table, n.key.id);
    const styleAttrs = nodeStyleAttrs(n.key.table);
    const isAbs = typeof n.file === 'string' && path.isAbsolute(n.file);
    const relOrAbs = isAbs ? path.relative(process.cwd(), n.file) : (n.file ?? '');
    const semanticTip = buildSemanticTooltip(n, g);
    const tooltipLines = [`${n.key.table}:${n.key.id}`, relOrAbs];
    if (semanticTip) tooltipLines.push(semanticTip);
    const nodeTooltip = escapeDotString(tooltipLines.filter(Boolean).join('\n'));
    const urlAttr = isAbs ? `, URL="${escapeDotString(buildFileUrl(n.file))}"` : '';
    const targetAttr = `, target="_blank"`;
    lines.push(`  "${id}" [label="${label}"${styleAttrs ? ', ' + styleAttrs : ''}, tooltip="${nodeTooltip}"${urlAttr}${targetAttr}];`);

    const layer = getLayerForTable(n.key.table);
    if (layer !== null) {
      const list = layerToIds.get(layer) || [];
      list.push(id);
      layerToIds.set(layer, list);
    }
  }

  const fromKeyToEdges = new Map<string, GraphEdge[]>();
  for (const e of g.edges) {
    const k = nkToStr(e.from);
    const arr = fromKeyToEdges.get(k) || [];
    arr.push(e); fromKeyToEdges.set(k, arr);
  }
  const clusterMembers = new Set<string>();
  const clusters: Array<{ rsKey: NodeKey; membersByLayer: Map<number, string[]> }> = [];
  for (const n of g.nodes.values()) {
    if (n.key.table !== 'RequirementSets') continue;
    const membersByLayer = new Map<number, string[]>();
    const add = (table: string, id: string) => {
      const nodeId = sanitize(`${table}_${id}`);
      const layer = getLayerForTable(table);
      if (layer === null) return;
      const list = membersByLayer.get(layer) || [];
      list.push(nodeId); membersByLayer.set(layer, list);
      clusterMembers.add(nodeId);
    };
    const anchorId = sanitize(`RSANCHOR_${n.key.id}`);
    const anchorLayer = 4; // RequirementSets layer
    const listA = membersByLayer.get(anchorLayer) || [];
    listA.push(anchorId); membersByLayer.set(anchorLayer, listA);
    clusterMembers.add(anchorId);
    const edgesFromRS = fromKeyToEdges.get(nkToStr(n.key)) || [];
    const reqIds: string[] = [];
    for (const e of edgesFromRS) {
      if (e.label === 'Requirement' && e.to.table === 'Requirements') {
        add(e.to.table, e.to.id);
        reqIds.push(e.to.id);
      }
    }
    for (const reqId of reqIds) {
      const edgesFromReq = fromKeyToEdges.get(`Requirements|${reqId}`) || [];
      for (const e of edgesFromReq) {
        if (e.label === 'Argument' && e.to.table === 'RequirementArguments') {
          add(e.to.table, e.to.id);
        }
      }
    }
    if (membersByLayer.size > 0) clusters.push({ rsKey: n.key, membersByLayer });
  }

  for (const [layer, ids] of layerToIds.entries()) {
    const filtered = ids.filter((nid) => !clusterMembers.has(nid));
    layerToIds.set(layer, filtered);
  }

  for (const c of clusters) {
    lines.push(`  subgraph cluster_reqset_${sanitize(c.rsKey.id)} {`);
    const rsNode = g.nodes.get(`${c.rsKey.table}|${c.rsKey.id}`);
    const rsType = (rsNode as any)?.row?.RequirementSetType ? `ReqSet: ${String((rsNode as any).row.RequirementSetType)}` : 'ReqSet';
    const isAbs = rsNode && typeof (rsNode as any).file === 'string' && path.isAbsolute((rsNode as any).file);
    const relOrAbs = rsNode && isAbs ? path.relative(process.cwd(), (rsNode as any).file) : ((rsNode as any)?.file ?? '');
    const tooltip = escapeDotString(`RequirementSets:${c.rsKey.id}\n${relOrAbs}`);
    lines.push(`    color=\"#1565c0\"; penwidth=2.0; style=\"rounded\"; bgcolor=\"#eaf2fb\";`);
    lines.push(`    label=\"${escapeDotString(rsType)}\"; labelloc=\"t\"; margin=\"10\"; fontname=\"Helvetica\"; fontsize=10;`);
    lines.push(`    tooltip=\"${tooltip}\";`);
    if (rsNode && isAbs) {
      lines.push(`    URL=\"${escapeDotString(buildFileUrl((rsNode as any).file))}\"; target=\"_blank\";`);
    }
    const innerLayers = Array.from(c.membersByLayer.keys()).sort((a, b) => a - b);
    for (const layer of innerLayers) {
      const ids = c.membersByLayer.get(layer)!;
      if (!ids.length) continue;
      lines.push('    subgraph {');
      lines.push('      rank=same;');
      for (const nid of ids) {
        if (nid.startsWith('RSANCHOR_')) {
          lines.push(`      "${nid}" [label="", shape=point, width=0.01, height=0.01, color=\"#1565c0\"];`);
        } else {
          lines.push(`      "${nid}";`);
        }
      }
      lines.push('    }');
    }
    lines.push('  }');
  }

  const orderedLayers = Array.from(layerToIds.keys()).sort((a, b) => a - b);
  for (const layer of orderedLayers) {
    const ids = layerToIds.get(layer)!;
    if (!ids.length) continue;
    lines.push(`  subgraph \"layer_${layer}\" {`);
    lines.push('    rank=same;');
    for (const nid of ids) lines.push(`    "${nid}";`);
    lines.push('  }');
  }

  const reqsetEdgeLabels = new Set(['SubjectRequirementSetId','OwnerRequirementSetId','RequirementSetId']);
  for (const e of g.edges) {
    const styleAttrs = edgeStyleAttrs(e.label);
    const parts: string[] = [styleAttrs];
    if (e.label) parts.push(`label=\"${escapeDotString(e.label)}\"`);
    const edgeTooltip = e.label ? `${e.label} from ${e.from.table}:${e.from.id} → ${e.to.table}:${e.to.id}` : '';
    if (edgeTooltip) parts.push(`tooltip=\"${escapeDotString(edgeTooltip)}\"`);

    if (e.to.table === 'RequirementSets' && reqsetEdgeLabels.has(e.label || '')) {
      const from = sanitize(`${e.from.table}_${e.from.id}`);
      const anchor = sanitize(`RSANCHOR_${e.to.id}`);
      parts.push(`lhead=\"cluster_reqset_${sanitize(e.to.id)}\"`);
      lines.push(`  "${from}" -> "${anchor}" [${parts.join(', ')}];`);
      continue;
    }
    if (e.from.table === 'RequirementSets') {
      const anchor = sanitize(`RSANCHOR_${e.from.id}`);
      const to = sanitize(`${e.to.table}_${e.to.id}`);
      parts.push(`ltail=\"cluster_reqset_${sanitize(e.from.id)}\"`);
      lines.push(`  "${anchor}" -> "${to}" [${parts.join(', ')}];`);
      continue;
    }

    const from = sanitize(`${e.from.table}_${e.from.id}`);
    const to = sanitize(`${e.to.table}_${e.to.id}`);
    lines.push(`  "${from}" -> "${to}" [${parts.join(', ')}];`);
  }
  lines.push('}');
  return lines.join('\n');
}

function nkToStr(nk: NodeKey): string { return `${nk.table}|${nk.id}`; }

function sanitize(s: string) { return s.replace(/[^A-Za-z0-9_:\-]/g, '_').slice(0, 120); }

function escapeDotString(s: string): string {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildFileUrl(absPath: string): string {
  const encoded = encodeURI(absPath);
  return `file://${encoded}`;
}

function getLayerForTable(table: string): number | null {
  const mapping: Record<string, number> = {
    Leaders: 1,
    Civilizations: 1,
    Traits: 2,
    LeaderTraits: 2,
    CivilizationTraits: 2,
    Modifiers: 3,
    RequirementSets: 4,
    Requirements: 5,
    ModifierArguments: 6,
    RequirementArguments: 6,
  };
  return Object.prototype.hasOwnProperty.call(mapping, table) ? mapping[table] : null;
}

function buildSemanticTooltip(n: GraphNode, g: Graph): string | undefined {
  try {
    const t = n.key.table;
    const row = n.row || {} as any;
    if (t === 'Modifiers') {
      const effect = (row as any).Effect ? `Effect=${(row as any).Effect}` : undefined;
      const coll = (row as any).Collection ? `Collection=${(row as any).Collection}` : undefined;
      const perm = (row as any).Permanent !== undefined ? `Permanent=${(row as any).Permanent}` : undefined;
      const args = summarizeArgsFor('ModifierArguments', 'ModifierId', n.key.id, g, 3);
      return [effect, coll, perm, args].filter(Boolean).join(' | ');
    }
    if (t === 'RequirementSets') {
      const type = (row as any).RequirementSetType ? `Type=${(row as any).RequirementSetType}` : undefined;
      const count = countOutgoing(n.key, g, 'Requirement', 'Requirements');
      const cnt = `Requirements=${count}`;
      return [type, cnt].filter(Boolean).join(' | ');
    }
    if (t === 'Requirements') {
      const rtype = (row as any).RequirementType ? `Type=${(row as any).RequirementType}` : undefined;
      const args = summarizeArgsFor('RequirementArguments', 'RequirementId', n.key.id, g, 3);
      return [rtype, args].filter(Boolean).join(' | ');
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function summarizeArgsFor(argTable: 'ModifierArguments'|'RequirementArguments', foreignKey: string, fkValue: string, g: Graph, maxItems: number): string | undefined {
  const items: string[] = [];
  let i = 0;
  for (const n of g.nodes.values()) {
    if (n.key.table !== argTable) continue;
    const r = n.row as any;
    if (String(r[foreignKey] || '') !== fkValue) continue;
    const name = String(r.Name ?? '');
    const value = String(r.Value ?? '');
    items.push(`${name}=${value}`);
    if (++i >= maxItems) break;
  }
  if (!items.length) return undefined;
  const more = countArgsFor(argTable, foreignKey, fkValue, g) - items.length;
  return `Args: ${items.join(', ')}${more > 0 ? ` (+${more} more)` : ''}`;
}

function countArgsFor(argTable: 'ModifierArguments'|'RequirementArguments', foreignKey: string, fkValue: string, g: Graph): number {
  let c = 0;
  for (const n of g.nodes.values()) {
    if (n.key.table !== argTable) continue;
    const r = n.row as any;
    if (String(r[foreignKey] || '') !== fkValue) continue;
    c++;
  }
  return c;
}

function countOutgoing(from: NodeKey, g: Graph, label?: string, toTable?: string): number {
  let c = 0;
  for (const e of g.edges) {
    if (e.from.table !== from.table || e.from.id !== from.id) continue;
    if (label && e.label !== label) continue;
    if (toTable && e.to.table !== toTable) continue;
    c++;
  }
  return c;
}

function formatNodeLabel(table: string, id: string): string {
  const wrapped = wrapId(id, 24);
  const label = `${table}\n${wrapped}`.replace(/\"/g, '\\\"');
  return label;
}

function wrapId(id: string, maxLen: number): string {
  const tokens = id.split(/([_-])/);
  const lines: string[] = [];
  let current = '';
  for (const t of tokens) {
    const next = current ? current + t : t;
    if (next.length > maxLen && current) {
      lines.push(current);
      current = t.replace(/^[_-]/, '');
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  const normalized = lines.flatMap(line => chunk(line, maxLen)).join('\n');
  return normalized;
}

function chunk(s: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
  return out;
}

function nodeStyleAttrs(table: string): string {
  const styles: Record<string, { shape: string; fill: string; border: string; style?: string; pen?: number }> = {
    Leaders: { shape: 'box', fill: '#eef7ff', border: '#3f51b5', style: 'filled,rounded', pen: 1.4 },
    Civilizations: { shape: 'box', fill: '#eef7ff', border: '#3f51b5', style: 'filled,rounded', pen: 1.4 },
    Traits: { shape: 'ellipse', fill: '#e8f5e9', border: '#2e7d32', style: 'filled', pen: 1.6 },
    Modifiers: { shape: 'hexagon', fill: '#fff3e0', border: '#ef6c00', style: 'filled', pen: 1.6 },
    RequirementSets: { shape: 'box', fill: '#e3f2fd', border: '#1565c0', style: 'filled,rounded', pen: 1.6 },
    Requirements: { shape: 'note', fill: '#f3e5f5', border: '#6a1b9a', style: 'filled', pen: 1.4 },
    ModifierArguments: { shape: 'parallelogram', fill: '#fce4ec', border: '#ad1457', style: 'filled', pen: 1.2 },
    RequirementArguments: { shape: 'parallelogram', fill: '#ede7f6', border: '#4527a0', style: 'filled', pen: 1.2 },
  };
  const s = styles[table];
  if (!s) return '';
  const parts = [`shape=${s.shape}`, `fillcolor=\"${s.fill}\"`, `color=\"${s.border}\"`];
  if (s.style) parts.push(`style=\"${s.style}\"`);
  if (s.pen) parts.push(`penwidth=${s.pen}`);
  return parts.join(', ');
}

function edgeStyleAttrs(label?: string): string {
  const primary = ['LeaderTraits', 'CivilizationTraits', 'TraitModifiers', 'Requirement'];
  const reqset = ['SubjectRequirementSetId', 'OwnerRequirementSetId', 'RequirementSetId'];
  if (label && primary.includes(label)) return 'color=\"#555555\", style=solid, penwidth=1.6';
  if (label && reqset.includes(label)) return 'color=\"#1976d2\", style=solid, penwidth=1.4';
  if (label === 'Attach') return 'color=\"#ef6c00\", style=dashed, penwidth=1.3';
  if (label === 'Argument') return 'color=\"#9e9e9e\", style=dotted, penwidth=1.0';
  if (label && /Type$/.test(label)) return 'color=\"#888888\", style=dotted, penwidth=1.0';
  return 'color=\"#777777\", style=solid, penwidth=1.1';
}


