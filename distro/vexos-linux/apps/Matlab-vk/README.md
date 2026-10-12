# Matlab-vk 1.1

A small MATLAB-style calculator and plotter for VexOS. Write MATLAB-style
statements, get values back, and see plots as modern pages in your browser.

Written in Python (standard library only). Python 3 must be installed.

## Run it

```sh
Matlab-vk                 # interactive prompt (type quit or exit to leave)
Matlab-vk demo.mvk        # run a script file
Matlab-vk --help          # language reference
Matlab-vk --version
```

Install with VexOS's package manager, then run it from any terminal:

```sh
vpk -Set Matlab-vk        # same as: vpk install Matlab-vk
```

## The language

```matlab
a = 3                     % prints a = 3
b = a * 2 + 1;            % ';' hides the result
x = 0:0.25:1              % range: start:step:stop
y = sin(2*pi*x)           % functions work on whole vectors
v = [1 2 3]               % spaces separate elements
w = [1 -2]                % two elements; [1 - 2] is one element
z = x.^2 + 1              % element-wise: .* ./ .^
x(2)                      % indexing starts at 1
x(2) = 9                  % assign one element
m = max(y)
```

Errors show the line number when you run a script:

```
error: demo.mvk, line 4: 'foo' is not defined
```

### Commands and graphics

| Command | What it does |
|---|---|
| `plot(x, y)` | plot a line; `plot(y)` uses 1, 2, 3 as x |
| `plot(x, y, 'r--')` | style: colour `r g b k m c y w`, line `-` `--` `:` `-.`, marker `o x + * s d .` |
| `hold on` / `hold off` | add to the current plot, or start a new one |
| `grid on` / `grid off` | grid lines |
| `title('..')`, `xlabel('..')`, `ylabel('..')` | labels |
| `legend('a', 'b')` | name the series; `legend off` removes the labels |
| `figure` | open a new figure window |
| `subplot(2, 1, 1)` | split the figure into a grid of plots |
| `clf` | clear the current figure |
| `close all` | close every figure |
| `gcf` | number of the current figure |
| `saveas(gcf, 'plot.html')` | save a figure as one standalone page |
| `clc` | clear the screen |
| `clear` / `clear x` | delete all variables, or one variable |
| `who` | list variables |
| `help` | show the language reference |

Functions: `sin cos tan asin acos atan sinh cosh tanh exp log log10 log2 sqrt
abs floor ceil round fix sign mod rem atan2 square sawtooth sum prod mean max
min length numel rms cumsum diff linspace zeros ones rand randn num2str disp`.
Constants: `pi e inf nan eps`.

### Not in this version

Loops, `if`, user-defined functions, and matrices with rows (`[1 2; 3 4]`).

## Figures

Each figure is a page in `~/Matlab-vk/figures/`:

- `figure-N.html`: the page. It shows a dark theme, a hover readout with the
  x and y values under the pointer, and labelled axes.
- `figure-N.data.js`: the data. The page reloads it about once a second, so
  the plot updates while you keep typing commands.

The first time a figure is created, the page opens in your browser (through
`xdg-open`, or Firefox). If there is no display, Matlab-vk prints a short
summary of each plot and writes the same pages. Set `MATLAB_VK_TEXT=1` to
force text mode.

`saveas(gcf, 'name.html')` writes a standalone page with the data embedded.
It does not update and can be copied or shared.

Set `MATLAB_VK_FIGURES` to change the output folder.

## Files

```
examples/demo.mvk                    example script
stage/usr/bin/Matlab-vk              launcher (REPL, script mode, --help)
stage/usr/lib/matlab-vk/lang.py      language: tokenizer, parser, evaluator, builtins
stage/usr/lib/matlab-vk/figures.py   figure state and browser pages
build.sh                             builds the .vpk package and repo index
```

## Build the package

```sh
sh build.sh
```

This writes `distro/vexos-linux/repo/Matlab-vk-1.1-1.vpk` and updates the
repo `INDEX`.

## Changes from 1.0

Version 1.0 used its own commands (`sine`, `add`, `show`, `svg`). Version 1.1
uses MATLAB syntax and browser figures. The old scripts do not run as-is.
