// Augment the vscode module to add joinPath, which is missing from the
// vscode@1.1.37 type stubs used in the test environment.
declare module 'vscode' {
  namespace Uri {
    function joinPath(base: Uri, ...pathSegments: string[]): Uri;
  }
}
