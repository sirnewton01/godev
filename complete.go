// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

/*import (
	"jazz.net/sirnewton/godev/completion"
	"net/http"
)

func completionHandler(writer http.ResponseWriter, req *http.Request, path string, pathSegs []string) bool {
	switch {
	case req.Method == "GET":
		qValues := req.URL.Query()
		pkg := qValues.Get("pkg")
		decl := qValues.Get("decl")

		values, err := completion.FindCompletions(pkg, decl)

		if err != nil {
			ShowError(writer, 400, "Error generating code completion", err)
			return true
		}

		ShowJson(writer, 200, values)
		return true
	}

	return false
}*/
