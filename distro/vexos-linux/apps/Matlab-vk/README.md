# Matlab-vk

A small signal calculator and plotter for VexOS. It creates waveforms, adds and multiplies them, plots them in the terminal, and saves them as SVG. It uses only the Python standard library.

## Install with vpk (on your VexOS machine)

Add the package repository once, then install by name:

```sh
echo https://raw.githubusercontent.com/Nour-yahyaoui/vexos/arena/fd4ab751-vexos/distro/vexos-linux/repo | sudo tee -a /etc/vpk/sources.list
sudo vpk update
vpk search matlab
sudo vpk -Set Matlab-vk
```

Then run it:

```sh
Matlab-vk                    # interactive session
Matlab-vk examples/demo.mvk  # run a script
```

Matlab-vk needs `python3` on the system. The package does not pull it in, because vpk only installs packages from its own repository.

## Commands

Run `help` inside the app. In short:

- Waves: `sine`, `cos`, `square`, `saw`, `tri`, `noise`. Example: `sine s1 5 1 200` means 5 Hz, amplitude 1, 200 samples.
- Math: `add`, `sub`, `mul`, `scale`, `delay`.
- Output: `show NAME` (terminal plot), `svg NAME FILE.svg`, `stats NAME`, `list`, `rm NAME`.

## Build the package

```sh
sh distro/vexos-linux/apps/Matlab-vk/build.sh
```

This writes `Matlab-vk-1.0-1.vpk` and `INDEX` into `distro/vexos-linux/repo/`. Commit that folder so vpk can download it.
