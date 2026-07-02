{
  description = "Optional development shell for Vector EVM contracts";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

  outputs =
    {
      nixpkgs,
      ...
    }:
    let
      systems = [
        "aarch64-darwin"
        "aarch64-linux"
        "x86_64-darwin"
        "x86_64-linux"
      ];
      forEachSystem = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forEachSystem (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              foundry
              nodejs_22
            ];

            shellHook = ''
              echo "Vector EVM contracts dev shell"
              echo "forge: $(forge --version)"
              echo "node:  $(node --version)"
            '';
          };
        }
      );
    };
}
