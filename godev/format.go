// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"bufio"
	"bytes"
	"net/http"
	"os/exec"
	"regexp"
	"strconv"
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
		qValues := req.URL.Query()
		showLines := qValues.Get("showLines")

		// Simple case, provide the output from gofmt
		if showLines != "true" {
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
		} else {
			// Get the specific line numbers where there are formatting problems
			cmd := exec.Command("gofmt", "-d")
			cmd.Stdin = req.Body

			output, err := cmd.Output()

			if err != nil {
				ShowError(writer, 500, "Error formatting go file", err)
				return true
			}

			if err != nil {
				ShowError(writer, 500, "Unable to parse format diff", err)
				return true
			}

			formatWarnings := []int64{}

			headerRegx := regexp.MustCompile(`^@@ -(\d+),(\d+) \+(\d+),(\d+) @@$`)

			firstLine := int64(-1)
			lineCounter := int64(-1)

			reader := bytes.NewReader(output)
			scanner := bufio.NewScanner(reader)

			for scanner.Scan() {
				hunk := scanner.Text()

				match := headerRegx.FindStringSubmatch(hunk)
				if len(match) > 1 {
					n, err := strconv.ParseInt(match[1], 10, 64)
					if err != nil {
						ShowError(writer, 500, "Unable to parse format diff", err)
						return true
					}
					firstLine = n
					lineCounter = -1
				}

				// This is a line that has a diff, mark it down
				if firstLine != -1 && hunk[0] == '-' {
					formatWarnings = append(formatWarnings, firstLine+lineCounter)
				}

				// Don't count the adds for the format proposal
				// TODO Some day we could provide the exact column within the original where the formatting warning exists
				if firstLine != -1 && hunk[0] != '+' {
					lineCounter++
				}
			}

			ShowJson(writer, 200, formatWarnings)
			return true
		}
	}

	return false
}
