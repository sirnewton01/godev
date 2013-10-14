// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"net/http"
	"os/exec"
)

func formatHandler(writer http.ResponseWriter, req *http.Request, path string, pathSegs []string) bool {
	switch {
	case req.Method == "GET":
		qValues := req.URL.Query()
		pkg := qValues.Get("pkg")

		cmd := exec.Command("go", "fmt", pkg)
		err := cmd.Run()

		if err != nil {
			ShowError(writer, 400, "Go format ran with errors", err)
			return true
		}

		writer.WriteHeader(200)
		return true
	}

	return false
}
