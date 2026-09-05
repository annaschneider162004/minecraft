from __future__ import annotations

import os
import queue
import threading

try:  # pragma: no cover - import availability depends on the host Python build
    import tkinter as tk
    from tkinter import filedialog, messagebox, ttk
    TKINTER_IMPORT_ERROR = None
except ModuleNotFoundError as exc:  # pragma: no cover - exercised indirectly via CLI fallback
    tk = None
    filedialog = None
    messagebox = None
    ttk = None
    TKINTER_IMPORT_ERROR = exc

from fantasy_schematic_builder.builder import default_output_directory, generate_project
from fantasy_schematic_builder.creative_tools import (
    IDEA_THEME_LABELS,
    BUILD_TYPE_LABELS_VI,
    build_type_from_display,
    format_build_idea,
    format_title_package,
    generate_build_idea,
    generate_youtube_title_package,
    get_display_build_type,
    idea_theme_from_display,
    idea_to_story_prompt,
)
from fantasy_schematic_builder.models import GenerationOptions


def build_generation_options(
    generate_full: bool,
    generate_staged: bool,
    generate_materials: bool,
    generate_commands: bool,
    generate_baritone: bool,
    generate_notes: bool,
    generate_mineflayer: bool,
    team_bots: int,
) -> GenerationOptions:
    return GenerationOptions(
        generate_full_schematic=generate_full,
        generate_staged_schematics=generate_staged,
        generate_material_list=generate_materials,
        generate_material_commands=generate_commands,
        generate_baritone_steps=generate_baritone,
        generate_youtube_notes=generate_notes,
        generate_mineflayer_plan=generate_mineflayer,
        team_bot_count=team_bots,
    )


class BuilderGUI:
    COLORS = {
        "bg": "#0f172a",
        "panel": "#1e293b",
        "panel_alt": "#111827",
        "text": "#e5e7eb",
        "text_soft": "#94a3b8",
        "accent": "#38bdf8",
        "accent_alt": "#22d3ee",
        "success": "#22c55e",
        "warning": "#f59e0b",
        "error": "#ef4444",
        "border": "#334155",
    }

    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Minecraft Fantasy Schematic Builder V2")
        self.root.geometry("1180x820")
        self.root.minsize(980, 700)
        self.root.configure(bg=self.COLORS["bg"])
        self.root.protocol("WM_DELETE_WINDOW", self.close)

        self.last_generated_idea = None
        self.build_type = tk.StringVar(value=get_display_build_type("auto"))
        self.build_name = tk.StringVar(value="Công trình huyền huyễn")
        self.output_name = tk.StringVar(value="cong_trinh_huyen_huyen")
        self.output_dir = tk.StringVar(value=default_output_directory())
        self.status = tk.StringVar(value="Sẵn sàng.")
        self.idea_theme = tk.StringVar(value=IDEA_THEME_LABELS["fantasy"])
        self.idea_keyword = tk.StringVar(value="")

        self.generate_full = tk.BooleanVar(value=True)
        self.generate_staged = tk.BooleanVar(value=True)
        self.generate_materials = tk.BooleanVar(value=True)
        self.generate_commands = tk.BooleanVar(value=True)
        self.generate_baritone = tk.BooleanVar(value=True)
        self.generate_notes = tk.BooleanVar(value=True)
        self.generate_mineflayer = tk.BooleanVar(value=False)
        self.team_bot_count = tk.StringVar(value="6")

        self.generate_button = None
        self.output_text = None
        self.is_generating = False
        self.is_closing = False
        self.poll_after_id = None
        self.worker_thread = None

        self._configure_theme()
        self._build_layout()

    def _configure_theme(self) -> None:
        style = ttk.Style(self.root)
        try:
            style.theme_use("clam")
        except tk.TclError:  # pragma: no cover - platform dependent
            pass

        style.configure(".", background=self.COLORS["bg"], foreground=self.COLORS["text"])
        style.configure("App.TFrame", background=self.COLORS["bg"])
        style.configure("Card.TFrame", background=self.COLORS["panel"])
        style.configure(
            "Card.TLabelframe",
            background=self.COLORS["panel"],
            foreground=self.COLORS["text"],
            bordercolor=self.COLORS["border"],
            relief="solid",
            borderwidth=1,
        )
        style.configure("Card.TLabelframe.Label", background=self.COLORS["panel"], foreground=self.COLORS["accent"])
        style.configure("HeaderTitle.TLabel", background=self.COLORS["panel_alt"], foreground=self.COLORS["text"], font=("Segoe UI", 18, "bold"))
        style.configure("HeaderSubtitle.TLabel", background=self.COLORS["panel_alt"], foreground=self.COLORS["text_soft"], font=("Segoe UI", 10))
        style.configure("Section.TLabel", background=self.COLORS["panel"], foreground=self.COLORS["accent_alt"], font=("Segoe UI", 10, "bold"))
        style.configure("Panel.TLabel", background=self.COLORS["panel"], foreground=self.COLORS["text"])
        style.configure(
            "Dashboard.TButton",
            background=self.COLORS["accent"],
            foreground=self.COLORS["panel_alt"],
            borderwidth=0,
            focusthickness=0,
            focuscolor=self.COLORS["accent"],
            padding=(12, 8),
        )
        style.map(
            "Dashboard.TButton",
            background=[("active", self.COLORS["accent_alt"]), ("disabled", self.COLORS["border"])],
            foreground=[("disabled", self.COLORS["text_soft"])],
        )
        style.configure(
            "Secondary.TButton",
            background=self.COLORS["panel_alt"],
            foreground=self.COLORS["text"],
            bordercolor=self.COLORS["border"],
            padding=(10, 7),
        )
        style.map("Secondary.TButton", background=[("active", self.COLORS["border"])])
        style.configure(
            "Dashboard.TCheckbutton",
            background=self.COLORS["panel"],
            foreground=self.COLORS["text"],
        )
        style.map(
            "Dashboard.TCheckbutton",
            background=[("active", self.COLORS["panel"])],
            indicatorcolor=[("selected", self.COLORS["accent"]), ("!selected", self.COLORS["panel_alt"])],
        )
        style.configure(
            "Dashboard.TEntry",
            fieldbackground=self.COLORS["panel_alt"],
            background=self.COLORS["panel_alt"],
            foreground=self.COLORS["text"],
            insertcolor=self.COLORS["text"],
            bordercolor=self.COLORS["border"],
            lightcolor=self.COLORS["border"],
            darkcolor=self.COLORS["border"],
        )
        style.configure(
            "Dashboard.TCombobox",
            fieldbackground=self.COLORS["panel_alt"],
            background=self.COLORS["panel_alt"],
            foreground=self.COLORS["text"],
            arrowcolor=self.COLORS["accent"],
            bordercolor=self.COLORS["border"],
            lightcolor=self.COLORS["border"],
            darkcolor=self.COLORS["border"],
        )

    def _build_layout(self):
        container = ttk.Frame(self.root, padding=14, style="App.TFrame")
        container.pack(fill="both", expand=True)

        header = ttk.Frame(container, padding=(18, 16), style="Card.TFrame")
        header.pack(fill="x")
        ttk.Label(header, text="Minecraft Fantasy Schematic Builder V2", style="HeaderTitle.TLabel").pack(anchor="w")
        ttk.Label(
            header,
            text="Tạo file .schem từ câu chuyện huyền huyễn để Baritone tự xây trong Minecraft",
            style="HeaderSubtitle.TLabel",
        ).pack(anchor="w", pady=(4, 0))

        content = ttk.Frame(container, style="App.TFrame")
        content.pack(fill="both", expand=True, pady=(12, 0))
        content.columnconfigure(0, weight=3)
        content.columnconfigure(1, weight=2)
        content.rowconfigure(0, weight=3)
        content.rowconfigure(1, weight=2)

        story_panel = ttk.LabelFrame(content, text="Câu chuyện / Ý tưởng huyền huyễn", padding=12, style="Card.TLabelframe")
        story_panel.grid(row=0, column=0, sticky="nsew", padx=(0, 10), pady=(0, 10))
        story_panel.columnconfigure(0, weight=1)
        ttk.Label(
            story_panel,
            text="Dán câu chuyện hoặc prompt để tạo schematic, hoặc tạo ý tưởng mới từ bảng công cụ bên phải.",
            style="Panel.TLabel",
        ).grid(row=0, column=0, sticky="w")
        ttk.Button(story_panel, text="Tải file câu chuyện", command=self.load_story_file, style="Secondary.TButton").grid(row=0, column=1, sticky="e")
        self.story_text = tk.Text(
            story_panel,
            wrap="word",
            height=18,
            bg=self.COLORS["panel_alt"],
            fg=self.COLORS["text"],
            insertbackground=self.COLORS["text"],
            selectbackground=self.COLORS["accent"],
            selectforeground=self.COLORS["panel_alt"],
            relief="flat",
            padx=10,
            pady=10,
        )
        self.story_text.grid(row=1, column=0, columnspan=2, sticky="nsew", pady=(10, 0))
        story_panel.rowconfigure(1, weight=1)

        settings_panel = ttk.LabelFrame(content, text="Thiết lập & công cụ sáng tạo", padding=12, style="Card.TLabelframe")
        settings_panel.grid(row=0, column=1, sticky="nsew", pady=(0, 10))
        settings_panel.columnconfigure(0, weight=1)
        settings_panel.columnconfigure(1, weight=1)

        ttk.Label(settings_panel, text="Loại công trình", style="Panel.TLabel").grid(row=0, column=0, sticky="w")
        ttk.Label(settings_panel, text="Tên công trình", style="Panel.TLabel").grid(row=0, column=1, sticky="w")
        ttk.Combobox(
            settings_panel,
            textvariable=self.build_type,
            values=list(BUILD_TYPE_LABELS_VI.values()),
            state="readonly",
            style="Dashboard.TCombobox",
        ).grid(row=1, column=0, sticky="ew", padx=(0, 8), pady=(4, 0))
        ttk.Entry(settings_panel, textvariable=self.build_name, style="Dashboard.TEntry").grid(row=1, column=1, sticky="ew", pady=(4, 0))

        ttk.Label(settings_panel, text="Tên file xuất", style="Panel.TLabel").grid(row=2, column=0, sticky="w", pady=(10, 0))
        ttk.Label(settings_panel, text="Thư mục xuất file", style="Panel.TLabel").grid(row=2, column=1, sticky="w", pady=(10, 0))
        ttk.Entry(settings_panel, textvariable=self.output_name, style="Dashboard.TEntry").grid(row=3, column=0, sticky="ew", padx=(0, 8), pady=(4, 0))
        output_row = ttk.Frame(settings_panel, style="Card.TFrame")
        output_row.grid(row=3, column=1, sticky="ew", pady=(4, 0))
        output_row.columnconfigure(0, weight=1)
        ttk.Entry(output_row, textvariable=self.output_dir, style="Dashboard.TEntry").grid(row=0, column=0, sticky="ew")
        ttk.Button(output_row, text="Chọn thư mục", command=self.pick_output_directory, style="Secondary.TButton").grid(row=0, column=1, padx=(6, 0))

        options_frame = ttk.LabelFrame(settings_panel, text="Tùy chọn tạo file", padding=10, style="Card.TLabelframe")
        options_frame.grid(row=4, column=0, columnspan=2, sticky="ew", pady=(14, 0))
        options_frame.columnconfigure(0, weight=1)
        options_frame.columnconfigure(1, weight=1)
        ttk.Checkbutton(options_frame, text="Tạo schematic đầy đủ", variable=self.generate_full, style="Dashboard.TCheckbutton").grid(row=0, column=0, sticky="w")
        ttk.Checkbutton(options_frame, text="Tạo từng giai đoạn build", variable=self.generate_staged, style="Dashboard.TCheckbutton").grid(row=0, column=1, sticky="w")
        ttk.Checkbutton(options_frame, text="Tạo danh sách vật liệu", variable=self.generate_materials, style="Dashboard.TCheckbutton").grid(row=1, column=0, sticky="w", pady=(6, 0))
        ttk.Checkbutton(options_frame, text="Tạo lệnh /give vật liệu", variable=self.generate_commands, style="Dashboard.TCheckbutton").grid(row=1, column=1, sticky="w", pady=(6, 0))
        ttk.Checkbutton(options_frame, text="Tạo hướng dẫn Baritone", variable=self.generate_baritone, style="Dashboard.TCheckbutton").grid(row=2, column=0, sticky="w", pady=(6, 0))
        ttk.Checkbutton(options_frame, text="Tạo ghi chú YouTube", variable=self.generate_notes, style="Dashboard.TCheckbutton").grid(row=2, column=1, sticky="w", pady=(6, 0))
        ttk.Checkbutton(options_frame, text="Tạo kế hoạch Mineflayer team bot", variable=self.generate_mineflayer, style="Dashboard.TCheckbutton").grid(row=3, column=0, sticky="w", pady=(6, 0))
        bot_count_row = ttk.Frame(options_frame, style="Card.TFrame")
        bot_count_row.grid(row=3, column=1, sticky="w", pady=(6, 0))
        ttk.Label(bot_count_row, text="Số bot", style="Panel.TLabel").grid(row=0, column=0, sticky="w", padx=(0, 8))
        ttk.Combobox(
            bot_count_row,
            textvariable=self.team_bot_count,
            values=("3", "4", "6"),
            state="readonly",
            width=6,
            style="Dashboard.TCombobox",
        ).grid(row=0, column=1, sticky="w")

        creative_frame = ttk.LabelFrame(settings_panel, text="Tạo ý tưởng & tiêu đề YouTube", padding=10, style="Card.TLabelframe")
        creative_frame.grid(row=5, column=0, columnspan=2, sticky="ew", pady=(14, 0))
        creative_frame.columnconfigure(0, weight=1)
        creative_frame.columnconfigure(1, weight=1)
        ttk.Label(creative_frame, text="Chủ đề", style="Panel.TLabel").grid(row=0, column=0, sticky="w")
        ttk.Label(creative_frame, text="Từ khóa bổ sung", style="Panel.TLabel").grid(row=0, column=1, sticky="w")
        ttk.Combobox(
            creative_frame,
            textvariable=self.idea_theme,
            values=[IDEA_THEME_LABELS[key] for key in IDEA_THEME_LABELS],
            state="readonly",
            style="Dashboard.TCombobox",
        ).grid(row=1, column=0, sticky="ew", padx=(0, 8), pady=(4, 0))
        ttk.Entry(creative_frame, textvariable=self.idea_keyword, style="Dashboard.TEntry").grid(row=1, column=1, sticky="ew", pady=(4, 0))

        button_row = ttk.Frame(creative_frame, style="Card.TFrame")
        button_row.grid(row=2, column=0, columnspan=2, sticky="ew", pady=(10, 0))
        button_row.columnconfigure(0, weight=1)
        button_row.columnconfigure(1, weight=1)
        button_row.columnconfigure(2, weight=1)
        ttk.Button(button_row, text="Tạo ý tưởng mới", command=self.generate_idea, style="Dashboard.TButton").grid(row=0, column=0, sticky="ew", padx=(0, 6))
        ttk.Button(button_row, text="Dùng ý tưởng này", command=self.use_generated_idea, style="Secondary.TButton").grid(row=0, column=1, sticky="ew", padx=3)
        ttk.Button(button_row, text="Tạo tiêu đề YouTube", command=self.generate_titles, style="Secondary.TButton").grid(row=0, column=2, sticky="ew", padx=(6, 0))

        self.generate_button = ttk.Button(settings_panel, text="Tạo schematic", command=self.generate, style="Dashboard.TButton")
        self.generate_button.grid(row=6, column=1, sticky="e", pady=(14, 0))

        output_panel = ttk.LabelFrame(content, text="Kết quả / Trạng thái", padding=12, style="Card.TLabelframe")
        output_panel.grid(row=1, column=0, columnspan=2, sticky="nsew")
        output_panel.columnconfigure(0, weight=1)
        output_panel.rowconfigure(1, weight=1)
        toolbar = ttk.Frame(output_panel, style="Card.TFrame")
        toolbar.grid(row=0, column=0, sticky="ew")
        toolbar.columnconfigure(0, weight=1)
        ttk.Label(toolbar, textvariable=self.status, style="Section.TLabel").grid(row=0, column=0, sticky="w")
        ttk.Button(toolbar, text="Sao chép kết quả", command=self.copy_output_text, style="Secondary.TButton").grid(row=0, column=1, sticky="e")
        output_panel.rowconfigure(1, weight=1)
        output_scrollbar = ttk.Scrollbar(output_panel, orient="vertical")
        self.output_text = tk.Text(
            output_panel,
            wrap="word",
            height=12,
            bg=self.COLORS["panel_alt"],
            fg=self.COLORS["text"],
            insertbackground=self.COLORS["text"],
            relief="flat",
            state="disabled",
            padx=10,
            pady=10,
            yscrollcommand=output_scrollbar.set,
        )
        self.output_text.grid(row=1, column=0, sticky="nsew", pady=(8, 0))
        output_scrollbar.configure(command=self.output_text.yview)
        output_scrollbar.grid(row=1, column=1, sticky="ns", pady=(8, 0))

    def _set_output_text(self, content: str) -> None:
        self.output_text.configure(state="normal")
        self.output_text.delete("1.0", "end")
        self.output_text.insert("1.0", content.strip())
        self.output_text.configure(state="disabled")

    def _append_output_text(self, content: str) -> None:
        self.output_text.configure(state="normal")
        existing = self.output_text.get("1.0", "end").strip()
        if existing:
            self.output_text.insert("end", "\n\n")
        self.output_text.insert("end", content.strip())
        self.output_text.configure(state="disabled")

    def _selected_build_type(self) -> str:
        return build_type_from_display(self.build_type.get())

    def _set_build_type(self, build_type: str) -> None:
        self.build_type.set(get_display_build_type(build_type))

    def copy_output_text(self) -> None:
        content = self.output_text.get("1.0", "end").strip()
        if not content:
            self.status.set("Chưa có kết quả để sao chép.")
            return
        self.root.clipboard_clear()
        self.root.clipboard_append(content)
        self.status.set("Đã sao chép kết quả vào clipboard.")

    def load_story_file(self):
        path = filedialog.askopenfilename(filetypes=[("File văn bản", "*.txt"), ("Tất cả file", "*.*")])
        if not path:
            return
        with open(path, "r", encoding="utf-8") as handle:
            content = handle.read()
        self.story_text.delete("1.0", "end")
        self.story_text.insert("1.0", content)
        self.status.set(f"Đã tải file câu chuyện: {os.path.basename(path)}")

    def pick_output_directory(self):
        path = filedialog.askdirectory(initialdir=self.output_dir.get() or default_output_directory())
        if path:
            self.output_dir.set(path)
            self.status.set(f"Đã chọn thư mục xuất: {path}")

    def generate_idea(self):
        theme = idea_theme_from_display(self.idea_theme.get())
        idea = generate_build_idea(theme=theme, keyword=self.idea_keyword.get())
        self.last_generated_idea = idea
        self._set_output_text(format_build_idea(idea))
        self.status.set("Đã tạo ý tưởng công trình mới.")

    def use_generated_idea(self):
        if self.last_generated_idea is None:
            messagebox.showerror("Lỗi", "Bạn chưa tạo ý tưởng mới. Hãy bấm 'Tạo ý tưởng mới' trước.")
            return
        self.story_text.delete("1.0", "end")
        self.story_text.insert("1.0", idea_to_story_prompt(self.last_generated_idea))
        self._set_build_type(self.last_generated_idea.recommended_build_type)
        if not self.build_name.get().strip() or self.build_name.get().strip() == "Công trình huyền huyễn":
            self.build_name.set(self.last_generated_idea.concept)
        self.status.set("Đã đưa ý tưởng vào ô câu chuyện.")

    def generate_titles(self):
        story = self.story_text.get("1.0", "end").strip()
        if not story and self.last_generated_idea is not None:
            story = idea_to_story_prompt(self.last_generated_idea)
        if not story:
            messagebox.showerror("Lỗi", "Vui lòng nhập câu chuyện hoặc tạo ý tưởng trước khi tạo tiêu đề YouTube.")
            return
        titles = generate_youtube_title_package(
            story_text=story,
            build_type=self._selected_build_type(),
            build_name=self.build_name.get(),
        )
        self._append_output_text(format_title_package(titles))
        self.status.set(f"Đã tạo {len(titles.titles)} gợi ý tiêu đề YouTube.")

    def generate(self):
        if self.is_generating:
            messagebox.showinfo("Đang xử lý", "Ứng dụng đang tạo schematic. Vui lòng chờ tác vụ hiện tại hoàn tất.")
            return

        story = self.story_text.get("1.0", "end").strip()
        if not story and self.last_generated_idea is not None:
            story = idea_to_story_prompt(self.last_generated_idea)
            self.story_text.delete("1.0", "end")
            self.story_text.insert("1.0", story)
        if not story:
            messagebox.showerror("Lỗi", "Vui lòng nhập câu chuyện huyền huyễn hoặc tải file .txt trước.")
            return

        build_type = self._selected_build_type()
        build_name = self.build_name.get()
        output_name = self.output_name.get()
        output_dir = self.output_dir.get()
        options = build_generation_options(
            generate_full=self.generate_full.get(),
            generate_staged=self.generate_staged.get(),
            generate_materials=self.generate_materials.get(),
            generate_commands=self.generate_commands.get(),
            generate_baritone=self.generate_baritone.get(),
            generate_notes=self.generate_notes.get(),
            generate_mineflayer=self.generate_mineflayer.get(),
            team_bots=int(self.team_bot_count.get()),
        )
        self.is_generating = True
        if self.generate_button is not None:
            self.generate_button.configure(state="disabled")
        self.status.set("Đang tạo file schematic và dữ liệu đi kèm...")
        result_queue: queue.Queue[tuple[str, object]] = queue.Queue()

        def worker():
            try:
                result = generate_project(
                    story_text=story,
                    build_type=build_type,
                    build_name=build_name,
                    output_name=output_name,
                    output_dir=output_dir,
                    options=options,
                )
            except Exception as exc:  # pragma: no cover - GUI error display path
                result_queue.put(("error", str(exc)))
                return
            result_queue.put(("success", result))

        self.worker_thread = threading.Thread(target=worker, daemon=True)
        self.worker_thread.start()
        self.poll_after_id = self.root.after(100, lambda: self._poll_generation_result(result_queue))

    def _poll_generation_result(self, result_queue: queue.Queue[tuple[str, object]]) -> None:
        self.poll_after_id = None
        if self.is_closing or not self.root.winfo_exists():
            return
        try:
            state, payload = result_queue.get_nowait()
        except queue.Empty:
            if self.root.winfo_exists():
                self.poll_after_id = self.root.after(100, lambda: self._poll_generation_result(result_queue))
            return

        if state == "success":
            self._on_generation_success(payload)
            return
        self._on_generation_error(str(payload))

    def close(self) -> None:
        if self.worker_thread is not None and self.worker_thread.is_alive():
            messagebox.showinfo("Đang xử lý", "Hãy chờ quá trình tạo schematic hoàn tất rồi đóng cửa sổ.")
            return
        self.is_closing = True
        if self.poll_after_id is not None:
            try:
                self.root.after_cancel(self.poll_after_id)
            except tk.TclError:  # pragma: no cover - window shutdown race
                pass
            self.poll_after_id = None
        self.root.destroy()

    def _on_generation_success(self, result):
        if self.is_closing or not self.root.winfo_exists():
            self.is_generating = False
            self.worker_thread = None
            return
        self.is_generating = False
        self.worker_thread = None
        if self.generate_button is not None:
            self.generate_button.configure(state="normal")
        selected_label = get_display_build_type(result["selected_build_type"])
        generated_files = []
        if "full_schematic" in result:
            generated_files.append(f"- Schematic đầy đủ: {result['full_schematic']}")
        for stage_path in result.get("stage_paths", []):
            generated_files.append(f"- Giai đoạn build: {stage_path}")
        for key, label in (
            ("materials", "Danh sách vật liệu"),
            ("give_commands", "Lệnh /give vật liệu"),
            ("baritone_steps", "Hướng dẫn Baritone"),
            ("youtube_notes", "Ghi chú YouTube"),
            ("mineflayer_plan", "Kế hoạch Mineflayer"),
        ):
            if key in result:
                generated_files.append(f"- {label}: {result[key]}")
        summary = (
            f"Tạo file thành công\n"
            f"Loại công trình: {selected_label} ({result['selected_build_type']})\n"
            f"Thư mục xuất: {result['output_dir']}\n\n"
            f"Các file đã tạo:\n" + "\n".join(generated_files)
        )
        self._set_output_text(summary)
        self.output_text.focus_set()
        self.status.set(f"Đã tạo file thành công tại: {result['output_dir']}")

    def _on_generation_error(self, message):
        if self.is_closing or not self.root.winfo_exists():
            self.is_generating = False
            self.worker_thread = None
            return
        self.is_generating = False
        self.worker_thread = None
        if self.generate_button is not None:
            self.generate_button.configure(state="normal")
        messagebox.showerror("Lỗi", f"Không thể tạo file:\n{message}")
        self.status.set("Tạo file thất bại.")


def run_gui():
    if TKINTER_IMPORT_ERROR is not None:
        raise RuntimeError(f"GUI is unavailable because tkinter could not be imported: {TKINTER_IMPORT_ERROR}")
    root = tk.Tk()
    BuilderGUI(root)
    root.mainloop()
