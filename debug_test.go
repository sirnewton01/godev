package main

import(
	"testing"
	"go/build"
	"path/filepath"
	"os"
	"runtime"
)

func TestCommandDetection(t *testing.T) {
	srcDirs := build.Default.SrcDirs()
	t.Logf("SRC DIRS: %v\n", srcDirs)
	commands := make(map[string]string)
	
	for _,srcDir := range(srcDirs) {
		// Skip stuff that is in the GOROOT
		if filepath.HasPrefix(srcDir, runtime.GOROOT()) {
			continue
		}
		
		filepath.Walk(srcDir, func(path string, info os.FileInfo, err error) error {
			if info.IsDir() {
				pkg, err := build.Default.ImportDir(path, 0)
				
				if err == nil && pkg.IsCommand() {
					t.Logf("PKG: %v\n", pkg.ImportPath)
					commands[pkg.ImportPath] = filepath.Base(pkg.ImportPath)
				}
			}
			return nil
		})
	}
	
	t.Logf("MAP: %v\n", commands)
}
