// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"bufio"
	"go/build"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

func init() {
	dirs := build.Default.SrcDirs()
	godoc_templates_dir := ""

	for i := len(dirs) - 1; i >= 0; i-- {
		srcDir := dirs[i]

		if godoc_templates_dir == "" {
			_, err := os.Stat(srcDir + "/github.com/sirnewton01/godev/godoc-templates")

			if err == nil {
				godoc_templates_dir = srcDir + "/github.com/sirnewton01/godev/godoc-templates"
				break
			}
		}
	}

	// Try again with with the srcdir parameter
	if godoc_templates_dir == "" {
		_, err := os.Stat(*godev_src_dir + "/godoc-templates")

		if err == nil {
			godoc_templates_dir = *godev_src_dir + "/godoc-templates"
		}
	}

	// Find an available port number
	godocPort := int64(6060)
	godocPortStr := strconv.FormatInt(godocPort, 10)

	for {
		_, err := net.DialTimeout("tcp", "127.0.0.1:"+godocPortStr, 100*time.Millisecond)
		if err != nil {
			break
		}

		godocPort++
		godocPortStr = strconv.FormatInt(godocPort, 10)
	}

	if godoc_templates_dir != "" {
		go func() {
			cmd := exec.Command("godoc", "-http=127.0.0.1:"+godocPortStr, "-index=true", "-templates="+godoc_templates_dir)
			cmd.Run()
		}()
	}
}

func docHandler(writer http.ResponseWriter, req *http.Request, path string, pathSegs []string) bool {
	switch {
	// Start a simple proxy for many of the different types of requests (except for source code)
	case req.Method == "GET" && pathSegs[1] != "src" && pathSegs[1] != "text":
		delegatePath := "/" + strings.Join(pathSegs[1:], "/")
		queryParam := req.URL.RawQuery

		// Check to see if the search param is a precise package and redirect
		//  since the godoc tool doesn't do this very well.
		if queryParam != "" && pathSegs[1] == "search" {
			pkgName := req.URL.Query().Get("q")

			gorootsrc := filepath.Join(goroot, "/src/pkg")

			for _, srcDir := range append(srcDirs, gorootsrc) {
				info, err := os.Stat(filepath.Join(srcDir, pkgName))
				if err == nil && info.IsDir() {
					http.Redirect(writer, req, "/godoc/pkg/"+pkgName, 302)
					return true
				}
			}
		}

		resp, err := http.Get("http://127.0.0.1:6060" + delegatePath + "?" + queryParam)
		if err != nil {
			ShowError(writer, 500, "Error connecting to godoc server", err)
			return true
		}
		defer resp.Body.Close()

		contentType := req.Header.Get("Content-Type")

		writer.Header().Add("Content-Type", contentType)
		writer.WriteHeader(resp.StatusCode)

		// Read line-by line replacing any hrefs to /pkg to /godoc/pkg
		r := bufio.NewReader(resp.Body)
		w := bufio.NewWriter(writer)
		defer w.Flush()

		for {
			line, _ := r.ReadString('\n')

			if line != "" {
				line = strings.Replace(line, `a href="/pkg/`, `a href="/godoc/pkg/`, -1)
				w.WriteString(line)
			} else {
				break
			}
		}

		return true
	// Redirect source code to the Orion editor interface
	case req.Method == "GET" && pathSegs[1] == "src":
		lineNumber := ""
		redirectLocation := ""

		// Check for the line number
		sourceRange := req.URL.Query().Get("s")
		sourceStartOffset := -1
		if sourceRange != "" {
			offsetString := strings.Split(sourceRange, ":")[0]
			offset, err := strconv.ParseInt(offsetString, 10, 64)
			if err == nil {
				sourceStartOffset = int(offset)
			}
		}

		gorootsrc := filepath.Join(goroot, "/src/pkg")

		for _, srcDir := range append(srcDirs, gorootsrc) {
			potentialMatch := filepath.Join(srcDir, filepath.Join(pathSegs[3:]...))

			if _, err := os.Stat(potentialMatch); err == nil {
				file, err := os.Open(potentialMatch)
				defer file.Close()

				if sourceStartOffset != -1 && err == nil {
					buf := make([]byte, sourceStartOffset, sourceStartOffset)

					bytesRead, _ := file.Read(buf)

					if bytesRead == sourceStartOffset {
						// We read all of the necessary bytes to count lines
						lines := 1
						for _, b := range buf {
							if b == '\n' {
								lines++
							}
						}

						lineNumber = strconv.FormatInt(int64(lines), 10)
					}
				}

				if file != nil && srcDir != gorootsrc {
					redirectLocation = "/file/" + strings.Join(pathSegs[3:], "/")
					break
				}

				if file != nil && srcDir == gorootsrc {
					redirectLocation = "/file/GOROOT/" + strings.Join(pathSegs[3:], "/")
					break
				}
			}
		}

		if redirectLocation == "" {
			ShowError(writer, 404, "Not Found", nil)
			return true
		}

		if lineNumber != "" {
			redirectLocation = redirectLocation + ",line=" + lineNumber
		}

		http.Redirect(writer, req, "/edit/edit.html#"+redirectLocation, 302)
		return true

	// Get the textual godoc for a package and optional name
	case req.Method == "GET" && pathSegs[1] == "text":
		pkg := req.URL.Query().Get("pkg")
		name := req.URL.Query().Get("name")

		if pkg == "" {
			ShowError(writer, 400, "No package provided", nil)
			return true
		}
		
		cmd := exec.Command("godoc", pkg, name)
		output, err := cmd.Output()
		if err != nil {
			ShowError(writer, 500, "Error invoking godoc tool", err)
			return true
		}
		
		writer.WriteHeader(200)
		writer.Write(output)
		return true
	}

	return false
}
