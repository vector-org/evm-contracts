{
  description = "Optional development shell for Vector EVM contracts";

  inputs = {
    nixpkgs.url = "github:cachix/devenv-nixpkgs/rolling";
    devenv.url = "github:cachix/devenv";
    devenv.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs =
    inputs@{
      self,
      nixpkgs,
      devenv,
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
          default = devenv.lib.mkShell {
            inherit inputs pkgs;

            modules = [
              {
                packages = with pkgs; [
                  foundry
                  nodejs_22
                ];

                scripts.forge-build.exec = "forge build";
                scripts.forge-test.exec = "forge test";

                enterShell = ''
                  echo "Vector EVM contracts dev shell"
                  echo "forge: $(forge --version)"
                  echo "node:  $(node --version)"
                '';
              }
            ];
          };
        }
      );
    };
}
