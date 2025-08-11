import { Args, Command, Flags } from "@oclif/core";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { renderSvg } from "@civ7/plugin-graph";
import * as fssync from "node:fs";
import { findProjectRoot } from "@civ7/config";

export default class Render extends Command {
  static id = "render";
  static summary = "Render a Graphviz DOT file to an SVG (no external deps).";
  static description = `
Renders a Graphviz DOT file to SVG using a WebAssembly Graphviz engine.
`;

  static examples = [
    "<%= config.bin %> render ./out/graph.dot ./out/graph.svg",
  ];

  static flags = {
    config: Flags.string({ description: "Path to config file", required: false }),
    profile: Flags.string({ description: "Profile key from config", required: false, default: "default" }),
    engine: Flags.string({
      description: "Graphviz engine",
      options: ["dot", "neato", "fdp", "sfdp", "circo", "twopi"],
      default: "dot",
    }),
    format: Flags.string({
      description: "Output format",
      options: ["svg"],
      default: "svg",
    }),
  } as const;

  static args = {
    input: Args.string({ description: "Path to DOT file (defaults to out/<seed>/graph.dot)", required: true }),
    output: Args.string({ description: "Path to output SVG (defaults to out/<seed>/graph.svg)", required: false }),
  } as const;

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Render);
    const projectRoot = findProjectRoot(process.cwd());

    // If user passes a seed instead of a path, resolve default paths
    const inputLooksLikeSeed = !args.input.endsWith('.dot') && !args.input.includes(path.sep);
    const seed = inputLooksLikeSeed ? args.input : undefined;
    const inputPath = seed
      ? path.resolve(projectRoot, 'out', seed.replace(/[^A-Za-z0-9_\-:.]/g, '_'), 'graph.dot')
      : path.resolve(process.cwd(), args.input);
    const outputPath = args.output
      ? path.resolve(process.cwd(), args.output)
      : path.resolve(path.dirname(inputPath), 'graph.svg');

    const dot = await fs.readFile(inputPath, "utf8");
    const engine = flags.engine as 'dot' | 'neato' | 'fdp' | 'sfdp' | 'circo' | 'twopi';
    const svg = await renderSvg(dot, engine);

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, svg, "utf8");
    this.log(`Rendered ${flags.format} written to: ${outputPath}`);
  }
}


