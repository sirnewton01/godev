// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"bytes"
	"io"
	"net/http"
	"os/exec"
)

func docHandler(writer http.ResponseWriter, req *http.Request, path string, pathSegs []string) bool {
	switch {
	case req.Method == "GET":
		qValues := req.URL.Query()
		pkg := qValues.Get("pkg")
		name := qValues.Get("name")

		var buffer bytes.Buffer
		var cmd *exec.Cmd

		if name != "" {
			cmd = exec.Command("godoc", pkg, name)
		} else {
			cmd = exec.Command("godoc", pkg)
		}
		cmd.Stdout = &buffer
		cmd.Run()

		reader := bytes.NewReader(buffer.Bytes())
		writer.WriteHeader(200)
		_, err := io.Copy(writer, reader)
		if err != nil {
			panic(err)
		}
		return true
	}

	return false
}
