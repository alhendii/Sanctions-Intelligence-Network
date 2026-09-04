function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : typeof value === "string" ? value : JSON.stringify(value);
  return `"${text.replaceAll("\"", "\"\"")}"`;
}

export function toCsv(headers: string[], rows: unknown[][]) {
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function pdfEscape(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

export function toPdf(title: string, lines: string[]) {
  const content = [
    "BT",
    "/F1 16 Tf",
    "50 780 Td",
    `(${pdfEscape(title)}) Tj`,
    "/F1 9 Tf",
    ...lines.slice(0, 72).flatMap((line) => ["0 -16 Td", `(${pdfEscape(line.slice(0, 150))}) Tj`]),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];
  let output = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(output));
    output += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(output);
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  output += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n");
  output += `\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(output, "binary");
}

export function exportEntityData(entity: any, format: string) {
  const generatedAt = new Date().toISOString();
  if (format === "json") {
    return { body: JSON.stringify({ exportedAt: generatedAt, entity }, null, 2), contentType: "application/json", extension: "json" };
  }
  const rows = Object.entries(entity.properties ?? {}).flatMap(([key, values]) => (values as string[]).map((value) => [entity.id, entity.name, key, value]));
  const csv = toCsv(["entity_id", "name", "property", "value"], [
    [entity.id, entity.name, "schemaType", entity.schemaType],
    [entity.id, entity.name, "aliases", entity.aliases.join(" | ")],
    ...rows,
    [entity.id, entity.name, "source_updated_at", entity.sourceUpdatedAt?.toISOString() ?? ""],
    [entity.id, entity.name, "exported_at", generatedAt],
    ...entity.sources.map((source: any) => [entity.id, entity.name, "citation", `${source.title} — ${source.url}`]),
  ]);
  if (format === "csv") return { body: csv, contentType: "text/csv", extension: "csv" };
  return {
    body: toPdf(`Ledgerline dossier: ${entity.name}`, [
      `ID: ${entity.id}`,
      `Schema: ${entity.schemaType}`,
      `Datasets: ${entity.datasets.join(", ")}`,
      `Source updated: ${entity.sourceUpdatedAt?.toISOString() ?? "Unavailable"}`,
      `Exported: ${generatedAt}`,
      "",
      "Aliases: " + (entity.aliases.join(", ") || "None recorded"),
      ...Object.entries(entity.properties ?? {}).flatMap(([key, values]) => [`${key}: ${(values as string[]).join(", ")}`]),
      "",
      "Citations:",
      ...entity.sources.map((source: any) => `${source.title} — ${source.url}`),
    ]),
    contentType: "application/pdf",
    extension: "pdf",
  };
}

export function exportNetworkData(graph: any, format: string) {
  const generatedAt = new Date().toISOString();
  if (format === "json") return { body: JSON.stringify({ exportedAt: generatedAt, graph }, null, 2), contentType: "application/json", extension: "json" };
  const rows = graph.edges.map((edge: any) => [edge.source, edge.target, edge.relationshipType, edge.confidence, edge.citation?.publisher, edge.citation?.title, edge.citation?.url]);
  const csv = toCsv(["source_id", "target_id", "relationship", "confidence", "publisher", "citation_title", "citation_url"], rows);
  if (format === "csv") return { body: csv, contentType: "text/csv", extension: "csv" };
  return { body: toPdf("Ledgerline relationship network", [`Exported: ${generatedAt}`, `Nodes: ${graph.nodes.length}`, `Edges: ${graph.edges.length}`, "", ...graph.edges.map((edge: any) => `${edge.source} -> ${edge.target} | ${edge.relationshipType} | ${edge.confidence} | ${edge.citation?.url}`)]), contentType: "application/pdf", extension: "pdf" };
}