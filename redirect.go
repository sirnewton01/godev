// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
)


func redirectHandler(writer http.ResponseWriter, req *http.Request, path string, pathSegs []string) bool {
	switch {
	// Start a simple proxy for many of the different types of requests (except for source code)
	case req.Method == "GET":
		ospath := "/" + filepath.Join(pathSegs[1:]...)
		ospath = filepath.Clean(ospath)
		extraArgs := ""
		
		if strings.Index(ospath,",") != -1 {
			idx := strings.Index(ospath, ",")
			
			extraArgs = ospath[idx:]
			ospath = ospath[0:idx]
		}
		
		gorootsrc := filepath.Join(goroot, "/src/pkg")
		
		for _,srcDir := range(append(srcDirs, gorootsrc)) {
			// TODO add trailing '/' or '\' to the srcDir for the check
			if strings.HasPrefix(ospath, srcDir) {
				_, err := os.Stat(ospath)
				
				if err == nil {
					relpath, err := filepath.Rel(srcDir,ospath)
					
					if err == nil {
						if srcDir == gorootsrc {
							relpath = filepath.Join("GOROOT", relpath)
						}
						// Switch back to URL path segments
						relpath = strings.Replace(relpath, "\\", "/", -1)
						
						http.Redirect(writer,req,"/edit/edit.html#/file/"+relpath+extraArgs, 302)
						return true
					}
				}
			}
		}

		ShowError(writer, 404, "Not Found", nil)
		return true
	}

	return false
}
