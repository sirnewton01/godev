// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"net/http"
	"os"
	"regexp"
	"runtime"
	"strings"
)

type Blob struct {
	ResponseHeader Header   `json:"responseHeader"`
	Response       Response `json:"response"`
}

type Header struct {
	Status uint `json:"status"`
	QTime  uint
	Params Params `json:"params"`
}

type Params struct {
	Wt    string `json:"wt"`
	Fl    string `json:"fl"`
	Rows  string `json:"rows"`
	Start string `json:"start"`
	Sort  string `json:"sort"`
	Q     string `json:"q"`
}

type Response struct {
	NumFound int      `json:"numFound"`
	Start    uint     `json:"start"`
	Docs     []Result `json:"docs"`
}

type Result struct {
	Id           string
	Name         string
	Length       int64
	Directory    bool
	LastModified int64
	Location     string
	Path         string
}

func filesearchHandler(writer http.ResponseWriter, req *http.Request, path string, pathSegs []string) bool {
	switch {
	case req.Method == "GET":
		req.ParseForm()
		values := req.Form

		// TODO validate the input better, check for nils
		query := values["q"][0]
		// TODO respect the rows, start and sort parameters
		//rows := values["rows"][0]
		//sort := values["sort"][0]
		//start := values["start"][0]

		// TODO proper validation, check for nil values and empty maps
		filterparts := strings.Split(query, " ")[0]

		filterparts = strings.Replace(filterparts, "\\", "", -1)

		results := []Result{}

		if strings.HasPrefix(filterparts, "NameLower") {
			matches := strings.Split(filterparts, ":")[1]

			// Convert wildcard to regex and use the standard regex library
			nameregex, err := regexp.Compile("^" + strings.Replace(strings.Replace(matches, "*", ".*", -1), "?", ".?", -1) + "$")
			if err != nil {
				ShowError(writer, 400, "Invalid wildcard", err)
				return true
			}

			for _,srcDir := range(srcDirs) {
				path := ""
				location := "/file"
				results = append(results, findNameMatches(srcDir, path, location, nameregex)...)
			}

			filesDir := runtime.GOROOT() + "/src/pkg"
			path = ""
			location := "/file/GOROOT"
			results = append(results, findNameMatches(filesDir, path, location, nameregex)...)
		} else {
			token := filterparts

			for _,srcDir := range(srcDirs) {
				path := ""
				location := "/file"
				results = append(results, findContentMatches(srcDir, path, location, token)...)
			}

			filesDir := runtime.GOROOT() + "/src/pkg"
			path = ""
			location := "/file/GOROOT"
			results = append(results, findContentMatches(filesDir, path, location, token)...)
		}

		retval := Blob{}
		// TODO figure out what QTime means
		retval.ResponseHeader = Header{Status: 0, QTime: 7}
		retval.ResponseHeader.Params = Params{}
		retval.ResponseHeader.Params.Wt = "json"
		retval.ResponseHeader.Params.Fl = "Id,Name,NameLower,Length,Directory,LastModified,Location,Path"
		retval.ResponseHeader.Params.Rows = values["rows"][0]
		retval.ResponseHeader.Params.Sort = values["sort"][0]
		retval.ResponseHeader.Params.Start = values["start"][0]
		retval.ResponseHeader.Params.Q = values["q"][0]

		retval.Response = Response{}
		retval.Response.NumFound = len(results)
		retval.Response.Docs = results

		ShowJson(writer, 200, retval)
		return true
	}

	return false
}

func findNameMatches(file string, path string, location string, nameregex *regexp.Regexp) []Result {
	retval := []Result{}

	stat, err := os.Stat(file)
	if err != nil {
		return retval
	}

	if stat.IsDir() {
		dir, err := os.Open(file)

		if err == nil {
			defer dir.Close()
			names, err := dir.Readdirnames(-1)
			if err == nil {
				for _, name := range names {
					retval = append(retval, findNameMatches(file+"/"+name, path+"/"+name, location+"/"+name, nameregex)...)
				}
			}
		}
	} else if nameregex.MatchString(stat.Name()) {
		// TODO Windows paths may not merge well into URI's
		result := Result{Id: "file:/" + file, Name: stat.Name(), Length: stat.Size(),
			Directory: stat.IsDir(), LastModified: stat.ModTime().Unix() * 1000,
			Location: location, Path: path}
		retval = append(retval, result)
	}

	return retval
}

func findContentMatches(file string, path string, location string, token string) []Result {
	retval := []Result{}

	stat, err := os.Stat(file)
	if err != nil {
		return retval
	}

	if stat.IsDir() {
		dir, err := os.Open(file)

		if err == nil {
			defer dir.Close()

			names, err := dir.Readdirnames(-1)
			if err == nil {
				for _, name := range names {
					retval = append(retval, findContentMatches(file+"/"+name, path+"/"+name, location+"/"+name, token)...)
				}
			}
		}
	} else {
		f, err := os.Open(file)
		if err != nil {
			return retval
		}
		defer f.Close()

		buffer := make([]byte, 4096, 4096)
		matchIdx := 0
		matches := false

		for {
			n, err := f.Read(buffer)
			if n == 0 || err != nil {
				break
			}

			for i := 0; i < n; i++ {
				if buffer[i] == token[matchIdx] {
					matchIdx++

					if matchIdx == len(token) {
						matches = true
						break
					}
				} else {
					matchIdx = 0
				}
			}

			if matches {
				break
			}
		}

		if matches {
			// TODO Windows paths may not merge well into URI's
			result := Result{Id: "file:/" + file, Name: stat.Name(), Length: stat.Size(),
				Directory: stat.IsDir(), LastModified: stat.ModTime().Unix() * 1000,
				Location: location, Path: path}
			retval = append(retval, result)
		}
	}

	return retval
}
