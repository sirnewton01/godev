// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"bufio"
	"bytes"
	"io/ioutil"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
)

type CompileError struct {
	Location string
	Line     int64
	Column   int64
	Msg      string
}

func parseBuildOutput(cmd *exec.Cmd) (compileErrors []CompileError, err error) {
	buffer, _ := cmd.CombinedOutput()

	reader := bytes.NewReader(buffer)
	bufReader := bufio.NewReader(reader)

	workingDir, err := os.Getwd()

	if err != nil {
		return []CompileError{}, err
	}

	for {
		l, _, err := bufReader.ReadLine()

		if err != nil {
			break
		}

		line := string(l)

		if strings.HasPrefix(line, "#") {
			// Skip comment lines
		} else if strings.HasPrefix(line, "\t") && len(compileErrors) > 0 {
			// Continuation of previous error message comment
			prevCompileError := compileErrors[len(compileErrors)-1]
			prevCompileError.Msg = prevCompileError.Msg + " " + line
			compileErrors[len(compileErrors)-1] = prevCompileError
		} else if strings.Contains(line, ":") {
			// Compile Error
			pieces := strings.Split(line, ":")
			file := pieces[0]

			if !filepath.IsAbs(file) {
				file = filepath.Join(workingDir, file)
			}
			file = filepath.Clean(file)

			location := ""

			for _, srcDir := range srcDirs {
				pkgLoc := strings.Index(file, srcDir)
				if pkgLoc == 0 {
					location = filepath.Join("/file", file[len(srcDir):])
				}
			}

			// Check the GOROOT for this error
			if location == "" {
				pkgLoc := strings.Index(file, goroot)
				if pkgLoc == 0 {
					location = filepath.Join("/file/GOROOT", file[len(goroot):])
				}
			}

			l := pieces[1]
			lineNum, err := strconv.ParseInt(l, 10, 64)

			if err != nil {
				continue
			}

			pieces = pieces[2:]

			columnNum, err := strconv.ParseInt(pieces[0], 10, 64)
			if err != nil {
				columnNum = 0
			} else {
				pieces = pieces[1:]
			}

			msg := strings.Join(pieces, ":")
			location = filepath.ToSlash(location)
			error := CompileError{Location: location, Line: lineNum,
				Column: columnNum, Msg: msg}
			compileErrors = append(compileErrors, error)
		}
	}

	return compileErrors, nil
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
		compileErrors, err := parseBuildOutput(cmd)
		os.Remove(tmpFileName)

		if err != nil {
			ShowError(writer, 500, "Error parsing build output", err)
			return true
		}

		// Compile the tests too
		// Do this in a temporary directory to avoid collisions.
		// Too bad "go build" doesn't have a "-t" parameters to include the tests.
		// Too bad that "go test -c" doesn't handle collisions, while "go test" does.
		os.Mkdir(tmpFileName, os.ModeDir|0700)
		cmd = exec.Command("go", "test", "-c", pkg)
		cmd.Dir = tmpFileName
		testCompileErrors, err := parseBuildOutput(cmd)
		for _, newError := range testCompileErrors {
			if strings.HasSuffix(newError.Location, "_test.go") {
				compileErrors = append(compileErrors, newError)
			}
		}
		os.RemoveAll(tmpFileName)

		if err != nil {
			ShowError(writer, 500, "Error parsing build output", err)
			return true
		}

		if install == "true" && len(compileErrors) == 0 {
			cmd := exec.Command("go", "install", pkg)
			err = cmd.Run()

			if err != nil {
				ShowError(writer, 500, "Error installing package", err)
				return true
			}
		}

		ShowJson(writer, 200, compileErrors)
		return true
	}

	return false
}
