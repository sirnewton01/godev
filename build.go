// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"bufio"
	"bytes"
	"net/http"
	"os/exec"
	"strconv"
	"strings"
	"io/ioutil"
	"os"
)

type CompileError struct {
	Location string
	Line     int64
	Msg      string
}

func parseBuildOutput(cmd *exec.Cmd) (compileErrors []CompileError) {
	buffer, _ := cmd.CombinedOutput()

	reader := bytes.NewReader(buffer)
	bufReader := bufio.NewReader(reader)
	var currentPkg string

	for {
		l, _, err := bufReader.ReadLine()

		if err != nil {
			break
		}

		line := string(l)

		if strings.HasPrefix(line, "#") {
			// Package Marker
			currentPkg = strings.Replace(line, "# ", "", 1)
		} else if strings.Contains(line, ":") {
			// Compile Error
			pieces := strings.Split(line, ":")
			file := pieces[0]

			pkgLoc := strings.Index(file, currentPkg)

			if pkgLoc != -1 {
				file = "/file/" + currentPkg + file[pkgLoc + len(currentPkg):]
			}

			l := pieces[1]
			lineNum, err := strconv.ParseInt(l, 10, 64)

			if err != nil {
				continue
			}

			msg := strings.Replace(line, pieces[0]+":"+pieces[1]+":", "", 1)
			error := CompileError{Location: file, Line: lineNum, Msg: msg}
			compileErrors = append(compileErrors, error)
		}
	}
	
	return compileErrors
}

func buildHandler(writer http.ResponseWriter, req *http.Request, path string, pathSegs []string) bool {
	switch {
	case req.Method == "GET":
		qValues := req.URL.Query()
		pkg := qValues.Get("pkg")
		install := qValues.Get("install")

		tmpFile, err := ioutil.TempFile("", "godev-build-temp")
		if err != nil {
			ShowError(writer, 500, "Unable to create temporary file for build", err)
			return true
		}
		
		// Compile the regular parts of the package
		tmpFileName := tmpFile.Name()
		cmd := exec.Command("go", "build", "-o", tmpFileName, pkg)
		compileErrors := parseBuildOutput(cmd)
		os.Remove(tmpFileName)
		
		// Compile the tests too
		// Do this in a temporary directory to avoid collisions.
		// Too bad "go build" doesn't have a "-t" parameters to include the tests.
		// Too bad that "go test -c" doesn't handle collisions, while "go test" does.
		os.Mkdir(tmpFileName, os.ModeDir | 0700)
		cmd = exec.Command("go", "test", "-c", pkg)
		cmd.Dir = tmpFileName
		compileErrors = append(compileErrors, parseBuildOutput(cmd)...)
		os.Remove(tmpFileName)

		if install == "true" && len(compileErrors) == 0 {
			cmd := exec.Command("go", "install", pkg)
			cmd.Run()
		}

		ShowJson(writer, 200, compileErrors)
		return true
	}

	return false
}
