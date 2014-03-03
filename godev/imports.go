// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"net/http"
	"os/exec"
	"strings"
)

func importsHandler(writer http.ResponseWriter, req *http.Request, path string, pathSegs []string) bool {
	switch {
	case req.Method == "POST":
		cmd := exec.Command("goimports")
		cmd.Stdin = req.Body

		output, err := cmd.Output()

		if err != nil {
			if strings.Contains(strings.ToLower(err.Error()), "not found") {
				// Executable was not found, inform the user
				ShowError(writer, 500, "Import tool failed or is not installed.", err)
				return true
			}

			// Tool could not format the input
			writer.WriteHeader(204)
			return true
		}

		writer.WriteHeader(200)
		writer.Write(output)
		return true
	}

	return false
}
