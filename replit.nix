{pkgs}: {
  deps = [
    pkgs.android-tools
    pkgs.openjdk17
    pkgs.gradle
    pkgs.chromium
    pkgs.postgresql
    pkgs.jq
  ];
}
