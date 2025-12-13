from __future__ import annotations

import argparse
import json
import os
import sys
import textwrap
import uuid
from dataclasses import dataclass, field, asdict
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# ---- Domain -----------------------------------------------------------------


class Status(str, Enum):
    DESIGNED = "DESIGNED"
    CODED_PARTIAL = "CODED_PARTIAL"
    CODED = "CODED"
    DEPLOYED = "DEPLOYED"


class TaskStatus(str, Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"


LEGAL_TRANSITIONS: Dict[Status, Tuple[Status, ...]] = {
    Status.DESIGNED: (Status.CODED_PARTIAL, Status.CODED),  # allow direct if truly complete
    Status.CODED_PARTIAL: (Status.CODED,),
    Status.CODED: (Status.DEPLOYED,),
    Status.DEPLOYED: (),  # terminal
}


def _gen_id() -> str:
    return uuid.uuid4().hex


@dataclass
class Component:
    id: str
    name: str
    status: Status
    notes: str = ""

    @staticmethod
    def create(name: str, status: Status = Status.DESIGNED, notes: str = "") -> "Component":
        return Component(id=_gen_id(), name=name, status=status, notes=notes)


@dataclass
class Task:
    id: str
    title: str
    status: TaskStatus = TaskStatus.TODO
    component_id: Optional[str] = None
    blocked_by: List[str] = field(default_factory=list)

    @staticmethod
    def create(title: str, component_id: Optional[str] = None, blocked_by: Optional[List[str]] = None) -> "Task":
        return Task(id=_gen_id(), title=title, status=TaskStatus.TODO, component_id=component_id, blocked_by=blocked_by or [])


@dataclass
class Store:
    version: int
    locked: bool
    components: List[Component]
    tasks: List[Task]
    active_focus_component_id: Optional[str] = None

    @staticmethod
    def empty_locked() -> "Store":
        return Store(version=1, locked=True, components=[], tasks=[], active_focus_component_id=None)


# ---- Persistence -------------------------------------------------------------


class JsonStore:
    """Local single source of truth."""

    def __init__(self, path: Optional[Path] = None) -> None:
        self.path = path or _default_state_path()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self._save(Store.empty_locked())

    def load(self) -> Store:
        with self.path.open("r", encoding="utf-8") as f:
            raw = json.load(f)
        return _store_from_dict(raw)

    def save(self, store: Store) -> None:
        self._save(store)

    def _save(self, store: Store) -> None:
        tmp = self.path.with_suffix(".tmp")
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(_store_to_dict(store), f, indent=2, sort_keys=True)
        os.replace(tmp, self.path)


def _default_state_path() -> Path:
    return Path.home() / ".qchain" / "state.json"


# ---- Engine -----------------------------------------------------------------


RULES_TEXT = textwrap.dedent(
    """
    QuranChain AI — Internal Rules (enforced)
    1) Truth Over Alignment:
       - 'designed' vs 'coded' vs 'deployed' are reported exactly. No inflation.
    2) No New Systems Unless Explicitly Ordered:
       - Components are created only via 'add-component'. No implicit creation.
    3) Finish Before Expand:
       - 'continue' requires an active focus; progression is stepwise; no skipping dependencies.
    4) One Active Focus:
       - Exactly one primary objective at a time; setting a new focus replaces the old one.
    """
).strip()


class EngineError(Exception):
    """Raised on rule violations or impossible/undefined requests."""


class Engine:
    """Chief-of-Staff control engine. Keeps coherence, sequencing, and scope discipline."""

    def __init__(self, store: Store, repo: JsonStore) -> None:
        self.store = store
        self.repo = repo

    # ---- Guardrails & helpers ----

    def save(self) -> None:
        self.repo.save(self.store)

    def is_locked(self) -> bool:
        return self.store.locked

    def _find_component(self, name_or_id: str) -> Component:
        for c in self.store.components:
            if c.id == name_or_id or c.name.lower() == name_or_id.lower():
                return c
        raise EngineError(f"Component not found: {name_or_id}")

    def _ensure_not_locked(self) -> None:
        if self.is_locked():
            raise EngineError("Ecosystem is locked. Explicitly run: qchain lock --off  (or 'unlock')")

    def _set_focus(self, comp: Optional[Component]) -> None:
        self.store.active_focus_component_id = (comp.id if comp else None)

    def _active_component(self) -> Component:
        if not self.store.active_focus_component_id:
            raise EngineError("No active focus. Set one with: qchain focus set <COMPONENT>")
        return self._find_component(self.store.active_focus_component_id)

    # ---- Commands ----

    def lock(self, on: bool) -> str:
        self.store.locked = on
        self.save()
        return f"Ecosystem locked = {self.store.locked}"

    def add_component(self, name: str, initial_status: Status = Status.DESIGNED, notes: str = "") -> Component:
        self._ensure_not_locked()
        if any(c.name.lower() == name.lower() for c in self.store.components):
            raise EngineError(f"Component already exists: {name}")
        comp = Component.create(name=name, status=initial_status, notes=notes)
        self.store.components.append(comp)
        self.save()
        return comp

    def set_status(self, name_or_id: str, new_status: Status) -> str:
        comp = self._find_component(name_or_id)
        if comp.status == new_status:
            return f"No change: {comp.name} already {comp.status}"
        allowed = LEGAL_TRANSITIONS.get(comp.status, ())
        if new_status not in allowed:
            raise EngineError(f"Illegal transition {comp.status} → {new_status} for {comp.name}")
        comp.status = new_status
        self.save()
        return f"{comp.name} set to {comp.status}"

    def set_focus(self, name_or_id: str) -> str:
        comp = self._find_component(name_or_id)
        self._set_focus(comp)
        self.save()
        return f"Active focus: {comp.name} [{comp.status}]"

    def clear_focus(self) -> str:
        self._set_focus(None)
        self.save()
        return "Active focus cleared."

    def show_focus(self) -> str:
        if not self.store.active_focus_component_id:
            return "No active focus."
        comp = self._active_component()
        return f"Active focus: {comp.name} [{comp.status}]"

    def status(self) -> str:
        comp_lines = []
        by_status = {s: 0 for s in Status}
        for c in sorted(self.store.components, key=lambda x: x.name.lower()):
            comp_lines.append(f"- {c.name} :: {c.status}" + (f" :: {c.notes}" if c.notes else ""))
            by_status[c.status] += 1
        focus_line = self.show_focus()
        counts = ", ".join(f"{s.name}={by_status[s]}" for s in Status)
        return "\n".join([
            "STATE:",
            f"  locked={self.store.locked}, components={len(self.store.components)}, tasks={len(self.store.tasks)}",
            f"  counts: {counts}",
            f"  {focus_line}",
            "COMPONENTS:",
            *(f"  {line}" for line in comp_lines or ["  (none)"]),
        ])

    def add_task(self, title: str, component_name_or_id: Optional[str] = None) -> Task:
        comp_id = None
        if component_name_or_id:
            comp_id = self._find_component(component_name_or_id).id
        task = Task.create(title=title, component_id=comp_id)
        self.store.tasks.append(task)
        self.save()
        return task

    def list_tasks(self, component_name_or_id: Optional[str], include_done: bool) -> List[Task]:
        tasks = self.store.tasks
        if component_name_or_id:
            comp = self._find_component(component_name_or_id)
            tasks = [t for t in tasks if t.component_id == comp.id]
        if not include_done:
            tasks = [t for t in tasks if t.status != TaskStatus.DONE]
        return sorted(tasks, key=lambda t: (t.status != TaskStatus.TODO, t.title.lower()))

    def complete_task(self, task_id: str) -> str:
        task = next((t for t in self.store.tasks if t.id == task_id), None)
        if not task:
            raise EngineError(f"Task not found: {task_id}")
        blocked = [bid for bid in task.blocked_by if not self._is_task_done(bid)]
        if blocked:
            raise EngineError(f"Task is blocked by: {', '.join(blocked)}")
        task.status = TaskStatus.DONE
        self.save()
        return f"Task done: {task.title} ({task.id})"

    def _is_task_done(self, task_id: str) -> bool:
        t = next((x for x in self.store.tasks if x.id == task_id), None)
        return bool(t and t.status == TaskStatus.DONE)

    def plan(self, component_name_or_id: Optional[str]) -> List[Task]:
        comp = self._active_component() if component_name_or_id is None else self._find_component(component_name_or_id)
        # Avoid duplicating existing tasks for the same component
        existing_titles = {t.title for t in self.store.tasks if t.component_id == comp.id and t.status != TaskStatus.DONE}

        # Sequencing per status
        titles: List[str] = []
        if comp.status == Status.DESIGNED:
            titles = [
                "Implement core code",
                "Write unit tests for core",
                "Draft minimal docs (README)",
                "Mark code as complete",
            ]
        elif comp.status == Status.CODED_PARTIAL:
            titles = [
                "Finish core code",
                "Write unit tests for completed code",
                "Update docs",
            ]
        elif comp.status == Status.CODED:
            titles = [
                "Package and version the build",
                "Create deployment config",
                "Deploy to target",
            ]
        elif comp.status == Status.DEPLOYED:
            titles = []

        new_tasks: List[Task] = []
        for t in titles:
            if t not in existing_titles:
                new_tasks.append(Task.create(title=t, component_id=comp.id))
        self.store.tasks.extend(new_tasks)
        self.save()
        return new_tasks

    def continue_work(self) -> List[str]:
        """Progress the active focus; refuse if undefined."""
        comp = self._active_component()
        # Ensure tasks exist for the current phase
        created = self.plan(comp.id)
        # Pick next actionable tasks
        actionable = [t for t in self.list_tasks(comp.id, include_done=False) if t.status == TaskStatus.TODO]
        if not actionable and comp.status != Status.DEPLOYED:
            return ["No actionable tasks. Consider finalizing status or re-planning."]
        steps = [f"NEXT: {t.title}  (task_id={t.id})" for t in actionable[:5]]
        return steps

    def import_state(self, file_path: str) -> str:
        with open(file_path, "r", encoding="utf-8") as f:
            raw = json.load(f)
        imported = _store_from_dict(raw)
        # Sanity checks: no duplicates by name; legal statuses
        names = [c.name.lower() for c in imported.components]
        if len(names) != len(set(names)):
            raise EngineError("Import rejected: duplicate component names detected.")
        # Keep lock state as-is from imported file (explicit).
        self.store = imported
        self.save()
        return f"Imported state from {file_path}"

    def export_state(self, file_path: str) -> str:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(_store_to_dict(self.store), f, indent=2, sort_keys=True)
        return f"Exported state to {file_path}"

    def bootstrap_omarmind(self) -> str:
        """Add QuranChain AI (OmarMind) if store is empty. Keeps ecosystem locked to prevent drift."""
        if self.store.components:
            return "Store already has components; bootstrap skipped."
        # Intentional: it's an explicit bootstrap command, so allowed even if locked.
        om = Component.create("QuranChain AI (OmarMind)", Status.DESIGNED, notes="codebase: partial planned")
        self.store.components.append(om)
        self.store.active_focus_component_id = om.id
        self.save()
        return f"Bootstrapped: {om.name} [{om.status}] and set as active focus."


# ---- Serialization -----------------------------------------------------------


def _store_to_dict(store: Store) -> Dict:
    return {
        "version": store.version,
        "locked": store.locked,
        "active_focus_component_id": store.active_focus_component_id,
        "components": [asdict(c) for c in store.components],
        "tasks": [asdict(t) for t in store.tasks],
    }


def _store_from_dict(raw: Dict) -> Store:
    def comp_from(d: Dict) -> Component:
        # Defensive: coerce/validate status
        status = Status(d["status"])
        return Component(id=d["id"], name=d["name"], status=status, notes=d.get("notes", ""))

    def task_from(d: Dict) -> Task:
        st = TaskStatus(d["status"])
        return Task(
            id=d["id"],
            title=d["title"],
            status=st,
            component_id=d.get("component_id"),
            blocked_by=list(d.get("blocked_by", [])),
        )

    return Store(
        version=int(raw.get("version", 1)),
        locked=bool(raw.get("locked", True)),
        components=[comp_from(c) for c in raw.get("components", [])],
        tasks=[task_from(t) for t in raw.get("tasks", [])],
        active_focus_component_id=raw.get("active_focus_component_id"),
    )


# ---- CLI --------------------------------------------------------------------


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="qchain", description="QuranChain AI — Control & Clarity Engine")
    p.set_defaults(func=lambda *_: p.print_help())

    sub = p.add_subparsers(dest="cmd")

    sub.add_parser("rules", help="Show internal rules").set_defaults(func=cmd_rules)

    sp_status = sub.add_parser("status", help="Show truthful state")
    sp_status.set_defaults(func=cmd_status)

    sp_lock = sub.add_parser("lock", help="Lock/unlock ecosystem")
    sp_lock.add_argument("--off", action="store_true", help="Unlock (default is lock on)")
    sp_lock.set_defaults(func=cmd_lock)

    sp_add = sub.add_parser("add-component", help="Explicitly add a new component (requires unlocked)")
    sp_add.add_argument("name")
    sp_add.add_argument("--status", choices=[s.name for s in Status], default=Status.DESIGNED.name)
    sp_add.add_argument("--notes", default="")
    sp_add.set_defaults(func=cmd_add_component)

    sp_set = sub.add_parser("set-status", help="Move component through legal transitions only")
    sp_set.add_argument("name_or_id")
    sp_set.add_argument("status", choices=["designed", "coded-partial", "coded", "deployed"])
    sp_set.set_defaults(func=cmd_set_status)

    sp_focus = sub.add_parser("focus", help="Manage single active focus")
    sf = sp_focus.add_subparsers(dest="sub")
    sfs = sf.add_parser("set")
    sfs.add_argument("name_or_id")
    sfs.set_defaults(func=cmd_focus_set)
    sf.add_parser("clear").set_defaults(func=cmd_focus_clear)
    sf.add_parser("show").set_defaults(func=cmd_focus_show)

    sp_plan = sub.add_parser("plan", help="Create a concrete plan for a component (or active focus)")
    sp_plan.add_argument("name_or_id", nargs="?")
    sp_plan.set_defaults(func=cmd_plan)

    sp_cont = sub.add_parser("continue", help="Advance the active focus; refuses if undefined")
    sp_cont.set_defaults(func=cmd_continue)

    sp_t = sub.add_parser("task", help="Manage tasks")
    st = sp_t.add_subparsers(dest="tcmd")
    ta = st.add_parser("add")
    ta.add_argument("title")
    ta.add_argument("--component", default=None)
    ta.set_defaults(func=cmd_task_add)
    tl = st.add_parser("list")
    tl.add_argument("--component", default=None)
    tl.add_argument("--all", action="store_true")
    tl.set_defaults(func=cmd_task_list)
    td = st.add_parser("done")
    td.add_argument("task_id")
    td.set_defaults(func=cmd_task_done)

    sp_state = sub.add_parser("state", help="Import/export single source of truth")
    sst = sp_state.add_subparsers(dest="scmd")
    si = sst.add_parser("import")
    si.add_argument("file")
    si.set_defaults(func=cmd_state_import)
    se = sst.add_parser("export")
    se.add_argument("file")
    se.set_defaults(func=cmd_state_export)

    sp_boot = sub.add_parser("bootstrap-omarmind", help="Add 'QuranChain AI (OmarMind)' and set focus (keeps locked)")
    sp_boot.set_defaults(func=cmd_bootstrap_omarmind)

    return p


# ---- Command handlers --------------------------------------------------------


def _engine() -> Engine:
    repo = JsonStore()
    return Engine(repo.load(), repo)


def cmd_rules(args: argparse.Namespace) -> None:
    print(RULES_TEXT)


def cmd_status(args: argparse.Namespace) -> None:
    eng = _engine()
    print(eng.status())


def cmd_lock(args: argparse.Namespace) -> None:
    eng = _engine()
    print(eng.lock(on=not args.off))


def cmd_add_component(args: argparse.Namespace) -> None:
    eng = _engine()
    try:
        comp = eng.add_component(args.name, Status[args.status], notes=args.notes)
        print(f"Added: {comp.name} [{comp.status}]")
    except EngineError as e:
        print(f"REFUSED: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_set_status(args: argparse.Namespace) -> None:
    mapping = {
        "designed": Status.DESIGNED,
        "coded-partial": Status.CODED_PARTIAL,
        "coded": Status.CODED,
        "deployed": Status.DEPLOYED,
    }
    eng = _engine()
    try:
        print(eng.set_status(args.name_or_id, mapping[args.status]))
    except EngineError as e:
        print(f"REFUSED: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_focus_set(args: argparse.Namespace) -> None:
    eng = _engine()
    try:
        print(eng.set_focus(args.name_or_id))
    except EngineError as e:
        print(f"REFUSED: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_focus_clear(args: argparse.Namespace) -> None:
    eng = _engine()
    print(eng.clear_focus())


def cmd_focus_show(args: argparse.Namespace) -> None:
    eng = _engine()
    print(eng.show_focus())


def cmd_plan(args: argparse.Namespace) -> None:
    eng = _engine()
    try:
        tasks = eng.plan(args.name_or_id)
        if tasks:
            for t in tasks:
                print(f"PLAN: {t.title} (task_id={t.id})")
        else:
            print("No new tasks generated.")
    except EngineError as e:
        print(f"REFUSED: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_continue(args: argparse.Namespace) -> None:
    eng = _engine()
    try:
        for line in eng.continue_work():
            print(line)
    except EngineError as e:
        print(f"REFUSED: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_task_add(args: argparse.Namespace) -> None:
    eng = _engine()
    try:
        t = eng.add_task(args.title, args.component)
        print(f"TASK: {t.title} (task_id={t.id})")
    except EngineError as e:
        print(f"REFUSED: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_task_list(args: argparse.Namespace) -> None:
    eng = _engine()
    try:
        tasks = eng.list_tasks(args.component, include_done=args.all)
        if not tasks:
            print("No tasks.")
            return
        for t in tasks:
            comp_name = "(none)"
            if t.component_id:
                comp = eng._find_component(t.component_id)
                comp_name = comp.name
            print(f"[{t.status}] {t.title}  (task_id={t.id})  :: {comp_name}")
    except EngineError as e:
        print(f"REFUSED: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_task_done(args: argparse.Namespace) -> None:
    eng = _engine()
    try:
        print(eng.complete_task(args.task_id))
    except EngineError as e:
        print(f"REFUSED: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_state_import(args: argparse.Namespace) -> None:
    eng = _engine()
    try:
        print(eng.import_state(args.file))
    except EngineError as e:
        print(f"REFUSED: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_state_export(args: argparse.Namespace) -> None:
    eng = _engine()
    print(eng.export_state(args.file))


def cmd_bootstrap_omarmind(args: argparse.Namespace) -> None:
    eng = _engine()
    print(eng.bootstrap_omarmind())


# ---- Entrypoint -------------------------------------------------------------


def main(argv: Optional[List[str]] = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    # 'why': any EngineError should be a hard stop to prevent silent drift.
    try:
        args.func(args)
    except EngineError as e:
        print(f"REFUSED: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
