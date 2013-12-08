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

		if pkg != "" {
			cmd := exec.Command("go", "fmt", pkg)
			err := cmd.Run()

			if err != nil {
				ShowError(writer, 400, "Go format ran with errors", err)
				return true
			}

			writer.WriteHeader(200)
			return true
		}
	case req.Method == "POST":
		cmd := exec.Command("gofmt")
		cmd.Stdin = req.Body

		output, err := cmd.Output()

		if err != nil {
			ShowError(writer, 500, "Error formatting go file", err)
			return true
		}

		writer.WriteHeader(200)
		writer.Write(output)
		return true
	}

	return false
}
