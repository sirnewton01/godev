// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
)

func formatHandler(writer http.ResponseWriter, req *http.Request, path string, pathSegs []string) bool {
	switch {
	case req.Method == "GET":
		qValues := req.URL.Query()
		pkg := qValues.Get("pkg")

		if pkg != "" {
			cmd := exec.Command("go", "fmt", pkg)
			err := cmd.Run()

			if err != nil {
				ShowError(writer, 400, "Go format ran with errors", err)
				return true
			}

			writer.WriteHeader(200)
			return true
		} else {
			file := qValues.Get("file")

			for _, srcDir := range srcDirs {
				filePath := filepath.Join(srcDir, file)
				info, err := os.Stat(filePath)

				if err == nil && !info.IsDir() {
					cmd := exec.Command("gofmt", filePath)
					output, err := cmd.Output()

					if err == nil {
						f, err := os.Create(filePath)
						if err == nil {
							_, err = f.Write(output)
							if err != nil {
								ShowError(writer, 500, "Can't write file", err)
								return true
							}
							err = f.Close()
							if err != nil {
								ShowError(writer, 500, "Can't close file", err)
								return true
							}
						} else {
							ShowError(writer, 500, "Can't open file", err)
							return true
						}
					} else {
						ShowError(writer, 500, "Can't execute gofmt command", err)
						return true
					}

					break
				}
			}

			writer.WriteHeader(200)
			return true
		}
	}

	return false
}
