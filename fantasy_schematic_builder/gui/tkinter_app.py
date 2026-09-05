from __future__ import annotations

import os
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from fantasy_schematic_builder.builder import default_output_directory, generate_project
from fantasy_schematic_builder.models import GenerationOptions
from fantasy_schematic_builder.story_analyzer import BUILD_TYPES


class BuilderGUI:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Minecraft Fantasy Schematic Builder V2")
        self.root.geometry("900x720")

        self.build_type = tk.StringVar(value="auto")
        self.build_name = tk.StringVar(value="Fantasy Build")
        self.output_name = tk.StringVar(value="fantasy_build")
        self.output_dir = tk.StringVar(value=default_output_directory())
        self.status = tk.StringVar(value="Ready.")

        self.generate_full = tk.BooleanVar(value=True)
        self.generate_staged = tk.BooleanVar(value=True)
        self.generate_materials = tk.BooleanVar(value=True)
        self.generate_commands = tk.BooleanVar(value=True)
        self.generate_baritone = tk.BooleanVar(value=True)
        self.generate_notes = tk.BooleanVar(value=True)

        self._build_layout()

    def _build_layout(self):
        frame = ttk.Frame(self.root, padding=12)
        frame.pack(fill="both", expand=True)

        ttk.Label(frame, text="Story (Vietnamese or English)").pack(anchor="w")
        self.story_text = tk.Text(frame, wrap="word", height=18)
        self.story_text.pack(fill="both", expand=True, pady=(0, 12))

        actions = ttk.Frame(frame)
        actions.pack(fill="x", pady=(0, 8))
        ttk.Button(actions, text="Load story from .txt", command=self.load_story_file).pack(side="left")

        form = ttk.Frame(frame)
        form.pack(fill="x")
        for column in range(2):
            form.columnconfigure(column, weight=1)

        ttk.Label(form, text="Build type").grid(row=0, column=0, sticky="w")
        ttk.Combobox(form, textvariable=self.build_type, values=BUILD_TYPES, state="readonly").grid(row=1, column=0, sticky="ew", padx=(0, 8))
        ttk.Label(form, text="Build name").grid(row=0, column=1, sticky="w")
        ttk.Entry(form, textvariable=self.build_name).grid(row=1, column=1, sticky="ew")

        ttk.Label(form, text="Output base name").grid(row=2, column=0, sticky="w", pady=(8, 0))
        ttk.Entry(form, textvariable=self.output_name).grid(row=3, column=0, sticky="ew", padx=(0, 8))
        ttk.Label(form, text="Output directory").grid(row=2, column=1, sticky="w", pady=(8, 0))
        output_row = ttk.Frame(form)
        output_row.grid(row=3, column=1, sticky="ew")
        output_row.columnconfigure(0, weight=1)
        ttk.Entry(output_row, textvariable=self.output_dir).grid(row=0, column=0, sticky="ew")
        ttk.Button(output_row, text="Browse", command=self.pick_output_directory).grid(row=0, column=1, padx=(6, 0))

        options_frame = ttk.LabelFrame(frame, text="Generate options", padding=8)
        options_frame.pack(fill="x", pady=(12, 12))
        ttk.Checkbutton(options_frame, text="Generate full schematic", variable=self.generate_full).grid(row=0, column=0, sticky="w")
        ttk.Checkbutton(options_frame, text="Generate staged schematics", variable=self.generate_staged).grid(row=0, column=1, sticky="w")
        ttk.Checkbutton(options_frame, text="Generate material list/count file", variable=self.generate_materials).grid(row=1, column=0, sticky="w")
        ttk.Checkbutton(options_frame, text="Generate /give material command files", variable=self.generate_commands).grid(row=1, column=1, sticky="w")
        ttk.Checkbutton(options_frame, text="Generate Baritone step instructions", variable=self.generate_baritone).grid(row=2, column=0, sticky="w")
        ttk.Checkbutton(options_frame, text="Generate YouTube notes/story notes", variable=self.generate_notes).grid(row=2, column=1, sticky="w")

        ttk.Button(frame, text="Generate", command=self.generate).pack(anchor="e")
        ttk.Label(frame, textvariable=self.status).pack(anchor="w", pady=(8, 0))

    def load_story_file(self):
        path = filedialog.askopenfilename(filetypes=[("Text files", "*.txt"), ("All files", "*.*")])
        if not path:
            return
        with open(path, "r", encoding="utf-8") as handle:
            content = handle.read()
        self.story_text.delete("1.0", "end")
        self.story_text.insert("1.0", content)
        self.status.set(f"Loaded story: {os.path.basename(path)}")

    def pick_output_directory(self):
        path = filedialog.askdirectory(initialdir=self.output_dir.get() or default_output_directory())
        if path:
            self.output_dir.set(path)

    def generate(self):
        story = self.story_text.get("1.0", "end").strip()
        if not story:
            messagebox.showerror("Missing story", "Please paste a fantasy story or load a .txt file first.")
            return

        options = GenerationOptions(
            generate_full_schematic=self.generate_full.get(),
            generate_staged_schematics=self.generate_staged.get(),
            generate_material_list=self.generate_materials.get(),
            generate_material_commands=self.generate_commands.get(),
            generate_baritone_steps=self.generate_baritone.get(),
            generate_youtube_notes=self.generate_notes.get(),
        )
        try:
            result = generate_project(
                story_text=story,
                build_type=self.build_type.get(),
                build_name=self.build_name.get(),
                output_name=self.output_name.get(),
                output_dir=self.output_dir.get(),
                options=options,
            )
        except Exception as exc:  # pragma: no cover - GUI error display path
            messagebox.showerror("Generation failed", str(exc))
            self.status.set("Generation failed.")
            return

        messagebox.showinfo(
            "Generation complete",
            f"Generated build type: {result['selected_build_type']}\nOutput directory: {result['output_dir']}",
        )
        self.status.set(f"Done. Generated files in {result['output_dir']}")


def run_gui():
    root = tk.Tk()
    BuilderGUI(root)
    root.mainloop()
