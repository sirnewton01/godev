// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

func completionHandler(writer http.ResponseWriter, req *http.Request, path string, pathSegs []string) bool {
	switch {
	case req.Method == "POST":
		qValues := req.URL.Query()
		path := qValues.Get("path")
		offset := qValues.Get("offset")

		path = strings.Replace(path, "/file", "", -1)
		realPath := ""

		// Find the correct location on disk for the provided path location
		for _, srcDir := range srcDirs {
			joinedPath := filepath.Join(srcDir, path)

			_, err := os.Stat(joinedPath)

			if err == nil {
				realPath = joinedPath
				break
			}
		}

		// Check if gocode exists
		cmd := exec.Command("gocode")
		err := cmd.Run()

		if err != nil {
			ShowError(writer, 400, "gocode is not installed. Install it with 'go get github.com/nsf/gocode'", nil)
			return true
		}

		// Copy the buffer into a temporary file to create a reader for the
		//  standard in of the gocode command
		tmpFile, err := ioutil.TempFile("", "godev-complete-temp")
		_, err = io.Copy(tmpFile, req.Body)

		if err != nil {
			ShowError(writer, 500, "Error copying buffer to temporary file", err)
			return true
		}
		tmpFile.Close()
		tmpFile, err = os.Open(tmpFile.Name())

		// Invoke the gocode client to get the completions from the server
		cmd = exec.Command("gocode", "-f=json", "autocomplete", realPath, offset)
		// Standard input is the buffer
		cmd.Stdin = tmpFile

		outputBuffer, err := cmd.Output()
		if err != nil {
			ShowError(writer, 500, "Error invoking gocode to get completions", err)
			return true
		}

		tmpFile.Close()
		os.Remove(tmpFile.Name())

		// The completions go directly to the web client as JSON
		writer.WriteHeader(200)
		writer.Header().Add("Content-Type", "application/json")
		writer.Write(outputBuffer)

		// TODO maybe add extra data to the JSON such as stripping out the types from the function arguments and provided the offsets of the placeholder parameters?
		return true
	}

	return false
}
