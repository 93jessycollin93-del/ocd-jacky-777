"""Command dispatch.

ARCHITECTURE.md asks for this module by name and says why: map commands to
handlers, keep behaviour modular, and avoid "giant fragile condition chains".
So commands register themselves against a table and are looked up, never
matched by a growing if/elif ladder.

The dispatcher knows nothing about Jackie. It takes a line of input and a
context object it never inspects, and hands both to whichever handler owns
the verb. That keeps the CLI, and any later Telegram front end, on the same
command surface.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

# A handler receives the raw argument string and the caller's context.
Handler = Callable[[str, Any], str]

PREFIX = "/"


@dataclass(frozen=True)
class Command:
    name: str
    handler: Handler
    summary: str
    usage: str = ""
    aliases: tuple[str, ...] = ()

    def render_help(self) -> str:
        usage = self.usage or f"{PREFIX}{self.name}"
        alias = f"  (also {', '.join(PREFIX + a for a in self.aliases)})" if self.aliases else ""
        return f"  {usage:<28} {self.summary}{alias}"


class UnknownCommand(LookupError):
    """Raised when input starts with the prefix but names nothing registered."""

    def __init__(self, name: str, suggestions: tuple[str, ...] = ()) -> None:
        self.name = name
        self.suggestions = suggestions
        super().__init__(name)


@dataclass
class Dispatcher:
    _commands: dict[str, Command] = field(default_factory=dict)
    _order: list[str] = field(default_factory=list)

    def command(
        self,
        name: str,
        summary: str,
        usage: str = "",
        aliases: tuple[str, ...] = (),
    ) -> Callable[[Handler], Handler]:
        """Decorator registering a handler under a name and any aliases."""

        def decorate(handler: Handler) -> Handler:
            self.register(
                Command(name=name, handler=handler, summary=summary, usage=usage, aliases=aliases)
            )
            return handler

        return decorate

    def register(self, command: Command) -> None:
        for key in (command.name, *command.aliases):
            if key in self._commands:
                raise ValueError(f"command {key!r} is already registered")
            self._commands[key] = command
        self._order.append(command.name)

    def is_command(self, text: str) -> bool:
        return text.strip().startswith(PREFIX)

    def resolve(self, text: str) -> tuple[Command, str]:
        """Split input into its command and argument string."""
        stripped = text.strip()
        if not self.is_command(stripped):
            raise ValueError("not a command")

        body = stripped[len(PREFIX):]
        name, _, args = body.partition(" ")
        name = name.lower()

        command = self._commands.get(name)
        if command is None:
            raise UnknownCommand(name, self._suggest(name))
        return command, args.strip()

    def dispatch(self, text: str, context: Any) -> str:
        command, args = self.resolve(text)
        return command.handler(args, context)

    def commands(self) -> list[Command]:
        """Registered commands in registration order, each listed once."""
        return [self._commands[name] for name in self._order]

    def help_text(self) -> str:
        return "\n".join(command.render_help() for command in self.commands())

    def _suggest(self, name: str) -> tuple[str, ...]:
        """Cheap prefix/substring suggestions — enough to catch a typo."""
        return tuple(
            key for key in self._commands
            if key.startswith(name[:2]) or name in key
        )[:3]
