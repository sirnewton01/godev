// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
)

type Definition struct {
	Name     string
	Package  string
	Location string
	Line     string
	Column   string
}

func definitionHandler(writer http.ResponseWriter, req *http.Request, path string, pathSegs []string) bool {
	switch {
	case req.Method == "POST" && len(pathSegs) > 2:
		offsetStr := req.URL.Query().Get("o")

		location := "/" + strings.Join(pathSegs[2:], "/")

		workingDir := ""

		// Find the workding directory we should launch godef in
		if pathSegs[3] == "GOROOT" {
			workingDir = filepath.Join(goroot+"/src/pkg", strings.Join(pathSegs[4:len(pathSegs)-1], "/"))
		} else {
			dirRelPath := filepath.Clean(strings.Join(pathSegs[3:len(pathSegs)-1], "/"))

			for _, srcDir := range srcDirs {
				dirPath := filepath.Join(srcDir, dirRelPath)
				_, err := os.Stat(dirPath)

				if err == nil {
					workingDir = dirPath
					break
				}
			}
		}

		if workingDir == "" {
			ShowError(writer, 400, "Invalid resource", nil)
			return true
		}

		cmd := exec.Command("godef", "-o="+offsetStr, "-i=true", "-t=true")
		cmd.Dir = workingDir
		cmd.Stdin = req.Body

		output, err := cmd.Output()

		if err != nil {
			if strings.Contains(strings.ToLower(err.Error()), "not found") {
				// Executable was not found, inform the user
				ShowError(writer, 400, "Godef tool not found", err)
				return true
			}
		}

		if len(output) == 0 {
			ShowJson(writer, 204, "No definition found")
			return true
		}

		outputStr := string(output)

		// First row is the file and path of the definition
		outputRows := strings.Split(outputStr, "\n")
		for idx, _ := range outputRows {
			outputRows[idx] = strings.Replace(outputRows[idx], "\r", "", -1)
		}

		if len(outputRows) == 0 {
			ShowJson(writer, 204, "No definition found")
			return true
		}

		outputColumns := strings.Split(outputRows[0], ":")

		// Windows path
		if (outputStr[0] == 'C' || outputStr[0] == 'c') && outputStr[1] == ':' {
			outputColumns[1] = string(outputStr[0]) + ":" + outputColumns[1]
			outputColumns = outputColumns[1:]
		}

		if len(outputColumns) == 0 || len(outputColumns) > 3 {
			ShowJson(writer, 204, "No definition found")
			return true
		}

		definition := &Definition{}

		if len(outputColumns) == 1 {
			// Package reference

			// do a quick check to see if this is a real file path
			_, err := os.Stat(outputColumns[0])
			if err != nil {
				ShowJson(writer, 204, "No definition found")
				return true
			}

			definition.Location = getLogicalPos(outputColumns[0])

			// The package name is the package location without the '/GOROOT' and starting '/'
			definition.Package = strings.Replace(definition.Location, "/GOROOT/", "", 1)
			if len(definition.Package) > 0 && definition.Package[0] == '/' {
				definition.Package = definition.Package[1:]
			}

			definition.Location = "/file" + definition.Location

			// Bail out early, packages don't have any type or line information
			ShowJson(writer, 200, definition)
			return true
		} else if len(outputColumns) == 3 {
			// File, line number and column reference

			_, err := strconv.ParseInt(outputColumns[1], 10, 64)
			if err != nil {
				ShowJson(writer, 204, "No definition found")
				return true
			}

			_, err = strconv.ParseInt(outputColumns[2], 10, 64)
			if err != nil {
				ShowJson(writer, 204, "No definition found")
				return true
			}

			// Make the path absolute
			if !filepath.IsAbs(outputColumns[0]) {
				outputColumns[0] = filepath.Join(workingDir, outputColumns[0])
			}

			// do a quick check to see if this is a real file path
			_, err = os.Stat(outputColumns[0])
			if err != nil {
				ShowJson(writer, 204, "No definition found")
				return true
			}

			definition.Location = "/file" + getLogicalPos(outputColumns[0])

			// The package name is the location without the '/GOROOT' and starting '/'

			definition.Package = strings.Replace(filepath.ToSlash(filepath.Dir(definition.Location[5:])), "/GOROOT/", "", 1)
			if len(definition.Package) > 0 && definition.Package[0] == '/' {
				definition.Package = definition.Package[1:]
			}

			definition.Line = outputColumns[1]
			definition.Column = outputColumns[2]
		} else if len(outputColumns) == 2 {
			// Same file line number and column

			_, err := strconv.ParseInt(outputColumns[0], 10, 64)
			if err != nil {
				ShowJson(writer, 204, "No definition found")
				return true
			}

			_, err = strconv.ParseInt(outputColumns[1], 10, 64)
			if err != nil {
				ShowJson(writer, 204, "No definition found")
				return true
			}

			definition.Location = location

			// The package name is the location without the '/GOROOT' and starting '/'
			definition.Package = strings.Replace(filepath.ToSlash(filepath.Dir(definition.Location[5:])), "/GOROOT/", "", 1)
			if len(definition.Package) > 0 && definition.Package[0] == '/' {
				definition.Package = definition.Package[1:]
			}

			definition.Line = outputColumns[0]
			definition.Column = outputColumns[1]
		} else {
			// Don't recognize this output
			ShowJson(writer, 204, "No definition found")
			return true
		}

		// The next line should have a name for this item
		if len(outputRows) > 1 {
			outputColumns = strings.Split(outputRows[1], " ")

			definition.Name = outputColumns[0]
		}

		ShowJson(writer, 200, definition)
		return true
	}

	return false
}
