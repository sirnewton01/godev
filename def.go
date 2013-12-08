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

func definitionHandler(writer http.ResponseWriter, req *http.Request, path string, pathSegs []string) bool {
	switch {
	case req.Method == "POST":
		offsetStr := req.URL.Query().Get("o")

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

		cmd := exec.Command("godef", "-o="+offsetStr, "-i=true")
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
		outputColumns := strings.Split(outputStr, ":")
		
		// Windows path
		if (outputStr[0] == 'C' || outputStr[0] == 'c') && outputStr[1] == ':' {
			outputColumns[1] = string(outputStr[0]) + ":" + outputColumns[1]
			outputColumns = outputColumns[1:]
		}
		
		if len(outputColumns) == 0 || len(outputColumns) > 3 {
			ShowJson(writer, 204, "No definition found")
			return true
		}

		// Package reference
		if len(outputColumns) == 1 {
			outputColumns[0] = strings.Replace(outputColumns[0], "\n", "", -1)
			outputColumns[0] = strings.Replace(outputColumns[0], "\r", "", -1)

			// do a quick check to see if this is a real file path
			_, err := os.Stat(outputColumns[0])
			if err != nil {
				ShowJson(writer, 204, "No definition found")
				return true
			}
			pkgPath := outputColumns[0]
			ShowJson(writer, 200, pkgPath)
			return true
		}

		// File and line number reference
		if len(outputColumns) == 3 {
			_, err := strconv.ParseInt(outputColumns[1], 10, 64)
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

			filePath := outputColumns[0]
			ShowJson(writer, 200, filePath+":"+outputColumns[1])
			return true
		}

		// Same file line number and column
		if len(outputColumns) == 2 {
			_, err := strconv.ParseInt(outputColumns[0], 10, 64)
			if err != nil {
				ShowJson(writer, 204, "No definition found")
				return true
			}
			outputColumns[1] = strings.Replace(outputColumns[1], "\n", "", -1)
			outputColumns[1] = strings.Replace(outputColumns[1], "\r", "", -1)
			_, err = strconv.ParseInt(outputColumns[1], 10, 64)
			if err != nil {
				ShowJson(writer, 204, "No definition found")
				return true
			}

			ShowJson(writer, 200, outputColumns[0]+":"+outputColumns[1])
			return true
		}

		ShowJson(writer, 204, "No definition found")
		return true
	}

	return false
}
