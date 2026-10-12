# VexOS Desktop 1.0 (Debian trixie based)

A Debian-based live desktop that boots in VirtualBox (BIOS or EFI):

- XFCE desktop, LightDM login, NetworkManager
- Firefox ESR for HTML and JavaScript
- Python 3 (with pip and venv), Node.js and npm
- Full apt package manager (Debian mirrors), git, build-essential
- VirtualBox guest tools for clipboard and screen resizing
- VexOS wallpaper, set as the default XFCE background
- `vexpad`, the same terminal editor as VexOS Linux (`vexpad --help`)

The live session user is `user` with password `live`, and has sudo.
Anything you install or change is lost on reboot unless you install to disk.

## Check before building

```sh
sh validate.sh      # checks files, scripts, package list, wallpaper; no build
```

## Build (on a Debian or Ubuntu machine, not in the sandbox)

Needs about 15 GB free disk, 4 GB RAM, and an internet connection. A build takes 30-90 minutes.

```sh
sudo apt install live-build
cd distro/vexos-desktop
sudo sh auto/config       # writes the live-build configuration
sudo sh auto/build        # output: live-image-amd64.hybrid.iso
```

If you need to start over: `sudo sh auto/clean`.

On Ubuntu, `live-build` may be an older version. Debian trixie hosts work best.

## Run in VirtualBox

1. New VM: Type *Linux*, Version *Debian (64-bit)*, 4 GB RAM, 2 CPUs, 20 GB disk (optional).
2. Storage: attach `live-image-amd64.hybrid.iso` to the optical drive.
3. System > Enable EFI only if you want UEFI; BIOS works by default.
4. Start the VM. The live desktop boots; a `Desktop/` folder has sample files:
   - `hello-web.html`: open it in Firefox to test JavaScript.
   - `hello.py`: run with `python3 hello.py` in a terminal.

## Layout

```
auto/config                       live-build settings (Debian trixie, amd64, ISO)
auto/build, auto/clean            build and cleanup
config/package-lists/             packages installed into the image
config/hooks/normal/              build hooks (VexOS branding)
config/includes.chroot/etc/skel/  files copied into every new user's home
```

## Notes

- Not built or tested inside the sandbox: its Debian mirror is blocked, so the first real build happens on your machine.
- Firefox is Firefox ESR, not a custom browser. VexOS is a distribution around the existing browser.
- The package list is a starting point. Add packages to `config/package-lists/vexos.list.chroot` and rebuild.
