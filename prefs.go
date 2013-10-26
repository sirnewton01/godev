// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"encoding/json"
	"go/build"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

func prefsHandler(writer http.ResponseWriter, req *http.Request, path string, pathSegs []string) bool {
	switch {
	case req.Method == "PUT":
		gopaths := filepath.SplitList(build.Default.GOPATH)
		prefFile := gopaths[len(gopaths)-1] + "/prefs.txt"

		var prefs map[string]map[string]string

		_, err := os.Stat(prefFile)
		if err == nil {
			file, err := os.Open(prefFile)

			if err != nil {
				ShowError(writer, 500, "Could not open preferences file", err)
				return true
			}

			dec := json.NewDecoder(file)
			err = dec.Decode(&prefs)
			file.Close()

			if err != nil {
				ShowError(writer, 500, "Corrupt preferences file", err)
				return true
			}
		} else {
			prefs = make(map[string]map[string]string)
		}

		var prefNode map[string]string

		prefNode, _ = prefs[path]
		if strings.HasPrefix(req.Header.Get("Content-Type"), "application/json") {
			prefNode = make(map[string]string)
			dec := json.NewDecoder(req.Body)
			err = dec.Decode(&prefNode)
			if err != nil {
				ShowError(writer, 400, "Could not parse JSON input", err)
				return true
			}
		} else {
			if prefNode == nil {
				prefNode = make(map[string]string)
			}
			err := req.ParseForm()
			if err != nil {
				ShowError(writer, 400, "Could not parse form input", err)
				return true
			}

			form := req.Form

			keyValue, keyValueOk := form["key"]
			if !keyValueOk {
				writer.WriteHeader(400)
				return true
			}

			key := keyValue[0]

			valueValue, valueValueOk := form["value"]
			if !valueValueOk {
				writer.WriteHeader(400)
				return true
			}

			value := valueValue[0]

			prefNode[key] = value
		}

		prefs[path] = prefNode

		file, err := os.Create(prefFile)

		if err != nil {
			ShowError(writer, 500, "Could not open preferences file", err)
			return true
		}

		enc := json.NewEncoder(file)
		enc.Encode(&prefs)
		file.Close()

		writer.WriteHeader(204)
		return true
	case req.Method == "DELETE":
		gopaths := filepath.SplitList(build.Default.GOPATH)
		prefFile := gopaths[len(gopaths)-1] + "/prefs.txt"

		var prefs map[string]map[string]string

		_, err := os.Stat(prefFile)
		if err == nil {
			file, err := os.Open(prefFile)

			if err != nil {
				ShowError(writer, 500, "Could not open preferences file", err)
				return true
			}

			dec := json.NewDecoder(file)
			err = dec.Decode(&prefs)
			file.Close()

			if err != nil {
				ShowError(writer, 500, "Corrupt preference file", err)
				return true
			}
		} else {
			writer.WriteHeader(204)
			return true
		}

		prefNode, _ := prefs[path]

		if prefNode == nil {
			writer.WriteHeader(204)
			return true
		}

		if req.URL.RawQuery == "" {
			delete(prefs, path)
		} else {
			keyValue, queryOk := req.URL.Query()["key"]
			if !queryOk {
				writer.WriteHeader(204)
				return true
			}
			key := keyValue[0]

			delete(prefNode, key)

			prefs[path] = prefNode
		}

		file, err := os.Create(prefFile)

		if err != nil {
			ShowError(writer, 500, "Could not open preferences file", err)
			return true
		}

		enc := json.NewEncoder(file)
		enc.Encode(&prefs)
		file.Close()

		writer.WriteHeader(204)
		return true
	}

	return false
}
