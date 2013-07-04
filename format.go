// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"net/http"
	"os"
	"os/exec"
)

func formatHandler(writer http.ResponseWriter, req *http.Request, path string, pathSegs []string) bool {
	switch {
	case req.Method == "GET":
		qValues := req.URL.Query()
		pkg := qValues.Get("pkg")

		pkgpath := gopath + "/src/" + pkg
		_, err := os.Stat(pkgpath)
		if err != nil {
			ShowError(writer, 400, "Error opening package directory", err)
			return true
		}

		cmd := exec.Command("go", "fmt", pkg)
		cmd.Dir = pkgpath
		err = cmd.Run()

		if err != nil {
			ShowError(writer, 400, "Go format ran with errors", err)
			return true
		}

		writer.WriteHeader(200)
		return true
	}

	return false
}
