{pkgs}: {
  deps = [
    pkgs.unzip
    # Playwright / Chromium headless-shell runtime dependencies.
    #
    # Without these, `chrome-headless-shell` fails to launch with
    # "error while loading shared libraries: libglib-2.0.so.0".
    # /mlabs-qa drives Playwright as part of the standard mstack
    # workflow, so the template ships these by default — first-fork
    # QA "just works" without a replit.nix edit.
    #
    # Adds ~one-time Nix profile rebuild cost on first workspace start
    # (~5–10 min). Forks that don't run /mlabs-qa can trim the list,
    # but the saving is small relative to other workspace deps.
    #
    # See docs/template/TEMPLATE.md recommendation #15 + lesson #9.
    pkgs.glib
    pkgs.nss
    pkgs.nspr
    pkgs.atk
    pkgs.at-spi2-atk
    pkgs.cups
    pkgs.dbus
    pkgs.expat
    pkgs.libxkbcommon
    pkgs.libdrm
    pkgs.mesa
    pkgs.cairo
    pkgs.pango
    pkgs.alsa-lib
    pkgs.gtk3
    pkgs.xorg.libX11
    pkgs.xorg.libXcomposite
    pkgs.xorg.libXdamage
    pkgs.xorg.libXext
    pkgs.xorg.libXfixes
    pkgs.xorg.libXrandr
    pkgs.xorg.libxcb
  ];
}
