import os
import typer
from dotenv import load_dotenv

from core.llm_parser import parse_prompt_with_llm, parse_prompt_fallback
from core.planner import plan_build
from core.validator import validate_blueprint
from core.optimizer import dedupe_blocks_keep_last, remove_air_if_not_needed

from exporters.json_exporter import export_json
from exporters.mcfunction_exporter import export_mcfunction
from exporters.manifest_exporter import export_manifest
from exporters.schem_exporter import export_schem_placeholder

app = typer.Typer()
load_dotenv()

@app.command()
def build(
    prompt: str = typer.Option(..., help="Mô tả công trình bằng tiếng Việt"),
    outdir: str = typer.Option("dist", help="Thư mục output"),
    use_llm: bool = typer.Option(True, help="Dùng OpenAI để parse prompt"),
    model: str = typer.Option("gpt-4o-mini", help="Model parse"),
    keep_air: bool = typer.Option(False, help="Giữ block air")
):
    os.makedirs(outdir, exist_ok=True)

    if use_llm and os.getenv("OPENAI_API_KEY"):
        req = parse_prompt_with_llm(prompt, model=model)
    else:
        req = parse_prompt_fallback(prompt)

    bp = plan_build(req)

    validate_blueprint(bp)
    bp = dedupe_blocks_keep_last(bp)
    bp = remove_air_if_not_needed(bp, keep_air=keep_air)

    json_path = os.path.join(outdir, "blueprint.json")
    mcf_path = os.path.join(outdir, "build.mcfunction")
    manifest_path = os.path.join(outdir, "manifest.txt")
    schem_path = os.path.join(outdir, "build.schem")

    export_json(bp, json_path)
    export_mcfunction(bp, mcf_path)
    export_manifest(bp, manifest_path)
    export_schem_placeholder(bp, schem_path)

    typer.echo("✅ Done:")
    typer.echo(f"- {json_path}")
    typer.echo(f"- {mcf_path}")
    typer.echo(f"- {manifest_path}")
    typer.echo(f"- {schem_path}")

if __name__ == "__main__":
    app()
