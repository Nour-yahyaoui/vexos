"""Matlab-vk language core: a small MATLAB-style language.

Supported
  numbers, 'text', variables, vectors [1, 2, 3], ranges a:b and a:step:b
  arithmetic  + - * / ^   and element-wise  .* ./ .^
  comparisons == ~= < <= > >=, logic & |, unary - + ~
  indexing with 1-based indices and ':'  (x(2), x(1:3), x(:), x(k) = v)
  built-in functions (see BUILTINS) and constants pi, e, inf, nan, eps
  command words: clc, clear, clf, close, figure, hold, grid, who, format, help

Statements end at a newline, ';' (hide the result) or ','.
Comments start with %.  Loops, functions and matrices are not supported yet.
"""
import math
import random
import re

MAX_LEN = 1_000_000

COMMAND_WORDS = {"clc", "clear", "clf", "close", "figure", "hold", "grid", "who", "format", "help"}
GRAPHICS = {"plot", "figure", "subplot", "hold", "grid", "title", "xlabel", "ylabel",
            "legend", "close", "clf", "saveas", "gcf"}

HELP = """\
Matlab-vk language

  x = 0:0.001:1;              range from 0 to 1, step 0.001 (';' hides output)
  y = sin(2*pi*5*x);          vectors work with + - .* ./ .^ and functions
  figure                      open a new figure window
  gcf                         number of the current figure
  plot(x, y, 'r--')           plot a line (colour r g b k m c y w, style - -- : -.)
  hold on / hold off          keep or replace plots on the current axes
  grid on / grid off          show grid lines
  title('Text')  xlabel('t')  ylabel('y')  legend('one', 'two')
  subplot(2, 1, 1)            split the figure into a grid of axes
  clc                         clear the screen
  clear  /  clear x           delete all variables, or one variable
  close all                   close every figure
  clf                         clear the current figure
  saveas(gcf, 'plot.html')    save a figure as a standalone page
  who                         list variables
  help                        this text

Functions: sin cos tan asin acos atan sinh cosh tanh exp log log10 log2 sqrt
  abs floor ceil round fix sign mod rem atan2 square sawtooth sum prod mean
  max min length numel rms cumsum diff linspace zeros ones rand randn num2str
  disp
Constants: pi e inf nan eps
"""


class MatlabError(Exception):
    """An error the user should see, worded like MATLAB's messages."""


TOKEN_RE = re.compile(r"""
    (?P<ws>[ \t\r]+)
  | (?P<cont>\.\.\.[^\n]*\n)
  | (?P<comment>%[^\n]*)
  | (?P<num>(?:\d+(?:\.(?![*/\\^]))?\d*|\.\d+)(?:[eE][+-]?\d+)?)
  | (?P<str>'(?:[^'\n]|'')*'|"[^"\n]*")
  | (?P<id>[A-Za-z_][A-Za-z_0-9]*)
  | (?P<op>\.\*|\./|\.\^|==|~=|<=|>=|&&|\|\||[-+*/^<>=&|~:(),;\[\]])
  | (?P<nl>\n)
""", re.X)


def tokenize(src):
    toks, pos, spaced = [], 0, False
    while pos < len(src):
        m = TOKEN_RE.match(src, pos)
        if m is None:
            raise MatlabError(f"invalid character '{src[pos]}'")
        pos = m.end()
        kind, text = m.lastgroup, m.group()
        if kind in ("ws", "cont", "comment"):
            spaced = True
            continue
        if kind == "nl":
            toks.append(("nl", "\n", spaced))
        elif kind == "num":
            toks.append(("num", float(text), spaced))
        elif kind == "str":
            body = text[1:-1]
            toks.append(("str", body.replace("''", "'") if text[0] == "'" else body, spaced))
        elif kind == "id":
            toks.append(("id", text, spaced))
        else:
            toks.append(("op", {"&&": "&", "||": "|"}.get(text, text), spaced))
        spaced = False
    toks.append(("eof", None, spaced))
    return toks


def describe_token(tok):
    if tok[0] in ("nl", "eof"):
        return "end of line"
    return f"'{tok[1]}'"


class Parser:
    def __init__(self, toks):
        self.toks = toks
        self.i = 0
        self.in_vec = 0  # > 0 while reading the inside of [ ]

    def peek(self, k=0):
        return self.toks[min(self.i + k, len(self.toks) - 1)]

    def is_op(self, val, k=0):
        t = self.peek(k)
        return t[0] == "op" and t[1] == val

    def take(self):
        t = self.peek()
        if t[0] != "eof":
            self.i += 1
        return t

    def expect(self, val):
        if not self.is_op(val):
            raise MatlabError(f"expected '{val}' but found {describe_token(self.peek())}")
        self.i += 1

    def program(self):
        stmts = []
        while True:
            while self.peek()[0] == "nl" or self.is_op(";") or self.is_op(","):
                self.i += 1
            if self.peek()[0] == "eof":
                return stmts
            stmts.append(self.statement())

    def terminator(self):
        """Consume the end of a statement. Returns True if the result should be shown."""
        if self.is_op(";"):
            self.i += 1
            return False
        if self.is_op(","):
            self.i += 1
            return True
        if self.peek()[0] in ("nl", "eof"):
            return True
        raise MatlabError(f"unexpected {describe_token(self.peek())}")

    def statement(self):
        t, nxt = self.peek(), self.peek(1)
        is_cmd_shape = nxt[0] in ("id", "num", "str", "nl", "eof") or (
            nxt[0] == "op" and nxt[1] in (";", ","))
        if t[0] == "id" and t[1] in COMMAND_WORDS and is_cmd_shape:
            self.i += 1
            args = []
            while self.peek()[0] in ("id", "num", "str"):
                a = self.take()
                args.append(format_num(a[1]) if a[0] == "num" else a[1])
            return ("cmd", t[1], args, self.terminator())
        expr = self.expression()
        if self.is_op("="):
            if expr[0] not in ("var", "call"):
                raise MatlabError("invalid assignment target")
            self.i += 1
            rhs = self.expression()
            return ("assign", expr, rhs, self.terminator())
        return ("expr", expr, self.terminator())

    def expression(self):
        return self.or_expr()

    def binary(self, sub, ops):
        left = sub()
        while self.peek()[0] == "op" and self.peek()[1] in ops:
            op = self.take()[1]
            left = ("bin", op, left, sub())
        return left

    def or_expr(self):
        return self.binary(self.and_expr, ("|",))

    def and_expr(self):
        return self.binary(self.cmp_expr, ("&",))

    def cmp_expr(self):
        return self.binary(self.range_expr, ("==", "~=", "<", "<=", ">", ">="))

    def range_expr(self):
        first = self.additive()
        if not self.is_op(":"):
            return first
        self.i += 1
        second = self.additive()
        if self.is_op(":"):
            self.i += 1
            return ("range", first, second, self.additive())
        return ("range", first, None, second)

    def additive(self):
        left = self.multiplicative()
        while self.peek()[0] == "op" and self.peek()[1] in ("+", "-"):
            if self.in_vec and self.is_vec_separator():
                break  # [1 -2] is two elements, [1 - 2] is one
            op = self.take()[1]
            left = ("bin", op, left, self.multiplicative())
        return left

    def is_vec_separator(self):
        t = self.peek()
        return t[2] and not self.peek(1)[2]

    def starts_element(self):
        t, nxt = self.peek(), self.peek(1)
        if not t[2] or t[0] in ("nl", "eof"):
            return False
        if t[0] in ("num", "str", "id"):
            return True
        if t[0] == "op" and t[1] in ("(", "["):
            return True
        return t[0] == "op" and t[1] in ("-", "+") and not nxt[2]

    def multiplicative(self):
        return self.binary(self.unary, ("*", "/", ".*", "./"))

    def unary(self):
        if self.peek()[0] == "op" and self.peek()[1] in ("-", "+", "~"):
            op = self.take()[1]
            return ("un", op, self.unary())
        return self.power()

    def power(self):
        base = self.postfix()
        while self.peek()[0] == "op" and self.peek()[1] in ("^", ".^"):
            op = self.take()[1]
            base = ("bin", op, base, self.power_operand())
        return base

    def power_operand(self):
        if self.peek()[0] == "op" and self.peek()[1] in ("-", "+", "~"):
            op = self.take()[1]
            return ("un", op, self.power_operand())
        return self.postfix()

    def postfix(self):
        t = self.take()
        if t[0] == "num":
            return ("num", t[1])
        if t[0] == "str":
            return ("str", t[1])
        if t[0] == "id":
            if self.is_op("("):
                return ("call", t[1], self.arguments())
            return ("var", t[1])
        if t[0] == "op" and t[1] == "(":
            saved, self.in_vec = self.in_vec, 0
            e = self.expression()
            self.in_vec = saved
            self.expect(")")
            return e
        if t[0] == "op" and t[1] == "[":
            items = []
            self.in_vec += 1
            if not self.is_op("]"):
                items.append(self.expression())
                while True:
                    if self.is_op(","):
                        self.i += 1
                        items.append(self.expression())
                    elif self.is_op(";"):
                        raise MatlabError("matrices with rows (';') are not supported yet")
                    elif self.starts_element():
                        items.append(self.expression())
                    else:
                        break
            self.in_vec -= 1
            self.expect("]")
            return ("vec", items)
        raise MatlabError(f"unexpected {describe_token(t)}")

    def arguments(self):
        self.expect("(")
        saved, self.in_vec = self.in_vec, 0
        args = []
        try:
            if self.is_op(")"):
                self.i += 1
                return args
            while True:
                if self.is_op(":") and (self.is_op(")", 1) or self.is_op(",", 1)):
                    self.i += 1
                    args.append(("colon",))
                else:
                    args.append(self.expression())
                if self.is_op(","):
                    self.i += 1
                    continue
                self.expect(")")
                return args
        finally:
            self.in_vec = saved


# ---------------------------------------------------------------- values
# A value is a float (scalar), a list of floats (row vector) or a str (text).

COLON = object()


def format_num(v):
    if float(v).is_integer() and abs(v) < 1e15:
        return str(int(v))
    return f"{v:.6g}"


def describe(v):
    if isinstance(v, str):
        return f"'{v}'"
    if isinstance(v, list):
        if len(v) <= 12:
            return "[" + " ".join(format_num(x) for x in v) + "]"
        head = " ".join(format_num(x) for x in v[:4])
        return f"1x{len(v)} double  [{head} ... {format_num(v[-1])}]"
    return format_num(v)


def to_list(v):
    if isinstance(v, str):
        raise MatlabError("text is not allowed here")
    return v if isinstance(v, list) else [v]


def scalar(v):
    if isinstance(v, list):
        if len(v) == 1:
            return v[0]
        raise MatlabError("expected a single number, got a vector")
    if isinstance(v, str):
        raise MatlabError("expected a number, got text")
    return v


def elementwise(a, b, f):
    if isinstance(a, str) or isinstance(b, str):
        raise MatlabError("text cannot be used in arithmetic")
    if isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            raise MatlabError(f"vectors must be the same length ({len(a)} and {len(b)})")
        return [f(x, y) for x, y in zip(a, b)]
    if isinstance(a, list):
        return [f(x, b) for x in a]
    if isinstance(b, list):
        return [f(a, y) for y in b]
    return f(a, b)


def _div(x, y):
    if y == 0:
        if x == 0 or math.isnan(x):
            return math.nan
        return math.copysign(math.inf, x)
    return x / y


def _pow(x, y):
    try:
        return math.pow(x, y)
    except OverflowError:
        return math.inf
    except ValueError:
        return math.nan


def _bool(flag):
    return 1.0 if flag else 0.0


def binary_op(op, a, b):
    if op == "*":
        if isinstance(a, list) and isinstance(b, list):
            raise MatlabError("use .* for element-wise products of vectors")
        return elementwise(a, b, lambda x, y: x * y)
    if op == "/":
        if isinstance(b, list):
            raise MatlabError("use ./ for element-wise division by a vector")
        return elementwise(a, b, _div)
    if op == "^":
        if isinstance(a, list) or isinstance(b, list):
            raise MatlabError("use .^ for element-wise powers of vectors")
        return _pow(a, b)
    table = {
        "+": lambda x, y: x + y,
        "-": lambda x, y: x - y,
        ".*": lambda x, y: x * y,
        "./": _div,
        ".^": _pow,
        "==": lambda x, y: _bool(x == y),
        "~=": lambda x, y: _bool(x != y),
        "<": lambda x, y: _bool(x < y),
        "<=": lambda x, y: _bool(x <= y),
        ">": lambda x, y: _bool(x > y),
        ">=": lambda x, y: _bool(x >= y),
        "&": lambda x, y: _bool(x and y),
        "|": lambda x, y: _bool(x or y),
    }
    return elementwise(a, b, table[op])


def make_range(a, step, b):
    a, b = scalar(a), scalar(b)
    s = 1.0 if step is None else scalar(step)
    if s == 0 or (b - a) * s < 0:
        return []
    n = int(math.floor((b - a) / s + 1e-10)) + 1
    if n > MAX_LEN:
        raise MatlabError("range is too large")
    return [a + i * s for i in range(n)]


def to_index(p, n):
    if not float(p).is_integer():
        raise MatlabError(f"index must be a whole number, got {format_num(p)}")
    k = int(p)
    if k < 1 or k > n:
        raise MatlabError(f"index {k} is out of bounds (length {n})")
    return k - 1


def index_value(base, idxs):
    if isinstance(base, str):
        raise MatlabError("indexing text is not supported")
    if len(idxs) != 1:
        raise MatlabError("only one index is supported")
    data = to_list(base)
    ix = idxs[0]
    if ix is COLON:
        return list(data)
    if isinstance(ix, list):
        return [data[to_index(p, len(data))] for p in ix]
    return data[to_index(ix, len(data))]


# ---------------------------------------------------------------- builtins

def _safe(fn, x):
    try:
        return float(fn(x))
    except (ValueError, OverflowError, ZeroDivisionError):
        return math.nan


def _map(v, fn):
    if isinstance(v, str):
        raise MatlabError("text is not allowed here")
    if isinstance(v, list):
        return [_safe(fn, x) for x in v]
    return _safe(fn, v)


def _round_half_away(x):
    return math.copysign(math.floor(abs(x) + 0.5), x)


def _log(x):
    if x == 0:
        return -math.inf
    return math.log(x)


def _sawtooth(t):
    return 2.0 * (t / (2 * math.pi) - math.floor(t / (2 * math.pi) + 0.5))


UNARY = {
    "sin": math.sin, "cos": math.cos, "tan": math.tan,
    "asin": math.asin, "acos": math.acos, "atan": math.atan,
    "sinh": math.sinh, "cosh": math.cosh, "tanh": math.tanh,
    "exp": math.exp, "log": _log, "log10": math.log10, "log2": math.log2,
    "sqrt": math.sqrt, "abs": abs, "floor": math.floor, "ceil": math.ceil,
    "round": _round_half_away, "fix": math.trunc,
    "sign": lambda x: float((x > 0) - (x < 0)),
    "square": lambda t: 1.0 if math.sin(t) >= 0 else -1.0,
    "sawtooth": _sawtooth,
}


def _one(name, args):
    if len(args) != 1:
        raise MatlabError(f"{name} needs one argument")
    return args[0]


def _two(name, args):
    if len(args) != 2:
        raise MatlabError(f"{name} needs two arguments")
    return args[0], args[1]


def _reduce(name, fn):
    def run(args):
        v = to_list(_one(name, args))
        if not v:
            raise MatlabError(f"{name} of an empty vector")
        return float(fn(v))
    return run


def _count_arg(args):
    """zeros(n) or zeros(1, n): the last argument is the length."""
    if not args:
        return 1
    n = scalar(args[-1])
    if not float(n).is_integer() or n < 0:
        raise MatlabError("size must be a whole number")
    if n > MAX_LEN:
        raise MatlabError("vector is too large")
    return int(n)


def _linspace(args):
    if len(args) not in (2, 3):
        raise MatlabError("linspace(a, b) or linspace(a, b, n)")
    a, b = scalar(args[0]), scalar(args[1])
    n = int(scalar(args[2])) if len(args) == 3 else 100
    if n < 1:
        return []
    if n == 1:
        return [b]
    return [a + (b - a) * k / (n - 1) for k in range(n)]


def _mod(args):
    a, b = _two("mod", args)
    return elementwise(a, b, lambda x, y: x if y == 0 else x - math.floor(x / y) * y)


def _rem(args):
    a, b = _two("rem", args)
    return elementwise(a, b, lambda x, y: x if y == 0 else x - math.trunc(x / y) * y)


def _atan2(args):
    a, b = _two("atan2", args)
    return elementwise(a, b, math.atan2)


def _maxmin(name, pick):
    def run(args):
        if len(args) == 2:
            return elementwise(args[0], args[1], lambda x, y: pick(x, y))
        return _reduce(name, lambda v: pick(v))(args)
    return run


def _cumsum(args):
    out, total = [], 0.0
    for x in to_list(_one("cumsum", args)):
        total += x
        out.append(total)
    return out


def _diff(args):
    v = to_list(_one("diff", args))
    return [v[k + 1] - v[k] for k in range(len(v) - 1)]


def _num2str(args):
    v = _one("num2str", args)
    if isinstance(v, str):
        return v
    return " ".join(format_num(x) for x in to_list(v))


def _rms(v):
    return math.sqrt(sum(x * x for x in v) / len(v))


BUILTINS = {
    "mod": _mod,
    "rem": _rem,
    "atan2": _atan2,
    "sum": _reduce("sum", sum),
    "prod": _reduce("prod", lambda v: math.prod(v)),
    "mean": _reduce("mean", lambda v: sum(v) / len(v)),
    "max": _maxmin("max", max),
    "min": _maxmin("min", min),
    "length": lambda args: float(len(to_list(_one("length", args)))),
    "numel": lambda args: float(len(to_list(_one("numel", args)))),
    "rms": _reduce("rms", _rms),
    "cumsum": _cumsum,
    "diff": _diff,
    "linspace": _linspace,
    "zeros": lambda args: [0.0] * _count_arg(args),
    "ones": lambda args: [1.0] * _count_arg(args),
    "rand": lambda args: [random.random() for _ in range(_count_arg(args))],
    "randn": lambda args: [random.gauss(0.0, 1.0) for _ in range(_count_arg(args))],
    "num2str": _num2str,
}
for _name, _fn in UNARY.items():
    BUILTINS[_name] = (lambda n, f: lambda args: _map(_one(n, args), f))(_name, _fn)

CONSTANTS = {"pi": math.pi, "e": math.e, "inf": math.inf, "Inf": math.inf,
             "nan": math.nan, "NaN": math.nan, "eps": 2.220446049250313e-16}


# ---------------------------------------------------------------- interpreter

class Interpreter:
    def __init__(self, graphics, out):
        self.vars = {}
        self.gfx = graphics
        self.out = out

    def run(self, src):
        for stmt in Parser(tokenize(src)).program():
            self.execute(stmt)

    def execute(self, stmt):
        kind = stmt[0]
        if kind == "cmd":
            self.command(stmt[1], stmt[2])
        elif kind == "assign":
            _, target, rhs, show = stmt
            value = self.evaluate(rhs)
            if value is None:
                raise MatlabError("the right side produces no value")
            if target[0] == "var":
                name = target[1]
                self.vars[name] = value
            else:
                name = target[1]
                self.assign_index(name, target[2], value)
            if show:
                self.out(f"{name} = {describe(self.vars[name])}")
        else:
            _, node, show = stmt
            value = self.evaluate(node)
            if value is None:
                return
            if node[0] == "var" and node[1] in self.vars:
                name = node[1]
            else:
                name = "ans"
                self.vars["ans"] = value
            if show:
                self.out(f"{name} = {describe(value)}")

    def assign_index(self, name, arg_nodes, value):
        if len(arg_nodes) != 1:
            raise MatlabError("only one index is supported")
        base = to_list(self.vars.get(name, []))
        ix = self.evaluate_arg(arg_nodes[0])
        vals = to_list(value)
        if ix is COLON:
            positions = list(range(len(base)))
        elif isinstance(ix, list):
            positions = [int(p) - 1 for p in ix]
        else:
            positions = [int(ix) - 1]
        if any(p < 0 for p in positions):
            raise MatlabError("index must be 1 or larger")
        if len(vals) != 1 and len(vals) != len(positions):
            raise MatlabError("assignment needs one value or as many values as indices")
        base = list(base)
        for k, p in enumerate(positions):
            while p >= len(base):
                base.append(0.0)
            base[p] = vals[0] if len(vals) == 1 else vals[k]
        self.vars[name] = base[0] if len(base) == 1 else base

    def command(self, word, args):
        if word == "clc":
            self.out("\033[2J\033[H", end="")
        elif word == "clear":
            if not args or args in (["all"], ["variables"]):
                self.vars.clear()
            else:
                for n in args:
                    self.vars.pop(n, None)
        elif word == "who":
            names = sorted(self.vars)
            self.out("  ".join(names) if names else "no variables")
        elif word == "format":
            return
        elif word == "help":
            self.out(HELP, end="")
        else:
            self.gfx.call(word, args)

    def evaluate(self, node):
        k = node[0]
        if k == "num" or k == "str":
            return node[1]
        if k == "var":
            name = node[1]
            if name in self.vars:
                return self.vars[name]
            return self.call_function(name, [])
        if k == "call":
            name, arg_nodes = node[1], node[2]
            if name in self.vars:
                base = self.vars[name]
                return index_value(base, [self.evaluate_arg(a) for a in arg_nodes])
            return self.call_function(name, [self.evaluate(a) for a in arg_nodes])
        if k == "range":
            step = None if node[2] is None else self.evaluate(node[2])
            return make_range(self.evaluate(node[1]), step, self.evaluate(node[3]))
        if k == "vec":
            out = []
            for item in node[1]:
                v = self.evaluate(item)
                out.extend(to_list(v))
            return out
        if k == "un":
            v = self.evaluate(node[2])
            if node[1] == "-":
                return elementwise(v, 0.0, lambda x, y: -x) if isinstance(v, list) else -scalar(v)
            if node[1] == "~":
                return elementwise(v, 0.0, lambda x, y: _bool(x == 0)) if isinstance(v, list) else _bool(scalar(v) == 0)
            return v
        if k == "bin":
            return binary_op(node[1], self.evaluate(node[2]), self.evaluate(node[3]))
        if k == "colon":
            raise MatlabError("':' is only valid inside an index")
        raise MatlabError("cannot evaluate this expression")

    def evaluate_arg(self, node):
        if node[0] == "colon":
            return COLON
        return scalar_or_list(self.evaluate(node))

    def call_function(self, name, args):
        if name in CONSTANTS and not args:
            return CONSTANTS[name]
        if name in GRAPHICS:
            return self.gfx.call(name, args)
        if name in BUILTINS:
            return BUILTINS[name](args)
        if name in CONSTANTS:
            raise MatlabError(f"{name} takes no arguments")
        raise MatlabError(f"'{name}' is not defined")


def scalar_or_list(v):
    if v is None:
        raise MatlabError("the expression produces no value")
    return v
