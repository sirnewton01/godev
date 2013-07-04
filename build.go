// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"bufio"
	"bytes"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
)

type CompileError struct {
	Location string
	Line     int64
	Msg      string
}

func buildHandler(writer http.ResponseWriter, req *http.Request, path string, pathSegs []string) bool {
	switch {
	case req.Method == "GET":
		qValues := req.URL.Query()
		pkg := qValues.Get("pkg")
		clean := qValues.Get("clean")
		install := qValues.Get("install")

		pkgpath := gopath + "/src/" + pkg
		_, err := os.Stat(pkgpath)
		if err != nil {
			ShowError(writer, 400, "Error opening package directory", err)
			return true
		}

		var buffer bytes.Buffer
		cmd := exec.Command("go", "build", pkg)
		cmd.Dir = pkgpath
		cmd.Stdout = &buffer
		err = cmd.Run()

		reader := bytes.NewReader(buffer.Bytes())
		bufReader := bufio.NewReader(reader)
		var currentPkg string

		compileErrors := make([]CompileError, 0, 0)

		for {
			l, _ := bufReader.ReadSlice('\n')

			if len(l) == 0 {
				break
			}

			line := string(l)
			line = strings.Replace(line, "\n", "", 1)

			if strings.HasPrefix(line, "#") {
				// Package Marker
				currentPkg = strings.Replace(line, "# ", "", 1)
			} else if strings.Contains(line, ":") {
				// Compile Error
				pieces := strings.Split(line, ":")
				file := pieces[0]

				if strings.HasPrefix(file, "./") {
					file = strings.Replace(file, "./", "", 1)
				}

				l := pieces[1]
				lineNum, err := strconv.ParseInt(l, 10, 64)

				if err != nil {
					continue
				}

				msg := strings.Replace(line, pieces[0]+":"+pieces[1]+":", "", 1)
				error := CompileError{Location: "/file/" + currentPkg + "/" + file, Line: lineNum, Msg: msg}
				compileErrors = append(compileErrors, error)
			}
		}

		if clean == "true" {
			cmd := exec.Command("go", "clean", pkg)
			cmd.Dir = pkgpath
			cmd.Run()
		}

		if install == "true" && len(compileErrors) == 0 {
			cmd := exec.Command("go", "install", pkg)
			cmd.Dir = pkgpath
			cmd.Run()
		}

		ShowJson(writer, 200, compileErrors)
		return true
	}

	return false
}
