{pkgs}: {
  deps = [
    pkgs.android-tools
    pkgs.openjdk17
    pkgs.chromium
    pkgs.postgresql
    pkgs.jq
  ];
}
