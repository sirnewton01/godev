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
		ospath := req.URL.Query().Get("path")
		ospath = filepath.Clean(ospath)

		if ospath == "" {
			ShowError(writer, 400, "Invalid request", nil)
			return true
		}

		lineNumber := req.URL.Query().Get("line")

		gorootsrc := filepath.Join(goroot, "/src/pkg")

		for _, srcDir := range append(srcDirs, gorootsrc) {
			// TODO add trailing '/' or '\' to the srcDir for the check
			if strings.HasPrefix(ospath, srcDir) {
				_, err := os.Stat(ospath)

				if err == nil {
					relpath, err := filepath.Rel(srcDir, ospath)

					if err == nil {
						if srcDir == gorootsrc {
							relpath = filepath.Join("GOROOT", relpath)
						}
						// Switch back to URL path segments
						relpath = strings.Replace(relpath, "\\", "/", -1)

						extraArgs := ""
						if lineNumber != "" {
							extraArgs = ",line=" + lineNumber
						}

						http.Redirect(writer, req, "/edit/edit.html#/file/"+relpath+extraArgs, 302)
						return true
					}
				}
			} else {
				p := filepath.Join(srcDir, ospath)
				_, err := os.Stat(p)

				if err == nil {
					if srcDir == gorootsrc {
						p = filepath.Join("/file/GOROOT/", ospath)
					} else {
						p = filepath.Join("/file/", ospath)
					}
					p = filepath.ToSlash(p)

					http.Redirect(writer, req, "/edit/edit.html#"+p, 302)
					return true
				}

			}
		}

		ShowError(writer, 404, "Not Found", nil)
		return true
	}

	return false
}
